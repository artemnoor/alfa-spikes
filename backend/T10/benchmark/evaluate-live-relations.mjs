import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { liveExpectedRelations, scoreLiveRelationTriples } from './live-expected-relations.mjs'

const runDirectory = resolve(process.argv[2] ?? 'benchmark/runs/2026-10-17-live-13-case-v8')
const resultPath = resolve(runDirectory,'results.json')
const result = JSON.parse(await readFile(resultPath,'utf8'))
const {cases,metrics} = scoreLiveRelationTriples(result.cases)
result.cases = cases
result.aggregate.relationTriples = metrics
result.benchmarkNotes = [
  ...(result.benchmarkNotes ?? []),
  'Manual relation triple gold was added offline; it matches predicate and both participants. Synthetic-only score; no additional model calls were made.',
]
await writeFile(resultPath,`${JSON.stringify(result,null,2)}\n`,'utf8')
const config={evaluation:'T10 relation triple evaluation',dataset:result.benchmark,annotationFile:'benchmark/live-expected-relations.mjs',matchedFields:['predicate','subject','object'],nameNormalization:'NFKC lowercase punctuation/whitespace normalization with contained-name match',additionalModelCalls:0,costRub:0}
await writeFile(resolve(runDirectory,'relation-evaluation-config.json'),`${JSON.stringify(config,null,2)}\n`,'utf8')
const rows=cases.map((item)=>`| ${item.scenarioId} | ${item.expectedRelationships.filter((relation)=>relation.found).length}/${item.expectedRelationships.length} | ${item.unexpectedRelationships.length} |`).join('\n')
const pct=(value)=>value===null?'n/a':`${(value*100).toFixed(1)}%`
const markdown=`# T10 live relation triple evaluation\n\n- Base run: ${result.benchmark}\n- Synthetic fixtures only. This is an offline re-score; no model calls were made.\n- True positives / false positives / false negatives: ${metrics.truePositive} / ${metrics.falsePositive} / ${metrics.falseNegative}\n- Precision / recall / F1: ${pct(metrics.precision)} / ${pct(metrics.recall)} / ${pct(metrics.f1)}\n- Expected manually annotated relation triples: ${metrics.expected}\n- Matching requires predicate and both participant names. Name matching applies Unicode normalization and substring matching to tolerate inflection.\n\n| Case | Correct expected triples | Unexpected predicted triples |\n|---|---:|---:|\n${rows}\n\nGold annotations are hand-authored for these synthetic snippets and deliberately omit relations not represented safely by the current predicate ontology. The results do not estimate quality on real company documents. Per-case expected matches and false positives are in saved JSON artifacts.\n`
await writeFile(resolve(runDirectory,'RELATION_EVALUATION.md'),markdown,'utf8')
process.stdout.write(`${JSON.stringify({benchmark:result.benchmark,relationTriples:metrics},null,2)}\n`)
