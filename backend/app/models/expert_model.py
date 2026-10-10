import numpy as np

class ExpertModel:
    def __init__(self, name, category, estimator):
        self.name, self.category, self.estimator = name, category, estimator

    def score(self, features):
        # Calibrate SVMs before export; decision margins are not probabilities.
        if not hasattr(self.estimator, "predict_proba"):
            raise ValueError(f"{self.name} must expose calibrated predict_proba")
        classes = list(self.estimator.classes_)
        value = float(self.estimator.predict_proba(features)[0, classes.index(1)])
        if not np.isfinite(value) or not 0 <= value <= 1:
            raise ValueError("Expert returned an invalid probability")
        return value
