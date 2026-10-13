import os
import secrets
from starlette.responses import JSONResponse
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes.api import router
from .models.predictor import Predictor
from .services.dataset import DatasetService
from .services.storage import create_feedback_store
from .services.experiments import ExperimentStore
from .services.research import ResearchService
from .routes.research import router as research_router
from .routes.learning import router as learning_router

ROOT = Path(__file__).resolve().parents[1]

@asynccontextmanager
async def lifespan(app):
    if os.getenv('VERCEL') == '1' and not os.getenv('ADMIN_API_KEY', '').strip():
        raise RuntimeError('Set backend ADMIN_API_KEY before deploying: research history and reviews require protection.')
    if os.getenv('AUTO_LEARNING')=='1' and not os.getenv('ADMIN_API_KEY'):
        raise RuntimeError('ADMIN_API_KEY must be set when automatic learning is enabled')
    deployed=ROOT/'deployment'
    default_model_dir=deployed/'models' if os.getenv('VERCEL')=='1' else ROOT/'trained_models'
    default_data_dir=deployed/'data' if os.getenv('VERCEL')=='1' else ROOT/'data'
    app.state.model_dir = Path(os.getenv('MODEL_DIR', default_model_dir))
    if os.getenv('VERCEL') == '1':
        pointer = app.state.model_dir / 'hmeg' / 'active.txt'
        if not pointer.is_file():
            raise RuntimeError('Missing trained deployment package. Run scripts/package_vercel.py before deploying this checkout.')
        name = pointer.read_text().strip()
        if Path(name).name != name or not (pointer.parent / name).is_file():
            raise RuntimeError('Invalid or missing deployed HMEG artifact.')
    app.state.predictor = Predictor(app.state.model_dir)
    app.state.dataset = DatasetService(Path(os.getenv('DATA_DIR', default_data_dir)))
    app.state.feedback = create_feedback_store(ROOT)
    app.state.research = ResearchService(app.state.dataset, app.state.model_dir,
                                        ExperimentStore(ROOT, app.state.feedback))
    if os.getenv('VERCEL') == '1' and app.state.research.bundle is None:
        raise RuntimeError(app.state.research.load_error or 'Deployed HMEG artifact did not load.')
    yield

app = FastAPI(title='Jailbreak Detection Research API', version='1.0.0', lifespan=lifespan,
              docs_url='/api/docs', redoc_url='/api/redoc', openapi_url='/api/openapi.json')
@app.middleware('http')
async def protect_research_writes(request,call_next):
    path=request.url.path
    protected=(path.startswith(('/api/feedback','/api/training/','/api/train/','/api/evaluate/')) or
               (request.method=='PUT' and path=='/api/routing/config'))
    secret=os.getenv('ADMIN_API_KEY','')
    if request.method!='OPTIONS' and protected and secret and not secrets.compare_digest(request.headers.get('X-Admin-Key',''),secret):
        return JSONResponse({'detail':'Researcher access required. Enter your admin key in Researcher access.'},status_code=401)
    return await call_next(request)

app.add_middleware(CORSMiddleware, allow_origins=os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(','), allow_methods=['GET', 'POST', 'PUT'], allow_headers=['Content-Type','X-Admin-Key'])
app.include_router(router)
app.include_router(research_router)
app.include_router(learning_router)
