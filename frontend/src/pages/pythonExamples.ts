// Educational excerpts: intentionally omit credentials and backend internals.
export const examples = [
  [
    "A",
    "Dataset and provenance",
    "Preserve source, verification status, recorded splits and parent IDs. Label 1 is the positive research class; a harmful-behavior proxy is not necessarily a jailbreak.",
    `import pandas as pd

data = pd.read_csv("HMEG_300K_Augmented_Dataset.csv")
assert data["prompt"].notna().all()
assert data["label"].isin([0, 1]).all()
X, y = data["prompt"], data["label"]
# Keep source_dataset, research_split, parent_id,
# verification_status and is_synthetic for auditing.
print(data.groupby(["research_split", "label"]).size())`,
  ],
  [
    "B",
    "Prevent augmentation leakage",
    "Use recorded train/validation/test partitions. Check that parent families never cross them. Split training again into base-expert and meta-training groups; retry or reject splits missing either class.",
    `from sklearn.model_selection import GroupShuffleSplit

train = data[data.research_split == "train"]
validation = data[data.research_split == "validation"]
test = data[data.research_split == "test"]
splitter = GroupShuffleSplit(
    n_splits=1, test_size=0.25, random_state=42
)
base_idx, meta_idx = next(splitter.split(
    train, groups=train["parent_id"]
))
base, meta_train = train.iloc[base_idx], train.iloc[meta_idx]
# Fit vocabularies and experts on base only.
# Fit fusion on meta_train; tune on validation.
# Reserve test for final evaluation.`,
  ],
  [
    "C",
    "Expert 1 · Lexical patterns",
    "Word TF-IDF and Logistic Regression learn wording patterns from labeled examples. The probability is a model estimate, not certainty. Implementation: ml/experts/lexical_expert.py.",
    `from sklearn.pipeline import make_pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

lexical = make_pipeline(
    TfidfVectorizer(ngram_range=(1, 2)),
    LogisticRegression(max_iter=1000, class_weight="balanced")
)
lexical.fit(base.prompt, base.label)
p1 = lexical.predict_proba([prompt])[0, 1]`,
  ],
  [
    "D",
    "Expert 2 · Obfuscation",
    "The implemented expert combines case-sensitive character 3–5 grams with scaled structural statistics, then uses Logistic Regression. This can capture spelling and formatting changes. Implementation: ml/experts/obfuscation_expert.py.",
    `from ml.experts.obfuscation_expert import ObfuscationExpert

obfuscation = ObfuscationExpert()
obfuscation.fit(base.prompt, base.label)
p2 = obfuscation.score(prompt)
# FeatureUnion combines:
# char TF-IDF (3, 5), lowercase=False
# + scaled case/digit/spacing/symbol statistics
# Classifier: balanced Logistic Regression`,
  ],
  [
    "E",
    "Expert 3 · Semantic intent (optional)",
    "MiniLM produces pretrained sentence embeddings; Logistic Regression learns the binary task. This optional feature encoder is neural, while the fitted classifier is classical ML. Dependencies and cached weights must exist locally. Implementation: ml/experts/semantic_expert.py.",
    `from ml.experts.semantic_expert import SemanticExpert

semantic = SemanticExpert()
try:
    semantic.fit(base.prompt, base.label)
    p3 = semantic.score(prompt)
except RuntimeError:
    p3 = None  # Report unavailable, never invent a score.
# When unavailable, fit fusion on the remaining expert keys.
# Do not insert a fake zero into a five-expert model.`,
  ],
  [
    "F",
    "Expert 4 · Adversarial / anomaly",
    "A supervised structural classifier uses length, entropy, repetition, ratios, and prefix/suffix statistics. XGBoost is preferred, with LR fallback. Optional perplexity is supplied separately; no language model is required. Implementation: ml/experts/anomaly_expert.py.",
    `from ml.experts.anomaly_expert import AnomalyExpert

anomaly = AnomalyExpert(perplexity_provider=None)
anomaly.fit(base.prompt, base.label)
p4 = anomaly.score(prompt)
# Structural features remain usable without perplexity.
# An unusual format is evidence, not proof of an attack.`,
  ],
  [
    "G",
    "Expert 5 · Instruction manipulation",
    "TF-IDF / n-gram features target hierarchy override and role manipulation. Specialization describes the detection mechanism, not merely a different classifier name. Implementation: ml/experts/instruction_expert.py.",
    `from ml.experts.instruction_expert import InstructionExpert

instruction = InstructionExpert()
instruction.fit(base.prompt, base.label)
p5 = instruction.score(prompt)
# Examples of relevant patterns:
# previous-instruction replacement, system override,
# developer-role manipulation, persona switching.`,
  ],
  [
    "H",
    "Layer 1 · Confidence-aware routing",
    "Only lexical and obfuscation experts run initially. Low/high thresholds control early exits; the final fusion threshold applies to uncertain prompts. Thresholds are tunable engineering choices, not proven optimal values. Implementation: ml/ensemble/router.py.",
    `fast_score = lexical_weight * p1 + (1 - lexical_weight) * p2
if fast_score <= low_threshold:
    prediction = "benign"
    decision_layer = 1
elif fast_score >= high_threshold:
    prediction = "jailbreak"
    decision_layer = 1
else:
    # Run available semantic, anomaly, instruction experts.
    # Then use the fitted meta-classifier (Layer 3).
    prediction = run_deeper_analysis(prompt)
# An early exit records deeper experts as skipped.`,
  ],
  [
    "I",
    "Layer 3 · Learn fusion without leakage",
    "Train LR or XGBoost fusion on expert scores from the separate meta-training partition. The implemented meta vector contains the available expert scores in a fixed order; extra meta-features are not currently included. Implementation: ml/ensemble/meta_classifier.py.",
    `from ml.ensemble.meta_classifier import MetaClassifier

keys = list(experts)  # Stable available-expert order
rows = [
    {key: experts[key].score(text) for key in keys}
    for text in meta_train.prompt
]
fusion = MetaClassifier(keys, kind="xgboost")
fusion.fit(rows, meta_train.label)
final_probability = fusion.score(current_scores)
prediction = "jailbreak" if final_probability >= threshold else "benign"`,
  ],
  [
    "J",
    "Flat ensemble versus HMEG",
    "Flat fusion runs every available expert for every prompt. HMEG uses early exits to reduce work. Flat options include majority vote, mean, weighted mean and fitted LR/XGBoost fusion. Implementation: ml/ensemble/hmeg.py.",
    `from ml.ensemble.hmeg import HMEG

guardrail = HMEG(experts=experts, meta=fusion, config=config)
hierarchical = guardrail.predict(prompt)
flat = guardrail.predict(prompt, flat=True, fusion="meta_xgboost")
print(hierarchical["decision_layer"])
print(hierarchical["experts_executed"])
print(hierarchical["total_inference_time_ms"])
# Each expert record includes status, score and latency.
# Supply the matching fitted fusion model for each strategy.`,
  ],
  [
    "K",
    "Evaluate effectiveness and cost",
    "Report positive-class recall/F1, FPR, ROC-AUC, confusion matrix, routing rates and latency. Measure timing on real inference runs. Compare matching datasets, splits and hardware; handle undefined metrics explicitly.",
    `from sklearn.metrics import confusion_matrix, f1_score, roc_auc_score

tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
f1 = f1_score(y_true, y_pred, zero_division=0)
fpr = fp / (fp + tn) if fp + tn else None
auc = roc_auc_score(y_true, scores) if len(set(y_true)) == 2 else None
# Separately measure average/P95 inference latency.
# Run source-held-out OOD tests and expert ablations.
# Synthetic augmentations and original-only results stay distinct.`,
  ],
  [
    "L",
    "Learning from reviewed corrections",
    "The PC worker polls Supabase for changed human reviews. It refits on eligible reviewed labels plus base training data, protects meta/validation/test examples, and validates before promotion. Predictions are never automatically treated as labels. Implementation: scripts/learning_worker.py.",
    `# Conceptual worker lifecycle (helper names are illustrative):
reviews = load_latest_human_reviews()
eligible = exclude_protected_holdout_prompts(reviews)
candidate = refit_experts_and_meta(base, eligible)
accepted = validation_gate(candidate, incumbent)
if accepted:
    activate_version_atomically(candidate)
    prepare_vercel_package(candidate)
# Deploy the validated package to update the hosted model.
# PC must be awake with the worker running.
# Validation selection never uses test labels.`,
  ],
];
