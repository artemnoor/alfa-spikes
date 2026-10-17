# T10 real-source benchmark v1

- Run: 2026-10-16T23:45:02.466Z
- real company reports; official primary sources; manually annotated excerpts. This 13-case small-sample pilot is not a general accuracy estimate.
- Model calls: 53 (0 failed); input/output tokens: 11865/1541; reported cost: 0.161954 ₽; total latency: 124335 ms.
- Entity TP/FP/FN: 8/2/16; precision/recall/F1: 80.0%/33.3%/47.1%.
- Relation TP/FP/FN: 0/0/8; precision/recall/F1: n/a/0.0%/n/a. Relation matches require predicate and both participants.

| Case | Industry | Pipeline | Entity recall | Relation recall | Relation FP | Calls | Cost ₽ |
|---|---|---|---:|---:|---:|---:|---:|---:|
| R04 | telecommunications and cloud | partial | 2/3 | 0/0 | 0 | 5 | 0.009294 |
| R05 | technology and delivery | partial | 0/2 | 0/1 | 0 | 3 | 0.008394 |
| R06 | oil and gas | partial | 1/2 | 0/1 | 0 | 5 | 0.016654 |
| R07 | mining and metals | partial | 1/2 | 0/1 | 0 | 6 | 0.026808 |
| R08 | natural gas and LNG | partial | 0/2 | 0/1 | 0 | 3 | 0.015094 |
| R09 | gold mining | partial | 0/1 | 0/0 | 0 | 3 | 0.002023 |
| R10 | food retail and logistics | partial | 1/1 | 0/0 | 0 | 3 | 0.002422 |
| R11 | steel and metallurgy | partial | 0/1 | 0/0 | 0 | 3 | 0.002755 |
| R12 | integrated energy | partial | 1/4 | 0/3 | 0 | 5 | 0.016412 |
| R13 | petrochemicals | partial | 0/2 | 0/1 | 0 | 5 | 0.025503 |
| R14 | commercial aviation | partial | 1/1 | 0/0 | 0 | 6 | 0.027030 |
| R15 | e-commerce and logistics | partial | 1/2 | 0/0 | 0 | 3 | 0.007645 |
| R16 | pharmaceutical manufacturing | partial | 0/1 | 0/0 | 0 | 3 | 0.001920 |

Every model-produced quote is checked against the exact stored excerpt. Full source documents are not included; source URL, publication date, printed page (where available), excerpt, and stage outputs are in results.json. Gold annotations and limitations are documented in config.json and real-scenarios.mjs.
