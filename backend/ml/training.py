"""Expert fitting and stacking use disjoint partitions; no full-data refit."""
import importlib.util
import time
from sklearn.ensemble import RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.svm import LinearSVC
from sklearn.feature_extraction.text import TfidfVectorizer
from .experts import EXPERT_CLASSES, NAMES
from .experts.base import Expert, word_pipeline
from .experts.anomaly_expert import boosted_or_lr
from .ensemble.meta_classifier import MetaClassifier
from .evaluation.data import partitions

def fit_bundle(dataset, sources=None, held_out=None, seed=42, prepared_parts=None, train_baselines=True):
    started = time.perf_counter()
    parts = prepared_parts if prepared_parts is not None else partitions(dataset, sources, held_out, seed)
    experts, unavailable = {}, {}
    for name, cls in EXPERT_CLASSES.items():
        expert = cls()
        print('Fitting expert: '+name, flush=True)
        try:
            expert.fit(parts['base'].prompt, parts['base'].label)
        except (ImportError, RuntimeError, OSError) as exc:
            if name != 'semantic':
                raise
            unavailable[name] = str(exc)
            continue
        experts[name] = expert
    # Batch inference avoids hundreds of thousands of separate sparse transformations.
    scores = {k:e.probabilities(parts['meta'].prompt) for k,e in experts.items()}
    meta_rows = [{k:float(values[i]) for k,values in scores.items()} for i in range(len(parts['meta']))]
    metas = {'meta_logistic': MetaClassifier(experts, 'logistic').fit(meta_rows, parts['meta'].label)}
    if importlib.util.find_spec('xgboost'):
        metas['meta_xgboost'] = MetaClassifier(experts, 'xgboost').fit(meta_rows, parts['meta'].label)
    baselines = {}
    for name, estimator in ([('Logistic Regression',None),
            ('SVM',CalibratedClassifierCV(LinearSVC(random_state=seed), cv=3)),
            ('Random Forest',RandomForestClassifier(n_estimators=80,n_jobs=1,random_state=seed))] if train_baselines else []):
        print('Fitting baseline: '+name, flush=True)
        e = Expert()
        e.features = 'Standalone word TF-IDF (1,2)'
        e.model = word_pipeline()
        if estimator is not None:
            e.model.steps[-1] = ('classifier',estimator)
        e.fit(parts['base'].prompt,parts['base'].label)
        baselines[name] = e
    if train_baselines and importlib.util.find_spec('xgboost'):
        e = Expert()
        e.features = 'Standalone word TF-IDF (1,2)'
        e.model = word_pipeline()
        e.model.steps[-1] = ('classifier',boosted_or_lr('xgboost'))
        e.fit(parts['base'].prompt,parts['base'].label)
        baselines['XGBoost'] = e
    elif train_baselines:
        unavailable['XGBoost'] = 'Optional xgboost dependency not installed'
        unavailable['meta_xgboost'] = 'Optional xgboost dependency not installed'
    char = Expert()
    char.features = 'Standalone character TF-IDF 3–5 grams'
    char.model = word_pipeline()
    char.model.steps[0] = ('features', TfidfVectorizer(analyzer='char',ngram_range=(3,5),max_features=20000))
    if train_baselines:
        char.fit(parts['base'].prompt,parts['base'].label)
        baselines['Character N-Gram model'] = char
    for key, name in [('semantic','Semantic-only model'),('anomaly','Anomaly detector')]:
        if key in experts:
            baselines[name] = experts[key]
    return dict(experts=experts, metas=metas, baselines=baselines, unavailable=unavailable,
                parts=parts, meta_rows=meta_rows, training_time=time.perf_counter()-started,
                sources=sorted(set(parts['base'].source)|set(parts['meta'].source)),
                seed=seed, dataset_file=dataset.filename,
                preferred_meta='meta_xgboost' if 'meta_xgboost' in metas else 'meta_logistic')

def fit_ablation_meta(bundle, exclude, kind=None):
    active = [k for k in bundle['experts'] if k not in exclude]
    name = kind or bundle['preferred_meta']
    if name not in bundle['metas']:
        raise ValueError('Requested meta-classifier dependency is unavailable')
    return MetaClassifier(active, 'xgboost' if name=='meta_xgboost' else 'logistic').fit(
        bundle['meta_rows'], bundle['parts']['meta'].label)

