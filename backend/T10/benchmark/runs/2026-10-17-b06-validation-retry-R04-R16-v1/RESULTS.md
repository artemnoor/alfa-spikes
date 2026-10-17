# T10-b06-validation-retry-R04-R16-v1

- Run: 2026-10-17T04:05:28.728Z
- real company reports; open primary sources; manually annotated excerpts. The report covers 13 cases; this is a limited pilot, not a general accuracy estimate.
- Model calls: 110 (0 failed); input/output tokens: 64053/7903; reported cost: 0.283928 ₽; total latency: 245735 ms.
- Entity TP/FP/FN: 16/9/8; precision/recall/F1: 64.0%/66.7%/65.3%.
- Relation TP/FP/FN: 5/3/3; precision/recall/F1: 62.5%/62.5%/62.5%. Relation matches require predicate and both participants.

| Case | Industry | Pipeline | Entity recall | Relation recall | Relation FP | Calls | Cost ₽ |
|---|---|---|---:|---:|---:|---:|---:|
| R04 | telecommunications and cloud | partial | 2/3 | 0/0 | 0 | 9 | 0.028829 |
| R05 | technology and delivery | completed | 0/2 | 0/1 | 1 | 7 | 0.007836 |
| R06 | oil and gas | completed | 2/2 | 1/1 | 0 | 10 | 0.030898 |
| R07 | mining and metals | completed | 1/2 | 1/1 | 0 | 12 | 0.036335 |
| R08 | natural gas and LNG | completed | 1/2 | 0/1 | 0 | 8 | 0.011365 |
| R09 | gold mining | completed | 1/1 | 0/0 | 0 | 6 | 0.006676 |
| R10 | food retail and logistics | completed | 1/1 | 0/0 | 1 | 8 | 0.024483 |
| R11 | steel and metallurgy | completed | 0/1 | 0/0 | 0 | 4 | 0.003904 |
| R12 | integrated energy | completed | 4/4 | 3/3 | 0 | 11 | 0.045605 |
| R13 | petrochemicals | partial | 0/2 | 0/1 | 0 | 9 | 0.023022 |
| R14 | commercial aviation | partial | 1/1 | 0/0 | 0 | 12 | 0.039578 |
| R15 | e-commerce and logistics | completed | 2/2 | 0/0 | 1 | 9 | 0.021529 |
| R16 | pharmaceutical manufacturing | completed | 1/1 | 0/0 | 0 | 5 | 0.003868 |

Every model-produced quote is checked against the exact excerpt. Full raw reports are not included; source URLs, dates, short excerpts and stage outputs are stored in results.json. Metrics are small-sample only.
