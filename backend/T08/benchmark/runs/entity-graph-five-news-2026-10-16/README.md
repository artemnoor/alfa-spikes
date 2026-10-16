# T08 entity graph benchmark — 2026-10-16

The five existing Russian news examples were run through the T08 entity endpoint. Each article made one DeepSeek V4 Flash request. Publication dates were passed separately as metadata. The backend validated every evidence quote against the article or metadata source, normalized values, linked organizations where the registry endpoint allowed it, and built event and relation records.

## Run result

- News: 5
- Complete DeepSeek results: 4
- Grounded fallback results: 1 (the interview response reached the provider's 12,000-token completion limit; only exact, locally verifiable mentions and facts are shown)
- Model calls: 5
- Tokens: 3,492 input / 33,158 output
- Provider reported cost: ₽0.52486872
- Registry lookups: 9
- Entities: 27
- Events: 12
- Relations: 5
- Event attributes: 15
- Evidence and relation-endpoint errors: 0

The fallback for news 4 contains the companies “Бизнес-Вектор” and “АгроСфера”, speaker Анна Белова, metadata date 2026-10-12, 38% cost growth over nine months, and a 2 billion RUB investment project. It is marked `status: partial` in the JSON; it is not counted as a complete model extraction.

## Reproduce

From `backend/T08`:

```powershell
npm run benchmark:entities
npm run verify:entities
npm run test:entities:graph
```

Set `T08_BENCHMARK_NEWS_IDS=1,4` before `benchmark:entities` to run selected records. The graph invariant test uses mocked model responses and does not spend model tokens.

`results.json` is the normalized report. `provider-run.json` preserves the raw output from the last full provider run before duplicate-mention reconciliation.
