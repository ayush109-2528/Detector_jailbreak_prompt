import json
from pathlib import Path

NAMES = ['Logistic Regression', 'Support Vector Machine', 'Random Forest', 'Expert 1', 'Expert 2', 'Expert 3', 'Expert 4', 'Final Ensemble']

def results(directory: Path):
    path = directory / 'metrics.json'
    if path.exists():
        data = json.loads(path.read_text(encoding='utf-8'))
        # Require explicit provenance; never relabel example metrics as real.
        if not isinstance(data.get('demo_mode'), bool) or not data.get('evaluation_note'):
            raise ValueError('metrics.json requires demo_mode and evaluation_note')
        required = {'name', 'accuracy', 'precision', 'recall', 'f1', 'roc_auc', 'fpr', 'inference_time_ms', 'confusion_matrix'}
        if not data.get('models') or any(not required.issubset(m) for m in data['models']):
            raise ValueError('Invalid model metrics schema')
        for m in data['models']:
            for key in ['accuracy', 'precision', 'recall', 'f1', 'roc_auc', 'fpr']:
                if m[key] is not None and not 0 <= m[key] <= 1:
                    raise ValueError('Metrics must be in [0, 1]')
        return data
    models = []
    for i, name in enumerate(NAMES):
        tn, fp, fn, tp = [(92,8,10,90),(94,6,8,92),(91,9,11,89),(89,11,14,86),(87,13,15,85),(88,12,13,87),(93,7,9,91),(96,4,6,94)][i]
        precision, recall = tp/(tp+fp), tp/(tp+fn)
        models.append({'name': name, 'accuracy': (tn+tp)/200, 'precision': precision, 'recall': recall,
                       'f1': 2*precision*recall/(precision+recall), 'roc_auc': [.95,.96,.94,.92,.91,.92,.96,.98][i],
                       'fpr': fp/(tn+fp), 'inference_time_ms': [2.1,3.8,8.4,2.4,2.7,2.2,2.9,10.2][i],
                       'confusion_matrix': [[tn,fp],[fn,tp]]})
    return {'demo_mode': True, 'evaluation_note': 'Demo Data: illustrative metrics on a fictional 200-sample evaluation set, unrelated to the sample dataset.', 'models': models}
