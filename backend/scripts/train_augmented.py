"""Train the supplied augmented dataset and evaluate before atomic activation."""
import sys,json,os,hashlib
from pathlib import Path
from uuid import uuid4
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import joblib
from dotenv import load_dotenv
from app.services.dataset import DatasetService
from ml.training import fit_bundle
from ml.evaluation.batch import evaluate

def main():
    load_dotenv(ROOT/'.env')
    dataset=DatasetService(ROOT/'data')
    directory=Path(os.getenv('MODEL_DIR',ROOT/'trained_models'))/'hmeg'
    directory.mkdir(parents=True,exist_ok=True)
    bundle=fit_bundle(dataset)
    version=str(uuid4())
    target=directory/(version+'.pkl')
    joblib.dump(bundle,target,compress=3)
    print('Evaluating candidate validation partition',flush=True)
    validation=evaluate(bundle,bundle['parts']['validation'])
    # Initial augmented-data run must beat a non-informative classifier in both F1 and recall.
    eligible=validation['f1']>=.65 and validation['recall']>=.65 and validation['fpr']<=.25
    report=dict(version=version,dataset=dataset.filename,dataset_sha256=hashlib.sha256(Path(os.environ['DATASET_FILE']).read_bytes()).hexdigest(),
        created_at=datetime.now(timezone.utc).isoformat(),validation=validation,activated=eligible,
        partition_counts={k:len(v) for k,v in bundle['parts'].items()},unavailable=bundle['unavailable'],
        synthetic_rows=int(dataset.frame.is_synthetic.astype(int).sum()),training_time=bundle['training_time'])
    if eligible:
        temp=directory/'active.tmp';temp.write_text(target.name);temp.replace(directory/'active.txt')
    print('Evaluating untouched test partition (not used for activation)',flush=True)
    report['test']=evaluate(bundle,bundle['parts']['test'])
    originals=bundle['parts']['test'];originals=originals[originals.is_synthetic.astype(int)==0]
    report['original_only_test']=evaluate(bundle,originals) if len(originals) else None
    report_path=ROOT/'data'/'augmented_training_report.json'
    report_path.write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report,indent=2),flush=True)

if __name__=='__main__':main()
