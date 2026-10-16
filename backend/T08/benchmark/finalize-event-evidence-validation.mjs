import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const [inputPath, firstRunPath, retryPath, outputPath] = process.argv.slice(2).map((value) => resolve(value))
if (!inputPath || !firstRunPath || !retryPath || !outputPath) {
  throw new Error('Usage: node finalize-event-evidence-validation.mjs <news.json> <first-run.json> <retry-run.json> <output.json>')
}

const [news, firstRun, retryRun] = await Promise.all([
  readFile(inputPath, 'utf8').then(JSON.parse),
  readFile(firstRunPath, 'utf8').then(JSON.parse),
  readFile(retryPath, 'utf8').then(JSON.parse),
])
const retryById = new Map(retryRun.results.map((item) => [item.input.id, item]))
const initialById = new Map(firstRun.results.map((item) => [item.input.id, item]))
const results = news.map((input) => {
  const retry = retryById.get(input.id)
  const initial = initialById.get(input.id)
  return { input, ...(retry?.result ? { result: retry.result } : initial?.result ? { result: initial.result } : { error: initial?.error ?? 'missing_result' }) }
})
const thresholds = [0.5, 0.6, 0.7, 0.8, 0.9]
const thresholdMetrics = thresholds.map((threshold) => {
  const positive = results.filter(({ input }) => input.expected_event)
  const negative = results.filter(({ input }) => !input.expected_event)
  const accepted = ({ result }) => Boolean(result)
    && result.event_type !== 'sentivent:no_matching_event'
    && result.evidence_verified === true
    && Number.isFinite(result.support_score)
    && result.support_score >= threshold
  const tp = positive.filter(accepted)
  const fp = negative.filter(accepted)
  const fn = positive.length - tp.length
  const tn = negative.length - fp.length
  const wrongType = tp.filter(({ input, result }) => result.proposed_event_type !== input.expected_event_type).length
  return {
    threshold,
    truePositive: tp.length,
    falseNegative: fn,
    falsePositive: fp.length,
    trueNegative: tn,
    falseRejectionRate: positive.length ? fn / positive.length : null,
    falseAcceptanceRate: negative.length ? fp.length / negative.length : null,
    precision: tp.length + fp.length ? tp.length / (tp.length + fp.length) : null,
    recall: positive.length ? tp.length / positive.length : null,
    acceptedWithWrongEventType: wrongType,
  }
})

const initialUsage = firstRun.results.map((item) => item.result ?? item.usage).filter(Boolean)
const retryUsage = retryRun.results.map((item) => item.result ?? item.usage).filter(Boolean)
const usage = [...initialUsage, ...retryUsage]
const sum = (field) => usage.reduce((total, item) => total + (item[field] ?? 0), 0)
const output = {
  generatedAt: new Date().toISOString(),
  input: inputPath,
  testKind: 'synthetic, manually labeled event-presence benchmark; counts failed first attempt and successful retry in spend',
  models: firstRun.models,
  thresholds,
  results,
  summary: {
    newsCount: news.length,
    completed: results.filter((item) => item.result).length,
    failed: results.filter((item) => !item.result).length,
    evidenceReviews: results.filter((item) => item.result?.evidence_reviewed).length,
    evidenceQuotesVerified: results.filter((item) => item.result?.evidence_verified).length,
    successfulWorkCalls: results.reduce((total, item) => total + (item.result?.calls ?? 0), 0),
    billedCallsIncludingFailedAttempt: sum('calls'),
    billedInputTokensIncludingFailedAttempt: sum('inputTokens'),
    billedOutputTokensIncludingFailedAttempt: sum('outputTokens'),
    totalCostRubIncludingFailedAttempt: usage.every((item) => Number.isFinite(item.costRub)) ? sum('costRub') : null,
    thresholdMetrics,
    attemptAccounting: {
      firstRunCalls: sum('calls') - retryUsage.reduce((total, item) => total + (item.calls ?? 0), 0),
      retryCalls: retryUsage.reduce((total, item) => total + (item.calls ?? 0), 0),
      retryCostRub: retryUsage.reduce((total, item) => total + (item.costRub ?? 0), 0),
    },
  },
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, JSON.stringify(output, null, 2), 'utf8')
process.stdout.write(`${JSON.stringify(output.summary, null, 2)}\nSaved ${outputPath}\n`)
