import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from app.models.preprocessing import preprocess
from .base import Expert

class InstructionFeatures(BaseEstimator, TransformerMixin):
    patterns = ('ignore previous', 'disregard', 'system prompt', 'system message',
                'developer instruction', 'act as', 'pretend', 'roleplay',
                'replace your', 'override', 'new instructions', 'forget your')
    def fit(self, X, y=None):
        return self
    def transform(self, X):
        return np.asarray([[float(pattern in preprocess(text)) for pattern in self.patterns]
                           for text in X])

class InstructionExpert(Expert):
    features = 'Word TF-IDF 1–3 grams + instruction hierarchy, persona and replacement indicators'
    def __init__(self):
        self.model = Pipeline([('features',FeatureUnion([
            ('ngrams',TfidfVectorizer(preprocessor=preprocess,ngram_range=(1,3),max_features=20000)),
            ('instruction_indicators',InstructionFeatures())])),
            ('classifier',LogisticRegression(max_iter=1000,class_weight='balanced',random_state=42))])

