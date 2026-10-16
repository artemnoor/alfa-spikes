import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'

const moduleDirectory = dirname(fileURLToPath(import.meta.url))
export const databasePath = process.env.PIPELINE_DB_PATH || resolve(moduleDirectory, '../../data/news_pipeline.sqlite')
mkdirSync(dirname(databasePath), { recursive: true })

const db = new DatabaseSync(databasePath)
db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS news_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    publication_date TEXT,
    source_kind TEXT NOT NULL DEFAULT 'manual',
    source_label TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS stage_runs (
    id TEXT PRIMARY KEY,
    news_id TEXT NOT NULL REFERENCES news_items(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    status TEXT NOT NULL,
    input_json TEXT NOT NULL,
    output_json TEXT,
    error_text TEXT,
    provider TEXT,
    model TEXT,
    calls INTEGER,
    input_tokens INTEGER,
    output_tokens INTEGER,
    cost_rub REAL,
    started_at TEXT NOT NULL,
    finished_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_stage_runs_news_stage ON stage_runs(news_id, stage, started_at DESC);
  CREATE INDEX IF NOT EXISTS idx_news_items_updated ON news_items(updated_at DESC);
`)

const insertNews = db.prepare(`
  INSERT INTO news_items (id, title, content, publication_date, source_kind, source_label, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    content = excluded.content,
    publication_date = excluded.publication_date,
    source_kind = CASE WHEN news_items.source_kind = 'synthetic_demo' THEN news_items.source_kind ELSE excluded.source_kind END,
    source_label = COALESCE(excluded.source_label, news_items.source_label),
    updated_at = excluded.updated_at
`)

export function saveNews(news) {
  const now = new Date().toISOString()
  const id = news.id || randomUUID()
  insertNews.run(
    id,
    String(news.title || 'Без заголовка'),
    String(news.content || ''),
    news.publicationDate || null,
    news.sourceKind || 'manual',
    news.sourceLabel || null,
    now,
    now,
  )
  return id
}

export function hasNews(id) {
  return Boolean(db.prepare('SELECT 1 FROM news_items WHERE id = ?').get(id))
}

export function beginStageRun({ newsId, stage, input, provider = null, model = null }) {
  const id = randomUUID()
  const startedAt = new Date().toISOString()
  db.prepare(`
    INSERT INTO stage_runs (id, news_id, stage, status, input_json, provider, model, started_at)
    VALUES (?, ?, ?, 'running', ?, ?, ?, ?)
  `).run(id, newsId, stage, JSON.stringify(input), provider, model, startedAt)
  return id
}

export function finishStageRun(id, { status = 'completed', output, error = null, provider = null, model = null, calls = null, inputTokens = null, outputTokens = null, costRub = null }) {
  db.prepare(`
    UPDATE stage_runs
    SET status = ?, output_json = ?, error_text = ?, provider = COALESCE(?, provider), model = COALESCE(?, model),
        calls = ?, input_tokens = ?, output_tokens = ?, cost_rub = ?, finished_at = ?
    WHERE id = ?
  `).run(status, output === undefined ? null : JSON.stringify(output), error, provider, model, calls, inputTokens, outputTokens, costRub, new Date().toISOString(), id)
}

export function failStageRun(id, error) {
  db.prepare(`
    UPDATE stage_runs SET status = 'failed', error_text = ?, finished_at = ? WHERE id = ?
  `).run(String(error?.message || error || 'unknown error').slice(0, 2000), new Date().toISOString(), id)
}

function parseJson(value) {
  if (!value) return null
  try { return JSON.parse(value) } catch { return null }
}

export function listRecords() {
  const rows = db.prepare(`
    SELECT n.id, n.title, n.content, n.publication_date AS publicationDate,
           n.source_kind AS sourceKind, n.source_label AS sourceLabel,
           n.created_at AS createdAt, n.updated_at AS updatedAt
    FROM news_items n
    ORDER BY n.created_at DESC, n.id
  `).all()
  const runs = db.prepare(`
    SELECT id, news_id AS newsId, stage, status, input_json AS inputJson, output_json AS outputJson,
           error_text AS error, provider, model, calls, input_tokens AS inputTokens,
           output_tokens AS outputTokens, cost_rub AS costRub, started_at AS startedAt, finished_at AS finishedAt
    FROM stage_runs
    ORDER BY started_at ASC
  `).all()
  const byNewsId = new Map(rows.map((row) => [row.id, { ...row, stageRuns: [] }]))
  for (const run of runs) {
    const record = byNewsId.get(run.newsId)
    if (!record) continue
    const output = parseJson(run.outputJson)
    if (run.stage === 'T09' && Array.isArray(output?.blocks)) {
      output.blocks = output.blocks.map(({ embedding, ...summary }) => summary)
    }
    record.stageRuns.push({ ...run, input: parseJson(run.inputJson), output })
    delete record.stageRuns.at(-1).inputJson
    delete record.stageRuns.at(-1).outputJson
  }
  return [...byNewsId.values()]
}

export function getDatabaseStats() {
  const news = db.prepare('SELECT COUNT(*) AS count FROM news_items').get().count
  const runs = db.prepare('SELECT COUNT(*) AS count FROM stage_runs').get().count
  return { news: Number(news), stageRuns: Number(runs), databasePath }
}
