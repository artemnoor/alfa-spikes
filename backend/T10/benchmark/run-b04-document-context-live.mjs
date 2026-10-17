import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { recoverDocumentContextEntities } from '../src/entities.mjs'

if (!process.env.POLZA_AI_API_KEY && !process.env.POLZA_API_KEY) throw new Error('Set POLZA_AI_API_KEY in backend/T10/.env')

const chunks = [
  { chunk_id: 'unique-ref', source_id: 'live-unique-ref', start_offset: 40, text_content: 'The company manufactures copper turbines.' },
  { chunk_id: 'ambiguous-ref', source_id: 'live-ambiguous-ref', start_offset: 70, text_content: 'The Company increased production of copper.' },
]
const knownEntities = [
  { entity_id: 'company-unique', entity_type: 'COMPANY', canonical_name: 'Northstar Metals', sourceId: 'live-unique-ref', chunkId: 'prior-1', startOffset: 0 },
  { entity_id: 'company-a', entity_type: 'COMPANY', canonical_name: 'Northstar Metals', sourceId: 'live-ambiguous-ref', chunkId: 'prior-2', startOffset: 0 },
  { entity_id: 'company-b', entity_type: 'COMPANY', canonical_name: 'Beacon Group', sourceId: 'live-ambiguous-ref', chunkId: 'prior-3', startOffset: 35 },
]

const result = await recoverDocumentContextEntities(chunks, knownEntities, { maxChunks: 2, batchSize: 3 })
const call = result.modelCalls[0] ?? {}
const report = {
  createdAt: new Date().toISOString(),
  model: call.model ?? process.env.T10_DEEPSEEK_MODEL ?? 'deepseek/deepseek-v4-flash',
  purpose: call.purpose,
  status: call.status ?? 'completed',
  finishReason: call.finishReason ?? null,
  latencyMs: call.latencyMs ?? null,
  inputTokens: call.inputTokens ?? null,
  outputTokens: call.outputTokens ?? null,
  reportedCostRub: call.costRub ?? null,
  maxCostRub: Number(process.env.T10_B04_CONTEXT_MAX_COST_RUB ?? 0.1),
  chunksSent: result.chunks,
  references: result.references,
  entities: result.entities.map(({ type, name, quote, startOffset, chunkId }) => ({ type, name, quote, startOffset, chunkId })),
  rejected: result.rejected,
  modelParsedResponse: call.parsed ?? null,
  checks: {
    uniqueCompanyReferenceAccepted: result.references.some((item) => item.chunkId === 'unique-ref' && item.entityId === 'company-unique'),
    ambiguousCompanyReferenceNotLinked: !result.references.some((item) => item.chunkId === 'ambiguous-ref'),
    allEntityQuotesVerified: result.entities.every((entity) => chunks.find((chunk) => chunk.chunk_id === entity.chunkId)?.text_content.includes(entity.quote)),
  },
}
report.checks.passed = report.checks.uniqueCompanyReferenceAccepted && report.checks.ambiguousCompanyReferenceNotLinked && report.checks.allEntityQuotesVerified
if (report.reportedCostRub !== null && report.reportedCostRub > report.maxCostRub) report.costWarning = 'Reported cost exceeded the post-request budget; one in-flight call cannot be interrupted.'

const runId = process.env.T10_B04_CONTEXT_RUN_ID ?? new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const outputDir = join(import.meta.dirname, 'runs', `b04-document-context-${runId}`)
await mkdir(outputDir, { recursive: true })
await writeFile(join(outputDir, 'result.json'), `${JSON.stringify(report, null, 2)}\n`)
await writeFile(join(outputDir, 'RESULTS.md'), `# B04 document-context live probe\n\n- Date: ${report.createdAt}\n- Model: ${report.model}\n- API calls: ${result.modelCalls.length}\n- Tokens: ${report.inputTokens ?? 'unknown'} input / ${report.outputTokens ?? 'unknown'} output\n- Reported cost: ${report.reportedCostRub === null ? 'unknown' : `${report.reportedCostRub} ₽`}\n- Chunks submitted: ${report.chunksSent}\n- Accepted unique antecedent: ${report.checks.uniqueCompanyReferenceAccepted}\n- Ambiguous antecedent left unlinked: ${report.checks.ambiguousCompanyReferenceNotLinked}\n- All extracted entity quotes exact: ${report.checks.allEntityQuotesVerified}\n- Overall: ${report.checks.passed ? 'PASS' : 'PARTIAL/FAIL'}\n\nRaw response metadata and verified outputs: [result.json](result.json).\n`)
console.log(JSON.stringify({ outputDir, ...report }, null, 2))
if (!report.checks.passed) process.exitCode = 1
