"""Reproducible local research runner using the same services as the dashboard."""
import argparse
import json
import os
import sys
from pathlib import Path
from uuid import uuid4
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from app.services.dataset import DatasetService
from app.services.storage import create_feedback_store
from app.services.experiments import ExperimentStore
from app.services.research import ResearchService

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--train',action='store_true')
    parser.add_argument('--evaluate',choices=['comparison','routing','ablation','ood'])
    parser.add_argument('--partition',choices=['test','validation'],default='test')
    parser.add_argument('--sources',nargs='+')
    parser.add_argument('--held-out')
    parser.add_argument('--seed',type=int,default=42)
    args=parser.parse_args()
    service=ResearchService(DatasetService(Path(os.getenv('DATA_DIR',ROOT/'data'))),
        Path(os.getenv('MODEL_DIR',ROOT/'trained_models')),
        ExperimentStore(ROOT,create_feedback_store(ROOT)))
    service.run_id=str(uuid4())
    if args.train:
        print(json.dumps(service.train(args.sources,args.seed),indent=2))
    if args.evaluate:
        if args.evaluate=='routing':
            rows=service.routing([(.1,.9),(.2,.8),(.3,.7)])
        elif args.evaluate=='ablation':
            rows=service.ablation(args.partition)
        elif args.evaluate=='ood':
            rows=service.ood(args.sources,args.held_out,args.seed)
        else:
            rows=service.compare(part=args.partition)
        print(json.dumps({'run_id':service.run_id,'records':len(rows),
            'models':[{'name':r['model_name'],'f1':r['metrics']['f1'],'samples':r['samples']} for r in rows]},indent=2))

if __name__=='__main__':
    main()
