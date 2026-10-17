# T10 real-source benchmark v1

- Run: 2026-10-16T23:35:12.907Z
- real company reports; open primary sources; manually annotated excerpts. Short excerpts from primary sources; this three-case pilot is not a general accuracy estimate.
- Model calls: 14 (0 failed); input/output tokens: 4287/672; reported cost: 0.041027 ₽; total latency: 28243 ms.
- Entity TP/FP/FN: 8/0/4; precision/recall/F1: 100.0%/66.7%/80.0%.
- Relation TP/FP/FN: 1/0/3; precision/recall/F1: 100.0%/25.0%/40.0%. Relation matches require predicate and both participants.

| Case | Industry | Pipeline | Entity recall | Relation recall | Relation FP | Calls | Cost ₽ |
|---|---|---|---:|---:|---:|---:|---:|
| R01 | steel manufacturing | partial | 1/2 | 0/1 | 0 | 3 | 0.002571 |
| R02 | food retail and logistics | partial | 4/5 | 1/1 | 0 | 6 | 0.026945 |
| R03 | telecommunications | partial | 3/5 | 0/2 | 0 | 5 | 0.011511 |

Every model-produced quote is checked against the exact stored excerpt. Full source documents are not included; source URL, publication date, printed page (where available), excerpt, and stage outputs are in results.json. Gold annotations and limitations are documented in config.json and real-scenarios.mjs.
