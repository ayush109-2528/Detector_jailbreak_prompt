from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from .features import PerplexityFeatures
from .base import Expert

def boosted_or_lr(kind='auto'):
    if kind in ('auto', 'xgboost'):
        try:
            from xgboost import XGBClassifier
            return XGBClassifier(n_estimators=80, max_depth=3, learning_rate=.08,
                                 n_jobs=1, random_state=42, eval_metric='logloss')
        except ImportError:
            if kind == 'xgboost':
                raise RuntimeError('Install xgboost to run this experiment')
    return LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42)

class AnomalyExpert(Expert):
    features = 'Length, entropy, repetition, token/character ratios and prefix/suffix statistics; optional perplexity'
    def __init__(self, perplexity_provider=None, classifier='auto'):
        self.model = Pipeline([('features', PerplexityFeatures(perplexity_provider)),
                               ('scale', StandardScaler()), ('classifier', boosted_or_lr(classifier))])

