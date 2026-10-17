# T10 independent real-source holdout — 2026-10-17-independent-holdout-live-v1

- Dataset: frozen source-disjoint holdout; 30 manually labeled passages from official primary-source filings and annual reports; untouched during prompt/retrieval tuning. Gold labels were frozen before the live run; the prompt and retrieval code were not tuned on these cases.
- Scoring: strict normalized exact label match; no substring or partial-name match. Relationships are ordered subject-predicate-object triples; reversed direction is not counted as a match.
- Models: DeepSeek=deepseek/deepseek-v4-flash; JEV=typesafe/jev; embeddings=qwen/qwen3-embedding-8b.
- Calls: 216 (0 failed); tokens in/out: 114776/16484; reported spend: ₽0.910891.
- Model-call latency: mean 2928 ms, P95 8831 ms across 216 recorded calls.
- Entities TP/FP/FN: 61/22/18; precision/recall/F1 73.5%/77.2%/75.3%.
- Exact directed relations TP/FP/FN: 10/13/16; precision/recall/F1 43.5%/38.5%/40.8%. Direction accuracy 100.0% (10 comparable cases); status accuracy 90.0% (10 exact triples).

| Case | Industry | Entity hits | Relation hits | Relation FP | Calls | Cost ₽ |
|---|---|---:|---:|---:|---:|---:|
| H01 | fertilizer manufacturing | 1/2 | 0/1 | 1 | 8 | 0.020389 |
| H02 | aluminium manufacturing | 3/3 | 1/1 | 0 | 8 | 0.020482 |
| H03 | uranium mining | 2/2 | 1/1 | 1 | 11 | 0.050738 |
| H04 | specialty chemicals | 1/2 | 0/1 | 1 | 8 | 0.111010 |
| H05 | packaging manufacturing | 2/2 | 0/1 | 0 | 5 | 0.010817 |
| H06 | paper and packaging | 2/2 | 1/1 | 0 | 8 | 0.019415 |
| H07 | fertilizer and energy | 2/3 | 0/1 | 1 | 8 | 0.030422 |
| H08 | department-store retail and logistics | 2/3 | 0/0 | 0 | 6 | 0.040693 |
| H09 | automotive retail and logistics | 2/2 | 0/1 | 0 | 6 | 0.026988 |
| H10 | parcel logistics | 1/2 | 0/1 | 0 | 6 | 0.030591 |
| H11 | parcel logistics | 3/3 | 1/1 | 3 | 9 | 0.078844 |
| H12 | general merchandise retail | 1/2 | 0/1 | 0 | 6 | 0.021245 |
| H13 | retail and distribution | 2/2 | 1/1 | 0 | 8 | 0.055702 |
| H14 | discount retail and logistics | 2/3 | 0/1 | 0 | 5 | 0.009338 |
| H15 | semiconductors and AI computing | 3/3 | 1/1 | 1 | 8 | 0.024447 |
| H16 | cloud computing and software | 2/2 | 1/1 | 0 | 5 | 0.037596 |
| H17 | enterprise software and IT services | 1/2 | 0/1 | 0 | 6 | 0.015334 |
| H18 | telecommunications | 2/2 | 0/1 | 0 | 5 | 0.010165 |
| H19 | telecommunications | 2/3 | 0/1 | 0 | 5 | 0.008945 |
| H20 | pharmaceuticals | 2/4 | 0/1 | 1 | 7 | 0.028736 |
| H21 | pharmaceuticals | 2/2 | 0/0 | 1 | 7 | 0.011546 |
| H22 | pharmaceuticals | 2/2 | 0/0 | 0 | 5 | 0.010289 |
| H23 | electric infrastructure construction | 3/4 | 1/1 | 1 | 10 | 0.056977 |
| H24 | oil and gas | 4/4 | 0/0 | 0 | 8 | 0.043911 |
| H25 | electric utilities | 3/3 | 0/1 | 0 | 6 | 0.009826 |
| H26 | warehouse retail | 2/2 | 1/1 | 0 | 8 | 0.018724 |
| H27 | home improvement retail and logistics | 2/2 | 0/1 | 0 | 6 | 0.008988 |
| H28 | steel manufacturing | 3/4 | 1/2 | 1 | 10 | 0.042938 |
| H29 | cloud computing and e-commerce | 1/3 | 0/1 | 1 | 9 | 0.026646 |
| H30 | commercial aviation | 1/4 | 0/0 | 0 | 9 | 0.029149 |

Full source URLs, passages, predictions and labels are in results.json. This holdout is independent by source/company from R01–R16, but one small 30-case evaluation does not establish target quality or production readiness.
