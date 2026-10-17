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
| Browser smoke | **PARTIAL** | Playwright opened `http://localhost:5173/`, rendered the T10 tab, and observed the local API as ready. The only console error was the existing missing `/favicon.ico` (404). No form was submitted. |

## Checks not run

| Check | Result | Reason |
|---|---|---|
| Full browser E2E: create profile → upload → extract → graph → answer gap → reprocess → export | `NOT_RUN` | Avoided creating persistent test profiles/data through the user's open local app. API integration covers profile/source/gap persistence but does not replace browser E2E. |
| Migrations against a clean, disposable PostgreSQL database | `NOT_RUN` | Integration tests used the configured shared local database; no clean database was provisioned. |
| Repeat full AI run on an already-populated profile | `NOT_RUN` | The live benchmark creates isolated profiles per case; same-profile repeat-run behavior was not evaluated end to end. SQL claim/evidence uniqueness and API idempotency tests cover only their tested operations. |
| New independent 30+ official-source dataset and blind holdout | `NOT_RUN` | The 13 existing official-source excerpts are regression data. No additional manual labeling was produced, so no holdout score is claimed. |
| Retrieval ranking metrics (Recall@5/10, MRR) | `NOT_RUN` | No independently judged relevant-chunk set exists. |
| Gap-detection precision/recall and usefulness | `NOT_RUN` on independent data | Existing 50-case gap suite is synthetic. |
| Direction/status accuracy, concurrency, load and P95 per-call latency | `NOT_RUN` | No corresponding gold labels, concurrent-run harness or per-call latency distribution were collected. |
| T08 graph/event-status invariants | **PASSED** | `npm run test:entities:graph` and `npm run verify:entity-status` verified saved graph statuses for five articles. |
| T09 unit + PostgreSQL + API suites | **PASSED** | `npm run test:all` completed successfully, including pgvector persistence and HTTP validation. |

## Interpretation

Passing unit/API tests show the implemented contracts and local persistence paths behave as tested. They do not establish business-graph accuracy. On the only comparable live set, relation F1 is 16.7% and entity F1 is 60.5%; these are far below the target metrics. See [BENCHMARK_COMPARISON.md](BENCHMARK_COMPARISON.md) and [REMAINING_LIMITATIONS.md](REMAINING_LIMITATIONS.md).
