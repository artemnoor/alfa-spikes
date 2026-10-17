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

The current run improves entity precision/recall and relation precision slightly, while exact relation recall remains 12.5%. It still does not meet the requested quality targets. The earlier hardening iteration (`hardening-real-R04-R16-v1`) measured 60.5% entity F1 and 16.7% relation F1; it remains available as an intermediate iteration, not the final current-checkout score.

## What was actually run

- **Matched comparison:** 13 cases R04–R16, 85 model calls, ₽0.402963, stored at [`benchmark/runs/2026-10-17-hardening-real-R04-R16-v1/RESULTS.md`](benchmark/runs/2026-10-17-hardening-real-R04-R16-v1/RESULTS.md). It completed under the configured per-run cap of ₽0.50.
- **Current-checkout matched rerun:** 13 cases R04–R16, 99 calls, 0 failures, ₽0.266928, stored at [`benchmark/runs/2026-10-17-final-live-R04-R16-v1/RESULTS.md`](benchmark/runs/2026-10-17-final-live-R04-R16-v1/RESULTS.md). All 13 temporary profiles were deleted after their stage outputs were checkpointed; raw outputs and costs remain in the benchmark artifact.
- **Additional non-matched diagnostic:** R01–R13, 106 calls, ₽0.371171, stored at [`benchmark/runs/2026-10-17-hardening-real-13-v1/RESULTS.md`](benchmark/runs/2026-10-17-hardening-real-13-v1/RESULTS.md). Do not compare its aggregate directly to the R04–R16 baseline.
- The original two hardening runs cost ₽0.774134 combined. The current-checkout matched rerun cost ₽0.266928. The retrieval iterations cost ₽0.005231 in Qwen embeddings, and the two B07 adversarial probes cost ₽0.030522; the latter includes an initial semantic-only diagnostic and the final full deterministic+semantic gate. Total new evaluation spend recorded across these runs: **₽1.076815**. Raw model responses, usage and URLs are kept in each benchmark artifact.
- The matched model run was completed after the retrieval fusion and deterministic direction/status changes, but the model prompts and extraction pipeline have not been independently evaluated on a source-disjoint holdout.

## Retrieval and adversarial checks (separate tasks)

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
| Direction accuracy on real independent labels | `NOT_RUN`; a small synthetic live probe is diagnostic only and the 13-case gold does not separately annotate direction. |
| Relation status accuracy on real independent labels | `NOT_RUN`; the 13-case gold triples do not consistently annotate temporal status. |
| Precision restricted to supported claims | `NOT_RUN` as a separate denominator; accepted claims include exact quote plus a model entailment review, but no independent support labels exist. |
| Retrieval metrics on a source-disjoint or larger corpus | `NOT_RUN`; the pilot above reuses the existing regression documents. |
| Gap precision/recall, usefulness, automatic closure rate | `NOT_RUN`; existing gap benchmark is synthetic and is not an independent business-profile annotation. |
| Mean/P95 per-call latency | `NOT_RUN`; saved aggregate contains total latency, not a per-call latency distribution. |
| Independent 30+ official-document holdout | `NOT_RUN`; the existing 13 excerpts are regression data and must not be treated as a holdout. |

R04 deserves a gold-label review: its source says the announced MWS portfolio “will include” three named items. The current expected file labels zero relationships, while the post-change system proposed three planned `PART_OF` relations and the semantic reviewer accepted them. They count as false positives against the current gold, but the annotation may itself be incomplete. No gold labels were changed for this report.
