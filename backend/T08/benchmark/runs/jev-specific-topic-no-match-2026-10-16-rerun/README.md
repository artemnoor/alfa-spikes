# Jev specific-topic and SENTiVENT no-match run

Valid run on the five user-provided Russian news items using the current `backend/T08/src/classifier.mjs` after confirming `no_matching_event` already exists in the SENTiVENT source tree. Results are in `results.json`.

- Completed: 5/5
- DeepSeek topic fallback: 3/5; each escalated article received one final DeepSeek call
- Total API calls: 74
- Input tokens: 147,753
- Polza-reported cost for this valid run: ₽2.60586794
- SENTiVENT selected `no_matching_event` on 0/5. On the cyberattack fact-check article it ranked second (36.05%) behind CSR/Brand (63.95%), so the no-match option is available but this example shows the event ranking still needs work.

An initial run in the sibling folder `jev-specific-topic-no-match-2026-10-16` was discarded because the runtime had temporarily duplicated the existing no-match option. It cost ₽2.57083439. Total Polza-reported spend across both attempts: ₽5.17670233; only this rerun is used for the reported classifications.

Model confidence and text-support values are model outputs, not human-verified probabilities.
