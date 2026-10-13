# No paid worker: your PC + existing Vercel + Supabase

Keep the existing root `vercel.json` and Vercel project. The public `/api/*` route stays on its FastAPI service, and all other paths stay on Vite. No internal service bindings are needed: browser requests use the same-domain API and neither service calls the other internally. Supabase remains an external database. Do not switch to Render; no paid Render resources are required or configured.

## What keeps learning

The site stores prompt observations and human-reviewed labels in Supabase. The PC worker polls the reviewed CSV approximately every hour while the PC is awake and the process is running. Changed labels trigger a full expert/meta refit using the original training partition plus eligible human reviews. Model predictions never become training labels automatically. Reviews matching meta-training, validation or test prompts are excluded. Existing reviews can be corrected; the latest label replaces the old training label on the next cycle.

Parent IDs keep original prompts and their augmentations together across base/meta fitting and recorded evaluation splits. All available experts and both learned meta-classifiers are retrained; comparison baselines stay tied to their initial experiment. The semantic expert remains optional and is clearly unavailable without MiniLM.

A candidate is promoted only when validation F1 and recall do not regress by more than 0.005 and FPR does not increase by more than 0.005. These are configurable engineering gates, not scientifically optimal values. Test data is not used for recurring selection. Repeated validation selection can itself overfit; reserve fresh unseen data for final research conclusions. Correcting a label does not guarantee immediate or perfect prediction of that prompt.

## Start the PC worker

In the ignored `backend/.env`, keep the Supabase `DATABASE_URL` and the absolute local `DATASET_FILE`. Add:

```dotenv
AUTO_LEARNING=1
ADMIN_API_KEY=your_private_researcher_key
LEARNING_INTERVAL_SECONDS=3600
LEARNING_GATE_TOLERANCE=0.005
AUTO_DEPLOY_VERCEL=0
```

From backend:

```powershell
uv pip install --python .\.venv\Scripts\python.exe -r requirements.txt
.\.venv\Scripts\python.exe -u scripts/learning_worker.py
```

Keep that terminal running. Closing it or sleeping/shutting down the PC stops learning until restarted; reviews remain safely stored in Supabase. The worker prevents overlapping processes with an OS file lock. Its status, last heartbeat, included-review count and excluded-holdout count appear in the analyzer's review panel. A stale heartbeat means the PC worker may be offline.

## Prepare a validated model update

```powershell
# From backend
.\.venv\Scripts\python.exe scripts/package_vercel.py
```

This writes `backend/deployment/`: a compact inference-only model, compressed CSV for Dataset Explorer, initial evaluation report, and SHA256 manifest. Training partitions, baseline binaries, local history and secrets are not deployed. `.vercelignore` excludes the large source data and training artifacts while including the prepared deployment directory. The six prepared release files are allowlisted in `.gitignore` so Git-based deployments can include them. They must actually be committed and pushed with the code; changing the ignore rules alone does not upload them. Alternatively, deploy the prepared checkout with the CLI. Exact runtime versions are pinned directly in the self-contained `requirements.txt` to match the serialized estimators. Deployment does not need to resolve an included constraints file. Python is 3.12.

For a Git-based deployment, include `backend/deployment/`, `backend/verify_deployment.py`, `vercel.json`, and the updated `.gitignore` with the release. The backend build runs `python verify_deployment.py` and rejects missing or corrupted assets before publishing. Do not commit `.env`, raw training artifacts or local history. Every later model update must include the updated release assets and manifest, or be deployed from the PC using the CLI.

## Link your EXISTING Vercel project and deploy

Install/sign into the Vercel CLI on this PC. From repository root:

```powershell
vercel link
# Select your EXISTING deployed project, never create a replacement.
vercel deploy --prod
```

The CLI must be linked at repository root (the folder containing root `vercel.json`). Keep the existing services named `backend` and `frontend`, with the existing public rewrites. The root contains both service folders.

In Vercel's server environment set `DATABASE_URL` and the same `ADMIN_API_KEY` as the PC worker. Leave `AUTO_LEARNING` unset or `0`: Vercel performs inference only. Do not copy the PC's absolute `DATASET_FILE`, `MODEL_DIR` or `DATA_DIR` into Vercel; hosted defaults use the prepared deployment directory. Leave `VITE_API_BASE_URL` unset for same-domain `/api` routing. Never place database or admin secrets in a `VITE_` variable. Review/history/export access requires the admin key; enter it in **Researcher access** in the website (tab-session storage only).

Verify `/api/health`, `/api/dataset/stats`, trained-mode analysis, history/review saving and `/api/learning/status` after deployment. Vercel's final Linux dependency bundle limits still apply; a local frontend build does not validate the hosted Python bundle.

## Optional automatic deployment after validation

After one successful manual deployment of this checkout, set `AUTO_DEPLOY_VERCEL=1` in the PC `.env` and restart the worker. It invokes the installed `vercel deploy --prod --yes` only when the existing `.vercel/project.json` link exists. Use an authenticated CLI session. Deployment failures are recorded and retried without discarding the validated model or retraining the same labels. With `AUTO_DEPLOY_VERCEL=0`, candidates are prepared locally and the live website keeps its previous model until you deploy.

This consumes your existing Vercel/Supabase quotas; it does not provide unlimited free hosting. No remote production deploy is claimed until Vercel reports success.

## CPU-only deployment dependencies

Linux deployment installs `xgboost-cpu==3.4.1` instead of the GPU-capable `xgboost` distribution. Both expose the `xgboost` Python module; the estimator version and saved model remain unchanged. Non-Linux environments keep `xgboost==3.4.1`. Do not install both distributions into the same environment.

An isolated Python 3.12 Linux wheel installation measured 334.34 MB of dependencies, with no CUDA/NCCL directories. Together with 56.82 MB of deployment assets this is 391.15 MB, excluding source and Vercel-generated files. The hosted build is the authority for final bundle size. Test folders under `release/` are excluded from Git and Vercel uploads.

## Training provenance

The user-supplied CSV has 300,000 records: 150,000 per class; 298,985 synthetic augmentations and 1,015 originals. Do not describe this as 300,000 independent real-world attacks. The source CSV is not modified. The training report separates augmented test and original-only test performance.
