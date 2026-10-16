import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractAndLinkEntities } from '../src/entities.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const inputPath = resolve(process.argv[2] ?? `${here}/runs/entity-status-five-news-2026-10-16/news.json`)
const outputDir = resolve(process.argv[3] ?? `${here}/runs/provider-raw-baseline-2026-10-16`)
const news = JSON.parse(await readFile(inputPath, 'utf8'))
const selected = news.find((item) => item.id === Number(process.env.T08_DIAGNOSTIC_NEWS_ID ?? 1))
if (!selected) throw new Error('Diagnostic news item not found')

const article = `Заголовок: ${selected.title}\n\n${selected.content}`
const result = await extractAndLinkEntities(article, {
  date: selected.date,
  captureProviderResponse: true,
  diagnosticMaxTokens: Number(process.env.T08_DIAGNOSTIC_MAX_TOKENS ?? 6000),
})
const response = result.providerResponse ?? null
if (!response) throw new Error(`Provider response was not captured: ${result.error ?? 'unknown extraction error'}`)

const choice = response.choices?.[0] ?? {}
const message = choice.message ?? {}
const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content ?? '')
const reasoning = message.reasoning_content ?? message.reasoning ?? null
const usage = response.usage ?? {}
const reportedReasoningTokens = usage.completion_tokens_details?.reasoning_tokens
  ?? usage.completion_tokens_details?.reasoningTokens
  ?? usage.reasoning_tokens
  ?? null
const redactedResponse = structuredClone(response)
for (const candidate of redactedResponse.choices ?? []) {
  if (!candidate.message) continue
  const reasoningKey = Object.hasOwn(candidate.message, 'reasoning') ? 'reasoning' : 'reasoning_content'
  if (candidate.message[reasoningKey] !== undefined) candidate.message[reasoningKey] = '[REDACTED: reasoning text omitted; token usage retained]'
}
const analysis = {
  model: response.model ?? result.model,
  finishReason: choice.finish_reason ?? null,
  usage,
  reportedReasoningTokens,
  visibleOutputTokens: Number.isFinite(Number(reportedReasoningTokens))
    ? Math.max(0, Number(usage.completion_tokens ?? 0) - Number(reportedReasoningTokens))
    : null,
  reasoningSetting: 'reasoning.effort=none',
  reasoningFieldPresent: reasoning !== null,
  reasoningVisibleCharacters: typeof reasoning === 'string' ? reasoning.length : null,
  answerCharacters: content.length,
  answerUtf8Bytes: Buffer.byteLength(content, 'utf8'),
  answerLooksLikeJson: /^\s*\{/.test(content),
  finishStatus: result.status,
  extractionMode: result.extractionMode,
  inputTokens: result.inputTokens,
  outputTokens: result.outputTokens,
  costRub: result.costRub,
  note: 'Provider-reported completion tokens include whatever the API bills as output. A reasoning-vs-visible-JSON token split is exact only when the response exposes a reasoning token counter; character/byte counts are diagnostic, not token estimates.',
}

await mkdir(outputDir, { recursive: true })
await writeFile(`${outputDir}/provider-raw-response.json`, `${JSON.stringify(redactedResponse, null, 2)}\n`, 'utf8')
if (result.providerRequest) await writeFile(`${outputDir}/provider-request.json`, `${JSON.stringify(result.providerRequest, null, 2)}\n`, 'utf8')
const { providerResponse: _providerResponse, providerRequest: _providerRequest, ...extractionResult } = result
await writeFile(`${outputDir}/extraction-result.json`, `${JSON.stringify(extractionResult, null, 2)}\n`, 'utf8')
await writeFile(`${outputDir}/analysis.json`, `${JSON.stringify({ article: selected, analysis }, null, 2)}\n`, 'utf8')
process.stdout.write(`${JSON.stringify({ outputDir, analysis }, null, 2)}\n`)
