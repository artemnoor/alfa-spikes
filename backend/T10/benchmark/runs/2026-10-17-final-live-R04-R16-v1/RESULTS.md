# T10-hardening-final-R04-R16-v1

- Run: 2026-10-17T02:40:48.687Z
- real company reports; open primary sources; manually annotated excerpts. The report covers 13 cases; this is a limited pilot, not a general accuracy estimate.
- Model calls: 99 (0 failed); input/output tokens: 52788/6530; reported cost: 0.266928 ₽; total latency: 262286 ms.
- Entity TP/FP/FN: 17/7/7; precision/recall/F1: 70.8%/70.8%/70.8%.
- Relation TP/FP/FN: 1/5/7; precision/recall/F1: 16.7%/12.5%/14.3%. Relation matches require predicate and both participants.

| Case | Industry | Pipeline | Entity recall | Relation recall | Relation FP | Calls | Cost ₽ |
|---|---|---|---:|---:|---:|---:|---:|
| R04 | telecommunications and cloud | completed | 2/3 | 0/0 | 3 | 9 | 0.025094 |
| R05 | technology and delivery | completed | 0/2 | 0/1 | 0 | 6 | 0.009381 |
| R06 | oil and gas | completed | 2/2 | 1/1 | 0 | 10 | 0.034518 |
| R07 | mining and metals | completed | 1/2 | 0/1 | 0 | 9 | 0.029279 |
| R08 | natural gas and LNG | completed | 1/2 | 0/1 | 0 | 6 | 0.006059 |
| R09 | gold mining | completed | 1/1 | 0/0 | 0 | 6 | 0.007909 |
| R10 | food retail and logistics | completed | 1/1 | 0/0 | 1 | 8 | 0.033236 |
| R11 | steel and metallurgy | completed | 1/1 | 0/0 | 0 | 9 | 0.025770 |
| R12 | integrated energy | completed | 4/4 | 0/3 | 0 | 8 | 0.026138 |
| R13 | petrochemicals | completed | 0/2 | 0/1 | 0 | 6 | 0.010716 |
| R14 | commercial aviation | completed | 1/1 | 0/0 | 0 | 9 | 0.027592 |
| R15 | e-commerce and logistics | completed | 2/2 | 0/0 | 1 | 8 | 0.024057 |
| R16 | pharmaceutical manufacturing | completed | 1/1 | 0/0 | 0 | 5 | 0.007179 |

Every model-produced quote is checked against the exact excerpt. Full raw reports are not included; source URLs, dates, short excerpts and stage outputs are stored in results.json. Metrics are small-sample only.
