from ..ensemble.router import RoutingConfig
from ..ensemble.hmeg import HMEG

def configurations(bundle, pairs, config):
    checked = [RoutingConfig(low,high,config.lexical_weight,config.threshold)
               for low,high in dict.fromkeys(tuple(p) for p in pairs)]
    for current in checked:
        yield current,HMEG(bundle['experts'],bundle['metas'][bundle['preferred_meta']],current)

