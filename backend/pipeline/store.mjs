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
  CREATE TABLE IF NOT EXISTS events (
    event_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    canonical_news_id TEXT NOT NULL REFERENCES news_items(id) ON DELETE RESTRICT,
    merged_into_event_id TEXT REFERENCES events(event_id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_events_merged_into ON events(merged_into_event_id);
  CREATE TABLE IF NOT EXISTS event_news (
    news_id TEXT PRIMARY KEY REFERENCES news_items(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL REFERENCES events(event_id) ON DELETE RESTRICT,
    linked_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_event_news_event ON event_news(event_id, linked_at);
  CREATE TABLE IF NOT EXISTS event_relations (
    id TEXT PRIMARY KEY,
    source_event_id TEXT NOT NULL REFERENCES events(event_id) ON DELETE RESTRICT,
    target_event_id TEXT NOT NULL REFERENCES events(event_id) ON DELETE RESTRICT,
    relation TEXT NOT NULL CHECK (relation = 'RELATED'),
    confidence REAL NOT NULL,
    decided_by TEXT NOT NULL,
    reason TEXT NOT NULL,
    stage_run_id TEXT NOT NULL REFERENCES stage_runs(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    UNIQUE (source_event_id, target_event_id),
    CHECK (source_event_id <> target_event_id)
  );
  CREATE TABLE IF NOT EXISTS event_match_decisions (
    id TEXT PRIMARY KEY,
    news_id TEXT NOT NULL REFERENCES news_items(id) ON DELETE CASCADE,
    candidate_news_id TEXT REFERENCES news_items(id) ON DELETE SET NULL,
    relation TEXT NOT NULL CHECK (relation IN ('SAME', 'RELATED', 'DIFFERENT', 'UNSURE')),
    confidence REAL NOT NULL,
    decided_by TEXT NOT NULL,
    reason TEXT NOT NULL,
    evidence_json TEXT,
    event_id TEXT REFERENCES events(event_id) ON DELETE SET NULL,
    candidate_event_id TEXT REFERENCES events(event_id) ON DELETE SET NULL,
    stage_run_id TEXT NOT NULL REFERENCES stage_runs(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_event_match_decisions_news ON event_match_decisions(news_id, created_at DESC);
  CREATE TABLE IF NOT EXISTS event_match_reviews (
    id TEXT PRIMARY KEY,
    news_id TEXT NOT NULL REFERENCES news_items(id) ON DELETE CASCADE,
    candidate_news_id TEXT REFERENCES news_items(id) ON DELETE SET NULL,
    stage_run_id TEXT NOT NULL REFERENCES stage_runs(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'resolved')),
    created_at TEXT NOT NULL,
    resolved_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_event_match_reviews_status ON event_match_reviews(status, created_at DESC);
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

function resolveCanonicalEventId(eventId) {
  let currentId = eventId
  const seen = new Set()
  while (currentId && !seen.has(currentId)) {
    seen.add(currentId)
    const row = db.prepare('SELECT merged_into_event_id AS mergedIntoEventId FROM events WHERE event_id = ?').get(currentId)
    if (!row?.mergedIntoEventId) return currentId
    currentId = row.mergedIntoEventId
  }
  return currentId || eventId
}

function createOrGetEvent(newsId, now) {
  const existing = db.prepare('SELECT event_id AS eventId FROM event_news WHERE news_id = ?').get(newsId)
  if (existing) {
    const eventId = resolveCanonicalEventId(existing.eventId)
    if (eventId !== existing.eventId) db.prepare('UPDATE event_news SET event_id = ? WHERE news_id = ?').run(eventId, newsId)
    return eventId
  }
  const news = db.prepare('SELECT title FROM news_items WHERE id = ?').get(newsId)
  if (!news) throw new Error(`Нельзя создать событие без новости ${newsId}`)
  const eventId = randomUUID()
  db.prepare('INSERT INTO events (event_id, title, canonical_news_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .run(eventId, news.title, newsId, now, now)
  db.prepare('INSERT INTO event_news (news_id, event_id, linked_at) VALUES (?, ?, ?)').run(newsId, eventId, now)
  return eventId
}

function mergeEventInto(sourceEventId, targetEventId, now) {
  const sourceId = resolveCanonicalEventId(sourceEventId)
  const targetId = resolveCanonicalEventId(targetEventId)
  if (sourceId === targetId) return targetId

  const relations = db.prepare(`
    SELECT source_event_id AS sourceEventId, target_event_id AS targetEventId,
      confidence, decided_by AS decidedBy, reason, stage_run_id AS stageRunId, created_at AS createdAt
    FROM event_relations WHERE source_event_id = ? OR target_event_id = ?
  `).all(sourceId, sourceId)
  db.prepare('DELETE FROM event_relations WHERE source_event_id = ? OR target_event_id = ?').run(sourceId, sourceId)
  db.prepare('UPDATE event_news SET event_id = ? WHERE event_id = ?').run(targetId, sourceId)
  const insertRelation = db.prepare(`
    INSERT INTO event_relations
      (id, source_event_id, target_event_id, relation, confidence, decided_by, reason, stage_run_id, created_at)
    VALUES (?, ?, ?, 'RELATED', ?, ?, ?, ?, ?)
    ON CONFLICT(source_event_id, target_event_id) DO UPDATE SET
      confidence = max(event_relations.confidence, excluded.confidence),
      reason = excluded.reason
  `)
  for (const relation of relations) {
    const mappedSource = relation.sourceEventId === sourceId ? targetId : resolveCanonicalEventId(relation.sourceEventId)
    const mappedTarget = relation.targetEventId === sourceId ? targetId : resolveCanonicalEventId(relation.targetEventId)
    if (mappedSource === mappedTarget) continue
    insertRelation.run(randomUUID(), mappedSource, mappedTarget, relation.confidence, relation.decidedBy, relation.reason, relation.stageRunId, relation.createdAt)
  }
  db.prepare('UPDATE events SET merged_into_event_id = ?, updated_at = ? WHERE event_id = ?').run(targetId, now, sourceId)
  db.prepare('UPDATE events SET updated_at = ? WHERE event_id = ?').run(now, targetId)
  return targetId
}

export function persistEventDecision({ newsId, stageRunId, decision, candidateNews = null }) {
  if (!decision || !['SAME', 'RELATED', 'DIFFERENT', 'UNSURE'].includes(decision.relation)) {
    throw new Error('Невозможно сохранить событие: неизвестная связь')
  }
  const now = new Date().toISOString()
  const transaction = () => {
    db.exec('BEGIN IMMEDIATE')
    try {
    if (decision.candidateId && candidateNews && !hasNews(decision.candidateId)) {
      saveNews({
        id: decision.candidateId,
        title: candidateNews.title,
        content: candidateNews.content,
        publicationDate: candidateNews.publicationDate,
        sourceKind: 't09_candidate_import',
      })
    }

    let eventId
    let candidateEventId = null
    let reviewId = null
    if (decision.candidateId && hasNews(decision.candidateId)) {
      candidateEventId = createOrGetEvent(decision.candidateId, now)
    }

    if (decision.relation === 'SAME' && candidateEventId) {
      const existing = db.prepare('SELECT event_id AS eventId FROM event_news WHERE news_id = ?').get(newsId)
      eventId = existing ? mergeEventInto(existing.eventId, candidateEventId, now) : candidateEventId
      db.prepare('INSERT INTO event_news (news_id, event_id, linked_at) VALUES (?, ?, ?) ON CONFLICT(news_id) DO UPDATE SET event_id = excluded.event_id')
        .run(newsId, eventId, now)
      db.prepare('UPDATE events SET updated_at = ? WHERE event_id = ?').run(now, eventId)
    } else {
      eventId = createOrGetEvent(newsId, now)
      if (decision.relation === 'RELATED' && candidateEventId && eventId !== candidateEventId) {
        db.prepare(`
          INSERT INTO event_relations
            (id, source_event_id, target_event_id, relation, confidence, decided_by, reason, stage_run_id, created_at)
          VALUES (?, ?, ?, 'RELATED', ?, ?, ?, ?, ?)
          ON CONFLICT(source_event_id, target_event_id) DO UPDATE SET
            confidence = max(event_relations.confidence, excluded.confidence),
            decided_by = excluded.decided_by,
            reason = excluded.reason
        `).run(randomUUID(), eventId, candidateEventId, Number(decision.confidence) || 0, decision.decidedBy || 'unknown', decision.reason || '', stageRunId, now)
      }
    }

    if (decision.relation === 'UNSURE') {
      reviewId = randomUUID()
      db.prepare(`INSERT INTO event_match_reviews (id, news_id, candidate_news_id, stage_run_id, status, created_at)
        VALUES (?, ?, ?, ?, 'pending', ?)`)
        .run(reviewId, newsId, decision.candidateId || null, stageRunId, now)
    } else {
      db.prepare(`UPDATE event_match_reviews SET status = 'resolved', resolved_at = ? WHERE news_id = ? AND status = 'pending'`)
        .run(now, newsId)
    }

    db.prepare(`
      INSERT INTO event_match_decisions
        (id, news_id, candidate_news_id, relation, confidence, decided_by, reason, evidence_json,
         event_id, candidate_event_id, stage_run_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(), newsId, decision.candidateId || null, decision.relation, Number(decision.confidence) || 0,
      decision.decidedBy || 'unknown', decision.reason || '', decision.evidence ? JSON.stringify(decision.evidence) : null,
      eventId, candidateEventId, stageRunId, now,
    )
      const result = { eventId, candidateEventId, disposition: decision.resolution, reviewId }
      db.exec('COMMIT')
      return result
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }

  const result = transaction()
  const event = db.prepare('SELECT count(*) AS articleCount FROM event_news WHERE event_id = ?').get(result.eventId)
  return { ...result, articleCount: Number(event?.articleCount || 0) }
}

export function listEvents() {
  const events = db.prepare(`
    SELECT event_id AS eventId, title, canonical_news_id AS canonicalNewsId,
      created_at AS createdAt, updated_at AS updatedAt
    FROM events WHERE merged_into_event_id IS NULL
    ORDER BY updated_at DESC, event_id
  `).all()
  const articles = db.prepare(`
    SELECT en.event_id AS eventId, n.id AS newsId, n.title, n.publication_date AS publicationDate,
      n.source_kind AS sourceKind, en.linked_at AS linkedAt
    FROM event_news en JOIN news_items n ON n.id = en.news_id
    JOIN events e ON e.event_id = en.event_id
    WHERE e.merged_into_event_id IS NULL
    ORDER BY en.linked_at, n.id
  `).all()
  const relations = db.prepare(`
    SELECT r.source_event_id AS sourceEventId, r.target_event_id AS targetEventId,
      target.title AS targetTitle, r.confidence, r.decided_by AS decidedBy, r.reason
    FROM event_relations r
    JOIN events source ON source.event_id = r.source_event_id AND source.merged_into_event_id IS NULL
    JOIN events target ON target.event_id = r.target_event_id AND target.merged_into_event_id IS NULL
    ORDER BY r.created_at DESC
  `).all()
  const reviews = db.prepare(`
    SELECT r.id, r.news_id AS newsId, n.title AS newsTitle,
      r.candidate_news_id AS candidateNewsId, candidate.title AS candidateTitle,
      r.stage_run_id AS stageRunId, r.status, r.created_at AS createdAt
    FROM event_match_reviews r
    JOIN news_items n ON n.id = r.news_id
    LEFT JOIN news_items candidate ON candidate.id = r.candidate_news_id
    WHERE r.status = 'pending'
    ORDER BY r.created_at DESC
  `).all()
  const articlesByEvent = new Map(events.map((event) => [event.eventId, []]))
  const relationsByEvent = new Map(events.map((event) => [event.eventId, []]))
  for (const article of articles) articlesByEvent.get(article.eventId)?.push(article)
  for (const relation of relations) relationsByEvent.get(relation.sourceEventId)?.push({
    eventId: relation.targetEventId,
    title: relation.targetTitle,
    relation: 'RELATED',
    confidence: relation.confidence,
    decidedBy: relation.decidedBy,
    reason: relation.reason,
  })
  return {
    events: events.map((event) => ({
      ...event,
      articles: articlesByEvent.get(event.eventId) || [],
      relatedEvents: relationsByEvent.get(event.eventId) || [],
    })),
    reviews,
  }
}

export function deleteNewsForBenchmark(newsId) {
  db.prepare('DELETE FROM news_items WHERE id = ?').run(newsId)
}

export function closeDatabase() {
  db.close()
}
