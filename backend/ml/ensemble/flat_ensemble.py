from .hmeg import HMEG

class FlatEnsemble(HMEG):
    def predict(self, prompt, fusion='weighted_average', **kwargs):
        return super().predict(prompt, flat=True, fusion=fusion, **kwargs)

