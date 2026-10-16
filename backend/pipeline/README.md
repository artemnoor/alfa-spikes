# Общее хранилище конвейера

SQLite-файл находится в `data/news_pipeline.sqlite`, вне каталогов T08–T13. Таблица `news_items` хранит исходный заголовок, текст, дату и источник. Таблица `stage_runs` хранит каждый запуск отдельно: этап, статус, входной JSON, полный выходной JSON, модель, вызовы, токены, стоимость и время выполнения. Повторный запуск не затирает предыдущую историю.

T08 и T09 пишут в это хранилище при каждом вызове API. Синтетический набор из 20 новостей описан в `news-seed.json`.

## Команды

```powershell
npm --prefix backend/pipeline run seed
npm --prefix backend/pipeline run run:t08
npm --prefix backend/pipeline start
```

Для запуска классификатора нужны `POLZA_AI_API_KEY` или `POLZA_API_KEY`. Скрипт `run:t08` последовательно прогоняет все 20 записей. Для короткого прогона можно задать `T08_DATASET_LIMIT=5`.

API архива: `GET http://127.0.0.1:8093/health` и `GET http://127.0.0.1:8093/records`. Интерфейс проекта показывает эти записи во вкладке «База».

Переменная `PIPELINE_DB_PATH` позволяет указать другой файл SQLite.

## T09: PostgreSQL + pgvector

T09 сохраняет в PostgreSQL четыре 4096-мерных вектора Qwen для каждой новости и выбирает до 10 кандидатов по среднему cosine similarity четырёх блоков. Один запрос JEV сравнивает с ними конкретные события; DeepSeek подключается лишь для низкой уверенности или противоречивых ответов. Для текущего набора используется точное сравнение без HNSW.

PostgreSQL запускается в отдельном Docker Compose проекте и хранит данные в своём volume. Он слушает только `127.0.0.1:55436` и не подключается к базам других проектов.

Скопируйте `backend/pipeline/.env.example` в `backend/pipeline/.env`, задайте локальный пароль и выполните:

```powershell
docker compose --env-file backend/pipeline/.env -f backend/pipeline/compose.yaml -p alfa-spikes-t09-pgvector up -d
npm --prefix backend/T09 start
npm --prefix backend/pipeline run backfill:pgvector
```

Сервис T09 загружает локальное подключение к базе из этого файла. Ключ Polza задаётся отдельно в окружении процесса T09. Команда `backfill:pgvector` повторно векторизует последние успешные результаты T08 из SQLite архива и сохраняет их в PostgreSQL; её можно запускать повторно.
