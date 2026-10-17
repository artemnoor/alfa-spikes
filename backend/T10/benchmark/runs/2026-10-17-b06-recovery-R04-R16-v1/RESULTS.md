# T10-b06-recovery-R04-R16-v1

- Run: 2026-10-17T03:13:07.610Z
- real company reports; open primary sources; manually annotated excerpts. The report covers 13 cases; this is a limited pilot, not a general accuracy estimate.
- Model calls: 100 (0 failed); input/output tokens: 54751/6300; reported cost: 0.261673 ₽; total latency: 261995 ms.
- Entity TP/FP/FN: 16/6/8; precision/recall/F1: 72.7%/66.7%/69.6%.
- Relation TP/FP/FN: 1/4/7; precision/recall/F1: 20.0%/12.5%/15.4%. Relation matches require predicate and both participants.

| Case | Industry | Pipeline | Entity recall | Relation recall | Relation FP | Calls | Cost ₽ |
|---|---|---|---:|---:|---:|---:|---:|
| R04 | telecommunications and cloud | completed | 1/3 | 0/0 | 2 | 8 | 0.027599 |
| R05 | technology and delivery | completed | 0/2 | 0/1 | 0 | 6 | 0.008573 |
| R06 | oil and gas | completed | 2/2 | 1/1 | 0 | 10 | 0.036250 |
| R07 | mining and metals | completed | 1/2 | 0/1 | 0 | 9 | 0.029853 |
| R08 | natural gas and LNG | completed | 1/2 | 0/1 | 0 | 8 | 0.013147 |
| R09 | gold mining | completed | 1/1 | 0/0 | 0 | 6 | 0.008053 |
| R10 | food retail and logistics | completed | 1/1 | 0/0 | 1 | 8 | 0.024479 |
| R11 | steel and metallurgy | completed | 1/1 | 0/0 | 0 | 9 | 0.023552 |
| R12 | integrated energy | completed | 4/4 | 0/3 | 0 | 8 | 0.025299 |
| R13 | petrochemicals | completed | 0/2 | 0/1 | 0 | 6 | 0.010911 |
| R14 | commercial aviation | completed | 1/1 | 0/0 | 0 | 9 | 0.023156 |
| R15 | e-commerce and logistics | completed | 2/2 | 0/0 | 1 | 8 | 0.021789 |
| R16 | pharmaceutical manufacturing | completed | 1/1 | 0/0 | 0 | 5 | 0.009012 |

Every model-produced quote is checked against the exact excerpt. Full raw reports are not included; source URLs, dates, short excerpts and stage outputs are stored in results.json. Metrics are small-sample only.
