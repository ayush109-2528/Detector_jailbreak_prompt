# HMEG implementation and research guide

Project: **Detection of Jailbreak Prompts Targeting Large Language Models**

For the current 300K augmented dataset, reviewed-label worker, and existing Vercel deployment, follow [PC learning and Vercel setup](pc-learning-vercel.md). When `AUTO_LEARNING=1`, the worker owns training and synchronous website training/evaluation jobs are disabled.

The existing routes, sidebar, styling, dataset explorer, charts, legacy prediction API and reviewed-example workflow are preserved. HMEG extends the existing pages, rather than replacing the repository.

## Research progression

| Level | Implemented experiment |
|---|---|
| A — Single guardrail | Word LR, calibrated SVM, Random Forest, XGBoost, semantic-only (optional), character-only, supervised structural anomaly detector |
| B — Specialized experts | Lexical, obfuscation, semantic intent, adversarial/anomaly, instruction manipulation |
| C — Flat ensemble | All available experts execute; majority, average, fixed weighted probability, meta LR, meta XGBoost |
| D — HMEG | Fast experts → confidence router → early exit or deeper experts → learned fusion |

Experts specialize through their **feature representation and detection mechanism**, not arbitrary algorithm numbering. Their effectiveness for each attack family still needs category-specific scientific evaluation.

1. Lexical: word TF-IDF unigrams/bigrams and LR.
2. Obfuscation: character 3–5 grams plus raw case, digits, spacing, punctuation and repetition statistics; LR.
3. Semantic: optional locally cached sentence-transformers/all-MiniLM-L6-v2 embeddings and LR.
4. Anomaly: structural statistics including entropy, length, repetition, prefix/suffix measures; XGBoost, with explicit LR fallback when unavailable. A callable perplexity provider can be supplied; none is bundled.
5. Instruction: word TF-IDF 1–3 grams plus hierarchy/persona/replacement indicators and LR.

Raw prompts are preserved for case and formatting statistics; word pipelines reuse existing Unicode/text normalization. No external generative LLM is invoked.

## HMEG flow and prediction semantics

Layer 1 runs lexical and obfuscation experts. Default fast score is 0.5 × p1 + 0.5 × p2.

- fast_score ≤ LOW_THRESHOLD: benign at Layer 1.
- fast_score ≥ HIGH_THRESHOLD: jailbreak at Layer 1.
- otherwise run available semantic, anomaly and instruction experts, then the fitted meta-classifier (decision layer 3).

Default low/high are 0.20/0.80 and final fusion threshold is 0.50. These are tunable starting values, **not empirically optimal thresholds**. Early decisions use low/high directly, not the final fusion threshold. The UI shows the exact thresholds used by each saved decision. Saving defaults persists them locally or in Supabase; an analyzer override affects only that request.

Returned records include final_probability, prediction, label, action, decision_layer, routed_to_layer_2, expert status, expert time, fast score, meta score, routing thresholds and total computation time. Skipped/absent expert scores are null, never fabricated zeros. HMEG with a missing optional semantic expert uses a meta-classifier trained for the available feature schema and is explicitly labeled **reduced expert set**. Full five-expert HMEG requires MiniLM training. Demo Mode is explicitly simulated, including its averaging substitute for meta fusion.

Flat weights are lexical .25, obfuscation .20, semantic .20, anomaly .15, instruction .20, normalized over the executed set. They are configuration defaults, not learned weights. Learned fusion is a separate meta LR or XGBoost experiment. An individual expert prediction runs only the selected expert.

The animation highlights completed backend execution after the response; it is not server streaming. Pending requests never highlight experts as having executed. Legacy analysis animation remains explicitly illustrative.

## Training and leakage controls

Use the current CSV loader; original source_dataset, attack_category, research_split and verification_status are preserved. The supplied expanded collection is the default. No new research training examples are generated.

