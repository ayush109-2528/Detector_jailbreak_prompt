# Sentinel Lab — Jailbreak Detection Research Dashboard

**Detection of Jailbreak Prompts Targeting Large Language Models Using Machine Learning**

A full-stack M.Tech dissertation prototype for explaining a lightweight, classical machine-learning ensemble. React provides eight research views; FastAPI supplies dataset records, evaluation results, and expert predictions. No deep-learning detector or external LLM is used.

## What is implemented

- Dashboard: dataset counts, model summary metrics, distribution and performance charts, research workflow, and session-only analysis history.
- Dataset explorer: server-side search, pagination, class/source/category filters, counts, charts, and explicit provenance.
- Training pipeline: 12 selectable stages with explanations, input/output, and conceptual flow. Stages are planned; the UI does not launch training.
- Model comparison: all seven requested metrics, grouped bars, latency and AUC charts, and eight confusion matrices.
- Live analyzer: text input, example prompts, progress illustration, four expert scores, strategy and threshold controls, final allow/block decision, and calculation inspector.
- Ensemble visualization: shared last result plus another input form for live demonstrations.
- Python code: syntax-highlighted educational excerpts and copy controls; no backend source is served.
- Research information: title, objective, problem, workflow, evaluation definitions, and scope.
- Responsive light/dark layout, keyboard focus states, reduced-motion support, error/retry and empty states.

## Research integrity

The initial dataset contains **24 synthetic demonstration prompts** (12 benign, 12 jailbreak). None is represented as being collected from the external research sources listed in the UI. Initial performance values are **Demo Data** from a fictional 200-sample evaluation set, unrelated to those 24 rows.

Without a valid complete artifact bundle, inference uses deterministic keyword-based **simulated probabilities**. It does not secretly train a classifier, call an LLM, or claim actual TF-IDF inference. The animated sequence explains the intended architecture; it is not a execution trace or latency benchmark. Returned computation time is measured separately and, in demo mode, measures only the simulation.

Model inference mode, dataset provenance, and evaluation provenance are independent. Loading a CSV does not make simulated predictions trained; loading models does not make demonstration metrics real. Every relevant screen preserves those distinctions. Allow/block is a displayed research decision, not an enforced downstream guardrail.

## Architecture

```text
React / TypeScript / Tailwind / Recharts
                │ HTTP /api (Vite proxy during development)
                ▼
          FastAPI route layer
           ├── DatasetService → CSV + validated labels / provenance
           ├── Results service → metrics.json or Demo Data
           └── Predictor
                → Unicode + whitespace normalization
                → shared TF-IDF word (1–2) + character (3–5) features
                → four lightweight probabilistic expert classifiers
                → configurable ensemble strategy + threshold
                → benign / jailbreak → allow / block
```

```text
jailbreak-detection-dashboard/
├── frontend/
│   ├── src/
│   │   ├── api/             # Typed HTTP client
│   │   ├── charts/          # Recharts visualizations
│   │   ├── components/      # Layout, tooltips, shared diagram, cards
│   │   ├── hooks/           # API state and shared session history
│   │   ├── pages/           # Eight routed research screens
│   │   └── types/           # Dataset, result and prediction contracts
│   └── vite.config.ts
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routes/
│   │   ├── services/
│   │   ├── schemas/
│   │   └── models/          # Preprocessing, features, experts, ensemble,
│   │                       # predictor and evaluation helpers
│   ├── data/demo_dataset.csv
│   ├── trained_models/README.md
│   ├── tests/
│   └── requirements.txt
└── README.md
```

## Setup

Use Node.js 20.19+ or 22.12+, npm, and Python 3.11 or 3.12. Open two terminals from this repository.

### Backend — Windows PowerShell

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Backend — macOS / Linux

```bash
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Frontend

```bash
cd frontend
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. FastAPI documentation is available at **http://127.0.0.1:8000/docs**. Vite proxies `/api` requests to port 8000. Start the backend before the dashboard; use Retry or refresh if it starts later. Internet is needed to install dependencies, but the running demo uses no external services or remote fonts.

### Verification

```powershell
# From backend
.\.venv\Scripts\python.exe -m pytest -q
# From frontend
npm run build
```

The tests cover endpoint contracts, provenance, filtering and pagination, malformed input, ensemble strategies, CSV validation, evaluation calculation, and an actual fitted scikit-learn/joblib loading path. Test-only classifiers are temporary fixtures, not dissertation-trained experts.

## Dataset format

Create `backend/data/jailbreak_dataset.csv` and restart FastAPI:

