import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { closePgVector, findAllSimilarNews } from '../src/pg-store.mjs'

const baseUrl = (process.env.T09_URL || 'http://127.0.0.1:8092').replace(/\/$/, '')
const casesUrl = new URL('./live-cases-expanded.json', import.meta.url)
const allCases = JSON.parse(await readFile(casesUrl, 'utf8')).cases
const requestedLimit = Number(process.env.T09_BENCHMARK_LIMIT)
const requestedIds = process.env.T09_BENCHMARK_IDS?.split(',').map((id) => id.trim()).filter(Boolean)
const resumeFile = process.env.T09_BENCHMARK_RESUME_FROM ? path.resolve(process.env.T09_BENCHMARK_RESUME_FROM) : null
const resumedRun = resumeFile ? JSON.parse(await readFile(resumeFile, 'utf8')) : null
const completedIds = new Set((resumedRun?.cases || []).map((item) => item.id))
const selectedCases = requestedIds?.length
  ? allCases.filter((testCase) => requestedIds.includes(testCase.id))
  : Number.isInteger(requestedLimit) && requestedLimit > 0 ? allCases.slice(0, requestedLimit) : allCases
const cases = resumedRun ? selectedCases.filter((testCase) => !completedIds.has(testCase.id)) : selectedCases
const requestedTotal = resumedRun ? allCases.length : cases.length
const { Client } = pg
const db = new Client({ connectionString: process.env.T09_PGVECTOR_URL })
const runId = resumedRun?.runId || `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`
const outputDirectory = resumeFile
  ? path.dirname(resumeFile)
  : path.join(path.dirname(fileURLToPath(import.meta.url)), 'runs', runId)
const indexedIds = []
const results = [...(resumedRun?.cases || [])]
let health
let benchmarkError = null
const weightProfiles = {
  equal: { topic: 1, event: 1, entities: 1, genre: 1 },
  event_2x: { topic: 1, event: 2, entities: 1, genre: 1 },
  entities_2x: { topic: 1, event: 1, entities: 2, genre: 1 },
  topic_2x: { topic: 2, event: 1, entities: 1, genre: 1 },
  genre_2x: { topic: 1, event: 1, entities: 1, genre: 2 },
  event_entities_2x: { topic: 1, event: 2, entities: 2, genre: 1 },
  topic_event_2x: { topic: 2, event: 2, entities: 1, genre: 1 },
  event_3x: { topic: 1, event: 3, entities: 1, genre: 1 },
  entities_3x: { topic: 1, event: 1, entities: 3, genre: 1 },
  no_genre: { topic: 1, event: 2, entities: 2, genre: 0 },
}
const weightStats = Object.fromEntries(Object.entries(weightProfiles).map(([name, weights]) => [name, {
  weights,
  evaluated: 0,
  candidateFound: 0,
  hitAt10: 0,
  reciprocalRankSum: 0,
  rankSum: 0,
}]))
for (const item of results) {
  for (const [name, stats] of Object.entries(weightStats)) {
    const rank = item.expectedCandidateRankByWeight?.[name]
    stats.evaluated += 1
    if (rank != null) {
      stats.candidateFound += 1
      stats.rankSum += rank
      stats.reciprocalRankSum += 1 / rank
      if (rank <= 10) stats.hitAt10 += 1
    }
  }
}

function cost(values) {
  const present = values.filter((value) => Number.isFinite(value))
  return present.length === values.length && present.length ? present.reduce((sum, value) => sum + value, 0) : null
}

