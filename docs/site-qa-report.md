# Site QA — 10 October 2026

## Fixes

- Replaced destructive loading-state switches with background refreshes. Existing rows and pagination remain mounted during updates.
- Dataset and saved-analysis results use stable-height scroll regions; loading status reserves space and cannot shift the page.
- Pagination is disabled while fetching or after a failed request; Retry retrieves the requested page. Displayed page numbers follow the actual loaded response.
- Memoized dataset charts and category data so filtering or changing pages does not restart unrelated chart animations.
- Fixed overlapping Copy-button timers, which could prematurely clear confirmation for a newer copy.
- Sidebar content can scroll on shorter screens.
- Added balanced/full CSV filename discovery and an explicit `DATASET_FILE` override; summary CSVs cannot be mistaken for prompt datasets.

## Automated coverage

Final verification: **21 frontend tests passed**, **39 backend tests passed**, and the production build passed. The test-tool dependency installation completed with zero reported npm vulnerabilities after upgrading to the patched runner.

Frontend regression suite: resource lifecycle and stale responses; dataset page retention under delayed responses; combined filters; first/last/empty pages; API error and Retry; training history pagination; explicit label save; review cancellation; save failure; download-link behavior; blank/oversized prompt UI constraints; both examples and Clear; strategy/threshold submission; stale-result notice; failed inference; rapid Copy-button feedback and denied clipboard handling.

Backend suite: all API endpoints; request validation; CSV validation/provenance; search and pagination; real joblib bundle loading and corrupt-bundle fallback; metrics; all four strategies at thresholds 0, 0.50, 0.95, and 1; prediction/explanation consistency; persistence across store reopening; exclusion of pending labels; review correction and category validation; deduplicated exports; multiline/quoted/Unicode CSV round-trips; history pagination boundaries; balanced-file selection and missing explicit file handling.

Tests use temporary stores or mocked APIs to test label modifications and failures without changing the user's reviewed training labels.

## Live browser checks

- Dataset pages 1–3, previous/next boundaries, all filters together, search, and no-result state.
- Dataset page 2 → 3: scroll position remained **1125.60 px**, table region remained **480 px**.
- Saved-history page 2 → 3: scroll position remained **1995.20 px**, table region remained **520 px**.
- All seven metric selections and eight confusion matrices rendered.
- All 12 training pipeline stages selectable with matching detail headings.
- All six educational Copy controls confirmed after the timer fix.
- Precision tooltip displayed the expected explanation.
- Empty Analyze button disabled; benign example ran with all four ensemble strategies at threshold 0.95.
- Observed benign scores: weighted average 0.120; average probability 0.120; majority vote 0.000; maximum confidence 0.120.
- Review editor opened, category changed, then canceled without saving a label.
- Reviewed CSV downloaded to the browser's normal Downloads folder. With no reviewed labels, a header-only file is expected.
- Ensemble page retained the latest prompt, threshold, strategy, and result.
- Mobile navigation and dark-mode toggle worked; document content width equaled viewport width (375 px), with no page-level horizontal overflow.
- Added a Reconnect control when API health fails; it refreshes shared health, dataset statistics, and metrics without a document reload. The live API was restarted and the dataset page confirmed `demo_dataset.csv` and API connected.

## Dataset integration limitation

The download script and three combined CSVs were not present in the project or parent research folder during QA. No external dataset was downloaded or represented as loaded. Supply the actual `build_full_jailbreak_dataset.py` or the generated CSV folder before validating real-source ingestion. The live application remains on its labeled synthetic demo dataset.

This is broad functional regression coverage, not a claim that every possible browser, data size, model artifact, or failure mode has been tested. Large real-dataset performance and statistical model effectiveness remain unverified until those assets are supplied.
