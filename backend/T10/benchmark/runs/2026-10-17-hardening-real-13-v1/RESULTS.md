# T10-hardening-real-regression-v1

- Run: 2026-10-17T02:01:57.991Z
- real company reports; open primary sources; manually annotated excerpts. The report covers 13 cases; this is a limited pilot, not a general accuracy estimate.
- Model calls: 106 (0 failed); input/output tokens: 53679/8125; reported cost: 0.371171 ₽; total latency: 389938 ms.
- Entity TP/FP/FN: 24/5/8; precision/recall/F1: 82.8%/75.0%/78.7%.
- Relation TP/FP/FN: 3/6/9; precision/recall/F1: 33.3%/25.0%/28.6%. Relation matches require predicate and both participants.

| Case | Industry | Pipeline | Entity recall | Relation recall | Relation FP | Calls | Cost ₽ |
|---|---|---|---:|---:|---:|---:|---:|
| R01 | steel manufacturing | completed | 2/2 | 1/1 | 0 | 8 | 0.020863 |
| R02 | food retail and logistics | completed | 5/5 | 1/1 | 1 | 9 | 0.029935 |
| R03 | telecommunications | completed | 4/5 | 0/2 | 1 | 11 | 0.042909 |
| R04 | telecommunications and cloud | completed | 2/3 | 0/0 | 3 | 9 | 0.033957 |
| R05 | technology and delivery | completed | 0/2 | 0/1 | 1 | 9 | 0.013101 |
| R06 | oil and gas | completed | 2/2 | 1/1 | 0 | 10 | 0.035494 |
| R07 | mining and metals | completed | 1/2 | 0/1 | 0 | 9 | 0.038310 |
| R08 | natural gas and LNG | completed | 1/2 | 0/1 | 0 | 6 | 0.008171 |
| R09 | gold mining | completed | 1/1 | 0/0 | 0 | 6 | 0.008726 |
| R10 | food retail and logistics | completed | 1/1 | 0/0 | 0 | 6 | 0.016857 |
| R11 | steel and metallurgy | completed | 1/1 | 0/0 | 0 | 9 | 0.054998 |
| R12 | integrated energy | completed | 4/4 | 0/3 | 0 | 8 | 0.042221 |
| R13 | petrochemicals | completed | 0/2 | 0/1 | 0 | 6 | 0.025629 |

Every model-produced quote is checked against the exact excerpt. Full raw reports are not included; source URLs, dates, short excerpts and stage outputs are stored in results.json. Metrics are small-sample only.