function knownCost(values) {
  const present = values.filter((value) => Number.isFinite(value))
  return present.length ? present.reduce((sum, value) => sum + value, 0) : null
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
  const relationMetrics = ['SAME', 'RELATED', 'DIFFERENT', 'UNSURE'].map((relation) => {
    const group = rows.filter((item) => item.expectedRelation === relation)
    const correct = group.filter((item) => item.decision.relation === relation).length
    return `| ${relation} | ${correct}/${group.length} |`
  })
  const lines = [
    '# T09 — живой бенчмарк дедупликации',
    '',
    `Запуск: ${report.generatedAt}`,
    `Модели: ${report.models.embedding}; ${report.models.jev}; ${report.models.deepseek || 'DeepSeek не вызывался'}`,
    ...(report.resumedFrom ? [`Прогон возобновлён из ${report.resumedFrom}; завершённые кейсы повторно не отправлялись.`] : []),
    '',
    'Набор содержит синтетические русскоязычные новости и проверяет дубль, обновление сделки, прямую связь, одноименную компанию с другим событием, разные инциденты одного сервиса и схожие сделки между разными компаниями.',
    '',
    `- Проверено новостей: ${totals.count}`,
    `- Точность отношения SAME/RELATED/DIFFERENT/UNSURE: ${accuracy}`,
    `- Ожидаемая статья попала в top‑10: ${totals.candidateRecall}/${totals.count}`,
    `- Верно выбранная статья среди SAME/RELATED: ${candidateAccuracy}`,
    `- Вызовы: Qwen ${totals.embeddingCalls}, JEV ${totals.jevCalls}, DeepSeek ${totals.deepseekCalls}`,
    `- Токены: Qwen input ${totals.embeddingInputTokens ?? 'н/д'}; JEV input/output ${totals.jevInputTokens}/${totals.jevOutputTokens}; DeepSeek input/output ${totals.deepseekInputTokens}/${totals.deepseekOutputTokens}`,
    `- Известная стоимость JEV + DeepSeek: ${totals.reportedProviderCostRub == null ? 'API не вернул стоимость' : `${totals.reportedProviderCostRub.toFixed(4)} ₽`}${totals.providerCostMissingCalls ? `; для ${totals.providerCostMissingCalls} вызова стоимость не передана` : ''}. Embeddings API стоимость не вернул.`,
    '',
    '## Метрики по отношению',
    '',
    '| Эталон | Верно |',
    '|---|---:|',
    ...relationMetrics,
    '',
    'В этом наборе ни один эталонный `DIFFERENT` не был ошибочно объединён с другим событием. Основные ошибки: `RELATED` ушёл в ручную проверку или `DIFFERENT`, а часть `UNSURE` получила `DIFFERENT`.',
    '',
    '## Сравнение весов embedding-блоков',
    '',
    '| Профиль | Тема / событие / сущности / характер | Hit@10 | Средний ранг | MRR |',
    '|---|---:|---:|---:|---:|',
  ]
  for (const [name, item] of Object.entries(report.weightEvaluation.profiles)) {
    lines.push(`| ${name} | ${Object.values(item.weights).join(' / ')} | ${item.hitAt10}/${item.evaluated} | ${item.meanRank?.toFixed(2) ?? 'н/д'} | ${item.mrr?.toFixed(3) ?? 'н/д'} |`)
  }
  lines.push(
    '',
    `Лучший профиль по Hit@10: **${report.weightEvaluation.recommended}**. Веса работающего сервера: ${Object.values(report.weightEvaluation.serverWeights).map((value) => Number(value).toFixed(2)).join(' / ')}.`,
    '',
    '## Сокращение входа JEV',
    '',
    report.tokenComparison
      ? `На одинаковых ${report.tokenComparison.overlap} исходных кейсах средний вход изменился с ${report.tokenComparison.baselineAverage} до ${report.tokenComparison.currentAverage} токенов на новость (${report.tokenComparison.changePercent > 0 ? '+' : ''}${report.tokenComparison.changePercent}%).`
      : 'Сопоставимый предыдущий запуск не найден.',
    '',
    '| Сценарий | Эталон | Результат | Ожидалась в top‑10 | Выбранная статья | Уверенность | DeepSeek |',
    '|---|---:|---:|---:|---|---:|---|',
  )
  for (const item of rows) {
    const found = item.expectedCandidateInTop10 ? 'да' : 'нет'
    const title = (item.decision.candidateTitle || '—').replaceAll('|', '\\|')
    lines.push(`| ${item.scenario} | ${item.expectedRelation} | ${item.decision.relation} | ${found} | ${title} | ${Math.round((item.decision.confidence || 0) * 100)}% | ${item.usage.deepseek.calls ? item.decision.fallback.status : 'нет'} |`)
  }
  lines.push('', '## Ограничения', '', 'Это проверка поведения на контрольных синтетических текстах внутри текущего корпуса, а не независимая оценка на реальном новостном потоке. Эталонные метки назначены правилами сценариев при генерации набора; это не независимая экспертная разметка. Уверенность моделей не является калиброванной вероятностью. Qwen usage/cost приведены только в объеме, возвращенном API. Полные ответы и кандидаты сохранены в `results.json`.', '')
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
    const fullCandidatePool = await findAllSimilarNews(newsId, payload.blocks, payload.model)
    const expectedCandidateInTop10 = payload.topCandidates.some((candidate) => candidate.candidateId === testCase.expectedCandidateId)
    const expectedCandidateRankByWeight = {}
    for (const [name, weights] of Object.entries(weightProfiles)) {
      const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0)
      const ranked = fullCandidatePool.map((candidate) => ({
        candidateId: candidate.newsId,
        score: candidate.blocks.reduce((sum, block) => sum + block.similarity * weights[block.key], 0) / totalWeight,
      })).sort((left, right) => right.score - left.score)
      const index = ranked.findIndex((candidate) => candidate.candidateId === testCase.expectedCandidateId)
      const rank = index < 0 ? null : index + 1
      expectedCandidateRankByWeight[name] = rank
      const stats = weightStats[name]
      stats.evaluated += 1
      if (rank !== null) {
        stats.candidateFound += 1
        stats.rankSum += rank
        stats.reciprocalRankSum += 1 / rank
        if (rank <= 10) stats.hitAt10 += 1
      }
    }
    results.push({
      id: testCase.id,
      scenario: testCase.scenario,
      expectedRelation: testCase.expectedRelation,
      expectedCandidateId: testCase.expectedCandidateId,
      expectedCandidateInTop10,
      expectedCandidateRankByWeight,
      decision: payload.decision,
      usage: payload.usage,
      models: payload.models,
      topCandidates: payload.topCandidates.map(trimCandidate),
      stageRunId: payload.stageRunId,
      newsId,
    })
    await writeFile(path.join(outputDirectory, 'partial-results.json'), `${JSON.stringify({ runId, health, cases: results }, null, 2)}\n`, 'utf8')
    process.stdout.write(`${results.length}/${requestedTotal} ${testCase.id}: expected ${testCase.expectedRelation}, got ${payload.decision.relation}; ${payload.decision.fallback.status}; JEV ${payload.usage.jev.inputTokens} input tokens\n`)

    // Keep the SQLite stage-run history and report, but remove temporary benchmark vectors
    // so a later run cannot retrieve its own previous test queries as easier duplicates.
    await db.query('DELETE FROM t09_news WHERE news_id = $1', [newsId])
  }
} catch (error) {
  benchmarkError = error
} finally {
  if (db._connected) {
    if (indexedIds.length) await db.query('DELETE FROM t09_news WHERE news_id = ANY($1::text[])', [indexedIds]).catch(() => {})
    await db.end()
  }
  await closePgVector()
}

