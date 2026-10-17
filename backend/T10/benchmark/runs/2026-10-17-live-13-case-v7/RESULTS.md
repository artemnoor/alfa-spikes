# T10 live 13-case benchmark · v7

Run at 2026-10-16T23:21:53.245Z. All source documents and company names are synthetic; this measures behavior on these fixtures, not real-company accuracy.

## Aggregate

- Model calls: 79 (0 failed)
- Tokens: 28807 input / 6660 output
- Cost reported by Polza: 0.513731 ₽
- Total model latency: 191525 ms
- Expected entities found: 44/63 (69.8% recall; name/type precision is not assessed here)
- Expected relationship predicates found: 12/31 (38.7% predicate recall; participant-level correctness is not assessed by this coarse metric)

## Per-case summary

| Case | Industry | Status | Entities found | Expected relation predicates found | Calls | Cost ₽ |
|---|---|---|---:|---:|---:|---:|
| L01 | производство | partial | 3/6 | 1/2 | 7 | 0.045180 |
| L02 | IT-услуги | partial | 3/4 | 1/1 | 6 | 0.028614 |
| L03 | торговля | partial | 3/4 | 2/2 | 7 | 0.043978 |
| L04 | логистика | partial | 4/4 | 2/2 | 7 | 0.045200 |
| L05 | пищевое производство | partial | 4/6 | 1/3 | 7 | 0.037533 |
| L06 | энергетика | partial | 2/4 | 1/2 | 5 | 0.022128 |
| L07 | медицинские изделия | partial | 4/4 | 1/3 | 5 | 0.029189 |
| L08 | строительство | partial | 4/4 | 0/2 | 6 | 0.042720 |
| L09 | сельское хозяйство | partial | 5/6 | 1/3 | 7 | 0.039892 |
| L10 | телеком | partial | 3/5 | 1/3 | 6 | 0.043726 |
| L11 | автокомпоненты | partial | 3/5 | 1/3 | 5 | 0.077818 |
| L12 | общественное питание | partial | 4/6 | 0/3 | 7 | 0.042362 |
| L13 | промышленное ПО | partial | 2/5 | 0/2 | 4 | 0.015391 |

Detailed outputs, exact model-returned entities/relations, stage errors and metrics are in `results.json`. This is a smoke benchmark on synthetic text; predicates are checked without verifying participant pairs, and reported precision/recall must not be treated as production quality.
