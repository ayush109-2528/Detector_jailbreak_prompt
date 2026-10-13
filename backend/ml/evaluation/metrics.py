import numpy as np
from sklearn.metrics import roc_curve
from app.models.metrics import evaluate

def summarize(labels, predictions):
    # Early exits use router labels, not the final meta threshold.
    scores = [p['final_probability'] for p in predictions]
    result = evaluate(labels, [p['label'] for p in predictions])
    from sklearn.metrics import roc_auc_score
    both = len(set(labels)) == 2
    result['roc_auc'] = float(roc_auc_score(labels, scores)) if both else None
    tn, fp = result['confusion_matrix'][0]
    fn, tp = result['confusion_matrix'][1]
    result['fnr'] = fn/(fn+tp) if fn+tp else None
    result['fpr'] = fp/(fp+tn) if fp+tn else None
    times = [p['total_inference_time_ms'] for p in predictions]
    result.update(average_inference_time=float(np.mean(times)), p95_inference_time=float(np.percentile(times,95)),
                  layer1_exit_rate=float(np.mean([p['decision_layer']==1 for p in predictions])),
                  layer2_routing_rate=float(np.mean([p['routed_to_layer_2'] for p in predictions])),
                  average_experts_executed=float(np.mean([p['experts_executed'] for p in predictions])),
                  average_layer1_time=float(np.mean([p.get('layer1_time_ms',0) for p in predictions])),
                  average_layer2_time=float(np.mean([p.get('layer2_time_ms',0) for p in predictions])))
    if both:
        fpr,tpr,thresholds = roc_curve(labels,scores)
        result['roc_data'] = [dict(fpr=float(f),tpr=float(t),threshold=float(s) if np.isfinite(s) else None)
                              for f,t,s in zip(fpr,tpr,thresholds)]
    else:
        result['roc_data'] = []
    return result

