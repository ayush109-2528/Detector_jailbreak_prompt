import json,os
from pathlib import Path
from fastapi import APIRouter,Request
router=APIRouter(prefix='/api')

@router.get('/learning/dataset-report')
def dataset_report():
    root=Path(__file__).resolve().parents[2]
    default=root/'deployment/data' if os.getenv('VERCEL')=='1' else root/'data'
    path=Path(os.getenv('DATA_DIR',default))/'augmented_training_report.json'
    return {'report':json.loads(path.read_text(encoding='utf-8')) if path.exists() else None}

@router.get('/learning/status')
def learning_status(request:Request):
    store=request.app.state.feedback
    state={}
    if hasattr(store,'_url'):
        with store.connect() as db:
            row=db.execute("SELECT value_json FROM research.settings WHERE key='learning_state'").fetchone()
            state=json.loads(row['value_json']) if row else {}
    return {'enabled':os.getenv('AUTO_LEARNING')=='1' or bool(state),'state':state.get('state','not_started'),
        'deployment':state.get('deployment','not_prepared'),
        'updated_at':state.get('updated_at'),'included':state.get('included',0),
        'excluded_holdout':state.get('excluded_holdout',0),
        'interval_seconds':int(os.getenv('LEARNING_INTERVAL_SECONDS','3600')),
        'policy':'Human-reviewed labels only; fixed validation gate before promotion; no test-set learning.'}
