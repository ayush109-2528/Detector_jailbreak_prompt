"""Local JSON or Supabase experiment persistence; artifacts remain trusted local files."""
import json
import os
from pathlib import Path
from uuid import uuid4

class ExperimentStore:
    def __init__(self, root, feedback):
        self.directory = Path(os.getenv('EXPERIMENT_DIR', root/'data'/'experiments'))
        self.feedback = feedback
        self.postgres = hasattr(feedback, '_url')
    def put(self, record):
        if self.postgres:
            with self.feedback.connect() as db:
                db.execute('INSERT INTO research.experiments (experiment_id, result_json) VALUES (%s,%s)',
                           (record['experiment_id'], json.dumps(record, allow_nan=False)))
        else:
            self.directory.mkdir(parents=True,exist_ok=True)
            target = self.directory/(record['experiment_id']+'.json')
            temp = target.with_suffix('.tmp')
            temp.write_text(json.dumps(record,allow_nan=False),encoding='utf-8')
            temp.replace(target)
        return record
    def list(self):
        if self.postgres:
            with self.feedback.connect() as db:
                return [json.loads(r['result_json']) for r in db.execute(
                    'SELECT result_json FROM research.experiments ORDER BY created_at DESC LIMIT 300').fetchall()]
        if not self.directory.exists():
            return []
        return sorted([json.loads(p.read_text(encoding='utf-8')) for p in self.directory.glob('*.json')],
                      key=lambda r:r['timestamp'],reverse=True)[:300]
    def config(self, value=None):
        if self.postgres:
            with self.feedback.connect() as db:
                if value is not None:
                    db.execute("""INSERT INTO research.settings (key,value_json) VALUES ('routing',%s)
                        ON CONFLICT(key) DO UPDATE SET value_json=EXCLUDED.value_json""",(json.dumps(value),))
                row = db.execute("SELECT value_json FROM research.settings WHERE key='routing'").fetchone()
                return json.loads(row['value_json']) if row else None
        path = self.directory.parent/'routing_config.json'
        if value is not None:
            path.parent.mkdir(parents=True,exist_ok=True)
            temp = path.with_suffix('.'+uuid4().hex+'.tmp')
            temp.write_text(json.dumps(value),encoding='utf-8')
            temp.replace(path)
        return json.loads(path.read_text(encoding='utf-8')) if path.exists() else None

