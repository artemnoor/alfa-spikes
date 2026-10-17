import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { scoreLiveRelationTriples } from './live-expected-relations.mjs'

const runDirectory=resolve(process.argv[2]??'benchmark/runs/2026-10-17-real-3-case-v1')
const resultPath=resolve(runDirectory,'results.json')
const report=JSON.parse(await readFile(resultPath,'utf8'))
const normalize=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('ru-RU').replace(/[«»“”„‟"'`.,;:()[\]{}]+/gu,' ').replace(/\s+/gu,' ').trim()
const contains=(actual,expected)=>{const a=normalize(actual),e=normalize(expected);return Boolean(a&&e&&(a.includes(e)||e.includes(a)))}
for(const item of report.cases){
  const raw=item.stageOutputs.B04.output.entities??[]
  item.entities=raw.map(entity=>({type:entity.type??entity.entity_type,name:entity.canonical_name??entity.name}))
  const used=new Set()
  item.expectedEntities=item.expectedEntities.map(expected=>{
    const index=item.entities.findIndex((actual,i)=>!used.has(i)&&actual.type===expected.type&&contains(actual.name,expected.name))
    const found=index>=0
    if(found)used.add(index)
    return {...expected,found}
  })
  item.expectedRelationTriples=item.expectedRelationTriples??item.expectedRelationships
}
const relationScore=scoreLiveRelationTriples(report.cases)
report.cases=relationScore.cases
const expected=report.cases.reduce((sum,item)=>sum+item.expectedEntities.length,0)
const found=report.cases.reduce((sum,item)=>sum+item.expectedEntities.filter(entity=>entity.found).length,0)
const falsePositives=report.cases.reduce((sum,item)=>sum+item.entities.filter(actual=>!item.expectedEntities.some(expected=>expected.type===actual.type&&contains(actual.name,expected.name))).length,0)
const falseNegatives=expected-found
const precision=found+falsePositives?found/(found+falsePositives):null
const recall=expected?found/expected:null
report.aggregate.entitiesExpected=expected
report.aggregate.entitiesFound=found
report.aggregate.entityFalsePositives=falsePositives
report.aggregate.entityFalseNegatives=falseNegatives
report.aggregate.entityPrecision=precision
report.aggregate.entityRecall=recall
report.aggregate.entityF1=precision!==null&&recall!==null&&precision+recall?2*precision*recall/(precision+recall):null
report.aggregate.relationships=relationScore.metrics
await writeFile(resultPath,`${JSON.stringify(report,null,2)}\n`,'utf8')
const pct=value=>value===null?'n/a':`${(value*100).toFixed(1)}%`
const rows=report.cases.map(item=>`| ${item.scenarioId} | ${item.industry} | ${item.status} | ${item.expectedEntities.filter(x=>x.found).length}/${item.expectedEntities.length} | ${item.expectedRelationships.filter(x=>x.found).length}/${item.expectedRelationships.length} | ${item.unexpectedRelationships.length} | ${item.usage.calls} | ${Number(item.usage.reported_cost_rub??0).toFixed(6)} |`).join('\n')
const markdown=`# T10 real-source benchmark v1\n\n- Run: ${report.testedAt}\n- ${report.datasetType}. This ${report.cases.length}-case small-sample pilot is not a general accuracy estimate.\n- Model calls: ${report.aggregate.calls} (${report.aggregate.failedCalls} failed); input/output tokens: ${report.aggregate.inputTokens}/${report.aggregate.outputTokens}; reported cost: ${report.aggregate.reportedCostRub.toFixed(6)} ₽; total latency: ${report.aggregate.latencyMs} ms.\n- Entity TP/FP/FN: ${found}/${falsePositives}/${falseNegatives}; precision/recall/F1: ${pct(precision)}/${pct(recall)}/${pct(report.aggregate.entityF1)}.\n- Relation TP/FP/FN: ${relationScore.metrics.truePositive}/${relationScore.metrics.falsePositive}/${relationScore.metrics.falseNegative}; precision/recall/F1: ${pct(relationScore.metrics.precision)}/${pct(relationScore.metrics.recall)}/${pct(relationScore.metrics.f1)}. Relation matches require predicate and both participants.\n\n| Case | Industry | Pipeline | Entity recall | Relation recall | Relation FP | Calls | Cost ₽ |\n|---|---|---|---:|---:|---:|---:|---:|---:|\n${rows}\n\nEvery model-produced quote is checked against the exact stored excerpt. Full source documents are not included; source URL, publication date, printed page (where available), excerpt, and stage outputs are in results.json. Gold annotations and limitations are documented in config.json and real-scenarios.mjs.\n`
await writeFile(resolve(runDirectory,'RESULTS.md'),markdown,'utf8')
process.stdout.write(JSON.stringify({entities:{expected,found,falsePositives,falseNegatives,precision,recall,f1:report.aggregate.entityF1},relationships:relationScore.metrics},null,2)+'\n')
