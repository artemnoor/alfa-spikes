# T10 real-source benchmark comparison

Tested 2026-10-17 with DeepSeek V4 Flash, JEV and Qwen3-Embedding-8B through Polza AI. The comparison uses the same 13 R04–R16 company-report excerpts and the same manually authored expected triples as the saved baseline. Each excerpt is short and linked to its primary source. This remains a small regression pilot, not a holdout or a general quality estimate.

## Before and after

| Metric | Before (`real-13-case-v2`) | Current (`final-live-R04-R16-v1`) | Change |
|---|---:|---:|---:|
| Entity F1 (n=24 gold entities) | 62.5% | 70.8% | +8.3 pp |
| Entity precision | 62.5% | 70.8% | +8.3 pp |
| Entity recall | 62.5% | 70.8% | +8.3 pp |
| Relation precision (n=8 gold triples) | 14.3% (1 TP, 6 FP) | 16.7% (1 TP, 5 FP) | +2.4 pp |
| Relation recall | 12.5% (1/8) | 12.5% (1/8) | no change |
| Relation F1 | 13.3% | 14.3% | +1.0 pp |
| Model calls | 66 | 99 | +33 (+50.0%) |
| Input / output tokens | 26,916 / 3,445 | 52,788 / 6,530 | +96.1% / +89.6% |
| Polza reported cost | ₽0.319121 | ₽0.266928 | −₽0.052193 (−16.4%) |
| Failed model calls | 0 | 0 | unchanged |
| Total recorded latency | 287,639 ms | 262,286 ms | −25,353 ms |

The saved `final-live-R04-R16-v1` comparison improved entity F1 and relation precision slightly, while exact relation recall remained 12.5%. It did not meet the requested quality targets. The earlier hardening iteration (`hardening-real-R04-R16-v1`) measured 60.5% entity F1 and 16.7% relation F1; it remains an intermediate historical iteration.

## B06 development iteration on the same R04–R16 cases

After the above current-checkout comparison, concrete error sources were addressed: a named company was not resolved from a clear `production` context, Russian inflected mentions failed exact participant matching, and invalid first-pass quotes could prevent a retry. Company references now require exactly one preceding candidate. B06 has one bounded second pass for cue-bearing chunks with no accepted relation, including chunks where all first-pass candidates fail local validation (maximum 12 by default; zero disables it).

| Metric | Saved baseline | Previous B06 iteration | Bounded retry for rejected candidates |
|---|---:|---:|---:|
| Entity precision / recall / F1 | 70.8 / 70.8 / 70.8% | 69.6 / 66.7 / 68.1% | 64.0 / 66.7 / 65.3% |
| Relation precision | 16.7% (1 TP, 5 FP) | 33.3% (2 TP, 4 FP) | 62.5% (5 TP, 3 FP) |
| Relation recall | 12.5% (1/8) | 25.0% (2/8) | 62.5% (5/8) |
| Relation F1 | 14.3% | 28.6% | 62.5% |
| Calls / failed responses | 99 / 0 | 97 / 0 | 110 / 0 |
| Reported cost | ₽0.266928 | ₽0.226312 | ₽0.283928 |

The bounded retry recovered the R12 relations after the first answer proposed non-exact quotes. However, this one development run does not establish a stable gain: the separate 30-case holdout showed unchanged relation recall and two additional false positives compared with v3. The holdout result takes precedence for generalization; no quality claim is made from the development score alone. Latest raw development evidence: [`b06-validation-retry-R04-R16-v1`](benchmark/runs/2026-10-17-b06-validation-retry-R04-R16-v1/RESULTS.md).

## Final independent holdout re-evaluation

The frozen H01–H30 labels were not changed. None of the four runs tuned prompts or retrieval on these labels; v4 verifies a retry behavior selected from R04–R16 development cases.

