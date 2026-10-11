import json
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.results import results

@pytest.mark.parametrize('field,value', [
    ('accuracy', None), ('recall', True), ('f1', float('nan')),
    ('roc_auc', float('inf')), ('inference_time_ms', -1),
    ('inference_time_ms', None), ('confusion_matrix', [[1, 2, 3]]),
    ('confusion_matrix', [[1, -2], [3, 4]]), ('name', ''),
])
def test_bad_metrics_are_rejected_without_rendering_false_results(tmp_path, field, value):
    data = results(tmp_path)
    data['models'][0][field] = value
    (tmp_path/'metrics.json').write_text(json.dumps(data), encoding='utf-8')
    with pytest.raises(ValueError): results(tmp_path)

def test_metrics_failure_is_actionable_and_does_not_disable_dataset(tmp_path, monkeypatch):
    monkeypatch.setenv('MODEL_DIR', str(tmp_path))
    monkeypatch.setenv('FEEDBACK_DB', str(tmp_path/'qa.sqlite3'))
    (tmp_path/'metrics.json').write_text('{broken', encoding='utf-8')
    with TestClient(app) as client:
        response = client.get('/api/models/metrics')
        assert response.status_code == 503
        assert 'metrics.json' in response.json()['detail']
        assert client.get('/api/dataset/stats').status_code == 200

def test_auc_can_be_unavailable_for_single_class_evaluation(tmp_path):
    data = results(tmp_path)
    data['models'][0]['roc_auc'] = None
    (tmp_path/'metrics.json').write_text(json.dumps(data), encoding='utf-8')
    assert results(tmp_path)['models'][0]['roc_auc'] is None
