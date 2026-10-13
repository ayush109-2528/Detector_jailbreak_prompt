# Deployment readiness check — 13 October 2026

## Verified locally

- Backend regression suite: 76 passed (one non-failing Starlette/httpx deprecation warning).
- Frontend regression suite: 27 passed.
- TypeScript and Vite production build: passed.
- `backend/scripts/check_deployment.py`: passed using Vercel-mode paths, packaged model/data and the existing Supabase configuration. Manifest hashes checked; no history or reviews written.
- Read endpoints tested: health, dataset statistics and page 2, models/metrics, research catalog/experiments, routing configuration, worker status and training report.
- Trained inference returned benign and jailbreak for the two smoke probes. These probes check execution, not research accuracy.
- Anonymous history request rejected; authenticated history read succeeded.

## Fixes from this check

- Updated copy-control tests to the expanded Python example titles.
- Isolated dataset-selection regression test from the user's changing real CSV collection.
- Hosted startup now requires an admin key and a present, loadable trained artifact.
- Pinned Python minor version to 3.12 with `.python-version`.
- Added reusable read-only packaged-deployment smoke checker and startup-guard tests.

## Live deployment — NOT passing

At https://detectorjailbreakprompt.vercel.app, `/`, `/code`, and `/models` returned HTTP 200. The browser showed the older six-example Python page and original navigation, not the latest local HMEG interface.

`/api/health`, `/api/dataset/stats`, and `/api/research/catalog` returned HTTP 500. The supplied Vercel request summary reports `FUNCTION_INVOCATION_FAILED` but does not contain the Python traceback. The root cause remains undetermined until that runtime exception is available.

Browser verification of the current local page confirmed the 12 explanation controls render. The browser session became unavailable before expanded-panel verification completed; do not count that interaction as passed.

## Before production sign-off

1. Inspect the underlying Python exception in Vercel runtime logs.
2. Link this checkout to the existing project, not a new project.
3. Configure server-only `DATABASE_URL` and `ADMIN_API_KEY`; keep PC filesystem path overrides out of Vercel.
4. Prepare deployment assets with `backend/scripts/package_vercel.py`. They are Git-ignored: pushing source alone does not publish them. Use the prepared checkout with the CLI as described in `pc-learning-vercel.md`.
5. Deploy and verify the hosted Linux build, API startup, trained inference, protected review workflow, and deep-link routing. Local Windows tests do not prove hosted Linux dependency compatibility or final function bundle size.

No production changes were made by this test run.
