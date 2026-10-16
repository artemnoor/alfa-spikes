# Saved T08 model runs

Each run is stored separately so changing the active classifier does not overwrite prior outputs.

- `jev-2026-10-15/` contains the 300-record Jev benchmark run: 232 predictions, 68 unavailable responses, summary metrics, and an estimated minimum spend of 55.44 RUB from successful-record input tokens. The exact Polza account debit was not captured.
- `jev-2026-10-15/hierarchical-score.json` contains the relaxed IPTC topic score for those saved Jev predictions. Overall, strict QCode accuracy is 37.1%, mean hierarchical F1 is 50.0%, and top-level category accuracy is 71.6%; on the held-out test split, the values are 33.3%, 58.3%, and 87.5%. It is computed offline from the predictions and taxonomy; no additional model calls were made.
- `deepseek-v4-flash-2026-10-15/` contains the full run on the same 300 records: 206 predictions, 94 unavailable responses, the Polza-reported cost for successful records, and a paired comparison against Jev. See `comparison-with-jev.json` for same-ID and held-out test comparisons. Failed requests may also have incurred charges not present in the saved successful responses.
- `deepseek-v4-flash-smoke.json` contains the latest response for one synthetic article classified through the replaced DeepSeek V4 Flash backend; Polza reported 0.038939 RUB for that response.
- `deepseek-v4-flash-smoke-history.json` records the three successful smoke responses for the same article and their reported costs, 0.118534 RUB total. Failed exploratory attempts are excluded because their billing was not captured.
