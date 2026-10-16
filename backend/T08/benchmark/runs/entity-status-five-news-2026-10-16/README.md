# Event status benchmark — 2026-10-16

Five synthetic Russian articles exercise one expected status each: `completed`, `announced`, `planned`, `conditional`, and `denied`. The inputs and final normalized output are `news.json` and `results.json` in this folder.

## Final provider run

- DeepSeek V4 Flash requests: 5, one per article; no retry.
- Provider stopped all five responses at `finish_reason=length`.
- Output cap: 3,000 tokens per request; total: 3,270 input / 15,000 output tokens.
- Provider reported cost: ₽0.33734315.
- All five expected primary statuses matched the article wording.
- The final report marks all five records `partial`. Its event graphs were rebuilt from exact source sentences; that deterministic pass made no additional model calls.
- Final graph: 18 entities, 6 events, 2 relations, 6 attributes. The acquisition link and the executive-to-company link are both grounded in article quotes.

The status benchmark checks the rule-based `event_status` layer, not SENTiVENT's taxonomy accuracy or complete NER recall. SENTiVENT remains a separate classification in the T08 API response; granular events, participants, relations, and facts live in the entity graph. Because all five provider answers were truncated, this run does not establish that the model's full entity graph is complete; the saved records are explicitly partial.

## Repeat

From `backend/T08`:

```powershell
node benchmark/run-entities-five-news.mjs benchmark/runs/entity-status-five-news-2026-10-16/news.json benchmark/runs/entity-status-five-news-2026-10-16/results.json
npm run rebuild:entity-status-graph
npm run verify:entity-status
npm run test:entities:graph
```

`run-entities-five-news.mjs` makes the five paid provider calls. `rebuild:entity-status-graph` only rebuilds grounded fallback records and makes no model calls. `test:entities:graph` mocks provider responses and verifies status rules, quote inheritance, and that `finish_reason=length` does not trigger a retry.

Earlier tuning outputs are in `iterations/` and are not the final report.
