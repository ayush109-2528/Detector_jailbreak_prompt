import numpy as np
from time import perf_counter
from ..experts.anomaly_expert import boosted_or_lr

class MetaClassifier:
    """Fitted on a disjoint meta-training partition, never base-training scores."""
    def __init__(self, expert_keys, kind='logistic'):
        self.expert_keys = list(expert_keys)
        self.kind = kind
        self.model = boosted_or_lr('xgboost' if kind == 'xgboost' else 'logistic')
    def matrix(self, scores):
        return np.asarray([[row[k] for k in self.expert_keys] for row in scores], dtype=float)
    def fit(self, scores, labels):
        start = perf_counter()
        self.model.fit(self.matrix(scores), labels)
        self.training_time = perf_counter() - start
        return self
    def score(self, scores):
        return float(self.model.predict_proba(self.matrix([scores]))[0, list(self.model.classes_).index(1)])

