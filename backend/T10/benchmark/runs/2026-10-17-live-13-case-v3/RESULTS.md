# T10 live 13-case benchmark

Run at 2026-10-16T22:37:30.408Z. All source documents and company names are synthetic; this measures behavior on these fixtures, not real-company accuracy.

## Aggregate

- Model calls: 62 (0 failed)
- Tokens: 22795 input / 7976 output
- Cost reported by Polza: 0.279692 ₽
- Total model latency: 193738 ms
- Expected entities found: 52/63 (82.5% recall; name/type precision is not assessed here)
- Expected relationship predicates found: 16/31 (51.6% predicate recall; participant-level correctness is not assessed by this coarse metric)

## Per-case summary

| Case | Industry | Status | Entities found | Expected relation predicates found | Calls | Cost ₽ |
|---|---|---|---:|---:|---:|---:|
| L01 | производство | partial | 3/6 | 1/2 | 5 | 0.024086 |
| L02 | IT-услуги | partial | 4/4 | 1/1 | 5 | 0.024211 |
| L03 | торговля | partial | 3/4 | 2/2 | 5 | 0.023583 |
| L04 | логистика | partial | 4/4 | 1/2 | 5 | 0.023357 |
| L05 | пищевое производство | partial | 6/6 | 2/3 | 5 | 0.026623 |
| L06 | энергетика | partial | 4/4 | 1/2 | 4 | 0.008916 |
| L07 | медицинские изделия | partial | 2/4 | 1/3 | 4 | 0.007559 |
| L08 | строительство | partial | 4/4 | 0/2 | 5 | 0.033465 |
| L09 | сельское хозяйство | partial | 6/6 | 2/3 | 5 | 0.026790 |
| L10 | телеком | partial | 4/5 | 2/3 | 5 | 0.023470 |
| L11 | автокомпоненты | partial | 5/5 | 3/3 | 5 | 0.024221 |
| L12 | общественное питание | partial | 4/6 | 0/3 | 5 | 0.024705 |
| L13 | промышленное ПО | partial | 3/5 | 0/2 | 4 | 0.008706 |

Detailed outputs, exact model-returned entities/relations, stage errors and metrics are in `results.json`. This is a smoke benchmark on synthetic text; predicates are checked without verifying participant pairs, and reported precision/recall must not be treated as production quality.
