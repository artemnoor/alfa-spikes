import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createProfile, initializeT10Store, saveSource, closeT10Store } from '../src/store.mjs'
import { processCompanyProfile } from '../src/pipeline.mjs'
import { realScenarios } from './real-scenarios.mjs'
import { scoreLiveRelationTriples } from './live-expected-relations.mjs'

const directory=dirname(fileURLToPath(import.meta.url))
const outputDirectory=resolve(directory,'runs',process.env.T10_REAL_BENCHMARK_RUN_ID||'2026-10-17-real-3-case-v1')
const normalize=(value)=>String(value??'').normalize('NFKC').toLocaleLowerCase('ru-RU').replace(/[«»“”„‟"'`.,;:()[\]{}]+/gu,' ').replace(/\s+/gu,' ').trim()
const contains=(actual,expected)=>{const a=normalize(actual),e=normalize(expected);return Boolean(a&&e&&(a.includes(e)||e.includes(a)))}
if(!(process.env.POLZA_AI_API_KEY||process.env.POLZA_API_KEY))throw new Error('Для real benchmark задайте POLZA_AI_API_KEY')
await initializeT10Store()
const cases=[]
const startIndex=Math.max(0,Number(process.env.T10_REAL_SCENARIO_START||0))
const scenarios=realScenarios.slice(startIndex)
if(!scenarios.length)throw new Error(`No real scenarios at start index ${startIndex}`)
const benchmarkId=process.env.T10_REAL_BENCHMARK_ID||`T10-real-${scenarios.length}-v1`
try {
  for(const [index,scenario] of scenarios.entries()){
    const created=await createProfile({companyName:scenario.company,profileName:`T10 live ${scenario.id} — ${scenario.industry}`})
    await saveSource(created.profileId,{sourceType:'annual_report',title:scenario.documentTitle,url:scenario.sourceUrl,contentText:scenario.text,contentType:'text/plain; charset=utf-8',accessLevel:'public',metadata:{benchmark:`T10-real-${scenarios.length}-v1`,scenarioId:scenario.id,publishedAt:scenario.publicationDate,sourceLanguage:scenario.language,sourcePage:scenario.page,primarySource:true}})
    const result=await processCompanyProfile(created.profileId,{trigger:'manual',benchmark:`T10-real-${scenarios.length}-v1`,scenarioId:scenario.id})
    const entities=result.stages.find((stage)=>stage.blockId==='B04')?.output?.entities??[]
    const claims=result.stages.find((stage)=>stage.blockId==='B07')?.output?.accepted??[]
    const relationships=claims.map((item)=>({predicate:item.proposal?.predicate??item.predicate,subject:item.proposal?.sourceName??item.proposal?.subject?.name??item.sourceName,object:item.proposal?.targetName??item.proposal?.object?.name??item.targetName,quote:item.proposal?.quote??item.quote}))
    const normalizedEntities=entities.map((entity)=>({type:entity.type??entity.entity_type,name:entity.canonical_name??entity.name}))
    const matchedEntities=new Set()
    const expectedEntities=scenario.expectedEntities.map((expected)=>{
      const index=normalizedEntities.findIndex((actual,i)=>!matchedEntities.has(i)&&actual.type===expected.type&&contains(actual.name,expected.name))
      const found=index>=0
      if(found)matchedEntities.add(index)
      return {...expected,found}
    })
    cases.push({scenarioId:scenario.id,industry:scenario.industry,language:scenario.language,profileId:created.profileId,runId:result.run.run_id,status:result.run.status,source:{title:scenario.documentTitle,url:scenario.sourceUrl,publicationDate:scenario.publicationDate,printedPage:scenario.page,excerpt:scenario.text},stages:result.stages.map(({blockId,status,errors})=>({blockId,status,errors})),stageOutputs:Object.fromEntries(result.stages.map(({blockId,input,output,errors})=>[blockId,{input,output,errors}])),entities:normalizedEntities,expectedEntities,relationships,expectedRelationTriples:scenario.expectedRelationships,usage:result.metrics,profile:result.profile,expectedUnknowns:scenario.expectedUnknowns})
    process.stdout.write(`Completed ${index+1}/${scenarios.length}: ${scenario.id}; status=${result.run.status}; calls=${result.metrics.calls}; cost=${result.metrics.reported_cost_rub??'unknown'} RUB\n`)
  }
} finally { await closeT10Store() }
const relationScore=scoreLiveRelationTriples(cases)
cases.splice(0,cases.length,...relationScore.cases)
const aggregate=cases.reduce((total,item)=>{
  total.calls+=Number(item.usage.calls??0);total.failedCalls+=Number(item.usage.failed_calls??0);total.inputTokens+=Number(item.usage.input_tokens??0);total.outputTokens+=Number(item.usage.output_tokens??0);total.reportedCostRub+=Number(item.usage.reported_cost_rub??0);total.latencyMs+=Number(item.usage.total_latency_ms??0)
  total.entitiesExpected+=item.expectedEntities.length;total.entitiesFound+=item.expectedEntities.filter((value)=>value.found).length
  total.entityFalsePositives+=item.entities.filter((actual)=>!item.expectedEntities.some((expected)=>expected.type===actual.type&&contains(actual.name,expected.name))).length
  return total
},{calls:0,failedCalls:0,inputTokens:0,outputTokens:0,reportedCostRub:0,latencyMs:0,entitiesExpected:0,entitiesFound:0,entityFalsePositives:0})
aggregate.entityFalseNegatives=aggregate.entitiesExpected-aggregate.entitiesFound
aggregate.entityPrecision=aggregate.entitiesFound+aggregate.entityFalsePositives?aggregate.entitiesFound/(aggregate.entitiesFound+aggregate.entityFalsePositives):null
aggregate.entityRecall=aggregate.entitiesExpected?aggregate.entitiesFound/aggregate.entitiesExpected:null
aggregate.entityF1=aggregate.entityPrecision!==null&&aggregate.entityRecall!==null&&aggregate.entityPrecision+aggregate.entityRecall?2*aggregate.entityPrecision*aggregate.entityRecall/(aggregate.entityPrecision+aggregate.entityRecall):null
aggregate.relationships=relationScore.metrics
const report={benchmark:benchmarkId,testedAt:new Date().toISOString(),datasetType:'real company reports; open primary sources; manually annotated excerpts',models:{extractor:process.env.T10_DEEPSEEK_MODEL||'deepseek/deepseek-v4-flash',matcher:process.env.T10_MATCH_MODEL||'typesafe/jev',embeddings:process.env.T10_EMBEDDING_MODEL||'qwen/qwen3-embedding-8b'},aggregate,cases}
const config={benchmarkId:report.benchmark,scenarioCount:scenarios.length,startIndex,datasetType:report.datasetType,scenarioFile:'real-scenarios.mjs',runner:'benchmark/run-real-live.mjs',annotation:'manual entity types and subject-predicate-object triples',allTextExcerptsUnder25WordsPerSource:true,models:report.models}
await mkdir(outputDirectory,{recursive:true})
await writeFile(resolve(outputDirectory,'config.json'),`${JSON.stringify(config,null,2)}\n`,'utf8')
await writeFile(resolve(outputDirectory,'results.json'),`${JSON.stringify(report,null,2)}\n`,'utf8')
const pct=value=>value===null?'n/a':`${(value*100).toFixed(1)}%`
const rows=cases.map(item=>`| ${item.scenarioId} | ${item.industry} | ${item.status} | ${item.expectedEntities.filter(x=>x.found).length}/${item.expectedEntities.length} | ${item.expectedRelationships.filter(x=>x.found).length}/${item.expectedRelationships.length} | ${item.unexpectedRelationships.length} | ${item.usage.calls} | ${Number(item.usage.reported_cost_rub??0).toFixed(6)} |`).join('\n')
const markdown=`# ${report.benchmark}\n\n- Run: ${report.testedAt}\n- ${report.datasetType}. The report covers ${cases.length} cases; this is a limited pilot, not a general accuracy estimate.\n- Model calls: ${aggregate.calls} (${aggregate.failedCalls} failed); input/output tokens: ${aggregate.inputTokens}/${aggregate.outputTokens}; reported cost: ${aggregate.reportedCostRub.toFixed(6)} ₽; total latency: ${aggregate.latencyMs} ms.\n- Entity TP/FP/FN: ${aggregate.entitiesFound}/${aggregate.entityFalsePositives}/${aggregate.entityFalseNegatives}; precision/recall/F1: ${pct(aggregate.entityPrecision)}/${pct(aggregate.entityRecall)}/${pct(aggregate.entityF1)}.\n- Relation TP/FP/FN: ${aggregate.relationships.truePositive}/${aggregate.relationships.falsePositive}/${aggregate.relationships.falseNegative}; precision/recall/F1: ${pct(aggregate.relationships.precision)}/${pct(aggregate.relationships.recall)}/${pct(aggregate.relationships.f1)}. Relation matches require predicate and both participants.\n\n| Case | Industry | Pipeline | Entity recall | Relation recall | Relation FP | Calls | Cost ₽ |\n|---|---|---|---:|---:|---:|---:|---:|\n${rows}\n\nEvery model-produced quote is checked against the exact excerpt. Full raw reports are not included; source URLs, dates, short excerpts and stage outputs are stored in results.json. Metrics are small-sample only.\n`
await writeFile(resolve(outputDirectory,'RESULTS.md'),markdown,'utf8')
process.stdout.write(`Saved ${cases.length} real-source cases to ${outputDirectory}\n`)
