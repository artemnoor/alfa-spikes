# T10-b06-final-R04-R16-v1

- Run: 2026-10-17T03:25:49.344Z
- real company reports; open primary sources; manually annotated excerpts. The report covers 13 cases; this is a limited pilot, not a general accuracy estimate.
- Model calls: 99 (1 failed); input/output tokens: 54432/6686; reported cost: 0.293422 ₽; total latency: 260118 ms.
- Entity TP/FP/FN: 17/7/7; precision/recall/F1: 70.8%/70.8%/70.8%.
- Relation TP/FP/FN: 4/4/4; precision/recall/F1: 50.0%/50.0%/50.0%. Relation matches require predicate and both participants.

| Case | Industry | Pipeline | Entity recall | Relation recall | Relation FP | Calls | Cost ₽ |
|---|---|---|---:|---:|---:|---:|---:|
| R04 | telecommunications and cloud | completed | 2/3 | 0/0 | 2 | 9 | 0.023985 |
| R05 | technology and delivery | completed | 0/2 | 0/1 | 1 | 8 | 0.011302 |
| R06 | oil and gas | completed | 2/2 | 1/1 | 0 | 10 | 0.036226 |
| R07 | mining and metals | completed | 1/2 | 0/1 | 0 | 9 | 0.051850 |
| R08 | natural gas and LNG | completed | 1/2 | 0/1 | 0 | 8 | 0.009989 |
| R09 | gold mining | completed | 1/1 | 0/0 | 0 | 6 | 0.007477 |
| R10 | food retail and logistics | completed | 1/1 | 0/0 | 0 | 6 | 0.012661 |
| R11 | steel and metallurgy | completed | 1/1 | 0/0 | 0 | 9 | 0.023340 |
| R12 | integrated energy | completed | 4/4 | 3/3 | 0 | 9 | 0.049063 |
| R13 | petrochemicals | completed | 0/2 | 0/1 | 0 | 6 | 0.008257 |
| R14 | commercial aviation | partial | 1/1 | 0/0 | 0 | 6 | 0.008169 |
| R15 | e-commerce and logistics | completed | 2/2 | 0/0 | 1 | 8 | 0.020540 |
| R16 | pharmaceutical manufacturing | completed | 1/1 | 0/0 | 0 | 5 | 0.030563 |

Every model-produced quote is checked against the exact excerpt. Full raw reports are not included; source URLs, dates, short excerpts and stage outputs are stored in results.json. Metrics are small-sample only.
