# T10 verification report

Date: 2026-10-17. `NOT_RUN` means no evidence was collected for that check.

## Checks run

| Check | Result | Evidence |
|---|---|---|
| T10 unit tests | **71 passed, 0 failed** | `npm --prefix backend/T10 run test:unit`; includes source-disjoint holdout contracts, Russian inflection/quote resolution, ambiguous company reference rejection, bounded B06 recovery including retry after invalid evidence, hybrid retrieval and B07 safeguards. |
| T10 PostgreSQL/API integration | **15 passed, 0 failed** | `npm --prefix backend/T10 run test:api` against configured local PostgreSQL/pgvector; B01–B11 persistence, identity safeguards, retrieval and relation-recovered entity provenance. |
| Production frontend build | **PASSED** | Root `npm run build` (`tsc && vite build`). |
| Whitespace/diff check | **PASSED** | `git diff --check`. |
| Real Polza AI benchmark | **COMPLETED ON CURRENT CHECKOUT** | Matched R04–R16: 99 calls, 0 failed, ₽0.266928; entity F1 70.8%, exact relation F1 14.3%. Earlier R01–R13 diagnostic: 106 calls, ₽0.371171. Raw outputs and accounting are retained. |
| Live retrieval comparison | **COMPLETED — SMALL PILOT** | 32 manually labeled queries over 16 primary-source excerpts; one Qwen embedding call, 1,471 input tokens, ₽0.001744. Qwen Recall@5/10/MRR 100/100/100%; PostgreSQL FTS 84.4/87.5/77.5%; hybrid 96.9/100/91.1%. Labels are separate from relation labels, but documents overlap R01–R16; this is not a source-disjoint holdout. |
| Independent entity/relation holdout | **COMPLETED — 30 CASES** | H01–H30 use official-source excerpts from companies absent from R01–R16. Strict normalized exact scoring: entity P/R/F1 73.5/77.2/75.3%; directed relation P/R/F1 43.5/38.5/40.8%. 216 model calls, 0 failed, 114,776 input / 16,484 output tokens, ₽0.910891; mean/P95 call latency 2,928/8,831 ms. Full outputs, labels and citations are retained in `benchmark/runs/2026-10-17-independent-holdout-live-v1/`. |
| Final independent holdout re-evaluation | **COMPLETED — 30 CASES** | Same frozen labels; strict entity P/R/F1 70.1/77.2/73.5%, directed relation P/R/F1 40.0/30.8/34.8%. 218 calls, 0 failed, 131,417 input / 18,099 output tokens, ₽0.455116; mean/P95 latency 2,927/6,346 ms. No holdout labels were used to tune this change. Relation recall was unchanged vs v3 and FPs increased from 10 to 12; this does not show generalized improvement. Raw evidence: `benchmark/runs/2026-10-17-independent-holdout-live-v4/`. |
| B06 development iteration | **COMPLETED — MATCHED R04–R16** | After enabling one bounded retry for rejected cue-bearing chunks: entity P/R/F1 64.0/66.7/65.3%, directed relation P/R/F1 62.5/62.5/62.5%; 110 calls, 0 failures, ₽0.283928. A true R12 triple set was recovered after the first response used non-exact quotes. This is one stochastic development run, not independent accuracy. Raw evidence: `benchmark/runs/2026-10-17-b06-validation-retry-R04-R16-v1/`. |
| Independent source-disjoint retrieval | **COMPLETED — 30 DIRECT + 30 PARAPHRASED QUERIES** | Both sets search the same 30 new company excerpts, with labels frozen before runs. Qwen vector Recall@5/MRR: direct 100/100%; paraphrased 100/97.8%. Hybrid: direct 100/100%; paraphrased 96.7/92.2%. FTS and BM25 metrics are in the run reports. Combined embedding spend ₽0.003819. Each run used one batched embedding call. |
| Live adversarial B07 check | **COMPLETED — DIAGNOSTIC** | One DeepSeek call (396 input/93 output tokens, ₽0.001565, 2.078 s) on 10 synthetic cases. The deterministic gate rejected two proposals before semantic review; the remaining eight were reviewed. Final TP/FP/FN/TN=1/0/0/9. This is not a real-world accuracy estimate. |
| Final live adversarial B07 check | **COMPLETED — DIAGNOSTIC** | One DeepSeek call (396 input/98 output tokens, ₽0.001591, 2.032 s), 11 synthetic cases including merger-vs-PART_OF, TP/FP/FN/TN=1/0/0/10. False acceptance 0/10. This is not a real-world accuracy estimate. Raw evidence: `benchmark/runs/2026-10-17-negative-b07-final-v2/`. |
| Targeted B06 context probe | **COMPLETED — 3 CASES** | 6 DeepSeek calls, 4,701 input / 491 output tokens, ₽0.015277; TP/FP/FN/TN=2/0/0/1. Unique cross-chunk reference and exact quoted PRODUCT recovery passed; ambiguous-company merger relation rejected by deterministic B07. This is diagnostic only. Raw evidence: `benchmark/runs/2026-10-17-b06-context-live-v2/`. |
| Interrupted benchmark configuration check | **STOPPED AFTER 1 CASE** | A first invocation selected R01 instead of the intended R04–R16 range and was stopped after its first completed case; 8 calls, ₽0.040134. Excluded from reported quality metrics. The intended matched R04–R16 run was then executed with an explicit start index and limit. |
| Browser E2E | **PASSED** | With Playwright, created a clearly labeled temporary profile, added a synthetic public text source, ran B01–B11, downloaded `t10-business-profile-v1.json`, parsed the downloaded file as JSON, and confirmed its profile/version/entities. A repeated B10 retrieval candidate had produced duplicate React keys; T10 now deduplicates candidates by chunk before rendering. After the fix, the T10 browser console had 0 errors and 0 warnings. The temporary profile/company and downloaded test file were removed. |

