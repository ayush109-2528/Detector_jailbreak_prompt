from sklearn.pipeline import Pipeline, FeatureUnion
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from .base import Expert
from .features import StructuralFeatures

class ObfuscationExpert(Expert):
    features = 'Character TF-IDF 3–5 grams + case, digit, spacing, symbol and structure statistics'
    def __init__(self):
        self.model = Pipeline([('features', FeatureUnion([
            ('characters', TfidfVectorizer(analyzer='char', ngram_range=(3,5),
                                          lowercase=False, max_features=20000)),
            ('structure', Pipeline([('stats', StructuralFeatures()), ('scale', StandardScaler())]))
        ])), ('classifier', LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42))])

