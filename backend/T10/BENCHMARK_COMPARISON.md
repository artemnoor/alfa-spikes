# T10 real-source benchmark comparison

Tested 2026-10-17 with DeepSeek V4 Flash, JEV and Qwen3-Embedding-8B through Polza AI. The comparison uses the same 13 R04–R16 company-report excerpts and the same manually authored expected triples as the saved baseline. Each excerpt is short and linked to its primary source. This remains a small regression pilot, not a holdout or a general quality estimate.

## Before and after

| Metric | Before (`real-13-case-v2`) | After (`hardening-real-R04-R16-v1`) | Change |
|---|---:|---:|---:|
| Entity F1 (n=24 gold entities) | 62.5% | 60.5% | −2.0 pp |
| Entity precision | 62.5% | 68.4% | +5.9 pp |
| Entity recall | 62.5% | 54.2% | −8.3 pp |
| Relation precision (n=8 gold triples) | 14.3% (1 TP, 6 FP) | 25.0% (1 TP, 3 FP) | +10.7 pp |
| Relation recall | 12.5% (1/8) | 12.5% (1/8) | no change |
| Relation F1 | 13.3% | 16.7% | +3.4 pp |
| Model calls | 66 | 85 | +19 (+28.8%) |
| Input / output tokens | 26,916 / 3,445 | 41,321 / 5,261 | +53.5% / +52.7% |
| Polza reported cost | ₽0.319121 | ₽0.402963 | +₽0.083842 (+26.3%) |
| Failed model calls | 0 | 0 | unchanged |
| Total recorded latency | 287,639 ms | 310,898 ms | +23,259 ms |

The relation precision improvement came from fewer false positives; recall did not improve. Entity F1 regressed slightly because recall fell by two expected entities even though precision rose. The results do not meet the requested quality targets.

## What was actually run

- **Matched comparison:** 13 cases R04–R16, 85 model calls, ₽0.402963, stored at [`benchmark/runs/2026-10-17-hardening-real-R04-R16-v1/RESULTS.md`](benchmark/runs/2026-10-17-hardening-real-R04-R16-v1/RESULTS.md). It completed under the configured per-run cap of ₽0.50.
- **Additional non-matched diagnostic:** R01–R13, 106 calls, ₽0.371171, stored at [`benchmark/runs/2026-10-17-hardening-real-13-v1/RESULTS.md`](benchmark/runs/2026-10-17-hardening-real-13-v1/RESULTS.md). Do not compare its aggregate directly to the R04–R16 baseline.
- Total reported spend for both new runs: **₽0.774134**. Raw inputs, model outputs, calls, token counts and source references are retained in each `results.json`.
- The matched model run was completed before the final addition of explicit prompt-injection wording and the correction to count only unique B10 graph claims. Those code changes are covered by deterministic/integration tests but were not re-evaluated with another paid full-set run.

## Required measures that are not available

| Measure | Result |
|---|---|
| Direction accuracy | `NOT_RUN` as a separate metric; exact directed triples are scored, but no separately adjudicated direction labels exist. |
| Relation status accuracy | `NOT_RUN`; the 13-case gold triples do not consistently annotate temporal status. |
| Precision restricted to supported claims | `NOT_RUN` as a separate denominator; accepted claims include exact quote plus a model entailment review, but no independent support labels exist. |
| Retrieval Recall@5, Recall@10, MRR | `NOT_RUN`; no gold relevant-chunk mapping was prepared. |
| Gap precision/recall, usefulness, automatic closure rate | `NOT_RUN`; existing gap benchmark is synthetic and is not an independent business-profile annotation. |
| Mean/P95 per-call latency | `NOT_RUN`; saved aggregate contains total latency, not a per-call latency distribution. |
| Independent 30+ official-document holdout | `NOT_RUN`; the existing 13 excerpts are regression data and must not be treated as a holdout. |

R04 deserves a gold-label review: its source says the announced MWS portfolio “will include” three named items. The current expected file labels zero relationships, while the post-change system proposed three planned `PART_OF` relations and the semantic reviewer accepted them. They count as false positives against the current gold, but the annotation may itself be incomplete. No gold labels were changed for this report.