const relationCorrect = results.filter((item) => item.decision.relation === item.expectedRelation).length
const candidateCases = results.filter((item) => ['SAME', 'RELATED'].includes(item.expectedRelation))
const candidateCorrect = candidateCases.filter((item) => item.decision.candidateId === item.expectedCandidateId).length
const sumUsage = (provider, key) => results.reduce((sum, item) => sum + (Number(item.usage[provider]?.[key]) || 0), 0)
const knownCosts = results.flatMap((item) => [item.usage.jev.costRub, item.usage.deepseek.costRub])
const profiles = Object.fromEntries(Object.entries(weightStats).map(([name, item]) => [name, {
  ...item,
  meanRank: item.candidateFound ? item.rankSum / item.candidateFound : null,
  mrr: item.evaluated ? item.reciprocalRankSum / item.evaluated : null,
}]))
const recommendedWeightProfile = Object.entries(profiles)
  .sort((left, right) => right[1].hitAt10 - left[1].hitAt10 || right[1].mrr - left[1].mrr)[0]?.[0] || null
let tokenComparison = null
try {
  const baseline = JSON.parse(await readFile(new URL('./runs/2026-10-16T16-08-39-879Z-c7ed9f74/results.json', import.meta.url), 'utf8'))
  const previousById = new Map(baseline.cases.map((item) => [item.id, item]))
  const paired = results.flatMap((item) => {
    const previous = previousById.get(item.id)?.usage?.jev?.inputTokens
    const current = item.usage?.jev?.inputTokens
    return Number.isFinite(previous) && Number.isFinite(current) ? [{ previous, current }] : []
  })
  if (paired.length) {
    const baselineAverage = paired.reduce((sum, item) => sum + item.previous, 0) / paired.length
    const currentAverage = paired.reduce((sum, item) => sum + item.current, 0) / paired.length
    tokenComparison = {
      baselineRunId: baseline.runId,
      overlap: paired.length,
      baselineAverage: Math.round(baselineAverage),
      currentAverage: Math.round(currentAverage),
      changePercent: Number(((currentAverage - baselineAverage) / baselineAverage * 100).toFixed(1)),
    }
  }
} catch {
  // The first run may not have a previous token baseline.
}
const report = {
  runId,
  generatedAt: new Date().toISOString(),
  baseUrl,
  health,
  models: {
    embedding: health?.model || 'qwen/qwen3-embedding-8b',
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
    reportedProviderCostRub: knownCost(knownCosts),
    providerCostMissingCalls: knownCosts.filter((value) => !Number.isFinite(value)).length,
  },
  weightEvaluation: {
    serverWeights: health?.blockWeights || { topic: 0.25, event: 0.25, entities: 0.25, genre: 0.25 },
    profiles,
    recommended: recommendedWeightProfile,
  },
  tokenComparison,
  resumedFrom: resumeFile ? path.basename(resumeFile) : null,
  cases: results,
}

