from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from app.models.preprocessing import preprocess
from time import perf_counter

def word_pipeline(ngram_range=(1, 2)):
    return Pipeline([('features', TfidfVectorizer(preprocessor=preprocess,
        ngram_range=ngram_range, max_features=20000, sublinear_tf=True)),
        ('classifier', LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42))])

class Expert:
    features = ''
    def fit(self, prompts, labels):
        start = perf_counter()
        self.model.fit(list(prompts), list(labels))
        self.training_time = perf_counter() - start
        return self
    def probabilities(self, prompts):
        index = list(self.model.classes_).index(1)
        return self.model.predict_proba(list(prompts))[:, index]
    def score(self, prompt):
        return float(self.probabilities([prompt])[0])
    @property
    def estimator(self):
        return type(self.model.steps[-1][1]).__name__ if hasattr(self.model, 'steps') else type(self.model).__name__

