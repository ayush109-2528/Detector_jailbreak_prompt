import pytest
from app.services.storage import create_feedback_store
from app.services.feedback import FeedbackStore
from app.services.postgres_feedback import PostgresFeedbackStore


def test_local_sqlite_remains_available(monkeypatch, tmp_path):
    monkeypatch.delenv('DATABASE_URL', raising=False)
    monkeypatch.delenv('VERCEL', raising=False)
    monkeypatch.setenv('FEEDBACK_DB', str(tmp_path / 'feedback.sqlite3'))
    assert isinstance(create_feedback_store(tmp_path), FeedbackStore)


@pytest.mark.parametrize('environment', ['production', 'preview'])
def test_hosted_storage_never_silently_falls_back(monkeypatch, tmp_path, environment):
    monkeypatch.delenv('DATABASE_URL', raising=False)
    monkeypatch.setenv('VERCEL', '1')
    monkeypatch.setenv('VERCEL_ENV', environment)
    with pytest.raises(RuntimeError, match='DATABASE_URL'):
        create_feedback_store(tmp_path)
    assert not (tmp_path / 'data').exists()


def test_database_url_selects_postgres_without_writing_disk(monkeypatch, tmp_path):
    monkeypatch.setenv('DATABASE_URL', 'postgresql://example.invalid/research')
    assert isinstance(create_feedback_store(tmp_path), PostgresFeedbackStore)
    assert not (tmp_path / 'data').exists()


def test_invalid_database_url_does_not_expose_secret(monkeypatch, tmp_path):
    monkeypatch.setenv('DATABASE_URL', 'https://private-password@example.invalid')
    with pytest.raises(ValueError) as exc:
        create_feedback_store(tmp_path)
    assert 'private-password' not in str(exc.value)
