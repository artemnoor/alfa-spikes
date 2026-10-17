# T10-b06-joint-recovery-final-R04-R16-v1

- Run: 2026-10-17T03:57:00.200Z
- real company reports; open primary sources; manually annotated excerpts. The report covers 13 cases; this is a limited pilot, not a general accuracy estimate.
- Model calls: 97 (0 failed); input/output tokens: 56590/6280; reported cost: 0.226312 ₽; total latency: 267968 ms.
- Entity TP/FP/FN: 16/7/8; precision/recall/F1: 69.6%/66.7%/68.1%.
- Relation TP/FP/FN: 2/4/6; precision/recall/F1: 33.3%/25.0%/28.6%. Relation matches require predicate and both participants.

| Case | Industry | Pipeline | Entity recall | Relation recall | Relation FP | Calls | Cost ₽ |
|---|---|---|---:|---:|---:|---:|---:|
| R04 | telecommunications and cloud | completed | 2/3 | 0/0 | 3 | 9 | 0.021391 |
| R05 | technology and delivery | completed | 0/2 | 0/1 | 0 | 6 | 0.008234 |
| R06 | oil and gas | completed | 2/2 | 1/1 | 0 | 10 | 0.034319 |
| R07 | mining and metals | completed | 1/2 | 1/1 | 0 | 11 | 0.038584 |
| R08 | natural gas and LNG | completed | 1/2 | 0/1 | 0 | 8 | 0.012889 |
| R09 | gold mining | completed | 1/1 | 0/0 | 0 | 6 | 0.009459 |
| R10 | food retail and logistics | completed | 1/1 | 0/0 | 0 | 6 | 0.015255 |
| R11 | steel and metallurgy | completed | 0/1 | 0/0 | 0 | 4 | 0.004137 |
| R12 | integrated energy | completed | 4/4 | 0/3 | 0 | 8 | 0.022890 |
| R13 | petrochemicals | completed | 0/2 | 0/1 | 0 | 6 | 0.005926 |
| R14 | commercial aviation | partial | 1/1 | 0/0 | 0 | 11 | 0.033984 |
| R15 | e-commerce and logistics | completed | 2/2 | 0/0 | 1 | 7 | 0.015358 |
| R16 | pharmaceutical manufacturing | completed | 1/1 | 0/0 | 0 | 5 | 0.003886 |

Every model-produced quote is checked against the exact excerpt. Full raw reports are not included; source URLs, dates, short excerpts and stage outputs are stored in results.json. Metrics are small-sample only.
