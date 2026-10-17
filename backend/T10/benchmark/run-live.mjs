import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createProfile, initializeT10Store, saveSource, closeT10Store } from '../src/store.mjs'
import { processCompanyProfile } from '../src/pipeline.mjs'
import { liveScenarios } from './live-scenarios.mjs'
import { scoreLiveRelationTriples } from './live-expected-relations.mjs'

const directory = dirname(fileURLToPath(import.meta.url))
const outputDirectory = resolve(directory, 'runs/2026-10-17-live-13-case-v8')
const normalize = (value) => String(value ?? '').normalize('NFKC').toLocaleLowerCase('ru-RU').replace(/[«»“”„‟"'`.,;:()[\]{}]+/gu, ' ').replace(/\s+/gu, ' ').trim()

if (!(process.env.POLZA_AI_API_KEY || process.env.POLZA_API_KEY)) throw new Error('Для живого бенчмарка задайте POLZA_AI_API_KEY в окружении T10')
await initializeT10Store()
const cases = []
try {
  for (const [index, scenario] of liveScenarios.entries()) {
    const created = await createProfile({ companyName: scenario.company, profileName: `T10 live ${scenario.id} — ${scenario.industry}` })
    await saveSource(created.profileId, { sourceType:'document', title:`${scenario.id} synthetic profile note.txt`, contentText:scenario.text, accessLevel:'customer_internal', metadata:{ benchmark:'T10-live-13-v8', scenarioId:scenario.id, synthetic:true } })
    const output = await processCompanyProfile(created.profileId, { trigger:'manual', benchmark:'T10-live-13-v8', scenarioId:scenario.id })
    const b04 = output.stages.find((stage) => stage.blockId === 'B04')?.output?.entities ?? []
    const b07 = output.stages.find((stage) => stage.blockId === 'B07')?.output?.accepted ?? []
    const foundEntities = scenario.expectedEntities.map((expected) => ({ expected, found: b04.some((item) => normalize(item.canonical_name).includes(normalize(expected)) || normalize(expected).includes(normalize(item.canonical_name))) }))
    const foundPredicates = scenario.expectedPredicates.map((expected) => ({ expected, found: b07.some((item) => (item.proposal?.predicate ?? item.predicate) === expected) }))
    cases.push({ scenarioId:scenario.id, industry:scenario.industry, profileId:created.profileId, runId:output.run.run_id, status:output.run.status, stages:output.stages.map(({ blockId,status,errors }) => ({ blockId,status,errors })), stageOutputs:Object.fromEntries(output.stages.map(({blockId,input,output:stageOutput,errors})=>[blockId,{input,output:stageOutput,errors}])), entities:b04.map(({ entity_type,canonical_name }) => ({ type:entity_type,name:canonical_name })), expectedEntities:foundEntities, relationships:b07.map((item) => ({ predicate:item.proposal?.predicate ?? item.predicate, subject:item.proposal?.sourceName ?? item.proposal?.subject?.name ?? item.sourceName, object:item.proposal?.targetName ?? item.proposal?.object?.name ?? item.targetName, quote:item.proposal?.quote ?? item.quote })), expectedPredicates:foundPredicates, usage:output.metrics, profile:output.profile })
    process.stdout.write(`Completed ${index + 1}/${liveScenarios.length}: ${scenario.id}; status=${output.run.status}; model calls=${output.metrics.calls}; cost=${output.metrics.reported_cost_rub ?? 'unknown'} RUB\n`)
  }
} finally {
  await closeT10Store()
}

const aggregate = cases.reduce((total, item) => {
  total.calls += Number(item.usage.calls ?? 0)
  total.failedCalls += Number(item.usage.failed_calls ?? 0)
  total.inputTokens += Number(item.usage.input_tokens ?? 0)
  total.outputTokens += Number(item.usage.output_tokens ?? 0)
  total.reportedCostRub += Number(item.usage.reported_cost_rub ?? 0)
  total.latencyMs += Number(item.usage.total_latency_ms ?? 0)
  total.entitiesExpected += item.expectedEntities.length
  total.entitiesFound += item.expectedEntities.filter((value) => value.found).length
  total.relationsExpected += item.expectedPredicates.length
  total.relationsFound += item.expectedPredicates.filter((value) => value.found).length
  return total
}, { calls:0, failedCalls:0, inputTokens:0, outputTokens:0, reportedCostRub:0, latencyMs:0, entitiesExpected:0, entitiesFound:0, relationsExpected:0, relationsFound:0 })
aggregate.entityRecall = aggregate.entitiesExpected ? aggregate.entitiesFound / aggregate.entitiesExpected : null
aggregate.relationPredicateRecall = aggregate.relationsExpected ? aggregate.relationsFound / aggregate.relationsExpected : null
const relationScore = scoreLiveRelationTriples(cases)
cases.splice(0,cases.length,...relationScore.cases)
aggregate.relationTriples = relationScore.metrics
const report = { benchmark:'T10-live-13-v8', testedAt:new Date().toISOString(), syntheticOnly:true, model:{ extractor:process.env.T10_DEEPSEEK_MODEL || 'deepseek/deepseek-v4-flash', matcher:process.env.T10_MATCH_MODEL || 'typesafe/jev', embeddings:process.env.T10_EMBEDDING_MODEL || 'qwen/qwen3-embedding-8b' }, aggregate, cases }
const config = { benchmarkId: report.benchmark, scenarioCount: liveScenarios.length, scenarioFile: 'live-scenarios.mjs', syntheticOnly: true, models: report.model, runner: 'benchmark/run-live.mjs', maxSourcesPerProfile: 1, externalNetworkEnrichment: false }
await mkdir(outputDirectory, { recursive:true })
await writeFile(resolve(outputDirectory,'config.json'), `${JSON.stringify(config,null,2)}\n`, 'utf8')
await writeFile(resolve(outputDirectory,'results.json'), `${JSON.stringify(report,null,2)}\n`, 'utf8')
const markdown = [
  '# T10 live 13-case benchmark · v8', '',
  `Run at ${report.testedAt}. All source documents and company names are synthetic; this measures behavior on these fixtures, not real-company accuracy.`, '',
  '## Aggregate', '',
  `- Model calls: ${aggregate.calls} (${aggregate.failedCalls} failed)`,
  `- Tokens: ${aggregate.inputTokens} input / ${aggregate.outputTokens} output`,
  `- Cost reported by Polza: ${aggregate.reportedCostRub.toFixed(6)} ₽`,
  `- Total model latency: ${aggregate.latencyMs} ms`,
  `- Expected entities found: ${aggregate.entitiesFound}/${aggregate.entitiesExpected} (${(aggregate.entityRecall*100).toFixed(1)}% recall; name/type precision is not assessed here)`,
  `- Expected relationship predicates found: ${aggregate.relationsFound}/${aggregate.relationsExpected} (${(aggregate.relationPredicateRecall*100).toFixed(1)}% predicate recall; participant-level correctness is not assessed by this coarse metric)`, '',
  `- Relation triples: ${aggregate.relationTriples.truePositive} TP / ${aggregate.relationTriples.falsePositive} FP / ${aggregate.relationTriples.falseNegative} FN; precision ${(aggregate.relationTriples.precision*100).toFixed(1)}%, recall ${(aggregate.relationTriples.recall*100).toFixed(1)}%, F1 ${(aggregate.relationTriples.f1*100).toFixed(1)}% (manual gold includes subject, predicate and object)`, '',
  '## Per-case summary', '',
  '| Case | Industry | Status | Entities found | Expected relation predicates found | Calls | Cost ₽ |',
  '|---|---|---|---:|---:|---:|---:|',
  ...cases.map((item) => `| ${item.scenarioId} | ${item.industry} | ${item.status} | ${item.expectedEntities.filter((value)=>value.found).length}/${item.expectedEntities.length} | ${item.expectedPredicates.filter((value)=>value.found).length}/${item.expectedPredicates.length} | ${item.usage.calls} | ${Number(item.usage.reported_cost_rub??0).toFixed(6)} |`), '',
  'Detailed outputs, exact model-returned entities/relations, manually annotated expected triples, stage errors and metrics are in `results.json`. This is a smoke benchmark on synthetic text, not production quality.', '',
].join('\n')
await writeFile(resolve(outputDirectory,'RESULTS.md'), markdown, 'utf8')
process.stdout.write(`Saved ${cases.length} cases to ${outputDirectory}\n`)
