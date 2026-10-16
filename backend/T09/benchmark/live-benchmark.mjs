import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const baseUrl = (process.env.T09_URL || 'http://127.0.0.1:8092').replace(/\/$/, '')
const casesUrl = new URL('./live-cases.json', import.meta.url)
const cases = JSON.parse(await readFile(casesUrl, 'utf8')).cases
const { Client } = pg
const db = new Client({ connectionString: process.env.T09_PGVECTOR_URL })
const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`
const outputDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'runs', runId)
const indexedIds = []
const results = []
let health

function cost(values) {
  const present = values.filter((value) => Number.isFinite(value))
  return present.length === values.length && present.length ? present.reduce((sum, value) => sum + value, 0) : null
}

function trimCandidate(candidate) {
  return {
    candidateId: candidate.candidateId,
    title: candidate.title,
    similarity: candidate.similarity,
    relation: candidate.relation,
    confidence: candidate.confidence,
  }
}

function markdownReport(report) {
  const { totals, cases: rows } = report
  const accuracy = totals.relationAccuracy == null ? 'н/д' : `${Math.round(totals.relationAccuracy * 100)}% (${totals.relationCorrect}/${totals.count})`
  const candidateAccuracy = totals.candidateAccuracy == null ? 'н/д' : `${Math.round(totals.candidateAccuracy * 100)}% (${totals.candidateCorrect}/${totals.candidateCount})`
  const lines = [
    '# T09 — живой бенчмарк дедупликации',
    '',
    `Запуск: ${report.generatedAt}`,
    `Модели: ${report.models.embedding}; ${report.models.jev}; ${report.models.deepseek || 'DeepSeek не вызывался'}`,
    '',
    'Набор содержит синтетические русскоязычные новости и проверяет дубль, обновление сделки, прямую связь, одноименную компанию с другим событием, разные инциденты одного сервиса и схожие сделки между разными компаниями.',
    '',
    `- Проверено новостей: ${totals.count}`,
    `- Точность отношения SAME/RELATED/DIFFERENT/UNSURE: ${accuracy}`,
    `- Ожидаемая статья попала в top‑10: ${totals.candidateRecall}/${totals.count}`,
    `- Верно выбранная статья среди SAME/RELATED: ${candidateAccuracy}`,
    `- Вызовы: Qwen ${totals.embeddingCalls}, JEV ${totals.jevCalls}, DeepSeek ${totals.deepseekCalls}`,
    `- Токены: Qwen input ${totals.embeddingInputTokens ?? 'н/д'}; JEV input/output ${totals.jevInputTokens}/${totals.jevOutputTokens}; DeepSeek input/output ${totals.deepseekInputTokens}/${totals.deepseekOutputTokens}`,
    `- Известная стоимость: ${totals.reportedProviderCostRub == null ? 'API не вернул стоимость' : `${totals.reportedProviderCostRub.toFixed(4)} ₽`}; включает только JEV и DeepSeek, так как Embeddings API стоимость не вернул.`,
    '',
    '| Сценарий | Эталон | Результат | Ожидалась в top‑10 | Выбранная статья | Уверенность | DeepSeek |',
    '|---|---:|---:|---:|---|---:|---|',
  ]
  for (const item of rows) {
    const found = item.expectedCandidateInTop10 ? 'да' : 'нет'
    const title = (item.decision.candidateTitle || '—').replaceAll('|', '\\|')
    lines.push(`| ${item.scenario} | ${item.expectedRelation} | ${item.decision.relation} | ${found} | ${title} | ${Math.round((item.decision.confidence || 0) * 100)}% | ${item.usage.deepseek.calls ? item.decision.fallback.status : 'нет'} |`)
  }
  lines.push('', '## Ограничения', '', 'Это проверка поведения на контрольных синтетических текстах внутри текущего корпуса, а не независимая оценка на реальном новостном потоке. Эталон размечен вручную; уверенность моделей не является калиброванной вероятностью. Qwen usage/cost приведены только в объеме, возвращенном API. Полные ответы и кандидаты сохранены в `results.json`.', '')
  return lines.join('\n')
}

try {
  if (!process.env.T09_PGVECTOR_URL) throw new Error('Нужен T09_PGVECTOR_URL из backend/pipeline/.env')
  const healthResponse = await fetch(`${baseUrl}/health`)
  health = await healthResponse.json()
  if (!healthResponse.ok || !health.ok) throw new Error(`T09 не готов: ${JSON.stringify(health)}`)
  await db.connect()
  await mkdir(outputDirectory, { recursive: true })
  for (const testCase of cases) {
    const newsId = `t09-bench-${runId}-${testCase.id}`
    indexedIds.push(newsId)
    const response = await fetch(`${baseUrl}/vectorize`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        newsId,
        title: testCase.title,
        content: testCase.content,
        publicationDate: testCase.publicationDate,
        sourceKind: 't09_benchmark',
        blocks: testCase.blocks,
      }),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(`Сценарий ${testCase.id} вернул HTTP ${response.status}: ${payload.error || 'ошибка'}`)
    const expectedCandidateInTop10 = payload.topCandidates.some((candidate) => candidate.candidateId === testCase.expectedCandidateId)
    results.push({
      id: testCase.id,
      scenario: testCase.scenario,
      expectedRelation: testCase.expectedRelation,
      expectedCandidateId: testCase.expectedCandidateId,
      expectedCandidateInTop10,
      decision: payload.decision,
      usage: payload.usage,
      models: payload.models,
      topCandidates: payload.topCandidates.map(trimCandidate),
      stageRunId: payload.stageRunId,
      newsId,
    })
    await writeFile(path.join(outputDirectory, 'partial-results.json'), `${JSON.stringify({ runId, health, cases: results }, null, 2)}\n`, 'utf8')
    process.stdout.write(`${results.length}/${cases.length} ${testCase.id}: expected ${testCase.expectedRelation}, got ${payload.decision.relation}; ${payload.decision.fallback.status}; ${payload.usage.embedding.inputTokens ?? '?'} embedding tokens\n`)

    // Keep the SQLite stage-run history and report, but remove temporary benchmark vectors
    // so a later run cannot retrieve its own previous test queries as easier duplicates.
    await db.query('DELETE FROM t09_news WHERE news_id = $1', [newsId])
  }
} finally {
  if (db._connected) {
    if (indexedIds.length) await db.query('DELETE FROM t09_news WHERE news_id = ANY($1::text[])', [indexedIds]).catch(() => {})
    await db.end()
  }
}

const relationCorrect = results.filter((item) => item.decision.relation === item.expectedRelation).length
const candidateCases = results.filter((item) => ['SAME', 'RELATED'].includes(item.expectedRelation))
const candidateCorrect = candidateCases.filter((item) => item.decision.candidateId === item.expectedCandidateId).length
const sumUsage = (provider, key) => results.reduce((sum, item) => sum + (Number(item.usage[provider]?.[key]) || 0), 0)
const knownCosts = results.flatMap((item) => [item.usage.jev.costRub, item.usage.deepseek.costRub])
const report = {
  runId,
  generatedAt: new Date().toISOString(),
  baseUrl,
  health,
  models: {
    embedding: health.model,
    jev: results.find((item) => item.models.jev)?.models.jev || 'typesafe/jev',
    deepseek: results.find((item) => item.models.deepseek)?.models.deepseek || null,
  },
  totals: {
    count: results.length,
    relationCorrect,
    relationAccuracy: results.length ? relationCorrect / results.length : null,
    candidateRecall: results.filter((item) => item.expectedCandidateInTop10).length,
    candidateCorrect,
    candidateCount: candidateCases.length,
    candidateAccuracy: candidateCases.length ? candidateCorrect / candidateCases.length : null,
    embeddingCalls: sumUsage('embedding', 'calls'),
    embeddingInputTokens: cost(results.map((item) => item.usage.embedding.inputTokens)),
    jevCalls: sumUsage('jev', 'calls'),
    jevInputTokens: sumUsage('jev', 'inputTokens'),
    jevOutputTokens: sumUsage('jev', 'outputTokens'),
    deepseekCalls: sumUsage('deepseek', 'calls'),
    deepseekInputTokens: sumUsage('deepseek', 'inputTokens'),
    deepseekOutputTokens: sumUsage('deepseek', 'outputTokens'),
    reportedProviderCostRub: cost(knownCosts),
  },
  cases: results,
}

await mkdir(outputDirectory, { recursive: true })
await writeFile(path.join(outputDirectory, 'results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
await writeFile(path.join(outputDirectory, 'RESULTS.md'), markdownReport(report), 'utf8')
await rm(path.join(outputDirectory, 'partial-results.json'), { force: true })
process.stdout.write(`\nSaved ${path.join(outputDirectory, 'RESULTS.md')}\n`)
process.stdout.write(`Accuracy ${report.totals.relationCorrect}/${report.totals.count}; JEV ${report.totals.jevCalls}, DeepSeek ${report.totals.deepseekCalls}; known cost ${report.totals.reportedProviderCostRub ?? 'n/a'} RUB\n`)