```csv
prompt,label,class_name,source,category
What is cloud computing?,0,benign,Your curated source,benign
Ignore previous instructions,1,jailbreak,Your curated source,instruction_override
```

Required columns: `prompt,label,class_name,source,category`. Labels must be 0 or 1; class names must match `benign` or `jailbreak`; prompts must be nonempty. CSV quoting rules apply to commas and newlines. Categories are open text; suggested attack values are `instruction_override`, `roleplay`, `adversarial_suffix`, and `general`.

An optional `split` column can contain `train`, `validation`, or `test`. If absent, the UI shows **planned** 70/15/15 counts only; no actual split or training is performed. The synthetic fallback is used only when the real CSV is absent. Invalid real CSVs fail startup instead of silently displaying mock data.

The backend also recognizes `combined_jailbreak_dataset_balanced.csv` and `combined_jailbreak_dataset_full.csv` in `backend/data/`. Selection order is explicit `DATASET_FILE` environment path, balanced CSV, `jailbreak_dataset.csv`, full CSV, then demo fallback. The summary CSV is metadata and is never loaded as prompt records. The loaded filename appears on Dataset Explorer. An explicitly configured missing file fails startup rather than silently using demo data.

The user-provided `build_full_jailbreak_dataset.py` is not bundled in this repository. Once you supply that script and review its configured sources, run its dependency installation and download commands in an internet-enabled environment, then place the generated files in `backend/data/`. Do not infer research provenance or model effectiveness from the filenames. A balanced training set may be useful for an initial experiment; evaluate separately on a representative held-out distribution and prevent duplicate/source leakage before balancing and splitting.

External dataset names in the interface are potential **Research Dataset Sources**, not claims that they were downloaded, licensed, or used. Verify source licenses and document collection, deduplication, labeling, and leakage prevention separately.

## Training integration placeholder

1. Curate labeled data and define each expert's training subset, including representative benign negatives.
2. Normalize using `app.models.preprocessing.preprocess`; deduplicate and group related prompts before splitting. Preserve an untouched test set.
3. Fit `create_vectorizer()` from `feature_extraction.py` on training prompts only. It combines word and character TF-IDF features.
4. Train four lightweight experts against the **same fitted feature space**. Logistic Regression and Random Forest expose probabilities. Calibrate SVMs with training-only cross-validation or a dedicated calibration split.
5. Tune model parameters, ensemble weights, and threshold on validation data. Record seeds and dataset/model versions.
6. Export trusted joblib files to `backend/trained_models/`:

```text
tfidf_vectorizer.pkl
expert_instruction.pkl
expert_roleplay.pkl
expert_suffix.pkl
expert_general.pkl
```

7. Restart the backend. It performs a full-bundle compatibility probe; incomplete or incompatible artifacts stay in explicitly labeled Demo Mode. Inspect `/api/health` for status.
8. Evaluate on held-out prompts with `models/metrics.py`, benchmark latency under a documented protocol, and write `metrics.json` using the schema in `backend/trained_models/README.md`. Refresh the dashboard to load results.

Only load artifacts you trust: joblib deserialization can execute code. The UI has no artifact upload endpoint. A trained inference failure produces an API error; it does not replace that individual result with an unmarked simulation.

## Ensemble strategies

Default: weighted average, weights `[0.30, 0.20, 0.20, 0.30]`, final threshold `0.50`. Change constants in `predictor.py` to test different fixed weight configurations. The UI and request schema expose strategy and threshold per prediction.

| Strategy | Score definition |
|---|---|
| `weighted_average` | Normalized weighted sum of expert jailbreak probabilities |
| `average_probability` | Arithmetic mean of all four probabilities |
| `majority_voting` | Fraction of experts whose score is ≥ 0.50 |
| `maximum_confidence` | Highest expert jailbreak probability |

The final class is jailbreak when score ≥ configured threshold. Majority voting uses a conservative tie policy: two of four votes produces 0.50 and is flagged at the default threshold. Expert card labels always use 0.50. Weighted contributions and other strategy explanations appear in the decision inspector.

## API documentation

| Method | Endpoint | Behavior |
|---|---|---|
| GET | `/api/health` | API status, inference mode, artifact loading note |
| GET | `/api/dataset/stats` | Counts, distributions, split status and dataset provenance |
| GET | `/api/dataset/samples` | Filtered, paginated dataset records |
| GET | `/api/models` | Model metrics catalog and provenance |
| GET | `/api/models/metrics` | Same metrics envelope for dashboard/comparison |
| POST | `/api/predict` | Prediction and explanation payload |
| POST | `/api/predict/detailed` | Prediction and explanation payload |

