import numpy as np

STRATEGIES = ("weighted_average", "average_probability", "majority_voting", "maximum_confidence")

def combine(scores, strategy="weighted_average", weights=None):
    values = np.asarray(scores, dtype=float)
    if not len(values) or not np.all(np.isfinite(values)) or np.any((values < 0) | (values > 1)):
        raise ValueError("Scores must be finite probabilities")
    if strategy == "majority_voting":
        return float(np.mean(values >= .5))
    if strategy == "average_probability":
        return float(np.mean(values))
    if strategy == "maximum_confidence":
        return float(np.max(values))
    if strategy != "weighted_average":
        raise ValueError("Unknown ensemble strategy")
    weights = np.asarray(weights if weights is not None else np.ones(len(values)), dtype=float)
    if len(weights) != len(values) or not np.all(np.isfinite(weights)) or np.any(weights < 0) or weights.sum() <= 0:
        raise ValueError("Weights must be nonnegative with positive sum")
    return float(np.average(values, weights=weights))
