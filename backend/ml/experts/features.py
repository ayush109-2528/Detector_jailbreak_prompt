"""Raw character features preserve case and spacing that text normalization removes."""
from collections import Counter
import math
import re
import string
import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin

FEATURE_NAMES = ['length', 'token_count', 'entropy', 'average_word_length', 'punctuation_ratio',
                 'special_ratio', 'digit_ratio', 'uppercase_ratio', 'whitespace_ratio',
                 'repeated_token_ratio', 'repeated_character_ratio', 'max_symbol_run',
                 'prefix_punctuation', 'suffix_punctuation', 'prefix_entropy', 'suffix_entropy']

def entropy(text):
    counts = Counter(text)
    n = max(len(text), 1)
    return -sum((v/n)*math.log2(v/n) for v in counts.values())

class StructuralFeatures(BaseEstimator, TransformerMixin):
    def fit(self, X, y=None):
        return self
    def transform(self, X):
        rows = []
        for text in X:
            n = max(len(text), 1)
            words = text.split()
            punctuation = lambda s: sum(c in string.punctuation for c in s)/max(len(s), 1)
            rows.append([len(text), len(words), entropy(text),
                         sum(map(len, words))/max(len(words), 1), punctuation(text),
                         sum(not c.isalnum() and not c.isspace() for c in text)/n,
                         sum(c.isdigit() for c in text)/n, sum(c.isupper() for c in text)/n,
                         sum(c.isspace() for c in text)/n,
                         1-len(set(words))/max(len(words), 1) if words else 0,
                         sum(a == b for a,b in zip(text, text[1:]))/n,
                         max([len(m.group()) for m in re.finditer(r'([^\w\s])\1+', text)] or [0]),
                         punctuation(text[:80]), punctuation(text[-80:]),
                         entropy(text[:80]), entropy(text[-80:])])
        return np.asarray(rows, dtype=float)

class PerplexityFeatures(StructuralFeatures):
    """Supply a local callable(text)->positive perplexity; no LM is required by default."""
    def __init__(self, provider=None):
        self.provider = provider
    def transform(self, X):
        values = super().transform(X)
        if self.provider is None:
            return values
        perplexities = np.asarray([self.provider(x) for x in X], dtype=float)
        if not np.all(np.isfinite(perplexities)) or np.any(perplexities <= 0):
            raise ValueError('Perplexity provider must return finite positive values')
        return np.column_stack([values, perplexities])

