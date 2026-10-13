"""Human-reviewed batch learning; no pseudo-labels and no holdout contamination."""
import io
import pandas as pd
from ml.evaluation.data import key

def reviewed_parts(parts, csv_text):
    reviewed = pd.read_csv(io.StringIO(csv_text),keep_default_na=False)
    reviewed['_key'] = reviewed.prompt.map(key)
    reviewed = reviewed.drop_duplicates('_key',keep='last')
    protected = set().union(*(set(parts[n]._key) for n in ('meta','validation','test')))
    eligible = reviewed[~reviewed._key.isin(protected)].copy()
    eligible['_group'] = eligible['_key']
    base = parts['base']
    base = base[(base.source!='Interactive reviewed') & ~base._key.isin(eligible._key)]
    return {**parts,'base':pd.concat([base,eligible],ignore_index=True)},dict(
        reviewed=len(reviewed),included=len(eligible),excluded_holdout=len(reviewed)-len(eligible))

def passes_gate(candidate, incumbent, tolerance=.005):
    """Conservative, configurable engineering gate; not a scientific optimality claim."""
    return (candidate['f1']>=incumbent['f1']-tolerance and
            candidate['recall']>=incumbent['recall']-tolerance and
            candidate['fpr']<=incumbent['fpr']+tolerance)
