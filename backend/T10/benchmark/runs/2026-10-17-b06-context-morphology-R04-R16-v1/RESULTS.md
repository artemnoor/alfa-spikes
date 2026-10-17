# T10-b06-context-morphology-R04-R16-v1

- Run: 2026-10-17T03:20:56.740Z
- real company reports; open primary sources; manually annotated excerpts. The report covers 13 cases; this is a limited pilot, not a general accuracy estimate.
- Model calls: 103 (0 failed); input/output tokens: 55423/6691; reported cost: 0.281570 ₽; total latency: 257797 ms.
- Entity TP/FP/FN: 16/6/8; precision/recall/F1: 72.7%/66.7%/69.6%.
- Relation TP/FP/FN: 4/2/4; precision/recall/F1: 66.7%/50.0%/57.1%. Relation matches require predicate and both participants.

| Case | Industry | Pipeline | Entity recall | Relation recall | Relation FP | Calls | Cost ₽ |
|---|---|---|---:|---:|---:|---:|---:|
| R04 | telecommunications and cloud | partial | 2/3 | 0/0 | 0 | 9 | 0.042215 |
| R05 | technology and delivery | completed | 0/2 | 0/1 | 0 | 7 | 0.009777 |
| R06 | oil and gas | completed | 2/2 | 1/1 | 0 | 10 | 0.032749 |
| R07 | mining and metals | completed | 1/2 | 0/1 | 0 | 9 | 0.025703 |
| R08 | natural gas and LNG | completed | 1/2 | 0/1 | 0 | 8 | 0.011624 |
| R09 | gold mining | completed | 1/1 | 0/0 | 0 | 6 | 0.005701 |
| R10 | food retail and logistics | completed | 1/1 | 0/0 | 1 | 8 | 0.026001 |
| R11 | steel and metallurgy | completed | 1/1 | 0/0 | 0 | 9 | 0.023453 |
| R12 | integrated energy | completed | 4/4 | 3/3 | 0 | 10 | 0.047289 |
| R13 | petrochemicals | completed | 0/2 | 0/1 | 0 | 6 | 0.010856 |
| R14 | commercial aviation | completed | 1/1 | 0/0 | 0 | 9 | 0.025674 |
| R15 | e-commerce and logistics | completed | 2/2 | 0/0 | 1 | 8 | 0.016565 |
| R16 | pharmaceutical manufacturing | completed | 0/1 | 0/0 | 0 | 4 | 0.003963 |

Every model-produced quote is checked against the exact excerpt. Full raw reports are not included; source URLs, dates, short excerpts and stage outputs are stored in results.json. Metrics are small-sample only.
