# T10 live 13-case benchmark · v6

Run at 2026-10-16T23:15:59.954Z. All source documents and company names are synthetic; this measures behavior on these fixtures, not real-company accuracy.

## Aggregate

- Model calls: 76 (0 failed)
- Tokens: 27740 input / 6321 output
- Cost reported by Polza: 0.482812 ₽
- Total model latency: 180790 ms
- Expected entities found: 38/63 (60.3% recall; name/type precision is not assessed here)
- Expected relationship predicates found: 13/31 (41.9% predicate recall; participant-level correctness is not assessed by this coarse metric)

## Per-case summary

| Case | Industry | Status | Entities found | Expected relation predicates found | Calls | Cost ₽ |
|---|---|---|---:|---:|---:|---:|
| L01 | производство | partial | 3/6 | 1/2 | 7 | 0.056276 |
| L02 | IT-услуги | partial | 1/4 | 0/1 | 3 | 0.005687 |
| L03 | торговля | partial | 2/4 | 1/2 | 7 | 0.043130 |
| L04 | логистика | partial | 4/4 | 2/2 | 7 | 0.049198 |
| L05 | пищевое производство | partial | 3/6 | 3/3 | 7 | 0.050544 |
| L06 | энергетика | partial | 2/4 | 1/2 | 5 | 0.026017 |
| L07 | медицинские изделия | partial | 2/4 | 1/3 | 5 | 0.019204 |
| L08 | строительство | partial | 3/4 | 0/2 | 6 | 0.054438 |
| L09 | сельское хозяйство | partial | 5/6 | 1/3 | 7 | 0.048771 |
| L10 | телеком | partial | 3/5 | 1/3 | 6 | 0.049429 |
| L11 | автокомпоненты | partial | 4/5 | 2/3 | 5 | 0.030166 |
| L12 | общественное питание | partial | 4/6 | 0/3 | 7 | 0.041039 |
| L13 | промышленное ПО | partial | 2/5 | 0/2 | 4 | 0.008913 |

Detailed outputs, exact model-returned entities/relations, stage errors and metrics are in `results.json`. This is a smoke benchmark on synthetic text; predicates are checked without verifying participant pairs, and reported precision/recall must not be treated as production quality.
