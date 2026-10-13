"""Idempotent SQLite -> Supabase import. Never deletes or renumbers source records."""
import argparse
import hashlib
import json
import os
import sqlite3
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from app.services.postgres_feedback import PostgresFeedbackStore
from dotenv import load_dotenv

def snapshot(path):
    if not path.is_file():
        raise ValueError('SQLite source file does not exist')
    with sqlite3.connect(path.resolve().as_uri()+'?mode=ro',uri=True) as db:
        db.row_factory = sqlite3.Row
        db.execute('BEGIN')
        return {name:[dict(r) for r in db.execute('SELECT * FROM '+name)]
                for name in ('analyses','reviews','review_audit')}

def migrate(rows, store, source_id):
    imported = dict(analyses=0,reviews=0,review_audit=0)
    with store.connect() as db:
        db.execute('SELECT pg_advisory_xact_lock(hashtext(%s))',(source_id,))
        for kind in imported:
            for row in rows[kind]:
                source_key = str(row['id']) if kind!='reviews' else row['prompt_key']+':'+row['reviewed_at']
                exists = db.execute('''SELECT 1 FROM research.imported_records
                    WHERE source_id=%s AND kind=%s AND source_record_id=%s''',(source_id,kind,source_key)).fetchone()
                if exists:
                    continue
                new_id = None
                if kind=='analyses':
                    new_id = db.execute('''INSERT INTO research.analyses (prompt_key,created_at,result_json)
                        VALUES (%s,%s,%s) RETURNING id''',
                        (row['prompt_key'],row['created_at'],row['result_json'])).fetchone()['id']
                elif kind=='reviews':
                    # Keep any newer destination review. Historical changes still migrate to audit.
                    db.execute('''INSERT INTO research.reviews (prompt_key,label,category,reviewed_at)
                        VALUES (%s,%s,%s,%s) ON CONFLICT(prompt_key) DO UPDATE SET label=EXCLUDED.label,
                        category=EXCLUDED.category,reviewed_at=EXCLUDED.reviewed_at
                        WHERE EXCLUDED.reviewed_at > research.reviews.reviewed_at''',
                        (row['prompt_key'],row['label'],row['category'],row['reviewed_at']))
                else:
                    new_id = db.execute('''INSERT INTO research.review_audit (prompt_key,label,category,reviewed_at)
                        VALUES (%s,%s,%s,%s) RETURNING id''',
                        (row['prompt_key'],row['label'],row['category'],row['reviewed_at'])).fetchone()['id']
                db.execute('''INSERT INTO research.imported_records
                    (source_id,kind,source_record_id,destination_id) VALUES (%s,%s,%s,%s)''',
                    (source_id,kind,source_key,new_id))
                imported[kind]+=1
    return imported

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--sqlite',type=Path,default=Path('data/feedback.sqlite3'))
    parser.add_argument('--source-id',required=True,help='Stable name for this original database; reuse on retries')
    parser.add_argument('--apply',action='store_true')
    args=parser.parse_args()
    load_dotenv(Path(__file__).resolve().parents[1]/'.env', override=False)
    rows=snapshot(args.sqlite)
    print(json.dumps({'source_counts':{k:len(v) for k,v in rows.items()},'mode':'apply' if args.apply else 'dry-run'}))
    if args.apply:
        url=os.getenv('DATABASE_URL')
        if not url:
            parser.error('Set DATABASE_URL securely in your environment first')
        try:
            print(json.dumps({'imported':migrate(rows,PostgresFeedbackStore(url),args.source_id)}))
        except Exception:
            sys.exit('Migration rolled back. Check Supabase connectivity, permissions and migrations 001/002; credentials were not printed.')

