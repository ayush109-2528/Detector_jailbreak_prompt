"""Supabase PostgreSQL storage; schema is installed separately by an administrator."""
import csv
import hashlib
import io
import json
from datetime import datetime, timezone

from ..models.preprocessing import preprocess


class PostgresFeedbackStore:
    def __init__(self, url):
        if not url.startswith(('postgresql://', 'postgres://')):
            raise ValueError('DATABASE_URL must be a PostgreSQL connection URL from Supabase Connect '
                             '(Transaction pooler), not the HTTPS project URL or anon key. '
                             'Store the HTTPS URL separately as SUPABASE_URL.')
        self._url = url

    def connect(self):
        import psycopg
        from psycopg.rows import dict_row
        # Supabase transaction pooler does not support prepared statements.
        # Context-managed connections commit/rollback and close after each operation.
        return psycopg.connect(self._url, row_factory=dict_row, prepare_threshold=None,
                               connect_timeout=10, sslmode='require')

    def record(self, result):
        key = hashlib.sha256(preprocess(result['prompt']).encode('utf-8')).hexdigest()
        with self.connect() as db:
            row = db.execute('''INSERT INTO research.analyses
                (prompt_key, created_at, result_json) VALUES (%s, %s, %s) RETURNING id''',
                (key, datetime.now(timezone.utc).isoformat(), json.dumps(result))).fetchone()
            return row['id']

    def history(self, page=1, page_size=8):
        with self.connect() as db:
            counts = db.execute('''SELECT COUNT(*) AS total,
                COUNT(DISTINCT prompt_key) AS unique_prompts,
                (SELECT COUNT(*) FROM research.reviews) AS reviewed_prompts
                FROM research.analyses''').fetchone()
            rows = db.execute('''SELECT a.*, r.label AS reviewed_label,
                r.category AS reviewed_category FROM research.analyses a
                LEFT JOIN research.reviews r USING(prompt_key)
                ORDER BY a.id DESC LIMIT %s OFFSET %s''',
                (page_size, (page - 1) * page_size)).fetchall()
        return {**counts, 'pending_prompts': counts['unique_prompts'] - counts['reviewed_prompts'],
                'page': page, 'page_size': page_size,
                'items': [dict(json.loads(r['result_json']), analysis_id=r['id'],
                              created_at=r['created_at'], reviewed_label=r['reviewed_label'],
                              reviewed_category=r['reviewed_category']) for r in rows]}

    def review(self, analysis_id, label, category):
        with self.connect() as db:
            row = db.execute('SELECT prompt_key FROM research.analyses WHERE id=%s',
                             (analysis_id,)).fetchone()
            if row is None:
                return False
            values = (row['prompt_key'], label, category, datetime.now(timezone.utc).isoformat())
            db.execute('''INSERT INTO research.reviews (prompt_key, label, category, reviewed_at)
                VALUES (%s, %s, %s, %s) ON CONFLICT (prompt_key) DO UPDATE SET
                label=EXCLUDED.label, category=EXCLUDED.category,
                reviewed_at=EXCLUDED.reviewed_at''', values)
            db.execute('''INSERT INTO research.review_audit
                (prompt_key, label, category, reviewed_at) VALUES (%s, %s, %s, %s)''', values)
        return True

    def training_csv(self):
        with self.connect() as db:
            rows = db.execute('''SELECT a.result_json, r.label, r.category
                FROM research.analyses a JOIN research.reviews r USING(prompt_key)
                WHERE a.id=(SELECT MIN(b.id) FROM research.analyses b
                            WHERE b.prompt_key=a.prompt_key) ORDER BY a.id''').fetchall()
        output = io.StringIO(newline='')
        writer = csv.writer(output)
        writer.writerow(['prompt', 'label', 'class_name', 'source', 'category'])
        for row in rows:
            writer.writerow([json.loads(row['result_json'])['prompt'], row['label'],
                             'jailbreak' if row['label'] else 'benign',
                             'Interactive reviewed', row['category']])
        return output.getvalue()