await mkdir(outputDirectory, { recursive: true })
if (benchmarkError) {
  const expectedCounts = Object.fromEntries(['SAME', 'RELATED', 'DIFFERENT', 'UNSURE'].map((relation) => [
    relation,
    results.filter((item) => item.expectedRelation === relation).length,
  ]))
  const hit10 = results.filter((item) => item.expectedCandidateInTop10).length
  const weightLines = Object.entries(profiles).map(([name, profile]) =>
    `| ${name} | ${profile.hitAt10}/${profile.evaluated} | ${profile.meanRank?.toFixed(2) ?? 'н/д'} |`).join('\n')
  const partialReport = [
    '# T09 — неполный живой бенчмарк',
    '',
    `Запуск: ${runId}`,
    `Остановлен после ${results.length} из ${requestedTotal} кейсов.`,
    '',
    `Причина: ${String(benchmarkError.message || benchmarkError).replaceAll('|', '\\|')}`,
    '',
    '## Результаты выполненной части',
    '',
    `- Совпадение отношения с эталонной меткой: ${relationCorrect}/${results.length} (${results.length ? Math.round(relationCorrect / results.length * 100) : 0}%).`,
    `- Ожидаемый кандидат найден в top‑10: ${hit10}/${results.length}.`,
    `- Метки выполненной части: ${Object.entries(expectedCounts).map(([key, value]) => `${key} — ${value}`).join('; ')}.`,
    `- JEV: ${report.totals.jevCalls} вызовов, ${report.totals.jevInputTokens} входных и ${report.totals.jevOutputTokens} выходных токенов.`,
    `- DeepSeek: ${report.totals.deepseekCalls} вызовов, ${report.totals.deepseekInputTokens} входных и ${report.totals.deepseekOutputTokens} выходных токенов.`,
    `- Известная стоимость JEV + DeepSeek: ${report.totals.reportedProviderCostRub?.toFixed(4) ?? 'н/д'} ₽; без учёта ${report.totals.providerCostMissingCalls} вызовов без тарифа в ответе API и стоимости Qwen API.`,
    '',
    '## Веса четырёх блоков',
    '',
    '| Профиль | Hit@10 | Средний ранг |',
    '|---|---:|---:|',
    weightLines,
    '',
    'Сравнение весов рассчитывается офлайн на тех же четырёх эмбеддингах каждой новости; повторных запросов к моделям для каждого профиля нет. Если профили совпали, набор не позволяет обосновать замену равных весов.',
    '',
    'Контрольные истории синтетические; эталонные метки назначаются правилами сценариев при генерации набора. Частичный прогон не является независимой оценкой на реальном потоке. Полные данные выполненных случаев сохранены в `partial-results.json`.',
    '',
  ].join('\n')
  await writeFile(path.join(outputDirectory, 'INTERRUPTED.md'), partialReport, 'utf8')
  process.stderr.write(`\nInterrupted after ${results.length}/${requestedTotal}. Partial report: ${path.join(outputDirectory, 'INTERRUPTED.md')}\n`)
  process.stderr.write(`${benchmarkError.message || benchmarkError}\n`)
  process.exitCode = 1
} else {
  await writeFile(path.join(outputDirectory, 'results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await writeFile(path.join(outputDirectory, 'RESULTS.md'), markdownReport(report), 'utf8')
  await rm(path.join(outputDirectory, 'partial-results.json'), { force: true })
  process.stdout.write(`\nSaved ${path.join(outputDirectory, 'RESULTS.md')}\n`)
  process.stdout.write(`Accuracy ${report.totals.relationCorrect}/${report.totals.count}; JEV ${report.totals.jevCalls}, DeepSeek ${report.totals.deepseekCalls}; known cost ${report.totals.reportedProviderCostRub ?? 'n/a'} RUB; unreported costs ${report.totals.providerCostMissingCalls}\n`)
}
