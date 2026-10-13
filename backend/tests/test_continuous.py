import io
from types import SimpleNamespace
import pandas as pd
import numpy as np
import pytest
from ml.continuous import reviewed_parts,passes_gate
from ml.evaluation.data import key,split,partitions
from ml.evaluation.batch import probabilities
from ml.ensemble.router import RoutingConfig

def frame(prompts):
    return pd.DataFrame({'prompt':prompts,'label':[i%2 for i in range(len(prompts))],
        'source':['original']*len(prompts),'_key':[key(p) for p in prompts]})

def test_reviews_cannot_enter_meta_validation_test():
    parts={name:frame([name+' benign',name+' jailbreak']) for name in ('base','meta','validation','test')}
    csv='prompt,label,class_name,source,category\nnew reviewed,1,jailbreak,Interactive reviewed,instruction\nmeta benign,1,jailbreak,Interactive reviewed,instruction\ntest benign,0,benign,Interactive reviewed,benign\nbase benign,1,jailbreak,Interactive reviewed,instruction\n'
    updated,counts=reviewed_parts(parts,csv)
    assert counts=={'reviewed':4,'included':2,'excluded_holdout':2}
    assert updated['base'].loc[updated['base'].prompt=='base benign','label'].tolist()==[1]
    assert len(updated['base'])==3
    for name in ('meta','validation','test'):pd.testing.assert_frame_equal(parts[name],updated[name])

def test_parent_families_do_not_cross_base_meta():
    f=frame([f'prompt {i}' for i in range(80)])
    f['_group']=[str(i//4) for i in range(80)]
    a,b=split(f,.25,42)
    assert set(a._group).isdisjoint(set(b._group))

def test_validation_gate_rejects_regression():
    incumbent=dict(f1=.9,recall=.9,fpr=.05)
    assert passes_gate(dict(f1=.91,recall=.92,fpr=.04),incumbent)
    assert not passes_gate(dict(f1=.91,recall=.80,fpr=.04),incumbent)
    assert not passes_gate(dict(f1=.91,recall=.92,fpr=.10),incumbent)

def test_batch_early_exit_respects_router_not_fusion_threshold():
    class Expert:
        def probabilities(self,p):return np.array([.8]*len(p))
    b={'experts':{'lexical':Expert(),'obfuscation':Expert()},'metas':{'m':None},'preferred_meta':'m'}
    rows,routed=probabilities(b,['probe'],RoutingConfig(.2,.8,.5,.95))
    assert rows==[(.8,1)] and routed==[False]

def test_admin_middleware_rejects_review_without_changing_data(monkeypatch):
    from fastapi.testclient import TestClient
    from app.main import app
    monkeypatch.setenv('ADMIN_API_KEY','test-only-key')
    client=TestClient(app)
    response=client.post('/api/feedback/1',json={'label':0,'category':'benign'})
    assert response.status_code==401
