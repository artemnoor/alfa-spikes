# T10 verification report

Date: 2026-10-17. `NOT_RUN` means no evidence was collected for that check.

## Checks run

| Check | Result | Evidence |
|---|---|---|
| T10 unit tests | **49 passed, 0 failed** | `npm run test:unit`; includes entity recovery, exact evidence, relation semantics, prompt failure and gap/profile rules. |
| T10 PostgreSQL/API integration | **14 passed, 0 failed** | `npm run test:api` against the configured local PostgreSQL/pgvector database; profile/source APIs, B01–B11 run record, evidence persistence, entity resolution and vector retrieval. |
| Production frontend build | **PASSED** | Root `npm run build` (`tsc && vite build`). |
| Whitespace/diff check | **PASSED** | `git diff --check`. |
| Real Polza AI benchmark | **COMPLETED** | Matched R04–R16: 85 calls, 0 failed, ₽0.402963. Separate R01–R13 diagnostic: 106 calls, 0 failed, ₽0.371171. Reports include raw outputs and accounting. |
| Browser E2E | **PASSED WITH UI WARNINGS** | On isolated Vite/API ports, created a clearly labeled temporary profile, added and processed a text source, inspected graph and gaps, saved a gap answer, reprocessed the same profile (second run completed), and confirmed the JSON export control was available. The temporary profile and orphan company row were deleted afterward. React logged duplicate-key warnings while rendering returned list data; this did not block the flow and remains a UI issue to trace. The unrelated T08/T09 health-check CORS noise was not part of this T10 path. |

## Checks not run

| Check | Result | Reason |
|---|---|---|
| Browser export download assertion | `NOT_RUN` | The export action was visible in the completed browser flow, but a download event/file-content assertion was not captured. |
| Migrations against a clean, disposable PostgreSQL database | `NOT_RUN` | Integration tests used the configured shared local database; no clean database was provisioned. |
| Repeat full AI run on an already-populated profile | **PASSED ON ONE TEMPORARY PROFILE** | Browser run #2 completed on the same profile after the gap answer was saved; its profile version advanced to 2. This is a smoke result, not a repeatability or concurrency study. |
| New independent 30+ official-source dataset and blind holdout | `NOT_RUN` | The 13 existing official-source excerpts are regression data. No additional manual labeling was produced, so no holdout score is claimed. |
| Retrieval ranking metrics (Recall@5/10, MRR) | `NOT_RUN` | No independently judged relevant-chunk set exists. |
| Gap-detection precision/recall and usefulness | `NOT_RUN` on independent data | Existing 50-case gap suite is synthetic. |
| Direction/status accuracy, concurrency, load and P95 per-call latency | `NOT_RUN` | No corresponding gold labels, concurrent-run harness or per-call latency distribution were collected. |
| T08 graph/event-status invariants | **PASSED** | `npm run test:entities:graph` and `npm run verify:entity-status` verified saved graph statuses for five articles. |
| T09 unit + PostgreSQL + API suites | **PASSED** | `npm run test:all` completed successfully, including pgvector persistence and HTTP validation. |

## Interpretation

Passing unit/API tests show the implemented contracts and local persistence paths behave as tested. They do not establish business-graph accuracy. On the only comparable live set, relation F1 is 16.7% and entity F1 is 60.5%; these are far below the target metrics. See [BENCHMARK_COMPARISON.md](BENCHMARK_COMPARISON.md) and [REMAINING_LIMITATIONS.md](REMAINING_LIMITATIONS.md).
