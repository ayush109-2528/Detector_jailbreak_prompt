"""Run outside serverless functions; poll durable reviewed labels and validate candidates."""
import os,sys,json,time,hashlib,signal,subprocess
from pathlib import Path
from datetime import datetime,timezone
from uuid import uuid4
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import joblib
from dotenv import load_dotenv
from app.services.storage import create_feedback_store
from ml.training import fit_bundle
from ml.continuous import reviewed_parts,passes_gate
from ml.evaluation.batch import evaluate

def status(store, value=None):
    with store.connect() as db:
        if value is not None:
            value['updated_at']=datetime.now(timezone.utc).isoformat()
            db.execute("INSERT INTO research.settings(key,value_json) VALUES ('learning_state',%s) ON CONFLICT(key) DO UPDATE SET value_json=EXCLUDED.value_json",(json.dumps(value),))
        row=db.execute("SELECT value_json FROM research.settings WHERE key='learning_state'").fetchone()
        return json.loads(row['value_json']) if row else {}

def cycle(store,directory):
    pointer=directory/'active.txt'
    if not pointer.exists():
        status(store,dict(state='waiting_for_model'));return
    csv=store.training_csv()
    fingerprint=hashlib.sha256(csv.encode()).hexdigest()
    previous=status(store)
    if previous.get('review_fingerprint')==fingerprint and previous.get('state') in ('promoted','rejected','no_eligible_reviews'):
        if previous['state']=='promoted' and previous.get('deployment')!='deployed' and os.getenv('AUTO_DEPLOY_VERCEL')=='1':
            previous.update(publish())
        status(store,previous);return
    current_name=pointer.read_text().strip()
    bundle=joblib.load(directory/current_name)
    parts,counts=reviewed_parts(bundle['parts'],csv)
    state=dict(state='training',review_fingerprint=fingerprint,**counts,previous_model=current_name)
    if not counts['included']:
        status(store,{**state,'state':'no_eligible_reviews'});return
    status(store,state)
    # All historical reviewed corrections enter base fitting only; fixed holdouts never change.
    dataset=type('TrainingDataset',(),{'filename':bundle['dataset_file']})()
    candidate=fit_bundle(dataset,seed=bundle['seed'],prepared_parts=parts,train_baselines=False)
    candidate['baselines']=bundle['baselines']
    candidate['baseline_note']='Baselines retained from initial dataset experiment; only experts/meta are continuously retrained.'
    candidate['review_fingerprint']=fingerprint
    before=evaluate(bundle,parts['validation'])
    after=evaluate(candidate,parts['validation'])
    version=str(uuid4())+'.pkl'
    joblib.dump(candidate,directory/version,compress=3)
    accepted=passes_gate(after,before,float(os.getenv('LEARNING_GATE_TOLERANCE','.005')))
    # Refuse to overwrite a newer manual/worker deployment.
    accepted=accepted and pointer.read_text().strip()==current_name
    if accepted:
        tmp=directory/'worker-active.tmp';tmp.write_text(version);tmp.replace(pointer)
    report={**state,'state':'promoted' if accepted else 'rejected','candidate':version,
            'incumbent_validation':before,'candidate_validation':after,
            'note':'Fixed validation gate; test set is never used for recurring selection.'}
    (directory/(version+'.json')).write_text(json.dumps(report,indent=2),encoding='utf-8')
    status(store,report)
    if accepted:
        report.update(publish())
        status(store,report)
    print(json.dumps({'learning_state':report['state'],'included_reviews':counts['included']}),flush=True)

def publish():
    try:
        from scripts.package_vercel import package
        package()
        if os.getenv('AUTO_DEPLOY_VERCEL')!='1':return {'deployment':'prepared_locally'}
        link=ROOT.parent/'.vercel/project.json'
        if not link.is_file():return {'deployment':'needs_existing_project_link'}
        cli=__import__('shutil').which('vercel')
        if cli is None:return {'deployment':'needs_vercel_cli'}
        process=subprocess.run([cli,'deploy','--prod','--yes'],cwd=ROOT.parent,capture_output=True,text=True,timeout=1800)
        return {'deployment':'deployed' if process.returncode==0 else 'failed'}
    except Exception as exc:
        # A publish failure must not discard the trained revision or trigger another full fit.
        return {'deployment':'failed','deployment_error_type':type(exc).__name__}

def main():
    load_dotenv(ROOT/'.env')
    if os.getenv('AUTO_LEARNING')!='1':
        raise SystemExit('Set AUTO_LEARNING=1 to run the review-learning worker')
    if not os.getenv('ADMIN_API_KEY'):
        raise SystemExit('ADMIN_API_KEY is required before enabling automatic review learning')
    store=create_feedback_store(ROOT)
    if not hasattr(store,'_url'):raise SystemExit('Supabase DATABASE_URL is required')
    directory=Path(os.getenv('MODEL_DIR',ROOT/'trained_models'))/'hmeg'
    directory.mkdir(parents=True,exist_ok=True)
    # One worker per shared disk, including process restarts. OS releases lock on a crash.
    from filelock import FileLock
    with FileLock(str(directory/'learning.lock'),timeout=0):
        while True:
            try:cycle(store,directory)
            except Exception as exc:
                # Never log database URLs, review contents or raw exception messages.
                print(json.dumps({'worker_error':type(exc).__name__}),flush=True)
                try:status(store,dict(state='error',error_type=type(exc).__name__))
                except Exception:pass
            time.sleep(max(60,int(os.getenv('LEARNING_INTERVAL_SECONDS','3600'))))

if __name__=='__main__':main()
