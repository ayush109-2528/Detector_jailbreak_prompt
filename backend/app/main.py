import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes.api import router
from .models.predictor import Predictor
from .services.dataset import DatasetService
from .services.storage import create_feedback_store

ROOT = Path(__file__).resolve().parents[1]

@asynccontextmanager
async def lifespan(app):
    app.state.model_dir = Path(os.getenv('MODEL_DIR', ROOT / 'trained_models'))
    app.state.predictor = Predictor(app.state.model_dir)
    app.state.dataset = DatasetService(Path(os.getenv('DATA_DIR', ROOT / 'data')))
    app.state.feedback = create_feedback_store(ROOT)
    yield

app = FastAPI(title='Jailbreak Detection Research API', version='1.0.0', lifespan=lifespan,
              docs_url='/api/docs', redoc_url='/api/redoc', openapi_url='/api/openapi.json')
app.add_middleware(CORSMiddleware, allow_origins=os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(','), allow_methods=['GET', 'POST'], allow_headers=['Content-Type'])
app.include_router(router)
