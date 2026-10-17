import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { closeT10Store, createProfile, initializeT10Store, pool, saveSource } from '../src/store.mjs'
import { processCompanyProfile } from '../src/pipeline.mjs'
import { polzaConfigured } from '../src/polza.mjs'
import { independentHoldoutScenarios } from './independent-holdout-scenarios.mjs'

const runId=process.env.T10_HOLDOUT_RUN_ID||'2026-10-17-independent-holdout-live-v1'
const benchmarkId='T10-independent-holdout-2026-10'
const outputDirectory=resolve('benchmark/runs',runId)
const maxCostRub=Number(process.env.T10_HOLDOUT_MAX_COST_RUB??1.5)
if(!polzaConfigured())throw new Error('Для live holdout задайте POLZA_AI_API_KEY')
if(independentHoldoutScenarios.length<30)throw new Error(`Holdout должен содержать не менее 30 кейсов; найдено ${independentHoldoutScenarios.length}`)

const normalize=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('en-US').replace(/[«»“”„‟"'`.,;:()[\]{}]+/gu,' ').replace(/\s+/gu,' ').trim()
const strictNameMatch=(actual,expected)=>Boolean(normalize(actual)&&normalize(actual)===normalize(expected))
const percentile95=values=>{if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.ceil(sorted.length*.95)-1]}

await mkdir(outputDirectory,{recursive:true})
await initializeT10Store()
const cases=[]
const callLatencies=[]
let totalCalls=0,totalFailedCalls=0,totalInputTokens=0,totalOutputTokens=0,totalCostRub=0
try{
  for(const [caseIndex,scenario] of independentHoldoutScenarios.entries()){
    const created=await createProfile({companyName:scenario.company,profileName:`T10 frozen holdout ${scenario.id} — ${scenario.industry}`})
    try{
      await saveSource(created.profileId,{sourceType:'annual_report',title:scenario.documentTitle,url:scenario.sourceUrl,contentText:scenario.text,contentType:'text/plain; charset=utf-8',accessLevel:'public',metadata:{benchmark:benchmarkId,scenarioId:scenario.id,publishedAt:scenario.publicationDate,sourceLanguage:scenario.language,sourcePage:scenario.page,primarySource:true,holdout:true}})
      const result=await processCompanyProfile(created.profileId,{trigger:'manual',benchmark:benchmarkId,scenarioId:scenario.id})
      const entityOutput=result.stages.find(stage=>stage.blockId==='B04')?.output??{}
      const relationOutput=result.stages.find(stage=>stage.blockId==='B07')?.output??{}
      const entities=entityOutput.entities??[]
      const actualEntities=entities.map(entity=>({type:entity.type??entity.entity_type,name:entity.canonical_name??entity.name}))
      const expectedEntities=scenario.expectedEntities.map(expected=>{
        const match=actualEntities.find(actual=>actual.type===expected.type&&strictNameMatch(actual.name,expected.name))
        return {...expected,found:Boolean(match)}
      })
      const accepted=relationOutput.accepted??[]
      const actualRelationships=accepted.map(item=>({predicate:item.proposal?.predicate??item.predicate,source:item.proposal?.sourceName??item.proposal?.subject?.name??item.sourceName,target:item.proposal?.targetName??item.proposal?.object?.name??item.targetName,status:item.proposal?.status??item.status,quote:item.proposal?.quote??item.quote}))
      const expectedRelationships=scenario.expectedRelationships.map(expected=>{
        const found=actualRelationships.find(actual=>actual.predicate===expected.predicate&&strictNameMatch(actual.source,expected.source)&&strictNameMatch(actual.target,expected.target))
        return {...expected,found:Boolean(found),predictedStatus:found?.status??null,statusCorrect:Boolean(found&&found.status===expected.status)}
      })
      const matchedActuals=new Set(expectedRelationships.filter(item=>item.found).map(item=>actualRelationships.findIndex(actual=>actual.predicate===item.predicate&&strictNameMatch(actual.source,item.source)&&strictNameMatch(actual.target,item.target))))
      const unexpectedRelationships=actualRelationships.filter((_,index)=>!matchedActuals.has(index))
      const usage={calls:Number(result.metrics.calls??0),failedCalls:Number(result.metrics.failed_calls??0),inputTokens:Number(result.metrics.input_tokens??0),outputTokens:Number(result.metrics.output_tokens??0),costRub:Number(result.metrics.reported_cost_rub??0),latencyMs:Number(result.metrics.total_latency_ms??0)}
      const latencyRows=await pool.query('SELECT latency_ms FROM t10.model_calls WHERE run_id=$1 AND latency_ms IS NOT NULL',[result.run.run_id])
      callLatencies.push(...latencyRows.rows.map(row=>Number(row.latency_ms)))
      totalCalls+=usage.calls;totalFailedCalls+=usage.failedCalls;totalInputTokens+=usage.inputTokens;totalOutputTokens+=usage.outputTokens;totalCostRub+=usage.costRub
      const item={scenarioId:scenario.id,industry:scenario.industry,language:scenario.language,status:result.run.status,source:{title:scenario.documentTitle,url:scenario.sourceUrl,publicationDate:scenario.publicationDate,excerpt:scenario.text},stages:result.stages.map(({blockId,status,errors})=>({blockId,status,errors})),entities:actualEntities,expectedEntities,relationships:actualRelationships,expectedRelationships,unexpectedRelationships,usage}
      cases.push(item)
      process.stdout.write(`Completed ${caseIndex+1}/${independentHoldoutScenarios.length}: ${scenario.id}; run=${result.run.status}; spend=${totalCostRub.toFixed(4)} RUB\n`)
      await writeFile(resolve(outputDirectory,'checkpoint.json'),`${JSON.stringify({runId,benchmarkId,savedAt:new Date().toISOString(),completedCases:cases},null,2)}\n`,'utf8')
    }finally{
      await pool.query('DELETE FROM t10.profiles WHERE profile_id=$1',[created.profileId]).catch(()=>{})
      await pool.query('DELETE FROM t10.companies WHERE company_id=$1 AND NOT EXISTS (SELECT 1 FROM t10.profiles WHERE company_id=$1)',[created.companyId]).catch(()=>{})
    }
    if(totalCostRub>maxCostRub){process.stdout.write(`Stopping after completed case at configured spend ceiling ${maxCostRub} RUB.\n`);break}
  }
}finally{await closeT10Store()}

let entityTP=0,entityFP=0,entityFN=0,relationTP=0,relationFP=0,relationFN=0,statusCorrect=0,statusChecked=0,directionCorrect=0,directionChecked=0
for(const item of cases){
  entityTP+=item.expectedEntities.filter(entity=>entity.found).length
  entityFN+=item.expectedEntities.filter(entity=>!entity.found).length
  entityFP+=item.entities.filter(actual=>!item.expectedEntities.some(expected=>expected.type===actual.type&&strictNameMatch(actual.name,expected.name))).length
  relationTP+=item.expectedRelationships.filter(relation=>relation.found).length
  relationFN+=item.expectedRelationships.filter(relation=>!relation.found).length
  relationFP+=item.unexpectedRelationships.length
  statusCorrect+=item.expectedRelationships.filter(relation=>relation.statusCorrect).length
  statusChecked+=item.expectedRelationships.filter(relation=>relation.found).length
  for(const expected of item.expectedRelationships){
    const candidates=item.relationships.filter(actual=>actual.predicate===expected.predicate&&((strictNameMatch(actual.source,expected.source)&&strictNameMatch(actual.target,expected.target))||(strictNameMatch(actual.source,expected.target)&&strictNameMatch(actual.target,expected.source))))
    if(candidates.length){directionChecked+=1;if(candidates.some(actual=>strictNameMatch(actual.source,expected.source)&&strictNameMatch(actual.target,expected.target)))directionCorrect+=1}
  }
}
const ratio=(a,b)=>b?a/b:null
const precision=ratio(entityTP,entityTP+entityFP),recall=ratio(entityTP,entityTP+entityFN)
const relationPrecision=ratio(relationTP,relationTP+relationFP),relationRecall=ratio(relationTP,relationTP+relationFN)
const aggregate={cases:cases.length,calls:totalCalls,failedCalls:totalFailedCalls,inputTokens:totalInputTokens,outputTokens:totalOutputTokens,reportedCostRub:totalCostRub,meanModelCallLatencyMs:callLatencies.length?callLatencies.reduce((sum,value)=>sum+value,0)/callLatencies.length:null,p95ModelCallLatencyMs:percentile95(callLatencies),modelLatencySamples:callLatencies.length,entity:{tp:entityTP,fp:entityFP,fn:entityFN,precision,recall,f1:precision!==null&&recall!==null&&precision+recall?2*precision*recall/(precision+recall):null},relationship:{tp:relationTP,fp:relationFP,fn:relationFN,precision:relationPrecision,recall:relationRecall,f1:relationPrecision!==null&&relationRecall!==null&&relationPrecision+relationRecall?2*relationPrecision*relationRecall/(relationPrecision+relationRecall):null,directionAccuracy:ratio(directionCorrect,directionChecked),directionChecked,statusAccuracy:ratio(statusCorrect,statusChecked),statusChecked}}
const report={runId,benchmarkId,testedAt:new Date().toISOString(),datasetType:'frozen source-disjoint holdout; 30 manually labeled passages from official primary-source filings and annual reports; labels were not used to tune prompts or retrieval',scoring:'strict normalized exact label match; no substring or partial-name match',models:{extractor:process.env.T10_DEEPSEEK_MODEL||'deepseek/deepseek-v4-flash',matcher:process.env.T10_MATCH_MODEL||'typesafe/jev',embeddings:process.env.T10_EMBEDDING_MODEL||'qwen/qwen3-embedding-8b'},maxCostRub,aggregate,cases}
await writeFile(resolve(outputDirectory,'config.json'),`${JSON.stringify({runId,benchmarkId,datasetType:report.datasetType,scenarioFile:'benchmark/independent-holdout-scenarios.mjs',scenarioCount:independentHoldoutScenarios.length,completedCases:cases.length,maxCostRub,scoring:report.scoring,labelsFrozenBeforeLiveRun:true,promptOrRetrievalTuningOnHoldout:false,codeRevisionForV2WasDevelopedOn:'R04–R16 regression set',labelsEditedAfterV1:false,cleanup:'temporary profiles and orphan companies deleted after each case'},null,2)}\n`,'utf8')
await writeFile(resolve(outputDirectory,'results.json'),`${JSON.stringify(report,null,2)}\n`,'utf8')
const pct=value=>value===null?'n/a':`${(value*100).toFixed(1)}%`
const table=cases.map(item=>`| ${item.scenarioId} | ${item.industry} | ${item.expectedEntities.filter(value=>value.found).length}/${item.expectedEntities.length} | ${item.expectedRelationships.filter(value=>value.found).length}/${item.expectedRelationships.length} | ${item.unexpectedRelationships.length} | ${item.usage.calls} | ${item.usage.costRub.toFixed(6)} |`).join('\n')
const markdown=`# T10 independent real-source holdout — ${runId}\n\n- Dataset: ${report.datasetType}. Gold labels were frozen before the live run; the prompt and retrieval code were not tuned on these cases.\n- Scoring: ${report.scoring}. Relationships are ordered subject-predicate-object triples; reversed direction is not counted as a match.\n- Models: DeepSeek=${report.models.extractor}; JEV=${report.models.matcher}; embeddings=${report.models.embeddings}.\n- Calls: ${aggregate.calls} (${aggregate.failedCalls} failed); tokens in/out: ${aggregate.inputTokens}/${aggregate.outputTokens}; reported spend: ₽${aggregate.reportedCostRub.toFixed(6)}.\n- Model-call latency: mean ${aggregate.meanModelCallLatencyMs?.toFixed(0)??'n/a'} ms, P95 ${aggregate.p95ModelCallLatencyMs??'n/a'} ms across ${aggregate.modelLatencySamples} recorded calls.\n- Entities TP/FP/FN: ${entityTP}/${entityFP}/${entityFN}; precision/recall/F1 ${pct(precision)}/${pct(recall)}/${pct(aggregate.entity.f1)}.\n- Exact directed relations TP/FP/FN: ${relationTP}/${relationFP}/${relationFN}; precision/recall/F1 ${pct(relationPrecision)}/${pct(relationRecall)}/${pct(aggregate.relationship.f1)}. Direction accuracy ${pct(aggregate.relationship.directionAccuracy)} (${directionChecked} comparable cases); status accuracy ${pct(aggregate.relationship.statusAccuracy)} (${statusChecked} exact triples).\n\n| Case | Industry | Entity hits | Relation hits | Relation FP | Calls | Cost ₽ |\n|---|---|---:|---:|---:|---:|---:|\n${table}\n\nFull source URLs, passages, predictions and labels are in results.json. This holdout is independent by source/company from R01–R16, but one small 30-case evaluation does not establish target quality or production readiness.\n`
await writeFile(resolve(outputDirectory,'RESULTS.md'),markdown,'utf8')
process.stdout.write(`${JSON.stringify({runId,completedCases:cases.length,aggregate},null,2)}\n`)
