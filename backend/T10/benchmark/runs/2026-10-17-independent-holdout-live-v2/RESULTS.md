# T10 independent real-source holdout — 2026-10-17-independent-holdout-live-v2

- Dataset: frozen source-disjoint holdout; 30 manually labeled passages from official primary-source filings and annual reports. Gold labels were frozen before the live run and were not used to tune prompts or retrieval. The v2 implementation revision was developed and checked on R04–R16; labels were not edited after v1.
- Scoring: strict normalized exact label match; no substring or partial-name match. Relationships are ordered subject-predicate-object triples; reversed direction is not counted as a match.
- Models: DeepSeek=deepseek/deepseek-v4-flash; JEV=typesafe/jev; embeddings=qwen/qwen3-embedding-8b.
- Calls: 215 (1 failed); tokens in/out: 115635/17724; reported spend: ₽0.552483.
- Model-call latency: mean 2443 ms, P95 4892 ms across 215 recorded calls.
- Entities TP/FP/FN: 63/23/16; precision/recall/F1 73.3%/79.7%/76.4%.
- Exact directed relations TP/FP/FN: 8/13/18; precision/recall/F1 38.1%/30.8%/34.0%. Direction accuracy 100.0% (8 comparable cases); status accuracy 87.5% (8 exact triples).

| Case | Industry | Entity hits | Relation hits | Relation FP | Calls | Cost ₽ |
|---|---|---:|---:|---:|---:|---:|
| H01 | fertilizer manufacturing | 1/2 | 0/1 | 1 | 8 | 0.021695 |
| H02 | aluminium manufacturing | 3/3 | 1/1 | 0 | 8 | 0.022570 |
| H03 | uranium mining | 2/2 | 1/1 | 1 | 11 | 0.037666 |
| H04 | specialty chemicals | 1/2 | 0/1 | 1 | 8 | 0.020528 |
| H05 | packaging manufacturing | 1/2 | 0/1 | 0 | 6 | 0.008278 |
| H06 | paper and packaging | 2/2 | 0/1 | 0 | 6 | 0.009969 |
| H07 | fertilizer and energy | 2/3 | 0/1 | 1 | 8 | 0.022201 |
| H08 | department-store retail and logistics | 3/3 | 0/0 | 0 | 6 | 0.010857 |
| H09 | automotive retail and logistics | 2/2 | 0/1 | 0 | 5 | 0.006180 |
| H10 | parcel logistics | 1/2 | 0/1 | 0 | 6 | 0.007928 |
| H11 | parcel logistics | 3/3 | 0/1 | 1 | 9 | 0.021387 |
| H12 | general merchandise retail | 2/2 | 0/1 | 0 | 5 | 0.009268 |
| H13 | retail and distribution | 2/2 | 1/1 | 0 | 8 | 0.032568 |
| H14 | discount retail and logistics | 3/3 | 0/1 | 1 | 7 | 0.012658 |
| H15 | semiconductors and AI computing | 3/3 | 1/1 | 0 | 8 | 0.020872 |
| H16 | cloud computing and software | 2/2 | 1/1 | 0 | 5 | 0.015887 |
| H17 | enterprise software and IT services | 1/2 | 0/1 | 0 | 6 | 0.010508 |
| H18 | telecommunications | 2/2 | 0/1 | 0 | 5 | 0.005899 |
| H19 | telecommunications | 2/3 | 0/1 | 0 | 5 | 0.008857 |
| H20 | pharmaceuticals | 2/4 | 0/1 | 2 | 8 | 0.029371 |
| H21 | pharmaceuticals | 2/2 | 0/0 | 0 | 5 | 0.008896 |
| H22 | pharmaceuticals | 2/2 | 0/0 | 1 | 8 | 0.022870 |
| H23 | electric infrastructure construction | 3/4 | 1/1 | 1 | 10 | 0.040661 |
| H24 | oil and gas | 4/4 | 0/0 | 0 | 7 | 0.021791 |
| H25 | electric utilities | 3/3 | 0/1 | 0 | 6 | 0.009030 |
| H26 | warehouse retail | 2/2 | 1/1 | 0 | 8 | 0.018079 |
| H27 | home improvement retail and logistics | 2/2 | 0/1 | 0 | 5 | 0.008407 |
| H28 | steel manufacturing | 3/4 | 1/2 | 2 | 10 | 0.040684 |
| H29 | cloud computing and e-commerce | 1/3 | 0/1 | 1 | 9 | 0.021765 |
| H30 | commercial aviation | 1/4 | 0/0 | 0 | 9 | 0.025153 |

Full source URLs, passages, predictions and labels are in results.json. This holdout is independent by source/company from R01–R16, but one small 30-case evaluation does not establish target quality or production readiness. The repeated model run is nondeterministic; compare v1/v2 as run variation, not as a controlled model improvement.
