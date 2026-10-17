# T10 live 13-case benchmark

Run at 2026-10-16T22:23:34.402Z. All source documents and company names are synthetic; this measures behavior on these fixtures, not real-company accuracy.

## Aggregate

- Model calls: 41 (2 failed)
- Tokens: 11812 input / 6715 output
- Cost reported by Polza: 0.229122 ₽
- Total model latency: 128643 ms
- Expected entities found: 50/63 (79.4% recall; name/type precision is not assessed here)
- Expected relationship predicates found: 13/31 (41.9% predicate recall; participant-level correctness is not assessed by this coarse metric)

## Per-case summary

| Case | Industry | Status | Entities found | Expected relation predicates found | Calls | Cost ₽ |
|---|---|---|---:|---:|---:|---:|
| L01 | производство | partial | 5/6 | 1/2 | 3 | 0.028012 |
| L02 | IT-услуги | partial | 4/4 | 1/1 | 3 | 0.010658 |
| L03 | торговля | partial | 3/4 | 2/2 | 3 | 0.011596 |
| L04 | логистика | partial | 4/4 | 2/2 | 3 | 0.019573 |
| L05 | пищевое производство | partial | 5/6 | 0/3 | 4 | 0.013179 |
| L06 | энергетика | partial | 4/4 | 1/2 | 3 | 0.020545 |
| L07 | медицинские изделия | partial | 3/4 | 0/3 | 4 | 0.008325 |
| L08 | строительство | partial | 3/4 | 0/2 | 3 | 0.009076 |
| L09 | сельское хозяйство | partial | 6/6 | 2/3 | 3 | 0.011349 |
| L10 | телеком | partial | 4/5 | 2/3 | 3 | 0.042966 |
| L11 | автокомпоненты | partial | 3/5 | 1/3 | 3 | 0.010076 |
| L12 | общественное питание | partial | 4/6 | 1/3 | 3 | 0.020496 |
| L13 | промышленное ПО | partial | 2/5 | 0/2 | 3 | 0.023271 |

Detailed outputs, exact model-returned entities/relations, stage errors and metrics are in `results.json`. This is a smoke benchmark on synthetic text; predicates are checked without verifying participant pairs, and reported precision/recall must not be treated as production quality.
