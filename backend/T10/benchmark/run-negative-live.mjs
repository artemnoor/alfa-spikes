import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { verifyRelationshipSemantics } from '../src/semantic-evidence.mjs'
import { verifyBusinessProposal } from '../src/evidence.mjs'
import { polzaConfigured } from '../src/polza.mjs'
import { negativeScenarios } from './negative-scenarios.mjs'

if (!polzaConfigured()) throw new Error('Для live negative benchmark задайте POLZA_AI_API_KEY')
const maxCostRub = Number(process.env.T10_NEGATIVE_MAX_COST_RUB ?? 0.15)
const runId = process.env.T10_NEGATIVE_RUN_ID ?? '2026-10-17-negative-b07-live-v2'
const bySource = new Map(negativeScenarios.map((scenario) => [scenario.id, { content_text: scenario.text }]))
const proposals = negativeScenarios.map((scenario) => ({ sourceId: scenario.id, ...scenario.proposal }))
const deterministicResults = new Map(proposals.map((proposal) => [proposal.sourceId, verifyBusinessProposal(proposal, {
  sourceId: proposal.sourceId,
  sourceText: bySource.get(proposal.sourceId)?.content_text,
  sourceStatus: 'processed',
  subject: { type: proposal.subjectType, name: proposal.subject },
  object: { type: proposal.objectType, name: proposal.object },
})]))
const semanticProposals = proposals.filter((proposal) => deterministicResults.get(proposal.sourceId)?.accepted)
const result = await verifyRelationshipSemantics(semanticProposals, (sourceId) => bySource.get(sourceId), { maxProposals: negativeScenarios.length })
const modelCall = result.modelCall
if (modelCall?.costRub != null && modelCall.costRub > maxCostRub) {
  throw new Error(`Semantic review стоил ${modelCall.costRub} ₽, выше заданного лимита ${maxCostRub} ₽; результаты не записаны.`)
}
const acceptedIds = new Set(result.accepted.map((item) => item.sourceId))
const cases = negativeScenarios.map((scenario) => {
  const deterministic = deterministicResults.get(scenario.id)
  const accepted = deterministic.accepted && acceptedIds.has(scenario.id)
  return { id: scenario.id, family: scenario.family, expectedSupported: scenario.expectedSupported, accepted, deterministicAccepted: deterministic.accepted, pass: accepted === scenario.expectedSupported, rejectionCode: !deterministic.accepted ? 'deterministic_b07_rejected' : result.rejected.find((item) => item.sourceId === scenario.id)?.code ?? null, reason: !deterministic.accepted ? deterministic.errors.join('; ') : result.rejected.find((item) => item.sourceId === scenario.id)?.reason ?? result.accepted.find((item) => item.sourceId === scenario.id)?.semanticVerification?.reason ?? null }
})
const tp = cases.filter((item) => item.expectedSupported && item.accepted).length
const fp = cases.filter((item) => !item.expectedSupported && item.accepted).length
const fn = cases.filter((item) => item.expectedSupported && !item.accepted).length
const tn = cases.filter((item) => !item.expectedSupported && !item.accepted).length
const accuracy = (tp + tn) / cases.length
const report = { runId, generatedAt: new Date().toISOString(), datasetType: 'synthetic adversarial B07 benchmark; deterministic checks followed by one batched live DeepSeek request', model: modelCall?.model ?? process.env.T10_DEEPSEEK_MODEL ?? 'deepseek/deepseek-v4-flash', calls: modelCall?.status === 'failed' ? 1 : Number(Boolean(modelCall)), semanticCandidates: semanticProposals.length, status: modelCall?.status ?? (semanticProposals.length ? 'completed' : 'skipped'), inputTokens: modelCall?.inputTokens ?? null, outputTokens: modelCall?.outputTokens ?? null, costRub: modelCall?.costRub ?? null, latencyMs: modelCall?.latencyMs ?? null, maxCostRub, metrics: { n: cases.length, truePositive: tp, falsePositive: fp, falseNegative: fn, trueNegative: tn, accuracy, falseAcceptanceRate: fp / Math.max(cases.filter((item) => !item.expectedSupported).length, 1) }, cases, rawReviews: modelCall?.parsed?.reviews ?? null }
const directory = resolve('benchmark/runs', runId)
await mkdir(directory, { recursive: true })
await writeFile(resolve(directory, 'config.json'), `${JSON.stringify({ runId, runner: 'benchmark/run-negative-live.mjs', scenarioFile: 'benchmark/negative-scenarios.mjs', scenarioCount: cases.length, maxCostRub, labels: 'manually authored synthetic expected entailment labels', oneBatch: true }, null, 2)}\n`)
await writeFile(resolve(directory, 'results.json'), `${JSON.stringify(report, null, 2)}\n`)
const rows = cases.map((item) => `| ${item.id} | ${item.family} | ${item.expectedSupported ? 'SUPPORTED' : 'reject'} | ${item.accepted ? 'accepted' : 'rejected'} | ${item.pass ? 'pass' : 'FAIL'} |`).join('\n')
const markdown = `# T10 live B07 negative benchmark — ${runId}\n\n- ${cases.length} hand-authored synthetic cases; ${semanticProposals.length} passed the deterministic B07 gate and were sent in one batch; model: ${report.model}; status: ${report.status}.\n- Tokens input/output: ${report.inputTokens ?? 'unknown'}/${report.outputTokens ?? 'unknown'}; reported cost: ${report.costRub === null ? 'unknown' : `${report.costRub.toFixed(6)} ₽`}; latency: ${report.latencyMs ?? 'unknown'} ms.\n- TP/FP/FN/TN after both stages: ${tp}/${fp}/${fn}/${tn}; accuracy ${(accuracy * 100).toFixed(1)}%; false acceptance ${(report.metrics.falseAcceptanceRate * 100).toFixed(1)}% over ${cases.filter((item) => !item.expectedSupported).length} negative cases.\n- This synthetic probe is diagnostic only; it is not an estimate of real-world semantic accuracy.\n\n| ID | Adversarial family | Gold | Final decision | Result |\n|---|---|---|---|---|\n${rows}\n\nPer-case deterministic errors, semantic reasons and raw review JSON are saved in results.json.\n`
await writeFile(resolve(directory, 'RESULTS.md'), markdown)
process.stdout.write(`${JSON.stringify({ runId, status: report.status, metrics: report.metrics, calls: report.calls, inputTokens: report.inputTokens, outputTokens: report.outputTokens, costRub: report.costRub, latencyMs: report.latencyMs }, null, 2)}\n`)
