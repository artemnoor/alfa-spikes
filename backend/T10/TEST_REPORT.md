# T10 verification report

Date: 2026-10-17. `NOT_RUN` means no evidence was collected for that check.

## Checks run

| Check | Result | Evidence |
|---|---|---|
| T10 unit tests | **59 passed, 0 failed** | `npm --prefix backend/T10 run test:unit`; includes source-disjoint holdout contracts, hybrid retrieval ranking, exact-identifier priority, B07 checks, entity recovery and profile rules. |
| T10 PostgreSQL/API integration | **14 passed, 0 failed** | `npm --prefix backend/T10 run test:api` against configured local PostgreSQL/pgvector; B01–B11 persistence, identity safeguards and retrieval. |
| Production frontend build | **PASSED** | Root `npm run build` (`tsc && vite build`). |
| Whitespace/diff check | **PASSED** | `git diff --check`. |
| Real Polza AI benchmark | **COMPLETED ON CURRENT CHECKOUT** | Matched R04–R16: 99 calls, 0 failed, ₽0.266928; entity F1 70.8%, exact relation F1 14.3%. Earlier R01–R13 diagnostic: 106 calls, ₽0.371171. Raw outputs and accounting are retained. |
| Live retrieval comparison | **COMPLETED — SMALL PILOT** | 32 manually labeled queries over 16 primary-source excerpts; one Qwen embedding call, 1,471 input tokens, ₽0.001744. Qwen Recall@5/10/MRR 100/100/100%; PostgreSQL FTS 84.4/87.5/77.5%; hybrid 96.9/100/91.1%. Labels are separate from relation labels, but documents overlap R01–R16; this is not a source-disjoint holdout. |
| Independent entity/relation holdout | **COMPLETED — 30 CASES** | H01–H30 use official-source excerpts from companies absent from R01–R16. Strict normalized exact scoring: entity P/R/F1 73.5/77.2/75.3%; directed relation P/R/F1 43.5/38.5/40.8%. 216 model calls, 0 failed, 114,776 input / 16,484 output tokens, ₽0.910891; mean/P95 call latency 2,928/8,831 ms. Full outputs, labels and citations are retained in `benchmark/runs/2026-10-17-independent-holdout-live-v1/`. |
| Independent source-disjoint retrieval | **COMPLETED — 30 DIRECT + 30 PARAPHRASED QUERIES** | Both sets search the same 30 new company excerpts, with labels frozen before runs. Qwen vector Recall@5/MRR: direct 100/100%; paraphrased 100/97.8%. Hybrid: direct 100/100%; paraphrased 96.7/92.2%. FTS and BM25 metrics are in the run reports. Combined embedding spend ₽0.003819. Each run used one batched embedding call. |
| Live adversarial B07 check | **COMPLETED — DIAGNOSTIC** | One DeepSeek call (396 input/93 output tokens, ₽0.001565, 2.078 s) on 10 synthetic cases. The deterministic gate rejected two proposals before semantic review; the remaining eight were reviewed. Final TP/FP/FN/TN=1/0/0/9. This is not a real-world accuracy estimate. |
| Browser E2E | **PASSED WITH UI WARNINGS** | On isolated Vite/API ports, created a clearly labeled temporary profile, added and processed a text source, inspected graph and gaps, saved a gap answer, reprocessed the same profile (second run completed), and confirmed the JSON export control was available. The temporary profile and orphan company row were deleted afterward. React logged duplicate-key warnings while rendering returned list data; this did not block the flow and remains a UI issue to trace. The unrelated T08/T09 health-check CORS noise was not part of this T10 path. |

## Checks not run

| Check | Result | Reason |
|---|---|---|
| Browser export download assertion | `NOT_RUN` | The export action was visible in the completed browser flow, but a download event/file-content assertion was not captured. |
| Migrations against a clean, disposable PostgreSQL database | **PASSED** | Applied all 9 T10 migrations to an isolated temporary database, verified both FTS GIN indexes, and dropped the temporary database. |
| Repeat full AI run on an already-populated profile | **PASSED ON ONE TEMPORARY PROFILE** | Browser run #2 completed on the same profile after the gap answer was saved; its profile version advanced to 2. This is a smoke result, not a repeatability or concurrency study. |
| Retrieval ranking on a production-sized corpus | `NOT_RUN` | The 16-chunk pilot has Recall@5/10 and MRR, but cannot establish behavior on larger company repositories; Recall@10 is weakly discriminative here. |
| Gap-detection precision/recall and usefulness | `NOT_RUN` on independent data | Existing 50-case gap suite is synthetic. |
| Direction/status accuracy on independent real labels, concurrency, load and P95 per-call latency | `NOT_RUN` | One live synthetic probe found no false accepts after deterministic gating; this is not real independent gold. No load harness or per-call latency distribution was collected. |
| T08 graph/event-status invariants | **PASSED** | `npm run test:entities:graph` and `npm run verify:entity-status` verified saved graph statuses for five articles. |
| T09 unit + PostgreSQL + API suites | **PASSED** | `npm run test:all`: 23 unit, 2 PostgreSQL and 7 API tests passed. |

## Interpretation

Passing unit/API tests show the implemented contracts and local persistence paths behave as tested. They do not establish production accuracy. The new 30-case source-disjoint extraction holdout scored entity F1 75.3% and exact relation F1 40.8%; strict scoring and label granularity issues affect these estimates. Retrieval was tested against 30 source-disjoint documents with direct and paraphrased queries. These are still small pilots, not production-scale evidence. See [BENCHMARK_COMPARISON.md](BENCHMARK_COMPARISON.md) and [REMAINING_LIMITATIONS.md](REMAINING_LIMITATIONS.md).
