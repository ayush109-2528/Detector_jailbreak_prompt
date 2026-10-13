"""Hierarchy executes deep experts only after an uncertain Layer 1 result."""
from time import perf_counter
from app.models.preprocessing import preprocess
from ..experts import NAMES
from .router import RoutingConfig, route
from app.models.ensemble import combine

DEMO_TERMS = dict(lexical=('ignore', 'jailbreak', 'dan', 'unrestricted'),
                 obfuscation=('!!!', '###', 'decode', 'suffix'),
                 semantic=('bypass', 'evade', 'conceal', 'without restrictions'),
                 anomaly=('!!!', 'suffix', '###', 'random'),
                 instruction=('previous instructions', 'system prompt', 'developer', 'override'))
FLAT_WEIGHTS = dict(lexical=.25, obfuscation=.20, semantic=.20, anomaly=.15, instruction=.20)
class HMEG:
    def __init__(self, experts=None, meta=None, config=None, demo=False):
        self.experts = experts or {}
        self.meta = meta
        self.config = config or RoutingConfig()
        self.demo = demo
    def predict(self, prompt, *, flat=False, fusion='weighted_average', exclude=()):
        started = perf_counter()
        normalized = preprocess(prompt)
        records, scores = [], {}
        def execute(key):
            if key in exclude:
                records.append(dict(key=key, name=NAMES[key], category=key, score=None,
                                    status='ablated', inference_time_ms=0, prediction=None))
                return
            if not self.demo and key not in self.experts:
                records.append(dict(key=key, name=NAMES[key], category=key, score=None,
                                    status='unavailable', inference_time_ms=0, prediction=None))
                return
            begin = perf_counter()
            score = min(.96, .12+.28*sum(t in normalized for t in DEMO_TERMS[key])) if self.demo else self.experts[key].score(prompt)
            scores[key] = score
            records.append(dict(key=key, name=NAMES[key], category=key, score=score,
                                status='simulated' if self.demo else 'executed',
                                inference_time_ms=(perf_counter()-begin)*1000,
                                prediction='jailbreak' if score >= .5 else 'benign'))
        execute('lexical')
        execute('obfuscation')
        fast, routing = route(scores, self.config)
        layer1_time = (perf_counter()-started)*1000
        deeper = flat or routing == 'uncertain'
        layer2_start = perf_counter()
        for key in ('semantic', 'anomaly', 'instruction'):
            if deeper:
                execute(key)
            else:
                records.append(dict(key=key, name=NAMES[key], category=key, score=None,
                                    status='skipped', inference_time_ms=0, prediction=None))
        layer2_time = (perf_counter()-layer2_start)*1000 if deeper else 0
        meta_score = None
        if deeper:
            if flat and fusion not in ('meta_logistic', 'meta_xgboost'):
                score = combine(list(scores.values()), fusion, [FLAT_WEIGHTS[k] for k in scores])
            elif self.demo:
                # Explicit simulation, never presented as a learned meta-classifier.
                score = combine(list(scores.values()), 'average_probability')
                meta_score = score
            else:
                if self.meta is None:
                    raise ValueError('A fitted meta-classifier is required for uncertain prompts')
                score = self.meta.score(scores)
                meta_score = score
            label = int(score >= self.config.threshold)
        else:
            score = fast
            label = int(routing == 'jailbreak')
        elapsed = (perf_counter()-started)*1000
        return dict(prompt=prompt, normalized_prompt=normalized, prediction='jailbreak' if label else 'benign',
                    label=label, action='block' if label else 'allow', final_probability=score,
                    ensemble_score=score, threshold=self.config.threshold,
                    strategy=fusion if flat else 'hmeg',
                    flat_weights={k:FLAT_WEIGHTS[k]/sum(FLAT_WEIGHTS[n] for n in scores) for k in scores},
                    weights=[FLAT_WEIGHTS[k]/sum(FLAT_WEIGHTS[n] for n in scores) for k in scores],
                    decision_layer=3 if deeper and (not flat or fusion.startswith('meta')) else 2 if deeper else 1,
                    routed_to_layer_2=deeper, fast_score=fast, routing_decision=routing,
                    routing_thresholds=self.config.as_dict(), meta_classifier_score=meta_score,
                    experts=records, experts_executed=len(scores), inference_time_ms=elapsed,
                    total_inference_time_ms=elapsed, layer1_time_ms=layer1_time,
                    layer2_time_ms=layer2_time,
                    demo_mode=self.demo, framework='flat' if flat else 'hmeg',
                    reduced_expert_set=not self.demo and len(self.experts)<5,
                    mode_note='Demo Mode: simulated experts and simulated fusion; no learned model.' if self.demo else
                        'Fitted research model; effectiveness requires held-out evaluation.',
                    processing_steps=['preprocessing', 'layer1', 'confidence_router']+
                        (['layer2', 'meta_classifier' if meta_score is not None else 'flat_fusion'] if deeper else [])+
                        ['final_decision'])

