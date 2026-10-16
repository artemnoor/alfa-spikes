# T08 entity extraction benchmark

Run on 2026-10-16 with `deepseek/deepseek-v4-flash` through Polza AI. The five input articles are the existing T08 examples, including fictional organizations.

| News | Accepted entities | Result overview |
| --- | ---: | --- |
| Financing | 6 | VectorMash, Tula region, 3.2 billion RUB, 15 Oct 2026, Q3 2027, industrial robots |
| Supplier problems | 4 | PolymerSnab, SeverPak, 780 million RUB, 14 Oct 2026 |
| Competitor acquisition | 6 | TransLine, ExpressCargo, 5.6 billion RUB, Dec 2026, 15%, 13 Oct 2026 |
| Financial interview | 6 | AgroSfera, Anna Belova, Business-Vector, 2 billion RUB, 38%, 12 Oct 2026 |
| Cyberattack denial | 3 | FinPotok, 10 Oct 2026, 11 Oct 2026 |

## Usage

- 5 DeepSeek requests, one per article
- 1,957 input tokens and 8,471 output tokens
- Polza reported total model cost: **₽0.12653833**
- 8 individual FNS search requests; no bulk registry data was downloaded
- 25 entities accepted; 1 model proposal rejected because its quote was not an exact supported fragment
- Verification found 0 invalid evidence quotes among accepted entities
- No company ID or INN was attached: exact name alone matched records with ambiguous identity or insufficient legal-form context

The full structured result, including each entity's type, quote, role, normalized value, ID status, and model confidence, is in `results.json`. Run `npm run verify:entities` from `backend/T08` to recheck exact quotes and deterministic normalization without making model or registry requests. To repeat model calls, run `npm run benchmark:entities`; this consumes Polza quota.
