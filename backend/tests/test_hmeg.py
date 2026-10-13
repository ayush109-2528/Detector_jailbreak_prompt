from types import SimpleNamespace
from pathlib import Path
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from app.main import app
from ml.ensemble.hmeg import HMEG
from ml.ensemble.router import RoutingConfig, route
from ml.evaluation.data import partitions
from ml.experts.features import StructuralFeatures, PerplexityFeatures

class Constant:
    def __init__(self, score):
        self.value, self.calls = score, 0
    def score(self,prompt):
        self.calls+=1
        return self.value

class Meta:
    def __init__(self):
        self.calls=0
    def score(self,scores):
        self.calls+=1
        assert len(scores)==5
        return .9

@pytest.mark.parametrize('score,label',[(.2,0),(.8,1)])
def test_boundary_early_exit_skips_deeper_experts(score,label):
    experts={k:Constant(score) for k in ('lexical','obfuscation','semantic','anomaly','instruction')}
    meta=Meta()
    result=HMEG(experts,meta,RoutingConfig(.2,.8)).predict('probe')
    assert result['decision_layer']==1 and result['label']==label
    assert result['experts_executed']==2 and not result['routed_to_layer_2']
    assert meta.calls==0
    for key in ('semantic','anomaly','instruction'):
        assert experts[key].calls==0
        row=next(e for e in result['experts'] if e['key']==key)
        assert row['score'] is None and row['status']=='skipped'

def test_uncertain_runs_deeper_then_meta_and_flat_always_executes_all():
    experts={k:Constant(.5) for k in ('lexical','obfuscation','semantic','anomaly','instruction')}
    meta=Meta()
    result=HMEG(experts,meta).predict('probe')
    assert result['decision_layer']==3 and result['final_probability']==.9
    assert result['experts_executed']==5 and meta.calls==1
    for e in experts.values():
        e.value=.01
    result=HMEG(experts,meta).predict('probe',flat=True,fusion='average_probability')
    assert result['experts_executed']==5 and result['routed_to_layer_2']
    assert result['final_probability']==pytest.approx(.01)

@pytest.mark.parametrize('low,high',[(.8,.2),(.5,.5),(float('nan'),.8),(-.1,.8)])
def test_invalid_router(low,high):
    with pytest.raises(ValueError):
        RoutingConfig(low,high)

def test_raw_statistics_preserve_obfuscation_signals_without_lm():
    features=StructuralFeatures().transform(['ABC 123 !!!','abc'])
    assert features.shape==(2,16)
    assert features[0,7]>features[1,7] and features[0,6]>features[1,6]
    assert PerplexityFeatures().transform(['no language model']).shape==(1,16)
    assert PerplexityFeatures(lambda _:2).transform(['probe']).shape==(1,17)

def test_duplicates_cannot_cross_recorded_splits():
    frame=pd.DataFrame([{'prompt':'duplicate','label':0,'source':'a','split':'train'},
                        {'prompt':'DUPLICATE','label':0,'source':'a','split':'test'}])
    with pytest.raises(ValueError,match='crosses'):
        partitions(SimpleNamespace(frame=frame,demo_mode=False))

def test_ood_source_and_normalized_prompt_leakage_excluded():
    rows=[dict(prompt=f'{"benign" if i%2==0 else "attack"} unique item {i}',label=i%2,source='train')
          for i in range(80)]
    rows += [dict(prompt=f'heldout example {i}',label=i%2,source='ood') for i in range(20)]
    rows += [dict(prompt='heldout example 0',label=0,source='train')]
    result=partitions(SimpleNamespace(frame=pd.DataFrame(rows),demo_mode=False),['train'],'ood')
    test_keys=set(result['test']._key)
    for part in ('base','meta','validation'):
        assert set(result[part].source)=={'train'}
        assert not test_keys.intersection(result[part]._key)

def test_api_research_validation_and_saved_demo_trace(monkeypatch,tmp_path):
    monkeypatch.setenv('FEEDBACK_DB',str(tmp_path/'feedback.sqlite3'))
    monkeypatch.setenv('EXPERIMENT_DIR',str(tmp_path/'experiments'))
    monkeypatch.setenv('MODEL_DIR',str(tmp_path/'models'))
    with TestClient(app) as client:
        assert client.put('/api/routing/config',json={'low_threshold':.9,'high_threshold':.1}).status_code==422
        assert client.put('/api/routing/config',json={'low_threshold':.1,'high_threshold':.9}).status_code==200
        assert client.get('/api/routing/config').json()['low_threshold']==.1
        result=client.post('/api/predict/hmeg',json={'prompt':'Explain clouds','routing':{'low_threshold':.2,'high_threshold':.8}}).json()
        assert result['decision_layer']==1 and result['demo_mode']
        assert result['analysis_id']>0
        assert client.get('/api/feedback').json()['items'][0]['experts'][2]['score'] is None
        assert client.post('/api/predict/hmeg',json={'prompt':'probe','mode':'trained'}).status_code==422
        assert client.post('/api/predict/hmeg',json={'prompt':'   '}).status_code==422
        assert client.post('/api/predict/expert/unknown',json={'prompt':'probe'}).status_code==422
        assert client.post('/api/evaluate/missing',json={}).status_code==404

