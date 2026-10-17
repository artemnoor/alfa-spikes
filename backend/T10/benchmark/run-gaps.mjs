import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectBusinessGaps } from '../src/gaps.mjs'
import { createGapBenchmarkScenarios } from './gap-scenarios.mjs'

const directory = dirname(fileURLToPath(import.meta.url))
const runId = '2026-10-17-gap-50-v1'
const outputDirectory = resolve(directory, 'runs', runId)
const scenarios = createGapBenchmarkScenarios()
const results = scenarios.map((scenario) => {
  const gaps = detectBusinessGaps({ profileId: scenario.id, entities: scenario.entities, claims: scenario.claims })
  const expected = new Set(scenario.expectedGapKeys)
  const actual = new Set(gaps.map((gap) => gap.gapKey))
  return { id: scenario.id, family: scenario.family, expectedGapKeys: [...expected], actualGapKeys: [...actual], truePositive: [...expected].filter((key) => actual.has(key)), falseNegative: [...expected].filter((key) => !actual.has(key)), falsePositive: [...actual].filter((key) => !expected.has(key)) }
})
const truePositive = results.reduce((sum, item) => sum + item.truePositive.length, 0)
const falseNegative = results.reduce((sum, item) => sum + item.falseNegative.length, 0)
const falsePositive = results.reduce((sum, item) => sum + item.falsePositive.length, 0)
const precision = truePositive + falsePositive ? truePositive / (truePositive + falsePositive) : null
const recall = truePositive + falseNegative ? truePositive / (truePositive + falseNegative) : null
const summary = { benchmarkId: runId, generatedAt: new Date().toISOString(), datasetType: 'synthetic deterministic B09 gap detection', modelCalls: 0, costRub: 0, scenarioCount: scenarios.length, truePositive, falsePositive, falseNegative, precision, recall, f1: precision && recall ? 2 * precision * recall / (precision + recall) : null, results }
const families = [...new Set(scenarios.map((item) => item.family))].map((family) => ({ family, count: scenarios.filter((item) => item.family === family).length }))
const config = { benchmarkId: runId, targetBlock: 'B09', seed: 17, scenarioCount: scenarios.length, syntheticOnly: true, generator: 'gap-scenarios.mjs', implementation: 'detectBusinessGaps', modelCalls: 0, costRub: 0, families }

await mkdir(outputDirectory, { recursive: true })
await writeFile(resolve(outputDirectory, 'config.json'), `${JSON.stringify(config, null, 2)}\n`)
await writeFile(resolve(outputDirectory, 'scenarios.json'), `${JSON.stringify(scenarios, null, 2)}\n`)
await writeFile(resolve(outputDirectory, 'results.json'), `${JSON.stringify(summary, null, 2)}\n`)
const markdown = `# T10 B09 gap detection benchmark\n\n- Дата: ${summary.generatedAt}\n- Сценариев: ${summary.scenarioCount} синтетических графов\n- Модельные вызовы: 0\n- Стоимость Polza: 0 ₽\n- TP / FP / FN: ${truePositive} / ${falsePositive} / ${falseNegative}\n- Precision / recall / F1: ${(precision * 100).toFixed(1)}% / ${(recall * 100).toFixed(1)}% / ${(summary.f1 * 100).toFixed(1)}%\n\n${families.map((item) => `- ${item.family}: ${item.count} сценариев`).join('\n')}\n\nСинтетический тест проверяет только правила B09 на заданных графах; результат не является качеством извлечения сущностей или связей на реальных документах. Конфигурация, эталонные сценарии и результаты сохранены рядом.\n`
await writeFile(resolve(outputDirectory, 'RESULTS.md'), markdown)
process.stdout.write(JSON.stringify({ benchmarkId: runId, scenarios: scenarios.length, truePositive, falsePositive, falseNegative, precision, recall, f1: summary.f1 }, null, 2))