Recorded train/validation/test partitions are honored. If absent, a deterministic stratified 70/15/15 partition is made for training (the Dataset page's counts remain planned until assignments are recorded in a CSV). Training is subdivided into 75% base fitting and 25% meta fitting. The base experts are not refitted on meta/validation/test rows afterward. SVM calibration uses base-training-only cross-validation.

Duplicate normalized prompts are grouped; conflicting labels and duplicate keys crossing recorded splits are rejected. OOD removes any exact normalized held-out prompt from training. Near-duplicate and semantic leakage are **not** automatically resolved; review source provenance and category coverage.

Routing sweeps use validation only. Comparison/ablation controls allow validation or test; validation is the UI default. Reserve an untouched final test set for dissertation reporting. Meta fusion for each expert-removal ablation is refitted on the same meta partition with the reduced input schema. Missing semantic/XGBoost variants are unavailable rather than assigned results.

OOD trains a new temporary suite from selected sources, excludes the entire held-out source from fitting and validation, selects the best single baseline by in-source validation F1, then measures on the held-out source. The active deployed model is not replaced. A single-class held-out set has undefined ROC-AUC and undefined FPR if it contains no benign rows; these are displayed as N/A.

## Run locally (PowerShell)

From the repository root, use two terminals:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

```powershell
cd frontend
npm ci
npm run dev
```

If using the existing uv-managed environment without pip:

```powershell
uv pip install --python .\.venv\Scripts\python.exe -r requirements.txt
```

Open http://127.0.0.1:5173/analyzer. OpenAPI is http://127.0.0.1:8000/api/docs.

Use Training Pipeline to train all dependencies, then select Trained artifacts in Analyzer. Training one expert writes a standalone artifact and does not overwrite the active HMEG bundle. Standalone training of semantic requires its optional dependencies.

Command-line equivalent from backend:

```powershell
.\.venv\Scripts\python.exe scripts/research_cli.py --train --evaluate comparison --partition validation
.\.venv\Scripts\python.exe scripts/research_cli.py --evaluate routing
.\.venv\Scripts\python.exe scripts/research_cli.py --evaluate ablation --partition validation
.\.venv\Scripts\python.exe scripts/research_cli.py --evaluate ood --sources "SOURCE A" "SOURCE B" --held-out "SOURCE C"
```

Restart FastAPI after training from a separate CLI process; API-initiated training updates the running instance automatically. Run one local backend worker for training/configuration. The in-process lock prevents overlapping training/evaluation requests, but is not a distributed job scheduler.

## Optional semantic integration

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-research.txt
.\.venv\Scripts\python.exe -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"
```

The second command explicitly downloads the pretrained encoder. Runtime loading is local-files-only and never silently downloads it. Then retrain all models to fit five-input fusion. Optional perplexity accepts a local callable via PerplexityFeatures; no language model/perplexity provider is bundled. The system runs without either dependency.

New dependencies: XGBoost, python-dotenv; psycopg[binary] was added for Supabase. Optional sentence-transformers supplies MiniLM embeddings and its neural dependencies. LR is the alternative meta model. Optional absence is recorded in the catalog/results.

## API additions (all under /api)

- POST /train/expert/{lexical|obfuscation|semantic|anomaly|instruction}
- POST /train/all-experts, /train/flat-ensemble, /train/hmeg
- POST /predict/expert/{expert_name}, /predict/flat-ensemble, /predict/hmeg
- POST /evaluate/comparison, /evaluate/ablation, /evaluate/ood, /evaluate/routing
- GET /routing/config; PUT /routing/config
- GET /research/catalog; GET /research/experiments

Legacy /predict, /predict/detailed, dataset, model metrics, history, review and export APIs are unchanged. See OpenAPI for complete validated request bodies. Example:

```json
{
  "prompt": "Explain cloud computing.",
  "mode": "trained",
  "routing": {
    "low_threshold": 0.2,
    "high_threshold": 0.8,
    "lexical_weight": 0.5,
    "threshold": 0.5
  }
}
```

Training and evaluation endpoints are disabled inside Vercel functions. Run research jobs locally; hosted Vercel serves inference, stored experiments and reviews. Model artifacts in backend/trained_models/hmeg are ignored by Git and require deliberate inclusion in a deployment. Keep the active.txt pointer and referenced trusted joblib artifact together, with compatible dependencies and cached encoder if used. Supabase stores records, not executable model binaries.

## Experiment persistence

Local experiment JSON is under backend/data/experiments, overridable with EXPERIMENT_DIR. With DATABASE_URL, experiments/default routing use Supabase. Each record stores its experiment/run ID, model type, features, serializable hyperparameters, thresholds, sources, partition fingerprints, confusion matrix, ROC points, FNR/FPR, average/P95 latency, layer exit/routing rates, average experts, timestamp, seed and runtime.

Latency measures sequential per-prompt feature extraction/inference, excluding HTTP, storage and UI animation. Mean layer times include zero for skipped layers. No cold/warm latency equivalence or hardware-independent performance is claimed. Model size measures serialized components; optional external encoder weights are not included. Timing of component fitting is stored separately from complete-suite fitting. Scientific benchmarking should control cache/warmup and report repeated runs/confidence intervals.

Schema version 2 records correct per-variant component metadata; initial version-1 integration-check files are retained locally for audit but excluded from the current result selector.

## Supabase history migration

1. Run backend/migrations/001_feedback.sql, then 002_experiments.sql in Supabase SQL Editor.
2. Put the transaction-pooler PostgreSQL URI in an ignored file at **jailbreak-detection-dashboard/backend/.env**:
   DATABASE_URL=your_actual_postgresql_uri
3. From backend, run:

```powershell
.\.venv\Scripts\python.exe scripts/migrate_feedback.py --source-id dissertation-local-history
.\.venv\Scripts\python.exe scripts/migrate_feedback.py --source-id dissertation-local-history --apply
```

The first command is a read-only dry run. The second imports analyses, reviews and review_audit in one PostgreSQL transaction, with an advisory lock and per-source import ledger. New destination IDs avoid collisions; the ledger maps original IDs. Reusing the same source ID skips previously imported rows. Newer destination reviews are not overwritten by older local reviews. The SQLite source is never modified or deleted. Re-run after later local analyses to copy the new records.

The migration loads backend/.env itself. To switch the local API to Supabase, start uvicorn with --env-file .env; plain local uvicorn intentionally remains SQLite unless DATABASE_URL is already in the environment. Configure the same server-only variable in Vercel for hosted use. Supabase is an external database, not a Vercel service binding.

Migration completed on 2026-10-13: verified the destination had no existing research schema, created the six application tables, and imported 29 analyses, 2 reviews and 3 review-audit entries. A second import added zero records; destination counts matched the local snapshot. The SQLite source remains unchanged. Only the research schema was created; unrelated project tables and settings were not changed. Credentials remain in the ignored backend/.env and were not displayed. Existing local experiment JSON files are separate from this history/review migration.

For an existing shared Supabase project, inspect the research schema and named objects before executing either migration. If any belongs to another application, do not run these scripts against it; choose a distinct schema and adapt the backend first. Migrations only restrict permissions on the six named application tables and their identity sequences, never all tables in the schema. They do not modify public/auth/storage tables or project-wide settings. Keep the research schema outside the exposed Data API schemas.

## Literature-only integrations

Llama Guard, NeMo Guardrails, MoJE, RigorLLM and EGuard have linked primary-source descriptions in Research Information / Model Comparison. None is executed or assigned numerical results. HMEG implementation is not a novelty, superiority or state-of-the-art claim.

## Verification and limitations

- Backend unit/API regression suite plus routing boundary/skip, raw feature, partition leakage and OOD source separation tests.
- Frontend legacy regression suite plus HMEG validation, stale-result and execution-status tests.
- Real fitting/validation, routing, ablation and OOD smoke runs use the supplied CSV.
- Initial OOD check against the 20-record TrustAIRLab source had poor detection (HMEG missed all positives in that preliminary configuration); this is retained honestly, not hidden behind in-source validation scores. Source/category imbalance and generalization require further research.
- Supabase history/review import and duplicate prevention were verified against the live database. MiniLM, a perplexity provider and external guardrail integrations remain optional and unverified here.


Final verification: 69 backend tests and 27 frontend tests passed; TypeScript and the Vite production build passed. Browser checks verified saved early-exit and deeper-analysis decisions, skipped/unavailable expert states, and the expert inspector. Latest reduced-set HMEG validation F1 was 0.93846 on 107 rows; held-out-source F1/recall was 0 on 20 positive rows. These are preliminary experiments, not evidence of superiority.
