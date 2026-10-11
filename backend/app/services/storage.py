"""Select durable hosted storage without silently falling back to local disk."""
import os
from pathlib import Path
from .feedback import FeedbackStore
from .postgres_feedback import PostgresFeedbackStore


def create_feedback_store(root: Path):
    database_url = os.getenv('DATABASE_URL', '').strip()
    if database_url:
        return PostgresFeedbackStore(database_url)
    if os.getenv('VERCEL') == '1' and os.getenv('VERCEL_ENV') in ('production', 'preview'):
        raise RuntimeError('Set backend DATABASE_URL and run the Supabase feedback migration before deployment.')
    return FeedbackStore(Path(os.getenv('FEEDBACK_DB', root / 'data' / 'feedback.sqlite3')))
