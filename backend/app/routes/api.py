from fastapi import APIRouter, Query, Request, HTTPException
from ..schemas.prediction import PredictionRequest
from ..services.results import results
from ..schemas.feedback import FeedbackRequest
from fastapi.responses import Response

router = APIRouter(prefix='/api')

@router.get('/experts')
def experts(request: Request):
    return request.app.state.predictor.catalog()

@router.get('/health')
def health(request: Request):
    p = request.app.state.predictor
    return {'status': 'ok', 'demo_mode': p.demo_mode, 'mode_note': p.reason}

@router.get('/dataset/stats')
def stats(request: Request):
    return request.app.state.dataset.stats()

@router.get('/dataset/samples')
def samples(request: Request, page: int = Query(1, ge=1), page_size: int = Query(8, ge=1, le=100), search: str = '', label: int | None = Query(None, ge=0, le=1), source: str = '', category: str = ''):
    return request.app.state.dataset.samples(page, page_size, search, label, source, category)

@router.get('/models')
@router.get('/models/metrics')
def metrics(request: Request):
    try:
        return results(request.app.state.model_dir)
    except (ValueError, TypeError, AttributeError, OSError) as exc:
        raise HTTPException(status_code=503, detail='Evaluation metrics could not be loaded. Check metrics.json values, provenance, timing, and 2 by 2 confusion matrices.') from exc

@router.post('/predict')
@router.post('/predict/detailed')
def predict(body: PredictionRequest, request: Request):
    try:
        result = request.app.state.predictor.predict(body.prompt, body.strategy, body.threshold)
    except Exception as exc:
        raise HTTPException(status_code=503, detail='Model inference failed. Check the trusted model artifacts and vectorizer compatibility.') from exc
    try:
        result['analysis_id'] = request.app.state.feedback.record(result)
    except Exception as exc:
        raise HTTPException(status_code=503, detail='Could not save the analysis. Check the configured feedback database and schema before retrying.') from exc
    return result


@router.get('/feedback')
def feedback_history(request: Request, page: int = Query(1, ge=1), page_size: int = Query(8, ge=1, le=100)):
    return request.app.state.feedback.history(page, page_size)


@router.post('/feedback/{analysis_id}')
def review(analysis_id: int, body: FeedbackRequest, request: Request):
    if not request.app.state.feedback.review(analysis_id, body.label, body.category):
        raise HTTPException(status_code=404, detail='Analysis not found')
    return {'saved': True, 'analysis_id': analysis_id, 'label': body.label, 'category': body.category}


@router.get('/training/examples.csv')
def training_examples(request: Request):
    return Response(request.app.state.feedback.training_csv(), media_type='text/csv',
                    headers={'Content-Disposition': 'attachment; filename="reviewed_training_examples.csv"'})