| Metric | Holdout v1 | Holdout v2 | Holdout v3 | Holdout v4 |
|---|---:|---:|---:|---:|
| Entity precision / recall / F1 | 73.5 / 77.2 / 75.3% | 73.3 / 79.7 / 76.4% | 72.9 / 78.5 / 75.6% | 70.1 / 77.2 / 73.5% |
| Relation precision | 43.5% | 38.1% | 44.4% | 40.0% |
| Relation recall | 38.5% | 30.8% | 30.8% | 30.8% |
| Relation F1 | 40.8% | 34.0% | 36.4% | 34.8% |
| Calls / failures | 216 / 0 | 215 / 1 | 212 / 0 | 218 / 0 |
| Input / output tokens | 114,776 / 16,484 | 115,635 / 17,724 | 122,890 / 17,315 | 131,417 / 18,099 |
| Reported cost | ₽0.910891 | ₽0.552483 | ₽0.524357 | ₽0.455116 |

The latest case-level report is [`independent-holdout-live-v4`](benchmark/runs/2026-10-17-independent-holdout-live-v4/RESULTS.md); mean/P95 latency was 2,927/6,346 ms. Relation recall remained 30.8% vs v3 while false positives rose from 10 to 12. Repeated relation F1 values range from 34.0% to 40.8%; the retry did not demonstrate a holdout gain. Keep all artifacts and do not claim the matched development result generalized to holdout.

## What was actually run

- **Matched comparison:** 13 cases R04–R16, 85 model calls, ₽0.402963, stored at [`benchmark/runs/2026-10-17-hardening-real-R04-R16-v1/RESULTS.md`](benchmark/runs/2026-10-17-hardening-real-R04-R16-v1/RESULTS.md). It completed under the configured per-run cap of ₽0.50.
- **Current-checkout matched rerun:** 13 cases R04–R16, 99 calls, 0 failures, ₽0.266928, stored at [`benchmark/runs/2026-10-17-final-live-R04-R16-v1/RESULTS.md`](benchmark/runs/2026-10-17-final-live-R04-R16-v1/RESULTS.md). All 13 temporary profiles were deleted after their stage outputs were checkpointed; raw outputs and costs remain in the benchmark artifact.
- **Additional non-matched diagnostic:** R01–R13, 106 calls, ₽0.371171, stored at [`benchmark/runs/2026-10-17-hardening-real-13-v1/RESULTS.md`](benchmark/runs/2026-10-17-hardening-real-13-v1/RESULTS.md). Do not compare its aggregate directly to the R04–R16 baseline.
- The original two hardening runs cost ₽0.774134 combined. The current-checkout matched rerun cost ₽0.266928. The retrieval iterations cost ₽0.005231 in Qwen embeddings, and the two B07 adversarial probes cost ₽0.030522; the latter includes an initial semantic-only diagnostic and the final full deterministic+semantic gate. Total new evaluation spend recorded across these runs: **₽1.076815**. Raw model responses, usage and URLs are kept in each benchmark artifact.
- The matched model run was completed after the retrieval fusion and deterministic direction/status changes, but the model prompts and extraction pipeline have not been independently evaluated on a source-disjoint holdout.

## Retrieval and adversarial checks (separate tasks)

### Source-disjoint retrieval (30 official-source excerpts)

Two 30-query variants were run against a temporary corpus of 30 primary-source excerpts from companies absent from R01–R16. One variant uses direct questions and the second uses paraphrases with less lexical overlap. Queries were labeled before the rankings were inspected. Both use the production PostgreSQL FTS, pgvector/Qwen, BM25 fallback and hybrid fusion paths.

| Query set | Method | Recall@5 | Recall@10 | MRR |
|---|---|---:|---:|---:|
| Direct, n=30 | Qwen vector | 100.0% | 100.0% | 100.0% |
| Direct, n=30 | PostgreSQL FTS | 100.0% | 100.0% | 100.0% |
| Direct, n=30 | BM25 fallback | 100.0% | 100.0% | 100.0% |
| Direct, n=30 | Hybrid | 100.0% | 100.0% | 100.0% |
| Paraphrased, n=30 | Qwen vector | 100.0% | 100.0% | 97.8% |
| Paraphrased, n=30 | PostgreSQL FTS | 86.7% | 86.7% | 76.4% |
| Paraphrased, n=30 | BM25 fallback | 90.0% | 90.0% | 86.1% |
| Paraphrased, n=30 | Hybrid | 96.7% | 100.0% | 92.2% |

