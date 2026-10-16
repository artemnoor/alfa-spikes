import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { classifyEvent } from '../src/classifier.mjs'

const defaultInput = new URL('./event-evidence-validation-2026-10-16/news.json', import.meta.url)
const inputPath = resolve(process.argv[2] || fileURLToPath(defaultInput))
const outputPath = resolve(process.argv[3] || dirname(inputPath), 'results.json')
const news = JSON.parse(await readFile(inputPath, 'utf8'))
const selectedIds = new Set((process.env.T08_NEWS_IDS || '').split(',').map(Number).filter(Boolean))
const filteredNews = selectedIds.size ? news.filter((item) => selectedIds.has(item.id)) : news
const newsToRun = Number(process.env.T08_NEWS_LIMIT) > 0 ? filteredNews.slice(0, Number(process.env.T08_NEWS_LIMIT)) : filteredNews
const thresholds = [0.5, 0.6, 0.7, 0.8, 0.9]
const output = {
  startedAt: new Date().toISOString(),
  input: inputPath,
  testKind: 'synthetic, manually labeled event-presence benchmark',
  thresholds,
  models: { selector: 'typesafe/jev', evidence: process.env.T08_EVENT_EVIDENCE_MODEL || 'deepseek/deepseek-v4-flash' },
  results: [],
}

function evaluateThreshold(results, threshold) {
  const positives = results.filter((item) => item.input.expected_event)
  const negatives = results.filter((item) => !item.input.expected_event)
  const predictionFor = (item) => {
    const result = item.result
    const proposedType = result.proposed_event_type ?? result.event_type
    return proposedType !== 'sentivent:no_matching_event'
      && result.evidence_verified === true
      && Number.isFinite(result.support_score)
      && result.support_score >= threshold
  }
  const truePositive = positives.filter(predictionFor).length
  const falseNegative = positives.length - truePositive
  const falsePositive = negatives.filter(predictionFor).length
  const trueNegative = negatives.length - falsePositive
  const acceptedWithWrongType = positives.filter((item) => predictionFor(item)
    && item.result.proposed_event_type !== item.input.expected_event_type).length
  return {
    threshold,
    truePositive,
    falseNegative,
    falsePositive,
    trueNegative,
    falseRejectionRate: positives.length ? falseNegative / positives.length : null,
    falseAcceptanceRate: negatives.length ? falsePositive / negatives.length : null,
    precision: truePositive + falsePositive ? truePositive / (truePositive + falsePositive) : null,
    recall: positives.length ? truePositive / positives.length : null,
    acceptedWithWrongEventType: acceptedWithWrongType,
  }
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, JSON.stringify(output, null, 2), 'utf8')

  for (const item of newsToRun) {
  const state = `Дата публикации: ${item.date}\nЗаголовок: ${item.title}\n\n${item.content}`
  try {
    const result = await classifyEvent(state)
    output.results.push({ input: item, result })
  } catch (error) {
    output.results.push({
      input: item,
      error: error?.message ?? String(error),
      usage: error?.classifierUsage ?? error?.usage ?? null,
    })
  }
  output.updatedAt = new Date().toISOString()
  await writeFile(outputPath, JSON.stringify(output, null, 2), 'utf8')
  const result = output.results.at(-1).result
  process.stdout.write(`${item.id}/${newsToRun.length} ${item.name}: ${result?.value?.label ?? 'ERROR'} · quote ${result?.evidence_verified ? 'valid' : 'none'}\n`)
}

const completed = output.results.filter((item) => item.result)
const usageRows = output.results.map((item) => item.result ?? item.usage).filter(Boolean)
output.summary = {
  newsCount: newsToRun.length,
  completed: completed.length,
  failed: newsToRun.length - completed.length,
  evidenceReviews: completed.filter((item) => item.result.evidence_reviewed).length,
  evidenceQuotesVerified: completed.filter((item) => item.result.evidence_verified).length,
  totalCalls: usageRows.reduce((sum, item) => sum + (item.calls ?? 0), 0),
  totalInputTokens: usageRows.reduce((sum, item) => sum + (item.inputTokens ?? 0), 0),
  totalCostRub: usageRows.length === output.results.length && usageRows.every((item) => Number.isFinite(item.costRub))
    ? usageRows.reduce((sum, item) => sum + item.costRub, 0)
    : null,
  thresholdMetrics: thresholds.map((threshold) => evaluateThreshold(completed, threshold)),
}
output.finishedAt = new Date().toISOString()
await writeFile(outputPath, JSON.stringify(output, null, 2), 'utf8')
process.stdout.write(`Saved ${output.results.length} results to ${outputPath}\n`)
