"""Prepare compact inference artifacts for the EXISTING Vercel multi-service project."""
import os,sys,json,gzip,shutil,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import joblib
from dotenv import load_dotenv

def package():
    load_dotenv(ROOT/'.env')
    source=Path(os.getenv('MODEL_DIR',ROOT/'trained_models'))/'hmeg'
    name=(source/'active.txt').read_text().strip()
    if Path(name).name!=name:raise ValueError('Invalid model pointer')
    bundle=joblib.load(source/name)
    # No training partitions, calibration rows or comparison baselines in the function.
    runtime={key:bundle[key] for key in ('experts','metas','unavailable','preferred_meta','dataset_file','seed')}
    runtime['model_version']=name
    target=ROOT/'deployment';models=target/'models/hmeg';data=target/'data'
    models.mkdir(parents=True,exist_ok=True);data.mkdir(parents=True,exist_ok=True)
    temp=models/'runtime.tmp';joblib.dump(runtime,temp,compress=3);temp.replace(models/'runtime.pkl')
    (models/'active.txt').write_text('runtime.pkl')
    dataset=Path(os.environ['DATASET_FILE'])
    # Compress the dataset for the explorer; avoid re-copying it after every reviewed update.
    csv=data/'HMEG_300K_Augmented_Dataset.csv.gz'
    dataset_digest=hashlib.sha256(dataset.read_bytes()).hexdigest()
    digest_path=data/'dataset.sha256'
    if not csv.exists() or not digest_path.exists() or digest_path.read_text()!=dataset_digest:
        with dataset.open('rb') as inp,gzip.open(csv.with_suffix('.tmp'),'wb') as out:shutil.copyfileobj(inp,out)
        csv.with_suffix('.tmp').replace(csv);digest_path.write_text(dataset_digest)
    report=ROOT/'data/augmented_training_report.json'
    if report.exists():shutil.copy2(report,data/report.name)
    manifest=dict(model_version=name,dataset_sha256=dataset_digest,
        files={str(p.relative_to(target)):dict(bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in target.rglob('*') if p.is_file() and p.name!='manifest.json'})
    (target/'manifest.json').write_text(json.dumps(manifest,indent=2))
    print(json.dumps({'model_version':name,'deployment_asset_bytes':sum(x['bytes'] for x in manifest['files'].values())}),flush=True)
    return manifest

if __name__=='__main__':package()
