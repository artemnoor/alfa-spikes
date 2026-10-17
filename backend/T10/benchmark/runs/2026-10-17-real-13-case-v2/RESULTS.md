# T10-real-13-v2

- Run: 2026-10-17T00:03:46.206Z
- real company reports; open primary sources; manually annotated excerpts. The report covers 13 cases; this is a limited pilot, not a general accuracy estimate.
- Model calls: 66 (0 failed); input/output tokens: 26916/3445; reported cost: 0.319121 ₽; total latency: 287639 ms.
- Entity TP/FP/FN: 15/9/9; precision/recall/F1: 62.5%/62.5%/62.5%.
- Relation TP/FP/FN: 1/6/7; precision/recall/F1: 14.3%/12.5%/13.3%. Relation matches require predicate and both participants.

| Case | Industry | Pipeline | Entity recall | Relation recall | Relation FP | Calls | Cost ₽ |
|---|---|---|---:|---:|---:|---:|---:|
| R04 | telecommunications and cloud | partial | 2/3 | 0/0 | 3 | 6 | 0.025536 |
| R05 | technology and delivery | partial | 0/2 | 0/1 | 1 | 4 | 0.022356 |
| R06 | oil and gas | partial | 2/2 | 1/1 | 0 | 7 | 0.029431 |
| R07 | mining and metals | partial | 1/2 | 0/1 | 0 | 6 | 0.020650 |
| R08 | natural gas and LNG | partial | 1/2 | 0/1 | 0 | 5 | 0.005323 |
| R09 | gold mining | partial | 0/1 | 0/0 | 0 | 3 | 0.003126 |
| R10 | food retail and logistics | partial | 1/1 | 0/0 | 1 | 5 | 0.057505 |
| R11 | steel and metallurgy | partial | 0/1 | 0/0 | 0 | 3 | 0.008645 |
| R12 | integrated energy | partial | 4/4 | 0/3 | 0 | 6 | 0.026897 |
| R13 | petrochemicals | partial | 0/2 | 0/1 | 1 | 6 | 0.028762 |
| R14 | commercial aviation | partial | 1/1 | 0/0 | 0 | 7 | 0.037322 |
| R15 | e-commerce and logistics | partial | 2/2 | 0/0 | 0 | 4 | 0.022323 |
| R16 | pharmaceutical manufacturing | partial | 1/1 | 0/0 | 0 | 4 | 0.031245 |

Every model-produced quote is checked against the exact excerpt. Full raw reports are not included; source URLs, dates, short excerpts and stage outputs are stored in results.json. Metrics are small-sample only.
