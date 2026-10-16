# Tuning attempts (not final)

These provider-run snapshots were retained while reducing the response cap and removing repeated evidence fields. The final report is one level up in `results.json`.

| Snapshot | Requests | Input tokens | Output tokens | Reported cost | Partial items |
|---|---:|---:|---:|---:|---:|
| `first-pass-results.json` | 5 | 3,009 | 13,292 | ₽0.33988660 | 2 |
| `pre-compact-results.json` | 5 | 3,388 | 22,500 | ₽0.48308524 | 5 |
| `compact-prompt-partial-results.json` | 3 | 2,133 | 13,500 | ₽0.30000000 | 3 |

The retained tuning attempts total 13 requests, 49,292 output tokens, and ₽1.12297184. Including the final five-request run, the retained reports account for 18 requests, 64,292 output tokens, and ₽1.46031499. Use provider billing for account-level totals.