## Checks not run

| Check | Result | Reason |
|---|---|---|
| Browser export download assertion | `NOT_RUN` | The export action was visible in the completed browser flow, but a download event/file-content assertion was not captured. |
| Migrations against a clean, disposable PostgreSQL database | **PASSED** | Applied all 9 T10 migrations to an isolated temporary database, verified both FTS GIN indexes, and dropped the temporary database. |
| Repeat full AI run on an already-populated profile | **PASSED ON ONE TEMPORARY PROFILE** | Browser run #2 completed on the same profile after the gap answer was saved; its profile version advanced to 2. This is a smoke result, not a repeatability or concurrency study. |
| Retrieval ranking on a production-sized corpus | `NOT_RUN` | Both source-disjoint retrieval variants have 30 documents; they cannot establish behavior on larger company repositories. |
| Gap-detection precision/recall and usefulness | `NOT_RUN` on independent data | Existing 50-case gap suite is synthetic. |
| Direction/status accuracy on independent real labels, concurrency, load and P95 per-call latency | `NOT_RUN` | One live synthetic probe found no false accepts after deterministic gating; this is not real independent gold. No load harness or per-call latency distribution was collected. |
| T08 graph/event-status invariants | **PASSED** | `npm run test:entities:graph` and `npm run verify:entity-status` verified saved graph statuses for five articles. |
| T09 unit + PostgreSQL + API suites | **PASSED** | `npm run test:all`: 23 unit, 2 PostgreSQL and 7 API tests passed. |

## Interpretation

Passing unit/API tests show the implemented contracts and local persistence paths behave as tested. They do not establish production accuracy. The latest 30-case source-disjoint extraction holdout scored entity F1 73.5% and exact relation F1 34.8%; four repeated holdout runs scored relation F1 40.8%, 34.0%, 36.4%, and 34.8%. The validation-triggered retry did not improve holdout relation recall and had two additional false positives versus v3. On matched R04–R16, the latest B06 development iteration scored relation F1 62.5%, while the independent holdout v4 scored 34.8% and did not improve recall. Retrieval was tested against 30 source-disjoint documents with direct and paraphrased queries. These remain small pilots, not production-scale evidence. See [BENCHMARK_COMPARISON.md](BENCHMARK_COMPARISON.md) and [REMAINING_LIMITATIONS.md](REMAINING_LIMITATIONS.md).
