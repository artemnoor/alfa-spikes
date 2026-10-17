# T10 independent real-source holdout — 2026-10-17-independent-holdout-live-v4

- Dataset: frozen source-disjoint holdout; 30 manually labeled passages from official primary-source filings and annual reports; labels were not used to tune prompts or retrieval. Gold labels were frozen before the live run; the prompt and retrieval code were not tuned on these cases.
- Scoring: strict normalized exact label match; no substring or partial-name match. Relationships are ordered subject-predicate-object triples; reversed direction is not counted as a match.
- Models: DeepSeek=deepseek/deepseek-v4-flash; JEV=typesafe/jev; embeddings=qwen/qwen3-embedding-8b.
- Calls: 218 (0 failed); tokens in/out: 131417/18099; reported spend: ₽0.455116.
- Model-call latency: mean 2927 ms, P95 6346 ms across 218 recorded calls.
- Entities TP/FP/FN: 61/26/18; precision/recall/F1 70.1%/77.2%/73.5%.
- Exact directed relations TP/FP/FN: 8/12/18; precision/recall/F1 40.0%/30.8%/34.8%. Direction accuracy 100.0% (8 comparable cases); status accuracy 87.5% (8 exact triples).

| Case | Industry | Entity hits | Relation hits | Relation FP | Calls | Cost ₽ |
|---|---|---:|---:|---:|---:|---:|
| H01 | fertilizer manufacturing | 1/2 | 0/1 | 1 | 8 | 0.016413 |
| H02 | aluminium manufacturing | 3/3 | 1/1 | 0 | 8 | 0.017750 |
| H03 | uranium mining | 1/2 | 0/1 | 0 | 7 | 0.013264 |
| H04 | specialty chemicals | 1/2 | 0/1 | 1 | 8 | 0.018286 |
| H05 | packaging manufacturing | 1/2 | 0/1 | 0 | 8 | 0.015699 |
| H06 | paper and packaging | 2/2 | 1/1 | 0 | 8 | 0.018795 |
| H07 | fertilizer and energy | 2/3 | 0/1 | 1 | 8 | 0.019203 |
| H08 | department-store retail and logistics | 2/3 | 0/0 | 0 | 6 | 0.005994 |
| H09 | automotive retail and logistics | 2/2 | 0/1 | 0 | 5 | 0.004323 |
| H10 | parcel logistics | 1/2 | 0/1 | 0 | 6 | 0.005392 |
| H11 | parcel logistics | 3/3 | 0/1 | 1 | 9 | 0.020771 |
| H12 | general merchandise retail | 2/2 | 0/1 | 0 | 5 | 0.004407 |
| H13 | retail and distribution | 2/2 | 1/1 | 0 | 8 | 0.017926 |
| H14 | discount retail and logistics | 3/3 | 0/1 | 1 | 7 | 0.007455 |
| H15 | semiconductors and AI computing | 3/3 | 1/1 | 0 | 8 | 0.017962 |
| H16 | cloud computing and software | 2/2 | 1/1 | 0 | 5 | 0.012847 |
| H17 | enterprise software and IT services | 1/2 | 0/1 | 2 | 6 | 0.018128 |
| H18 | telecommunications | 2/2 | 0/1 | 0 | 5 | 0.005167 |
| H19 | telecommunications | 2/3 | 0/1 | 0 | 5 | 0.005903 |
| H20 | pharmaceuticals | 2/4 | 0/1 | 1 | 7 | 0.009435 |
| H21 | pharmaceuticals | 2/2 | 0/0 | 0 | 5 | 0.004661 |
| H22 | pharmaceuticals | 2/2 | 0/0 | 1 | 8 | 0.019528 |
| H23 | electric infrastructure construction | 3/4 | 1/1 | 0 | 10 | 0.033073 |
| H24 | oil and gas | 4/4 | 0/0 | 1 | 10 | 0.032123 |
| H25 | electric utilities | 3/3 | 0/1 | 0 | 6 | 0.008368 |
| H26 | warehouse retail | 2/2 | 1/1 | 0 | 8 | 0.016134 |
| H27 | home improvement retail and logistics | 2/2 | 0/1 | 0 | 6 | 0.006544 |
| H28 | steel manufacturing | 3/4 | 1/2 | 1 | 10 | 0.036808 |
| H29 | cloud computing and e-commerce | 1/3 | 0/1 | 1 | 9 | 0.020682 |
| H30 | commercial aviation | 1/4 | 0/0 | 0 | 9 | 0.022075 |

Full source URLs, passages, predictions and labels are in results.json. This holdout is independent by source/company from R01–R16, but one small 30-case evaluation does not establish target quality or production readiness.
