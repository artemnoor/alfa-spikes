# T10 independent real-source holdout — 2026-10-17-independent-holdout-live-v3

- Dataset: frozen source-disjoint holdout; 30 manually labeled passages from official primary-source filings and annual reports; labels were not used to tune prompts or retrieval. Gold labels were frozen before the live run; the prompt and retrieval code were not tuned on these cases.
- Scoring: strict normalized exact label match; no substring or partial-name match. Relationships are ordered subject-predicate-object triples; reversed direction is not counted as a match.
- Models: DeepSeek=deepseek/deepseek-v4-flash; JEV=typesafe/jev; embeddings=qwen/qwen3-embedding-8b.
- Calls: 212 (0 failed); tokens in/out: 122890/17315; reported spend: ₽0.524357.
- Model-call latency: mean 2567 ms, P95 6028 ms across 212 recorded calls.
- Entities TP/FP/FN: 62/23/17; precision/recall/F1 72.9%/78.5%/75.6%.
- Exact directed relations TP/FP/FN: 8/10/18; precision/recall/F1 44.4%/30.8%/36.4%. Direction accuracy 100.0% (8 comparable cases); status accuracy 87.5% (8 exact triples).

| Case | Industry | Entity hits | Relation hits | Relation FP | Calls | Cost ₽ |
|---|---|---:|---:|---:|---:|---:|
| H01 | fertilizer manufacturing | 1/2 | 0/1 | 1 | 8 | 0.022479 |
| H02 | aluminium manufacturing | 3/3 | 1/1 | 0 | 8 | 0.023124 |
| H03 | uranium mining | 1/2 | 0/1 | 0 | 5 | 0.008119 |
| H04 | specialty chemicals | 1/2 | 0/1 | 1 | 8 | 0.018794 |
| H05 | packaging manufacturing | 1/2 | 0/1 | 0 | 6 | 0.012249 |
| H06 | paper and packaging | 2/2 | 1/1 | 0 | 8 | 0.023883 |
| H07 | fertilizer and energy | 2/3 | 0/1 | 1 | 8 | 0.021814 |
| H08 | department-store retail and logistics | 2/3 | 0/0 | 0 | 6 | 0.010327 |
| H09 | automotive retail and logistics | 2/2 | 0/1 | 0 | 5 | 0.009365 |
| H10 | parcel logistics | 1/2 | 0/1 | 0 | 6 | 0.008609 |
| H11 | parcel logistics | 3/3 | 0/1 | 1 | 9 | 0.022957 |
| H12 | general merchandise retail | 2/2 | 0/1 | 0 | 5 | 0.007985 |
| H13 | retail and distribution | 2/2 | 1/1 | 0 | 8 | 0.031363 |
| H14 | discount retail and logistics | 3/3 | 0/1 | 1 | 7 | 0.013325 |
| H15 | semiconductors and AI computing | 3/3 | 1/1 | 0 | 8 | 0.021558 |
| H16 | cloud computing and software | 2/2 | 1/1 | 0 | 5 | 0.012984 |
| H17 | enterprise software and IT services | 1/2 | 0/1 | 0 | 6 | 0.011545 |
| H18 | telecommunications | 2/2 | 0/1 | 0 | 5 | 0.006666 |
| H19 | telecommunications | 2/3 | 0/1 | 0 | 5 | 0.006683 |
| H20 | pharmaceuticals | 2/4 | 0/1 | 2 | 8 | 0.029336 |
| H21 | pharmaceuticals | 2/2 | 0/0 | 0 | 5 | 0.006845 |
| H22 | pharmaceuticals | 2/2 | 0/0 | 1 | 8 | 0.019704 |
| H23 | electric infrastructure construction | 3/4 | 1/1 | 0 | 10 | 0.031635 |
| H24 | oil and gas | 4/4 | 0/0 | 0 | 7 | 0.021030 |
| H25 | electric utilities | 3/3 | 0/1 | 0 | 6 | 0.007742 |
| H26 | warehouse retail | 2/2 | 1/1 | 0 | 8 | 0.016201 |
| H27 | home improvement retail and logistics | 2/2 | 0/1 | 0 | 6 | 0.007006 |
| H28 | steel manufacturing | 3/4 | 1/2 | 1 | 11 | 0.040183 |
| H29 | cloud computing and e-commerce | 1/3 | 0/1 | 1 | 9 | 0.021299 |
| H30 | commercial aviation | 2/4 | 0/0 | 0 | 8 | 0.029547 |

Full source URLs, passages, predictions and labels are in results.json. This holdout is independent by source/company from R01–R16, but one small 30-case evaluation does not establish target quality or production readiness.
