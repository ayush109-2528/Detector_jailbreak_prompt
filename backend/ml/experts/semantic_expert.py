"""Optional pretrained sentence encoder; no network download during inference."""
from sklearn.linear_model import LogisticRegression
from .base import Expert
from time import perf_counter

class SemanticExpert(Expert):
    features = 'sentence-transformers/all-MiniLM-L6-v2 embeddings + Logistic Regression'
    def __init__(self, encoder_path='sentence-transformers/all-MiniLM-L6-v2'):
        self.encoder_path = encoder_path
        self._encoder = None
        self.model = LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42)
    def encoder(self):
        if self._encoder is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._encoder = SentenceTransformer(self.encoder_path, local_files_only=True)
            except (ImportError, OSError, RuntimeError) as exc:
                raise RuntimeError('Semantic expert unavailable: install optional dependencies and cache MiniLM locally.') from exc
        return self._encoder
    def fit(self, prompts, labels):
        start = perf_counter()
        vectors = self.encoder().encode(list(prompts), show_progress_bar=False)
        self.model.fit(vectors, list(labels))
        self.training_time = perf_counter() - start
        return self
    def probabilities(self, prompts):
        vectors = self.encoder().encode(list(prompts), show_progress_bar=False)
        return self.model.predict_proba(vectors)[:, list(self.model.classes_).index(1)]
    def __getstate__(self):
        return {**self.__dict__, '_encoder': None}

