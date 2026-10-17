# T10 live relation triple evaluation

- Base run: T10-live-13-v7
- Synthetic fixtures only. This is an offline re-score; no model calls were made.
- True positives / false positives / false negatives: 10 / 4 / 30
- Precision / recall / F1: 71.4% / 25.0% / 37.0%
- Expected manually annotated relation triples: 40
- Matching requires predicate and both participant names. Name matching applies Unicode normalization and substring matching to tolerate inflection.

| Case | Correct expected triples | Unexpected predicted triples |
|---|---:|---:|
| L01 | 1/4 | 1 |
| L02 | 0/2 | 1 |
| L03 | 1/3 | 1 |
| L04 | 2/2 | 0 |
| L05 | 1/4 | 0 |
| L06 | 1/3 | 0 |
| L07 | 1/2 | 0 |
| L08 | 0/2 | 0 |
| L09 | 1/4 | 0 |
| L10 | 1/4 | 0 |
| L11 | 1/4 | 0 |
| L12 | 0/4 | 1 |
| L13 | 0/2 | 0 |

Gold annotations are hand-authored for these synthetic snippets and deliberately omit relations not represented safely by the current predicate ontology. The results do not estimate quality on real company documents. Per-case expected matches and false positives are in saved JSON artifacts.
