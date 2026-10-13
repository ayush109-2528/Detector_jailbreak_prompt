# HMEG change manifest

Existing pages and APIs were extended in place. Generated datasets, trained artifacts, experiment results and credentials are excluded from this source-file list.

## Files created

- `backend/app/routes/research.py`
- `backend/app/services/experiments.py`
- `backend/app/services/research.py`
- `backend/migrations/002_experiments.sql`
- `backend/ml/__init__.py`
- `backend/ml/ensemble/__init__.py`
- `backend/ml/ensemble/flat_ensemble.py`
- `backend/ml/ensemble/hmeg.py`
- `backend/ml/ensemble/meta_classifier.py`
- `backend/ml/ensemble/router.py`
- `backend/ml/evaluation/__init__.py`
- `backend/ml/evaluation/ablation.py`
- `backend/ml/evaluation/data.py`
- `backend/ml/evaluation/metrics.py`
- `backend/ml/evaluation/ood.py`
- `backend/ml/evaluation/routing_analysis.py`
- `backend/ml/experts/__init__.py`
- `backend/ml/experts/anomaly_expert.py`
- `backend/ml/experts/base.py`
- `backend/ml/experts/features.py`
- `backend/ml/experts/instruction_expert.py`
- `backend/ml/experts/lexical_expert.py`
- `backend/ml/experts/obfuscation_expert.py`
- `backend/ml/experts/semantic_expert.py`
- `backend/ml/training.py`
- `backend/requirements-research.txt`
- `backend/scripts/migrate_feedback.py`
- `backend/scripts/research_cli.py`
- `backend/tests/test_hmeg.py`
- `docs/hmeg-files.md`
- `docs/hmeg-guide.md`
- `frontend/src/api/hmeg.ts`
- `frontend/src/components/HmegAnalyzer.tsx`
- `frontend/src/components/HmegArchitecture.tsx`
- `frontend/src/components/HmegFlow.tsx`
- `frontend/src/components/LiteratureComparison.tsx`
- `frontend/src/components/ResearchExperiments.tsx`
- `frontend/src/components/ResearchProgression.tsx`
- `frontend/src/components/RoutingControls.tsx`
- `frontend/src/tests/Hmeg.test.tsx`
- `frontend/src/types/hmeg.ts`

## Files modified

- `.gitignore`
- `README.md`
- `backend/app/main.py`
- `backend/app/routes/api.py`
- `backend/requirements.txt`
- `frontend/src/api/client.ts`
- `frontend/src/components/Layout.tsx`
- `frontend/src/components/TrainingFeedback.tsx`
- `frontend/src/pages/Analyzer.tsx`
- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/pages/Ensemble.tsx`
- `frontend/src/pages/ModelComparison.tsx`
- `frontend/src/pages/PythonCode.tsx`
- `frontend/src/pages/ResearchInfo.tsx`
- `frontend/src/pages/TrainingPipeline.tsx`
- `frontend/src/styles.css`
- `frontend/src/tests/Analyzer.test.tsx`
- `frontend/src/tests/Ensemble.test.tsx`
- `frontend/src/tests/ResearchPanels.test.tsx`
- `frontend/src/types/index.ts`
- `frontend/vite.config.ts`

Additional verification artifact: `docs/hmeg-browser.png`.

