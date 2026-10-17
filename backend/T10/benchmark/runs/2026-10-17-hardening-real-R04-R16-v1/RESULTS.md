# T10-hardening-real-R04-R16-v1

- Run: 2026-10-17T02:08:57.022Z
- real company reports; open primary sources; manually annotated excerpts. The report covers 13 cases; this is a limited pilot, not a general accuracy estimate.
- Model calls: 85 (0 failed); input/output tokens: 41321/5261; reported cost: 0.402963 ₽; total latency: 310898 ms.
- Entity TP/FP/FN: 13/6/11; precision/recall/F1: 68.4%/54.2%/60.5%.
- Relation TP/FP/FN: 1/3/7; precision/recall/F1: 25.0%/12.5%/16.7%. Relation matches require predicate and both participants.

| Case | Industry | Pipeline | Entity recall | Relation recall | Relation FP | Calls | Cost ₽ |
|---|---|---|---:|---:|---:|---:|---:|
| R04 | telecommunications and cloud | completed | 2/3 | 0/0 | 3 | 9 | 0.053261 |
| R05 | technology and delivery | completed | 0/2 | 0/1 | 0 | 6 | 0.033589 |
| R06 | oil and gas | completed | 2/2 | 1/1 | 0 | 10 | 0.037095 |
| R07 | mining and metals | completed | 1/2 | 0/1 | 0 | 9 | 0.034952 |
| R08 | natural gas and LNG | completed | 1/2 | 0/1 | 0 | 6 | 0.078608 |
| R09 | gold mining | completed | 0/1 | 0/0 | 0 | 4 | 0.008344 |
| R10 | food retail and logistics | completed | 1/1 | 0/0 | 0 | 6 | 0.016423 |
| R11 | steel and metallurgy | completed | 0/1 | 0/0 | 0 | 4 | 0.004261 |
| R12 | integrated energy | completed | 4/4 | 0/3 | 0 | 7 | 0.034013 |
| R13 | petrochemicals | completed | 0/2 | 0/1 | 0 | 5 | 0.014939 |
| R14 | commercial aviation | completed | 1/1 | 0/0 | 0 | 9 | 0.059664 |
| R15 | e-commerce and logistics | completed | 1/2 | 0/0 | 0 | 6 | 0.012684 |
| R16 | pharmaceutical manufacturing | completed | 0/1 | 0/0 | 0 | 4 | 0.015130 |

Every model-produced quote is checked against the exact excerpt. Full raw reports are not included; source URLs, dates, short excerpts and stage outputs are stored in results.json. Metrics are small-sample only.
