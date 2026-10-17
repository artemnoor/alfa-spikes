import { mkdir, writeFile } from 'node:fs/promises'
import { createBenchmarkScenarios } from './scenarios.mjs'
import { verifyBusinessProposal } from '../src/evidence.mjs'
import { verifyRelationship } from '../src/relationships.mjs'

const runId = '2026-10-17-deterministic-v1'
const outputDirectory = new URL(`./runs/${runId}/`, import.meta.url)
const scenarios = createBenchmarkScenarios()
const results = scenarios.map((scenario) => {
  const chunk = { chunk_id: scenario.id, source_id: scenario.id, start_offset: 0, text_content: scenario.text }
  const b06 = verifyRelationship(chunk, scenario.proposal, scenario.entities)
  let accepted = b06.ok
  let b07 = null
  if (b06.ok) {
    const relation = b06.relationship
    b07 = verifyBusinessProposal({
      ...relation,
      sourceResolution: relation.sourceResolution,
      targetResolution: relation.targetResolution,
      subject: { type: relation.sourceType, name: relation.sourceName, resolution: relation.sourceResolution },
      object: { type: relation.targetType, name: relation.targetName, resolution: relation.targetResolution },
    }, {
      sourceId: scenario.id, sourceText: scenario.text, sourceStatus: 'processed', sourceAccessLevel: 'public',
      subject: { type: relation.sourceType, name: relation.sourceName, resolution: relation.sourceResolution },
      object: { type: relation.targetType, name: relation.targetName, resolution: relation.targetResolution },
    })
    accepted = b07.accepted
  }
  return { id: scenario.id, family: scenario.family, expectedAccepted: scenario.expectedAccepted, b06Accepted: b06.ok, b07Accepted: b07?.accepted ?? false, accepted, pass: accepted === scenario.expectedAccepted, reason: b06.ok ? (b07?.errors ?? []).join('; ') : b06.reason }
})

const families = Object.fromEntries([...new Set(results.map((item) => item.family))].map((family) => {
  const group = results.filter((item) => item.family === family)
  return [family, { cases: group.length, passed: group.filter((item) => item.pass).length, expectedAccepts: group.filter((item) => item.expectedAccepted).length, actualAccepts: group.filter((item) => item.accepted).length }]
}))
const truePositive = results.filter((item) => item.accepted && item.expectedAccepted).length
const falsePositive = results.filter((item) => item.accepted && !item.expectedAccepted).length
const falseNegative = results.filter((item) => !item.accepted && item.expectedAccepted).length
const precision = truePositive + falsePositive ? truePositive / (truePositive + falsePositive) : null
const recall = truePositive + falseNegative ? truePositive / (truePositive + falseNegative) : null
const summary = {
  benchmarkId: runId,
  generatedAt: new Date().toISOString(),
  datasetType: 'synthetic deterministic unit benchmark',
  modelCalls: 0,
  costRub: 0,
  total: results.length,
  passed: results.filter((item) => item.pass).length,
  failed: results.filter((item) => !item.pass).length,
  falseAccepted: results.filter((item) => item.accepted && !item.expectedAccepted).map((item) => item.id),
  falseRejected: results.filter((item) => !item.accepted && item.expectedAccepted).map((item) => item.id),
  truePositive, falsePositive, falseNegative, precision, recall,
  f1: precision !== null && recall !== null && precision + recall ? 2 * precision * recall / (precision + recall) : null,
  families,
  results,
}
const config = { benchmarkId: runId, targetBlocks: ['B06','B07'], datasetType: 'synthetic deterministic relation verification', scenarioCount: scenarios.length, modelCalls: 0, costRub: 0, checks: ['participant type compatibility','evidence quote provenance','unique local coreference','ambiguous coreference rejection'] }

await mkdir(outputDirectory, { recursive: true })
await writeFile(new URL('config.json', outputDirectory), `${JSON.stringify(config, null, 2)}\n`)
await writeFile(new URL('scenarios.json', outputDirectory), `${JSON.stringify(scenarios, null, 2)}\n`)
await writeFile(new URL('results.json', outputDirectory), `${JSON.stringify(summary, null, 2)}\n`)
const familyLines = Object.entries(families).map(([family, value]) => `| ${family} | ${value.cases} | ${value.passed}/${value.cases} | ${value.actualAccepts} |`).join('\n')
const failedLines = results.filter((item) => !item.pass).map((item) => `- ${item.id} (${item.family}): ${item.reason}`).join('\n') || 'Нет.'
await writeFile(new URL('RESULTS.md', outputDirectory), `# T10 deterministic benchmark\n\n- Дата: ${summary.generatedAt}\n- Сценариев: ${summary.total}\n- Пройдено: ${summary.passed}/${summary.total}\n- TP / FP / FN: ${summary.truePositive} / ${summary.falsePositive} / ${summary.falseNegative}\n- Precision / recall / F1: ${summary.precision?.toFixed(3) ?? 'n/a'} / ${summary.recall?.toFixed(3) ?? 'n/a'} / ${summary.f1?.toFixed(3) ?? 'n/a'}\n- Ложных принятий: ${summary.falseAccepted.length}\n- Ложных отклонений: ${summary.falseRejected.length}\n- Вызовы моделей: 0\n- Стоимость Polza: 0 ₽\n\nВсе сценарии синтетические и проверяют детерминированный слой B06/B07. Это не оценка качества моделей или реальных профилей компаний.\n\n| Группа | Сценариев | Прошло | Фактически принято |\n|---|---:|---:|---:|\n${familyLines}\n\n## Несовпадения\n\n${failedLines}\n\nМашинные артефакты: \`scenarios.json\` и \`results.json\`.\n`)
process.stdout.write(JSON.stringify({ benchmarkId: runId, total: summary.total, passed: summary.passed, failed: summary.failed, families }, null, 2))
if (summary.failed) process.exitCode = 1
