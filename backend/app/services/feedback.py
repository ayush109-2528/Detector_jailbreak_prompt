"""Persist experiments separately from reviewed training examples."""
import csv
import hashlib
import io
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from ..models.preprocessing import preprocess


class FeedbackStore:
    def __init__(self, path: Path):
        self.path = path
        path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.executescript('''
                CREATE TABLE IF NOT EXISTS analyses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    prompt_key TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    result_json TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS reviews (
                    prompt_key TEXT PRIMARY KEY,
                    label INTEGER NOT NULL CHECK(label IN (0, 1)),
                    category TEXT NOT NULL,
                    reviewed_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS review_audit (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    prompt_key TEXT NOT NULL,
                    label INTEGER NOT NULL,
                    category TEXT NOT NULL,
                    reviewed_at TEXT NOT NULL
                );
            ''')

    def connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        db.row_factory = sqlite3.Row
        return db

    def record(self, result):
        key = hashlib.sha256(preprocess(result['prompt']).encode('utf-8')).hexdigest()
        with self.connect() as db:
            cursor = db.execute(
                'INSERT INTO analyses(prompt_key, created_at, result_json) VALUES (?, ?, ?)',
                (key, datetime.now(timezone.utc).isoformat(), json.dumps(result)),
            )
            return cursor.lastrowid

    def history(self, page=1, page_size=8):
        with self.connect() as db:
            total = db.execute('SELECT COUNT(*) FROM analyses').fetchone()[0]
            reviewed = db.execute('SELECT COUNT(*) FROM reviews').fetchone()[0]
            unique = db.execute('SELECT COUNT(DISTINCT prompt_key) FROM analyses').fetchone()[0]
            rows = db.execute('''
                SELECT a.*, r.label AS reviewed_label, r.category AS reviewed_category
                FROM analyses a LEFT JOIN reviews r USING(prompt_key)
                ORDER BY a.id DESC LIMIT ? OFFSET ?
            ''', (page_size, (page-1)*page_size)).fetchall()
        return {'items': [dict(json.loads(r['result_json']), analysis_id=r['id'],
                               created_at=r['created_at'], reviewed_label=r['reviewed_label'],
                               reviewed_category=r['reviewed_category']) for r in rows],
                'total': total, 'unique_prompts': unique, 'reviewed_prompts': reviewed,
                'pending_prompts': unique-reviewed, 'page': page, 'page_size': page_size}

    def review(self, analysis_id, label, category):
        with self.connect() as db:
            row = db.execute('SELECT prompt_key FROM analyses WHERE id=?', (analysis_id,)).fetchone()
            if row is None:
                return False
            values = (row['prompt_key'], label, category, datetime.now(timezone.utc).isoformat())
            db.execute('INSERT OR REPLACE INTO reviews VALUES (?, ?, ?, ?)', values)
            db.execute('INSERT INTO review_audit(prompt_key,label,category,reviewed_at) VALUES (?, ?, ?, ?)', values)
        return True

    def training_csv(self):
        # One row per normalized prompt. Predictions never become target labels.
        with self.connect() as db:
            rows = db.execute('''
                SELECT a.result_json, r.label, r.category FROM analyses a
                JOIN reviews r USING(prompt_key)
                WHERE a.id=(SELECT MIN(b.id) FROM analyses b WHERE b.prompt_key=a.prompt_key)
                ORDER BY a.id
            ''').fetchall()
        output = io.StringIO(newline='')
        writer = csv.writer(output)
        writer.writerow(['prompt','label','class_name','source','category'])
        for row in rows:
            writer.writerow([json.loads(row['result_json'])['prompt'], row['label'],
                             'jailbreak' if row['label'] else 'benign', 'Interactive reviewed', row['category']])
        return output.getvalue()
