from ..ensemble.hmeg import HMEG
from ..training import fit_ablation_meta

def variants(bundle, config):
    experts = bundle['experts']
    yield ('Full HMEG' if len(experts)==5 else 'HMEG (reduced expert set)'), HMEG(experts,bundle['metas'][bundle['preferred_meta']],config), {}, []
    for key in ('lexical','obfuscation','semantic','anomaly','instruction'):
        if key not in experts:
            continue
        excluded = [key]
        # Refit fusion for each ablated feature schema; never fill absent scores with zero.
        meta = fit_ablation_meta(bundle,excluded)
        yield 'HMEG without '+key, HMEG(experts,meta,config), {'exclude':excluded}, excluded
    for title, fusion in [('HMEG without routing',bundle['preferred_meta']),('Flat ensemble','weighted_average'),
                          ('Simple average fusion','average_probability'),('Majority voting','majority_voting'),
                          ('Meta Logistic Regression','meta_logistic'),('Meta XGBoost','meta_xgboost')]:
        if fusion.startswith('meta') and fusion not in bundle['metas']:
            continue
        yield title,HMEG(experts,bundle['metas'].get(fusion),config),{'flat':True,'fusion':fusion},[]

