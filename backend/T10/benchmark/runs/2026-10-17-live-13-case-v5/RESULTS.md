# T10 live 13-case benchmark · v5

Run at 2026-10-16T23:11:21.863Z. All source documents and company names are synthetic; this measures behavior on these fixtures, not real-company accuracy.

## Aggregate

- Model calls: 78 (0 failed)
- Tokens: 27798 input / 6680 output
- Cost reported by Polza: 0.511162 ₽
- Total model latency: 210431 ms
- Expected entities found: 41/63 (65.1% recall; name/type precision is not assessed here)
- Expected relationship predicates found: 10/31 (32.3% predicate recall; participant-level correctness is not assessed by this coarse metric)

## Per-case summary

| Case | Industry | Status | Entities found | Expected relation predicates found | Calls | Cost ₽ |
|---|---|---|---:|---:|---:|---:|
| L01 | производство | partial | 3/6 | 1/2 | 7 | 0.064044 |
| L02 | IT-услуги | partial | 1/4 | 0/1 | 3 | 0.005857 |
| L03 | торговля | partial | 2/4 | 1/2 | 7 | 0.049724 |
| L04 | логистика | partial | 4/4 | 2/2 | 7 | 0.045574 |
| L05 | пищевое производство | partial | 3/6 | 1/3 | 7 | 0.045691 |
| L06 | энергетика | partial | 4/4 | 1/2 | 6 | 0.041057 |
| L07 | медицинские изделия | partial | 2/4 | 1/3 | 5 | 0.036942 |
| L08 | строительство | partial | 4/4 | 0/2 | 6 | 0.026610 |
| L09 | сельское хозяйство | partial | 4/6 | 0/3 | 7 | 0.041432 |
| L10 | телеком | partial | 5/5 | 2/3 | 7 | 0.066747 |
| L11 | автокомпоненты | partial | 3/5 | 1/3 | 5 | 0.031414 |
| L12 | общественное питание | partial | 4/6 | 0/3 | 7 | 0.040333 |
| L13 | промышленное ПО | partial | 2/5 | 0/2 | 4 | 0.015737 |

Detailed outputs, exact model-returned entities/relations, stage errors and metrics are in `results.json`. This is a smoke benchmark on synthetic text; predicates are checked without verifying participant pairs, and reported precision/recall must not be treated as production quality.
