# T10 live 13-case benchmark

Run at 2026-10-16T22:27:44.184Z. All source documents and company names are synthetic; this measures behavior on these fixtures, not real-company accuracy.

## Aggregate

- Model calls: 39 (0 failed)
- Tokens: 11889 input / 7082 output
- Cost reported by Polza: 0.133697 ₽
- Total model latency: 133521 ms
- Expected entities found: 46/63 (73.0% recall; name/type precision is not assessed here)
- Expected relationship predicates found: 17/31 (54.8% predicate recall; participant-level correctness is not assessed by this coarse metric)

## Per-case summary

| Case | Industry | Status | Entities found | Expected relation predicates found | Calls | Cost ₽ |
|---|---|---|---:|---:|---:|---:|
| L01 | производство | partial | 3/6 | 2/2 | 3 | 0.009587 |
| L02 | IT-услуги | partial | 3/4 | 0/1 | 3 | 0.011489 |
| L03 | торговля | partial | 3/4 | 2/2 | 3 | 0.008347 |
| L04 | логистика | partial | 4/4 | 2/2 | 3 | 0.008252 |
| L05 | пищевое производство | partial | 4/6 | 2/3 | 3 | 0.012320 |
| L06 | энергетика | partial | 4/4 | 1/2 | 3 | 0.008482 |
| L07 | медицинские изделия | partial | 2/4 | 1/3 | 3 | 0.018407 |
| L08 | строительство | partial | 3/4 | 0/2 | 3 | 0.008190 |
| L09 | сельское хозяйство | partial | 6/6 | 2/3 | 3 | 0.011367 |
| L10 | телеком | partial | 4/5 | 2/3 | 3 | 0.009108 |
| L11 | автокомпоненты | partial | 4/5 | 2/3 | 3 | 0.008829 |
| L12 | общественное питание | partial | 4/6 | 1/3 | 3 | 0.011701 |
| L13 | промышленное ПО | partial | 2/5 | 0/2 | 3 | 0.007618 |

Detailed outputs, exact model-returned entities/relations, stage errors and metrics are in `results.json`. This is a smoke benchmark on synthetic text; predicates are checked without verifying participant pairs, and reported precision/recall must not be treated as production quality.
