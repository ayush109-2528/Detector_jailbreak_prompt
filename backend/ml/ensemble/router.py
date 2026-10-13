from dataclasses import dataclass, asdict
import math
from app.models.ensemble import combine

@dataclass(frozen=True)
class RoutingConfig:
    low_threshold: float = .2
    high_threshold: float = .8
    lexical_weight: float = .5
    threshold: float = .5
    def __post_init__(self):
        values = [self.low_threshold, self.high_threshold, self.lexical_weight, self.threshold]
        if not all(math.isfinite(v) and 0 <= v <= 1 for v in values):
            raise ValueError('Thresholds and weights must be finite and within [0, 1]')
        if not self.low_threshold < self.high_threshold:
            raise ValueError('LOW_THRESHOLD must be below HIGH_THRESHOLD')
    def as_dict(self):
        return asdict(self)

def route(scores, config):
    keys = [k for k in ('lexical', 'obfuscation') if k in scores]
    if not keys:
        return None, 'uncertain'
    weights = [config.lexical_weight if k == 'lexical' else 1-config.lexical_weight for k in keys]
    if not sum(weights):
        weights = None
    fast = combine([scores[k] for k in keys], weights=weights)
    if fast <= config.low_threshold:
        return fast, 'benign'
    if fast >= config.high_threshold:
        return fast, 'jailbreak'
    return fast, 'uncertain'