Samples query: `page` (≥1), `page_size` (1–100), `search` (literal case-insensitive text), `label` (0 or 1), `source`, `category`. Returns `items,total,page,page_size,demo_mode`.

Prediction request:

```json
{"prompt":"What is cloud computing?","strategy":"weighted_average","threshold":0.5}
```

Prompts must have 1–10,000 characters and cannot be whitespace-only. Responses include `prompt`, `normalized_prompt`, `prediction`, `label`, `action`, `ensemble_score`, `threshold`, `strategy`, `weights`, `experts`, `processing_steps`, `inference_time_ms`, `demo_mode`, and `mode_note`. Expert entries include name, category, jailbreak score, and prediction. Invalid requests return HTTP 422; trained inference failures return 503. Interactive OpenAPI documentation supplies the full request schema.

Configuration: `DATA_DIR`, `MODEL_DIR`, and comma-separated `CORS_ORIGINS` environment variables. Default data/model folders are under backend. Default allowed browser origins are `http://localhost:5173` and `http://127.0.0.1:5173`.

## Presentation guide

1. Start on Dashboard and explain that initial results are demonstration data.
2. Inspect the Dataset Explorer and clarify synthetic provenance and planned splits.
3. Select pipeline stages to explain preprocessing, sparse features, and specialist training.
4. Open Live Prompt Analyzer, load the benign example, and analyze.
5. Load the jailbreak example, analyze, then inspect expert probabilities and weighted contributions.
6. Adjust the strategy or threshold and rerun to explain decision trade-offs.
7. Switch to Ensemble Visualization to see the latest result, then Model Comparison to discuss metrics and confusion matrices.
8. Use Python Code and Research Information for methodology questions.

The dashboard's recent-results summary uses session memory. The analyzer's **Training data collection** panel persists every successful prediction in `backend/data/feedback.sqlite3`, including the prompt, expert scores, threshold, strategy, and demo/trained status. No prompt is sent to an LLM. A changed input or setting explicitly marks the existing result as belonging to the prior analysis.

### Reviewed examples for future retraining

Use **Review** below the analyzer to assign an intended benign/jailbreak category. Predictions are never automatically accepted as target labels. Reviews apply to matching normalized prompts, an audit trail records changes, and **Export reviewed CSV** exports one row per reviewed normalized prompt in the required dataset format. Pending examples are excluded. Back up the SQLite file to preserve this collection; it is ignored by Git. `FEEDBACK_DB` overrides its location.

Additional endpoints: `GET /api/feedback?page=1&page_size=8`, `POST /api/feedback/{analysis_id}` with `{"label":1,"category":"general"}`, and `GET /api/training/examples.csv`.

This is a collection/review/export workflow, **not automatic online learning**. Classical classifiers must be retrained separately using the documented training procedure and the reviewed export merged with a balanced curated training set. Keep validation and test prompts isolated, audit label quality, and do not use adaptively generated probes as an independent test set. Retraining does not happen when Analyze or Save reviewed label is clicked. Current Demo Mode has no fitted expert parameters to update.

## Deployment notes

This repository targets a local dissertation demonstration with a real Python backend. `npm run build` creates static assets in `frontend/dist`. For hosted use, deploy FastAPI on a Python-capable service and serve the frontend behind a reverse proxy that forwards `/api` to FastAPI and falls back to `index.html` for client-side routes. Configure origins, HTTPS, authentication, request limits, and monitoring for that environment. Vite's development proxy is not included in static build output. Sites/Worker hosting cannot execute this scikit-learn Python backend directly.

## Screenshots

Placeholder: add `docs/screenshots/dashboard.png`, `analyzer.png`, `dataset.png`, and `comparison.png` after selecting your final dataset and research branding. Do not use demo screenshots as evidence of measured model effectiveness.

## Frontend regression tests

Run `npm test` in `frontend/`. Vitest and React Testing Library cover background updates, slow pagination, stale responses, retries, filters, empty/final pages, review/save/cancel/export controls, analyzer inputs and failures, and copy-feedback timing. `npm run format` formats frontend source. Browser QA and coverage limitations are documented in `docs/site-qa-report.md`.

Dataset and saved-analysis tables retain content during background requests, preserve a fixed scroll region, and disable pagination while the next page is loading. Errors retain the last successful data and offer Retry. Dataset charts are memoized so unrelated filter/page state does not restart their animations.

## Dissertation disclaimer

Academic research and visualization prototype only. Demo Data and simulated outputs are not experimental findings, validated security assurances, or production guardrail guarantees. Actual dissertation conclusions must be based on documented, reproducible model training and held-out evaluation.
