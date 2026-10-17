# Alfa Spikes

React/Vite prototype for news classification experiments. The interface is split into blocks T08–T13; the active backend implementation and reproducible classification benchmarks are in `backend/T08`.

## Run the frontend

```powershell
npm install
npm run dev
```

## Run the T08 backend

Use Node.js 22 or newer. Set `POLZA_AI_API_KEY` (or `POLZA_API_KEY`) in the environment, then run:

```powershell
cd backend/T08
npm start
```

The backend listens on `http://127.0.0.1:8091` by default. The API and model configuration are documented in [`backend/T08/README.md`](backend/T08/README.md). Do not commit local API keys; `.env` files are ignored.

## Общая база новостей и результатов этапов

Общая SQLite-база хранится отдельно от папок этапов: `data/news_pipeline.sqlite`. Локальный файл базы игнорируется Git; его можно пересоздать из `backend/pipeline/news-seed.json` командами ниже. Таблица `news_items` содержит новость на входе, а `stage_runs` — отдельную запись каждого запуска T08/T09 с входом, статусом, полным результатом, моделью и метриками. Повторные запуски сохраняются в истории, не заменяя предыдущие.

Вкладка «База» показывает новости, результаты этапов и реестр событий. T08 записывает каждую классификацию, T09 сохраняет векторы и объединяет дубли в общие события. Архив API слушает порт 8094.

```powershell
npm run db:seed
npm run db:run:t08
npm run db:server
```

`db:seed` добавляет 20 демонстрационных синтетических новостей, `db:run:t08` последовательно прогоняет их через действующий классификатор. Нужен ключ Polza AI в `POLZA_AI_API_KEY` или `POLZA_API_KEY`. Для просмотра архива запустите frontend и backend/pipeline.

## T08 verification and saved results

The final five-news entity graph benchmark is saved in [`backend/T08/benchmark/runs/entity-graph-facilities-typed-relations-final-2026-10-16/RESULTS.md`](backend/T08/benchmark/runs/entity-graph-facilities-typed-relations-final-2026-10-16/RESULTS.md), alongside its machine-readable `results.json`.

## T09 tests and live deduplication benchmark

Run T09 unit and integration checks with `npm --prefix backend/T09 run test:all`. The 111-case live Qwen + JEV + DeepSeek benchmark, including per-news classifications, candidate lists, weight comparisons, and reported costs, is saved in [`backend/T09/benchmark/runs/2026-10-16T18-26-23-708Z-9e0495a9/RESULTS.md`](backend/T09/benchmark/runs/2026-10-16T18-26-23-708Z-9e0495a9/RESULTS.md).

- 5 sample news articles and 5 DeepSeek V4 Flash requests.
- 7,160 tokens total (2,809 input; 4,351 output); reported cost: ₽0.13925841.
- 22 entities, 10 events, 8 relations, and 17 attributes.
- The verifier found 0 evidence, relation-type, or facility-grounding errors. All five model outputs are marked `partial`: four had unsupported proposals rejected, and one used a grounded fallback after reaching the output-token limit.

Run the local graph invariants, saved-result verifier, and frontend production build from the repository root:

```powershell
npm --prefix backend/T08 run test:entities:graph
npm --prefix backend/T08 run verify:entities -- benchmark/runs/entity-graph-facilities-typed-relations-final-2026-10-16/results.json
npm run build
```

The benchmark report explains the comparison limits and the reason `partial` is preserved in every result.

## T10 Business Understanding

T10 is an independent company-profile pipeline with a separate PostgreSQL `t10` schema and profile-scoped run ledger. It does not use T08/T09 news records or code. It provides B01–B11 contracts, profile/source/fact APIs, provenance-aware facts and a live T10 tab. See [`backend/T10/README.md`](backend/T10/README.md) for setup, status and known limitations.

Saved model evaluations:

- [Synthetic live run v8](backend/T10/benchmark/runs/2026-10-17-live-13-case-v8/RESULTS.md) and [relation-level comparison](backend/T10/benchmark/runs/2026-10-17-live-13-case-v8/RELATION_EVALUATION.md).
- [Three-case real-source pilot](backend/T10/benchmark/runs/2026-10-17-real-3-case-v1/RESULTS.md): 8/12 expected entities and 1/4 expected relation triples found; no false positives in this small sample. Cost: ₽0.041027.
- [13 additional real-source cases, baseline](backend/T10/benchmark/runs/2026-10-17-real-13-case-v1/RESULTS.md): 8/24 expected entities found; 0/8 relation triples. Cost: ₽0.161954.
- [13 additional real-source cases, rerun after fixes](backend/T10/benchmark/runs/2026-10-17-real-13-case-v2/RESULTS.md): 15/24 expected entities found (62.5% precision, recall and F1); 1/8 relation triples, with 6 additional predicted relations. Cost: ₽0.319121. Recall improved, while relation quality and precision still need work; this small manually annotated pilot is diagnostic, not a production accuracy estimate.
- Synthetic B06/B07 and B09 benchmarks, scripts, inputs and annotations are under [`backend/T10/benchmark`](backend/T10/benchmark/).

Hardening comparison on the same R04–R16 real-source cases: [`backend/T10/BENCHMARK_COMPARISON.md`](backend/T10/BENCHMARK_COMPARISON.md) and [`backend/T10/benchmark/runs/2026-10-17-hardening-real-R04-R16-v1/RESULTS.md`](backend/T10/benchmark/runs/2026-10-17-hardening-real-R04-R16-v1/RESULTS.md). Entity F1 was 60.5%; exact relationship F1 was 16.7% (1/8 recall, 25% precision). This improved relation precision but remains below target. See [`backend/T10/TEST_REPORT.md`](backend/T10/TEST_REPORT.md) for passed and `NOT_RUN` checks, and [`backend/T10/REMAINING_LIMITATIONS.md`](backend/T10/REMAINING_LIMITATIONS.md) for current limits.

Copy `backend/T10/.env.example` to `backend/T10/.env`, configure `T10_DATABASE_URL`, then run `npm --prefix backend/T10 start`. Run unit and PostgreSQL API checks with `npm --prefix backend/T10 test`.
