# Trusted model artifacts

Place a fitted shared transformer and four classifiers here:

- `tfidf_vectorizer.pkl`
- `expert_instruction.pkl`
- `expert_roleplay.pkl`
- `expert_suffix.pkl`
- `expert_general.pkl`

The transformer may be the `FeatureUnion` returned by `create_vectorizer()`. Every classifier must be fitted on that same transformer output and expose `predict_proba` with class `1` meaning jailbreak. Calibrate classifiers such as LinearSVC before exporting. Apply `preprocess()` consistently before vectorizing training and inference data. Keep all artifact versions together, record the scikit-learn version, and only load trusted joblib files.

Missing or invalid bundles activate explicitly labeled Demo Mode. The system validates the full bundle with an inference probe at startup. Restart the backend after replacing artifacts. Training is intentionally a separate research activity; there is no claim that category specialists have already been trained.

## Evaluation file

An optional `metrics.json` is read on every metrics request. Its top level must contain `demo_mode`, `evaluation_note`, and `models`. Each model requires:

```json
{
  "name": "Final Ensemble",
  "accuracy": 0.5,
  "precision": 0.5,
  "recall": 0.5,
  "f1": 0.5,
  "roc_auc": 0.5,
  "fpr": 0.5,
  "inference_time_ms": 1.0,
  "confusion_matrix": [[1, 1], [1, 1]]
}
```

These values are **schema examples only**, not measurements. Use `demo_mode: true` for illustrative data. Set it to `false` only for actual held-out evaluations and explain dataset version, split, sample size, hardware, timing protocol, and model version in `evaluation_note`. Metrics use fractions, except time in milliseconds. `roc_auc` can be null when undefined. Confusion matrix rows are actual [benign, jailbreak]; columns are predicted [benign, jailbreak]. Use the exact name `Final Ensemble` for the dashboard summary.
