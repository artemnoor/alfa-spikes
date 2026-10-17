# T10 live 13-case benchmark · v8

Run at 2026-10-16T23:26:22.727Z. All source documents and company names are synthetic; this measures behavior on these fixtures, not real-company accuracy.

## Aggregate

- Model calls: 76 (0 failed)
- Tokens: 33683 input / 6297 output
- Cost reported by Polza: 0.431028 ₽
- Total model latency: 165536 ms
- Expected entities found: 43/63 (68.3% recall; name/type precision is not assessed here)
- Expected relationship predicates found: 11/31 (35.5% predicate recall; participant-level correctness is not assessed by this coarse metric)

## Per-case summary

| Case | Industry | Status | Entities found | Expected relation predicates found | Calls | Cost ₽ |
|---|---|---|---:|---:|---:|---:|
| L01 | производство | partial | 3/6 | 2/2 | 7 | 0.055903 |
| L02 | IT-услуги | partial | 3/4 | 0/1 | 5 | 0.013084 |
| L03 | торговля | partial | 2/4 | 0/2 | 6 | 0.027305 |
| L04 | логистика | partial | 4/4 | 2/2 | 7 | 0.046892 |
| L05 | пищевое производство | partial | 3/6 | 1/3 | 7 | 0.042765 |
| L06 | энергетика | partial | 2/4 | 1/2 | 5 | 0.030286 |
| L07 | медицинские изделия | partial | 4/4 | 1/3 | 5 | 0.032229 |
| L08 | строительство | partial | 4/4 | 0/2 | 6 | 0.029069 |
| L09 | сельское хозяйство | partial | 6/6 | 2/3 | 7 | 0.050126 |
| L10 | телеком | partial | 4/5 | 0/3 | 6 | 0.030709 |
| L11 | автокомпоненты | partial | 4/5 | 2/3 | 5 | 0.023997 |
| L12 | общественное питание | partial | 2/6 | 0/3 | 6 | 0.036814 |
| L13 | промышленное ПО | partial | 2/5 | 0/2 | 4 | 0.011849 |

Detailed outputs, exact model-returned entities/relations, stage errors and metrics are in `results.json`. This is a smoke benchmark on synthetic text; predicates are checked without verifying participant pairs, and reported precision/recall must not be treated as production quality.
