export const explanations: Record<string, { steps: [string, string][]; output: string; takeaway: string }> = {
  A: {
    steps: [
      ['pd.read_csv(...)', 'Reads the CSV into a table called data. Each row contains one prompt and its research metadata.'],
      ['assert ...', 'Stops this example if prompts are missing or a label is not 0 or 1. These checks do not establish that the labels are correct.'],
      ['X, y = ...', 'X contains the input texts. y contains the human-supplied classes: 0 for benign and 1 for the positive jailbreak research class.'],
      ['groupby(...).size()', 'Counts examples by recorded partition and label so you can inspect class balance before training.'],
    ],
    output: 'A prompt table, input texts, labels, and counts for each split/class pair.',
    takeaway: 'Source and synthetic-status fields explain where examples came from; they are not proof of independent verification.',
  },
  B: {
    steps: [
      ['data[data.research_split == ...]', 'Selects the existing train, validation and test rows without reshuffling those assignments.'],
      ['GroupShuffleSplit(...)', 'Creates a separate base-training and meta-training partition by parent family. The 0.25 fraction refers to groups, so row counts need not be exactly 25%.'],
      ['groups=train["parent_id"]', 'Keeps variants of the same parent together. Otherwise very similar prompts could appear on both sides and inflate results.'],
      ['train.iloc[base_idx], train.iloc[meta_idx]', 'Builds the two tables: experts learn from base; the fusion model learns from scores on meta_train.'],
    ],
    output: 'Separate base, meta-training, validation and test partitions.',
    takeaway: 'The full pipeline must also check parent overlap across recorded splits and that each required partition contains both classes.',
  },
  C: {
    steps: [
      ['TfidfVectorizer(ngram_range=(1, 2))', 'Turns words and two-word phrases into sparse numeric features, weighting terms by how informative they are within the training collection.'],
      ['make_pipeline(...)', 'Connects the text transformer to Logistic Regression so the same processing is used for fitting and prediction.'],
      ['lexical.fit(base.prompt, base.label)', 'Learns the vocabulary, TF-IDF weights and classifier coefficients using base-training examples only.'],
      ['predict_proba(...)[0, 1]', 'Reads the positive-class probability for the first prompt, assuming the fitted binary class order is [0, 1]. The backend explicitly locates class 1.'],
    ],
    output: 'p1: the lexical expert’s estimated jailbreak probability.',
    takeaway: 'The model learns statistical wording patterns. A high score is not a guarantee that the prompt is malicious.',
  },
  D: {
    steps: [
      ['ObfuscationExpert()', 'Constructs the existing character-level and structural feature pipeline.'],
      ['obfuscation.fit(...)', 'Learns character TF-IDF, scales structural features and fits Logistic Regression.'],
      ['Character 3–5 grams + structure', 'Character fragments can survive spelling changes. Case, digits, spacing and symbols provide additional formatting evidence.'],
      ['obfuscation.score(prompt)', 'Applies the fitted transformations to the new prompt and returns the positive-class probability.'],
    ],
    output: 'p2: the obfuscation expert’s estimated probability.',
    takeaway: 'Odd formatting also occurs in benign code and mathematics; evaluate false positives on those examples.',
  },
  E: {
    steps: [
      ['SemanticExpert()', 'Prepares an optional MiniLM sentence encoder and a Logistic Regression classifier.'],
      ['semantic.fit(...)', 'Encodes base prompts into vectors, then trains the classifier on those vectors. It does not fine-tune MiniLM.'],
      ['semantic.score(prompt)', 'Embeds the new prompt and estimates its positive-class probability.'],
      ['except RuntimeError: p3 = None', 'Illustrates an unavailable optional expert. The real training workflow records availability and fits fusion using only available experts.'],
    ],
    output: 'p3 when dependencies and cached weights are available; otherwise an explicit unavailable status.',
    takeaway: 'None is not a benign score. Never substitute zero into a meta-model trained to expect a semantic probability.',
  },
  F: {
    steps: [
      ['AnomalyExpert(perplexity_provider=None)', 'Builds the structural classifier without requesting language-model perplexity.'],
      ['anomaly.fit(...)', 'Extracts numeric statistics and fits the supervised classifier. It uses XGBoost when available, with Logistic Regression as a fallback.'],
      ['Structural statistics', 'Length, entropy, repeated tokens, punctuation and prefix/suffix patterns describe the prompt’s shape.'],
      ['anomaly.score(prompt)', 'Returns a probability from those learned structural patterns.'],
    ],
    output: 'p4: the structural/anomaly expert’s estimated probability.',
    takeaway: 'This is a labeled, supervised detector, not evidence that every unusual prompt is an attack.',
  },
  G: {
    steps: [
      ['InstructionExpert()', 'Combines word 1–3 gram TF-IDF with indicators for instruction replacement, persona changes and hierarchy manipulation.'],
      ['instruction.fit(...)', 'Fits the vocabulary and Logistic Regression weights on labeled base-training prompts.'],
      ['instruction.score(prompt)', 'Produces the instruction-manipulation probability using the fitted pipeline.'],
      ['Example pattern comments', 'These describe the mechanism being studied; they are not a rule saying every mention of these phrases must be blocked.'],
    ],
    output: 'p5: the instruction expert’s estimated probability.',
    takeaway: 'Lexical and instruction experts can overlap; ablation experiments test whether their combination adds value.',
  },
  H: {
    steps: [
      ['fast_score = ...', 'Combines p1 and p2. A lexical weight of 0.5 gives the two fast experts equal influence.'],
      ['fast_score <= low_threshold', 'Returns benign immediately at Layer 1. Deeper experts are marked skipped.'],
      ['fast_score >= high_threshold', 'Returns jailbreak immediately at Layer 1. It does not wait for meta fusion.'],
      ['else: run_deeper_analysis(prompt)', 'Only an uncertain score triggers available Layer 2 experts and then learned fusion. This helper name is illustrative.'],
    ],
    output: 'An early decision, or a routing decision to run deeper analysis.',
    takeaway: 'For illustrative thresholds 0.2 and 0.8, a fast score of 0.5 routes deeper. The final fusion threshold is a separate setting.',
  },
  I: {
    steps: [
      ['keys = list(experts)', 'Fixes the order of available expert features. Training and prediction must use the same keys.'],
      ['rows = [...]', 'Runs the fitted experts on meta-training prompts, creating one probability vector per prompt.'],
      ['fusion.fit(rows, meta_train.label)', 'Learns how to combine the scores against known labels. These examples were not used to fit the base experts.'],
      ['fusion.score(...) and threshold', 'Produces the final estimated probability and converts it to benign or jailbreak using the configured threshold.'],
    ],
    output: 'A learned fusion model and a final probability for an uncertain prompt.',
    takeaway: 'Learned fusion is different from averaging: the model learns its combination from a separate labeled partition.',
  },
  J: {
    steps: [
      ['HMEG(experts=..., meta=..., config=...)', 'Assembles fitted experts, a compatible fusion model and routing configuration.'],
      ['guardrail.predict(prompt)', 'Runs confidence-aware routing, with early exits for confident Layer 1 decisions.'],
      ['predict(..., flat=True, ...)', 'Runs every available expert for the same prompt, then uses the selected fusion strategy.'],
      ['decision_layer, experts_executed, total_inference_time_ms', 'Reports where the decision was made, how many experts actually executed, and elapsed inference time.'],
    ],
    output: 'Two structured prediction results that can be compared for behavior and computational cost.',
    takeaway: 'One prompt cannot establish overall speed or quality. Compare both methods on the same held-out set and hardware.',
  },
  K: {
    steps: [
      ['confusion_matrix(...).ravel()', 'Returns true negatives, false positives, false negatives and true positives, in that order.'],
      ['f1_score(...)', 'Balances precision and recall for the positive research class.'],
      ['fp / (fp + tn)', 'Measures the fraction of genuinely benign examples incorrectly flagged. If no benign examples exist, FPR is undefined.'],
      ['roc_auc_score(y_true, scores)', 'Measures ranking across thresholds using continuous scores; the example returns None if only one class is present.'],
    ],
    output: 'Measured classification metrics; latency and routing statistics are collected separately.',
    takeaway: 'Accuracy alone can hide missed attacks or false alarms. Report the dataset composition and evaluation partition with every result.',
  },
  L: {
    steps: [
      ['load_latest_human_reviews()', 'Conceptually loads your latest reviewed labels from Supabase, including corrections to older reviews.'],
      ['exclude_protected_holdout_prompts(...)', 'Prevents reviewed copies of meta-training, validation or test prompts from entering the base-training additions.'],
      ['refit_experts_and_meta(...)', 'Represents the full retraining workflow: updated base data for experts and the separate meta partition for fusion. It is not instant online learning.'],
      ['validation_gate(...)', 'Compares candidate validation results with the incumbent before accepting an update. Test results are not used for recurring selection.'],
      ['activate... and prepare_vercel_package(...)', 'Switches the accepted local model and prepares deployment assets. The hosted model changes only after a successful deployment.'],
    ],
    output: 'A validated model version or a rejected candidate, with review/training status.',
    takeaway: 'These helper names illustrate the process, not a runnable script. A correction does not guarantee an immediate change; the PC worker must be running.',
  },
};
