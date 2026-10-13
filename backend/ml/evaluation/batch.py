"""Bounded-memory evaluation; batched throughput is not single-request latency."""
import numpy as np
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
from ml.ensemble.router import RoutingConfig

def probabilities(bundle, prompts, config=None, batch_size=512):
    config = config or RoutingConfig()
    result, routed = [], []
    experts = bundle['experts']
    meta = bundle['metas'][bundle['preferred_meta']]
    prompts = list(prompts)
    for start in range(0,len(prompts),batch_size):
        texts = prompts[start:start+batch_size]
        scores = {k:experts[k].probabilities(texts) for k in ('lexical','obfuscation')}
        fast = config.lexical_weight*scores['lexical']+(1-config.lexical_weight)*scores['obfuscation']
        uncertain = (fast>config.low_threshold)&(fast<config.high_threshold)
        indices = np.flatnonzero(uncertain)
        final = fast.copy()
        if len(indices):
            deeper = [texts[i] for i in indices]
            selected = {k:v[indices] for k,v in scores.items()}
            selected.update({k:e.probabilities(deeper) for k,e in experts.items() if k not in scores})
            matrix = np.column_stack([selected[k] for k in meta.expert_keys])
            final[indices] = meta.model.predict_proba(matrix)[:,list(meta.model.classes_).index(1)]
        # Layer-1 labels depend on router boundaries, not the fusion threshold.
        labels = np.where(uncertain,final>=config.threshold,fast>=config.high_threshold)
        result.extend(zip(final.tolist(),labels.astype(int).tolist()))
        routed.extend(uncertain.tolist())
    return result,routed

def evaluate(bundle, frame, config=None):
    rows,routed = probabilities(bundle,frame.prompt,config)
    scores,labels = zip(*rows)
    tn,fp,fn,tp = confusion_matrix(frame.label,labels,labels=[0,1]).ravel()
    return dict(accuracy=float(accuracy_score(frame.label,labels)),precision=float(precision_score(frame.label,labels,zero_division=0)),
        recall=float(recall_score(frame.label,labels,zero_division=0)),f1=float(f1_score(frame.label,labels,zero_division=0)),
        roc_auc=float(roc_auc_score(frame.label,scores)) if frame.label.nunique()==2 else None,
        fpr=float(fp/(fp+tn)) if fp+tn else None,fnr=float(fn/(fn+tp)) if fn+tp else None,
        confusion_matrix=[[int(tn),int(fp)],[int(fn),int(tp)]],samples=len(frame),
        layer2_routing_rate=float(np.mean(routed)),layer1_exit_rate=float(1-np.mean(routed)),
        average_experts_executed=float(2+np.mean(routed)*(len(bundle['experts'])-2)))
