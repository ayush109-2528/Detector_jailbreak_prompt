import json
import math
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
        if not isinstance(data.get('models'), list) or not data['models'] or any(not isinstance(m, dict) or not required.issubset(m) for m in data['models']):
            raise ValueError('Invalid model metrics schema')
        names = set()
        for m in data['models']:
            if not isinstance(m['name'], str) or not m['name'].strip() or m['name'] in names:
                raise ValueError('Model names must be nonempty and unique')
            names.add(m['name'])
            for key in ['accuracy', 'precision', 'recall', 'f1', 'roc_auc', 'fpr']:
                if key == 'roc_auc' and m[key] is None:
                    continue
                if type(m[key]) not in (int, float) or not math.isfinite(m[key]) or not 0 <= m[key] <= 1:
                    raise ValueError('Metrics must be in [0, 1]')
            timing = m['inference_time_ms']
            if type(timing) not in (int, float) or not math.isfinite(timing) or timing < 0:
                raise ValueError('Inference time must be finite and nonnegative')
            matrix = m['confusion_matrix']
            if not isinstance(matrix, list) or len(matrix) != 2 or any(
                not isinstance(row, list) or len(row) != 2 or any(type(n) is not int or n < 0 for n in row)
                for row in matrix
            ):
                raise ValueError('Confusion matrix must be a 2 by 2 array of nonnegative integer counts')
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
