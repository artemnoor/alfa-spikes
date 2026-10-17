import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { realScenarios } from './real-scenarios.mjs'
import { scoreLiveRelationTriples } from './live-expected-relations.mjs'

const directory = dirname(fileURLToPath(import.meta.url))
const runId = process.env.T10_REAL_BENCHMARK_RUN_ID || '2026-10-17-real-13-case-v1'
const outputDirectory = resolve(directory, 'runs', runId)
const apiUrl = (process.env.T10_API_URL || 'http://127.0.0.1:8095').replace(/\/$/u, '')
const startIndex = Math.max(0, Number(process.env.T10_REAL_SCENARIO_START || 3))
const scenarios = realScenarios.slice(startIndex)
if (!scenarios.length) throw new Error(`No real scenarios at start index ${startIndex}`)

async function request(path, method, body) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body == null ? undefined : JSON.stringify(body),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(`${method} ${path}: HTTP ${response.status} ${JSON.stringify(data)}`)
  return data
}

const normalize = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase('ru-RU').replace(/[«»“”„‟"'`.,;:()[\]{}]+/gu, ' ').replace(/\s+/gu, ' ').trim()
const contains = (actual, expected) => { const a = normalize(actual), e = normalize(expected); return Boolean(a && e && (a.includes(e) || e.includes(a))) }
await request('/health', 'GET')
const cases = []
for (const [index, scenario] of scenarios.entries()) {
  const { profile } = await request('/profiles', 'POST', { companyName: scenario.company, profileName: `T10 live ${scenario.id} — ${scenario.industry}` })
  const profileId = profile.profile_id ?? profile.profileId
  await request(`/profiles/${profileId}/sources`, 'POST', {
    sourceType: 'annual_report', title: scenario.documentTitle, url: scenario.sourceUrl,
    contentText: scenario.text, contentType: 'text/plain; charset=utf-8', accessLevel: 'public',
    metadata: { benchmark: runId, scenarioId: scenario.id, publishedAt: scenario.publicationDate, sourceLanguage: scenario.language, sourcePage: scenario.page, primarySource: true },
  })
  const result = await request(`/profiles/${profileId}/runs`, 'POST', { config: { trigger: 'manual', benchmark: runId, scenarioId: scenario.id } })
  const entities = result.stages.find(stage => stage.blockId === 'B04')?.output?.entities ?? []
  const accepted = result.stages.find(stage => stage.blockId === 'B07')?.output?.accepted ?? []
  const relationships = accepted.map(item => ({
    predicate: item.proposal?.predicate ?? item.predicate,
    subject: item.proposal?.sourceName ?? item.proposal?.subject?.name ?? item.sourceName,
    object: item.proposal?.targetName ?? item.proposal?.object?.name ?? item.targetName,
    quote: item.proposal?.quote ?? item.quote,
  }))
  const normalizedEntities = entities.map(entity => ({ type: entity.type ?? entity.entity_type, name: entity.canonical_name ?? entity.name }))
  const matched = new Set()
  const expectedEntities = scenario.expectedEntities.map(expected => {
    const foundIndex = normalizedEntities.findIndex((actual, i) => !matched.has(i) && actual.type === expected.type && contains(actual.name, expected.name))
    const found = foundIndex >= 0
    if (found) matched.add(foundIndex)
    return { ...expected, found }
  })
  const output = {
    scenarioId: scenario.id, industry: scenario.industry, language: scenario.language,
    profileId, runId: result.run.run_id, status: result.run.status,
    source: { title: scenario.documentTitle, url: scenario.sourceUrl, publicationDate: scenario.publicationDate, printedPage: scenario.page, excerpt: scenario.text },
    stages: result.stages.map(({ blockId, status, errors }) => ({ blockId, status, errors })),
    stageOutputs: Object.fromEntries(result.stages.map(({ blockId, input, output, errors }) => [blockId, { input, output, errors }])),
    entities: normalizedEntities, expectedEntities, relationships,
    expectedRelationTriples: scenario.expectedRelationships, usage: result.metrics,
    profile: result.profile, expectedUnknowns: scenario.expectedUnknowns,
  }
  cases.push(output)
  process.stdout.write(`Completed ${index + 1}/${scenarios.length}: ${scenario.id}; status=${result.run.status}; calls=${result.metrics.calls}; cost=${result.metrics.reported_cost_rub ?? 'unknown'} RUB\n`)
}

const relationScore = scoreLiveRelationTriples(cases)
cases.splice(0, cases.length, ...relationScore.cases)
const aggregate = cases.reduce((total, item) => {
  total.calls += Number(item.usage.calls ?? 0)
  total.failedCalls += Number(item.usage.failed_calls ?? 0)
  total.inputTokens += Number(item.usage.input_tokens ?? 0)
  total.outputTokens += Number(item.usage.output_tokens ?? 0)
  total.reportedCostRub += Number(item.usage.reported_cost_rub ?? 0)
  total.latencyMs += Number(item.usage.total_latency_ms ?? 0)
  total.entitiesExpected += item.expectedEntities.length
  total.entitiesFound += item.expectedEntities.filter(value => value.found).length
  total.entityFalsePositives += item.entities.filter(actual => !item.expectedEntities.some(expected => expected.type === actual.type && contains(actual.name, expected.name))).length
  return total
}, { calls: 0, failedCalls: 0, inputTokens: 0, outputTokens: 0, reportedCostRub: 0, latencyMs: 0, entitiesExpected: 0, entitiesFound: 0, entityFalsePositives: 0 })
aggregate.entityFalseNegatives = aggregate.entitiesExpected - aggregate.entitiesFound
aggregate.entityPrecision = aggregate.entitiesFound + aggregate.entityFalsePositives ? aggregate.entitiesFound / (aggregate.entitiesFound + aggregate.entityFalsePositives) : null
aggregate.entityRecall = aggregate.entitiesExpected ? aggregate.entitiesFound / aggregate.entitiesExpected : null
aggregate.entityF1 = aggregate.entityPrecision !== null && aggregate.entityRecall !== null && aggregate.entityPrecision + aggregate.entityRecall ? 2 * aggregate.entityPrecision * aggregate.entityRecall / (aggregate.entityPrecision + aggregate.entityRecall) : null
aggregate.relationships = relationScore.metrics
const runtimeNote = 'Executed through the already-running local T10 API. Its loaded backend revision could not be confirmed against the current checkout.'
const report = { benchmark: runId, testedAt: new Date().toISOString(), datasetType: 'real company reports; official primary sources; manually annotated excerpts', apiUrl, runtimeNote, additionalModelCalls: true, aggregate, cases }
const config = { benchmarkId: runId, scenarioCount: scenarios.length, startIndex, scenarioFile: 'real-scenarios.mjs', runner: 'benchmark/run-real-through-api.mjs', runtimeNote, annotation: 'manual entity types and subject-predicate-object triples', allTextExcerptsUnder25WordsPerSource: true, models: { extractor: 'DeepSeek V4 Flash through Polza AI', matcher: 'JEV', embeddings: 'Qwen3 Embedding 8B' } }
const pct = value => value === null ? 'n/a' : `${(value * 100).toFixed(1)}%`
const rows = cases.map(item => `| ${item.scenarioId} | ${item.industry} | ${item.status} | ${item.expectedEntities.filter(x => x.found).length}/${item.expectedEntities.length} | ${item.expectedRelationTriples.filter(x => x.found).length}/${item.expectedRelationTriples.length} | ${item.unexpectedRelationships.length} | ${item.usage.calls} | ${Number(item.usage.reported_cost_rub ?? 0).toFixed(6)} |`).join('\n')
const markdown = `# T10 real-source live benchmark — ${cases.length} additional cases\n\n- Run: ${report.testedAt}\n- Open official company reports/sites, manually annotated excerpts. Small pilot, not a production accuracy estimate.\n- Model calls: ${aggregate.calls} (${aggregate.failedCalls} failed); input/output tokens: ${aggregate.inputTokens}/${aggregate.outputTokens}; cost reported by Polza: ${aggregate.reportedCostRub.toFixed(6)} ₽; total latency: ${aggregate.latencyMs} ms.\n- Entities TP/FP/FN: ${aggregate.entitiesFound}/${aggregate.entityFalsePositives}/${aggregate.entityFalseNegatives}; precision/recall/F1: ${pct(aggregate.entityPrecision)}/${pct(aggregate.entityRecall)}/${pct(aggregate.entityF1)}.\n- Relation triples TP/FP/FN: ${aggregate.relationships.truePositive}/${aggregate.relationships.falsePositive}/${aggregate.relationships.falseNegative}; precision/recall/F1: ${pct(aggregate.relationships.precision)}/${pct(aggregate.relationships.recall)}/${pct(aggregate.relationships.f1)}. Match requires predicate and both participants.\n- Runtime note: ${runtimeNote}\n\n| Case | Industry | Status | Entities | Relations | Relation FP | Calls | Cost ₽ |\n|---|---|---|---:|---:|---:|---:|---:|\n${rows}\n\nEach source excerpt is stored with URL/date and is shorter than 25 words. Full documents are not bundled. Raw per-stage outputs and request metrics are in results.json.\n`
await mkdir(outputDirectory, { recursive: true })
await writeFile(resolve(outputDirectory, 'config.json'), `${JSON.stringify(config, null, 2)}\n`)
await writeFile(resolve(outputDirectory, 'results.json'), `${JSON.stringify(report, null, 2)}\n`)
await writeFile(resolve(outputDirectory, 'RESULTS.md'), markdown)
process.stdout.write(`Saved ${cases.length} cases to ${outputDirectory}\n`)
