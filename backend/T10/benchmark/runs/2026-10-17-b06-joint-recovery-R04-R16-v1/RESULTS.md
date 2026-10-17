# T10-b06-joint-recovery-R04-R16-v1

- Run: 2026-10-17T03:45:29.716Z
- real company reports; open primary sources; manually annotated excerpts. The report covers 13 cases; this is a limited pilot, not a general accuracy estimate.
- Model calls: 104 (0 failed); input/output tokens: 59839/7256; reported cost: 0.287780 ₽; total latency: 240373 ms.
- Entity TP/FP/FN: 17/7/7; precision/recall/F1: 70.8%/70.8%/70.8%.
- Relation TP/FP/FN: 5/2/3; precision/recall/F1: 71.4%/62.5%/66.7%. Relation matches require predicate and both participants.

| Case | Industry | Pipeline | Entity recall | Relation recall | Relation FP | Calls | Cost ₽ |
|---|---|---|---:|---:|---:|---:|---:|
| R04 | telecommunications and cloud | partial | 2/3 | 0/0 | 0 | 9 | 0.024670 |
| R05 | technology and delivery | completed | 0/2 | 0/1 | 0 | 6 | 0.011543 |
| R06 | oil and gas | completed | 2/2 | 1/1 | 0 | 10 | 0.035334 |
| R07 | mining and metals | completed | 1/2 | 1/1 | 0 | 11 | 0.040227 |
| R08 | natural gas and LNG | completed | 1/2 | 0/1 | 0 | 8 | 0.014587 |
| R09 | gold mining | completed | 1/1 | 0/0 | 0 | 6 | 0.005289 |
| R10 | food retail and logistics | completed | 1/1 | 0/0 | 1 | 8 | 0.023849 |
| R11 | steel and metallurgy | completed | 1/1 | 0/0 | 0 | 9 | 0.026320 |
| R12 | integrated energy | completed | 4/4 | 3/3 | 0 | 9 | 0.042527 |
| R13 | petrochemicals | completed | 0/2 | 0/1 | 0 | 6 | 0.008922 |
| R14 | commercial aviation | completed | 1/1 | 0/0 | 0 | 9 | 0.023125 |
| R15 | e-commerce and logistics | completed | 2/2 | 0/0 | 1 | 8 | 0.021694 |
| R16 | pharmaceutical manufacturing | completed | 1/1 | 0/0 | 0 | 5 | 0.009693 |

Every model-produced quote is checked against the exact excerpt. Full raw reports are not included; source URLs, dates, short excerpts and stage outputs are stored in results.json. Metrics are small-sample only.
