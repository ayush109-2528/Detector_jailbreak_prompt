from sklearn.pipeline import FeatureUnion
from sklearn.feature_extraction.text import TfidfVectorizer

def create_vectorizer():
    """Fit only on training data to avoid evaluation leakage."""
    return FeatureUnion([
        ("word", TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True, max_features=20000)),
        ("character", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), max_features=30000)),
    ])
