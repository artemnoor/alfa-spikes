import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { extractRelationshipsFromChunks } from '../src/relationships.mjs'
import { verifyRelationshipSemantics } from '../src/semantic-evidence.mjs'
import { verifyBatch } from '../src/evidence.mjs'
import { polzaConfigured } from '../src/polza.mjs'
import { contextLiveScenarios } from './context-live-scenarios.mjs'

if(!polzaConfigured())throw new Error('Для live B06 context benchmark задайте POLZA_AI_API_KEY')
const runId=process.env.T10_CONTEXT_RUN_ID||'2026-10-17-b06-context-live-v1'
const maxCostRub=Number(process.env.T10_CONTEXT_MAX_COST_RUB??0.15)
let calls=0,inputTokens=0,outputTokens=0,costRub=0,failedCalls=0
const cases=[]
for(const scenario of contextLiveScenarios){
  const b06=await extractRelationshipsFromChunks(scenario.chunks,scenario.entities,{batchSize:3})
  const proposals=b06.relationships.map((item)=>({...item,subject:{type:item.sourceType,name:item.sourceName,resolution:item.sourceResolution},object:{type:item.targetType,name:item.targetName,resolution:item.targetResolution}}))
  const verification=await verifyRelationshipSemantics(proposals,(sourceId)=>sourceId===scenario.chunks[0].source_id?{content_text:scenario.sourceText}:null)
  const b07=verifyBatch(verification.accepted,(sourceId)=>sourceId===scenario.chunks[0].source_id?{source_id:sourceId,content_text:scenario.sourceText,source_status:'processed',access_level:'public'}:null)
  const usage=[...b06.modelCalls,...(verification.modelCall?[verification.modelCall]:[])]
  for(const item of usage){calls+=item.status==='failed'?1:1;failedCalls+=item.status==='failed'?1:0;inputTokens+=Number(item.inputTokens??0);outputTokens+=Number(item.outputTokens??0);costRub+=Number(item.costRub??0)}
  const supported=new Set(b07.accepted.map((item)=>[item.sourceId,item.predicate,item.sourceName,item.targetName,item.quote].join('|')))
  const final=proposals.filter((item)=>supported.has([item.sourceId,item.predicate,item.sourceName,item.targetName,item.quote].join('|')))
  const expected=scenario.expected
  const matched=expected?final.some((item)=>item.predicate===expected.predicate&&item.sourceName===expected.sourceName&&item.targetName===expected.targetName):false
  const accepted=final.length>0
  cases.push({id:scenario.id,family:scenario.family,expectedSupported:scenario.expectedSupported,accepted,pass:accepted===scenario.expectedSupported,matched,expected:expected??null,entities:b06.recoveredEntities,relationships:b06.relationships,semanticRejected:verification.rejected.map((item)=>({sourceId:item.sourceId,reason:item.reason,code:item.code})),deterministicRejected:b07.rejected.map((item)=>({sourceId:item.sourceId,reason:item.reason,errors:item.errors})),calls:usage.map((item)=>({model:item.model,status:item.status??'completed',inputTokens:item.inputTokens??null,outputTokens:item.outputTokens??null,costRub:item.costRub??null,latencyMs:item.latencyMs??null})),recovery:b06.recovery})
  if(costRub>maxCostRub)throw new Error(`Превышен лимит ${maxCostRub} ₽ после ${scenario.id}; результат не записан.`)
}
const tp=cases.filter((item)=>item.expectedSupported&&item.accepted).length
const fp=cases.filter((item)=>!item.expectedSupported&&item.accepted).length
const fn=cases.filter((item)=>item.expectedSupported&&!item.accepted).length
const tn=cases.filter((item)=>!item.expectedSupported&&!item.accepted).length
const report={runId,testedAt:new Date().toISOString(),datasetType:'three frozen targeted live cases for B06 document context and exact quoted-participant recovery',models:{extractor:process.env.T10_DEEPSEEK_MODEL||'deepseek/deepseek-v4-flash',semanticReviewer:process.env.T10_DEEPSEEK_MODEL||'deepseek/deepseek-v4-flash'},maxCostRub,metrics:{n:cases.length,tp,fp,fn,tn,accuracy:(tp+tn)/cases.length,falseAcceptanceRate:fp/Math.max(1,cases.filter((item)=>!item.expectedSupported).length)},usage:{calls,failedCalls,inputTokens,outputTokens,costRub,meanLatencyMs:cases.flatMap((item)=>item.calls.map((call)=>call.latencyMs??0)).reduce((a,b)=>a+b,0)/Math.max(1,cases.flatMap((item)=>item.calls).length)},cases}
const directory=resolve('benchmark/runs',runId)
await mkdir(directory,{recursive:true})
await writeFile(resolve(directory,'config.json'),`${JSON.stringify({runId,runner:'benchmark/run-context-live.mjs',scenarioFile:'benchmark/context-live-scenarios.mjs',scenarioCount:contextLiveScenarios.length,labelsFrozenBeforeRun:true,oneAmbiguousNegativeControl:true,maxCostRub,scoring:'acceptance after B06 quote/type checks and B07 semantic gate'},null,2)}\n`)
await writeFile(resolve(directory,'results.json'),`${JSON.stringify(report,null,2)}\n`)
const rows=cases.map((item)=>`| ${item.id} | ${item.family} | ${item.expectedSupported?'SUPPORTED':'reject'} | ${item.accepted?'accepted':'rejected'} | ${item.pass?'pass':'FAIL'} |`).join('\n')
const markdown=`# T10 live B06 context and participant-recovery probe — ${runId}\n\n- ${cases.length} frozen targeted cases, including one ambiguous-company negative control.\n- Models: DeepSeek=${report.models.extractor}; B07 reviewer=${report.models.semanticReviewer}.\n- TP/FP/FN/TN: ${tp}/${fp}/${fn}/${tn}; accuracy ${(report.metrics.accuracy*100).toFixed(1)}%; false acceptance ${(report.metrics.falseAcceptanceRate*100).toFixed(1)}%.\n- Calls ${calls} (${failedCalls} failed), tokens ${inputTokens}/${outputTokens}, cost ₽${costRub.toFixed(6)}.\n- This targeted live probe validates behavior only for these three cases; it is not a general extraction-quality estimate.\n\n| Case | Scenario | Gold | Final | Result |\n|---|---|---|---|---|\n${rows}\n\nFull quotes, recovered entities, model calls and rejection reasons are in results.json.\n`
await writeFile(resolve(directory,'RESULTS.md'),markdown)
process.stdout.write(`${JSON.stringify({runId,metrics:report.metrics,usage:report.usage},null,2)}\n`)