The direct set is too easy to distinguish ranking quality. On paraphrases, vector search ranks the relevant chunk first in 29/30 cases; hybrid retrieves all relevant chunks by rank 10 and misses top 5 once. This remains a 30-document pilot. The two embedding batches cost ₽0.003819 total. Raw ranks and sources: [`independent-retrieval-live-v1`](benchmark/runs/2026-10-17-independent-retrieval-live-v1/RESULTS.md) and [`independent-retrieval-hard-v1`](benchmark/runs/2026-10-17-independent-retrieval-hard-v1/RESULTS.md).

### Source-disjoint entity and relation holdout

The frozen H01–H30 extraction holdout is source/company-disjoint from R01–R16. Strict normalized exact entity labels produce P/R/F1 of 73.5/77.2/75.3%. Strict ordered triple labels produce P/R/F1 of 43.5/38.5/40.8%; direction accuracy is 10/10 and status accuracy 9/10 among only 10 exact matched triples. The run cost ₽0.910891 over 216 calls (zero failures), and recorded mean/P95 per-call latency is 2,928/8,831 ms. These estimates are affected by ambiguous gold granularity and the small sample; see the case-level audit in [`independent-holdout-live-v1`](benchmark/runs/2026-10-17-independent-holdout-live-v1/RESULTS.md). Do not interpret direction/status conditional accuracy as overall correctness.

The production retrieval path was exercised with 32 manually authored queries over 16 short primary-source excerpts in a temporary PostgreSQL T10 profile. Query labels are separate from extraction predictions, but the documents overlap R01–R16; this is not a source-disjoint holdout.

| Retrieval method | n queries | Recall@5 | Recall@10 | MRR |
|---|---:|---:|---:|---:|
| Qwen cosine through pgvector | 32 | 100.0% | 100.0% | 100.0% |
| PostgreSQL Russian/English FTS | 32 | 84.4% | 87.5% | 77.5% |
| Local BM25 fallback | 32 | 93.8% | 93.8% | 87.5% |
| Reciprocal-rank fusion | 32 | 96.9% | 100.0% | 91.1% |

Recall@10 is weakly discriminative with only 16 candidate chunks. Qwen ranked first on this set; hybrid fusion retained lexical coverage but did not beat the vector baseline. The embedding request used 1,471 input tokens, cost ₽0.001744 and took 9.375 seconds. Per-query ranks and sources are in [`benchmark/runs/2026-10-17-retrieval-32-live-v3/RESULTS.md`](benchmark/runs/2026-10-17-retrieval-32-live-v3/RESULTS.md).

The separate B07 live negative probe had 10 synthetic cases, one DeepSeek call, 396 input / 93 output tokens, ₽0.001565 and 2.078 seconds. The deterministic stage rejected two proposals before semantic review; final classifications matched authored labels (one positive, nine negative, no false accepts). This single synthetic run does not estimate real-world accuracy. Raw judgments are in [`benchmark/runs/2026-10-17-negative-b07-live-v2/RESULTS.md`](benchmark/runs/2026-10-17-negative-b07-live-v2/RESULTS.md).

## Required measures that are not available

| Measure | Result |
|---|---|
| Direction accuracy on the independent holdout | 100% on 8 exact-match-eligible relationships in v2; denominator is too small for a stable estimate. |
| Relation status accuracy on the independent holdout | 87.5% on 8 exact triples in v2; denominator is too small for a stable estimate. |
| Precision restricted to supported claims | `NOT_RUN` as a separate denominator; accepted claims include exact quote plus a model entailment review, but no independent support labels exist. |
| Retrieval metrics on a production-sized corpus | `NOT_RUN`; the source-disjoint evaluation has 30 documents and 30 queries per variant. |
| Gap precision/recall, usefulness, automatic closure rate | `NOT_RUN`; existing gap benchmark is synthetic and is not an independent business-profile annotation. |
| Mean/P95 per-call latency | `NOT_RUN`; saved aggregate contains total latency, not a per-call latency distribution. |
| Larger independent extraction holdout (100–200) with independent adjudication | `NOT_RUN`; H01–H30 is a manually authored 30-case pilot, not a large or double-annotated gold set. |

R04 deserves a gold-label review: its source says the announced MWS portfolio “will include” three named items. The current expected file labels zero relationships, while the post-change system proposed three planned `PART_OF` relations and the semantic reviewer accepted them. They count as false positives against the current gold, but the annotation may itself be incomplete. No gold labels were changed for this report.
