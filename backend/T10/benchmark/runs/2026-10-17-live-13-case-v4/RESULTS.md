# T10 live 13-case benchmark · v4

Run at 2026-10-16T22:55:33.143Z. All source documents and company names are synthetic; this measures behavior on these fixtures, not real-company accuracy.

## Aggregate

- Model calls: 67 (0 failed)
- Tokens: 20453 input / 6235 output
- Cost reported by Polza: 0.403828 ₽
- Total model latency: 177012 ms
- Expected entities found: 43/63 (68.3% recall; name/type precision is not assessed here)
- Expected relationship predicates found: 15/31 (48.4% predicate recall; participant-level correctness is not assessed by this coarse metric)

## Per-case summary

| Case | Industry | Status | Entities found | Expected relation predicates found | Calls | Cost ₽ |
|---|---|---|---:|---:|---:|---:|
| L01 | производство | partial | 3/6 | 1/2 | 6 | 0.031029 |
| L02 | IT-услуги | partial | 1/4 | 0/1 | 3 | 0.005926 |
| L03 | торговля | partial | 3/4 | 2/2 | 6 | 0.033616 |
| L04 | логистика | partial | 4/4 | 2/2 | 6 | 0.039566 |
| L05 | пищевое производство | partial | 5/6 | 2/3 | 6 | 0.030516 |
| L06 | энергетика | partial | 2/4 | 1/2 | 4 | 0.026254 |
| L07 | медицинские изделия | partial | 2/4 | 1/3 | 4 | 0.016891 |
| L08 | строительство | partial | 3/4 | 0/2 | 6 | 0.045939 |
| L09 | сельское хозяйство | partial | 6/6 | 2/3 | 6 | 0.031798 |
| L10 | телеком | partial | 5/5 | 2/3 | 6 | 0.046798 |
| L11 | автокомпоненты | partial | 3/5 | 1/3 | 4 | 0.034297 |
| L12 | общественное питание | partial | 4/6 | 1/3 | 6 | 0.046061 |
| L13 | промышленное ПО | partial | 2/5 | 0/2 | 4 | 0.015137 |

Detailed outputs, exact model-returned entities/relations, stage errors and metrics are in `results.json`. This is a smoke benchmark on synthetic text; predicates are checked without verifying participant pairs, and reported precision/recall must not be treated as production quality.
