from ..training import fit_bundle

def fit_source_holdout(dataset, training_sources, held_out_source, seed=42):
    # Entire held-out source is excluded from expert fitting, meta fitting and validation.
    return fit_bundle(dataset,training_sources,held_out_source,seed)

