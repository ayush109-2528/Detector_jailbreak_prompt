import pytest
from fastapi.testclient import TestClient
from app.main import app


def test_vercel_requires_research_key(monkeypatch):
    monkeypatch.setenv('VERCEL', '1')
    monkeypatch.delenv('ADMIN_API_KEY', raising=False)
    with pytest.raises(RuntimeError, match='ADMIN_API_KEY'):
        with TestClient(app):
            pass


def test_vercel_requires_prepared_model(monkeypatch, tmp_path):
    monkeypatch.setenv('VERCEL', '1')
    monkeypatch.setenv('ADMIN_API_KEY', 'test-only')
    monkeypatch.setenv('MODEL_DIR', str(tmp_path))
    with pytest.raises(RuntimeError, match='Missing trained deployment package'):
        with TestClient(app):
            pass
