import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { processDocument } from '../src/documents.mjs'
import { createEmbeddings, polzaConfigured } from '../src/polza.mjs'
import { closeT10Store, createProfile, findLexicalDocumentChunks, findSimilarDocumentChunks, initializeT10Store, listDocumentChunks, pool, saveChunkEmbeddings, saveProcessedDocument, saveSource } from '../src/store.mjs'
import { rankHybridChunks, scoreRetrievalRanking } from '../src/retrieval.mjs'
import { independentHoldoutScenarios } from './independent-holdout-scenarios.mjs'

const querySet=process.env.T10_HOLDOUT_RETRIEVAL_QUERY_SET==='hard'?'hard':'direct'
const queryModule=querySet==='hard'?await import('./independent-holdout-retrieval-hard-queries.mjs'):await import('./independent-holdout-retrieval-queries.mjs')
const independentRetrievalQueries=queryModule.independentRetrievalQueries
const runId=process.env.T10_HOLDOUT_RETRIEVAL_RUN_ID||`2026-10-17-independent-retrieval-${querySet}-v1`
const maxCostRub=Number(process.env.T10_HOLDOUT_RETRIEVAL_MAX_COST_RUB??0.15)
const outputDirectory=resolve('benchmark/runs',runId)
if(!polzaConfigured())throw new Error('Для независимого retrieval benchmark задайте POLZA_AI_API_KEY')
if(independentHoldoutScenarios.length!==30||independentRetrievalQueries.length!==30)throw new Error('Ожидалось ровно 30 holdout документов и запросов')

await initializeT10Store()
let profile
try{
  profile=await createProfile({companyName:`T10 retrieval holdout ${runId}`})
  const corpus=independentHoldoutScenarios.map(scenario=>({chunk_id:scenario.id,source_title:scenario.documentTitle,text_content:scenario.text,source_url:scenario.sourceUrl,company:scenario.company,industry:scenario.industry}))
  const sourceById=new Map()
  for(const item of corpus){
    const source=await saveSource(profile.profileId,{sourceType:'annual_report',title:item.source_title,url:item.source_url,contentText:item.text_content,contentType:'text/plain; charset=utf-8',accessLevel:'public',metadata:{benchmark:runId,scenarioId:item.chunk_id,temporary:true,primarySource:true}})
    const document=await processDocument({sourceId:source.source_id,fileName:item.source_title,contentType:'text/plain',contentText:item.text_content})
    await saveProcessedDocument(profile.profileId,source.source_id,document)
    sourceById.set(item.chunk_id,source.source_id)
  }
  const embedding=await createEmbeddings([...corpus.map(item=>`${item.source_title}\n${item.text_content}`),...independentRetrievalQueries.map(item=>item.query)])
  if(embedding.costRub!==null&&embedding.costRub>maxCostRub)throw new Error(`Embedding запрос стоил ${embedding.costRub} ₽, выше лимита ${maxCostRub} ₽; результаты не записаны.`)
  const dbChunks=await listDocumentChunks(profile.profileId)
  if(dbChunks.length!==corpus.length)throw new Error(`Ожидалось 30 индексируемых документов, найдено ${dbChunks.length}`)
  const sourceChunkByScenario=new Map(corpus.map(item=>[item.chunk_id,dbChunks.find(chunk=>chunk.source_id===sourceById.get(item.chunk_id))]))
  if([...sourceChunkByScenario.values()].some(chunk=>!chunk))throw new Error('Не удалось связать holdout-источники с их индексированными фрагментами')
  const orderedChunks=corpus.map(item=>sourceChunkByScenario.get(item.chunk_id))
  await saveChunkEmbeddings(profile.profileId,{...embedding,vectors:embedding.vectors.slice(0,corpus.length)},orderedChunks.map(chunk=>({chunkId:chunk.chunk_id})))
  const indexedChunks=await listDocumentChunks(profile.profileId)
  const results=[]
  for(const [index,item] of independentRetrievalQueries.entries()){
    const relevant=item.relevantChunkIds.map(id=>sourceChunkByScenario.get(id)?.chunk_id).filter(Boolean)
    const [vectorCandidates,lexicalCandidates]=await Promise.all([findSimilarDocumentChunks(profile.profileId,embedding.vectors[corpus.length+index],30),findLexicalDocumentChunks(profile.profileId,item.query,30)])
    const vectorRanking=vectorCandidates.map(candidate=>candidate.chunk_id)
    const lexicalRanking=lexicalCandidates.map(candidate=>candidate.chunk_id)
    const bm25Ranking=rankHybridChunks({query:item.query,chunks:indexedChunks,limit:indexedChunks.length}).map(candidate=>candidate.chunk_id)
    const hybrid=rankHybridChunks({query:item.query,chunks:indexedChunks,vectorCandidates,lexicalCandidates,limit:indexedChunks.length})
    const hybridRanking=hybrid.map(candidate=>candidate.chunk_id)
    results.push({...item,indexedRelevantChunkIds:relevant,vector:{ranking:vectorRanking,...scoreRetrievalRanking(vectorRanking,relevant)},postgresFts:{ranking:lexicalRanking,...scoreRetrievalRanking(lexicalRanking,relevant)},bm25Fallback:{ranking:bm25Ranking,...scoreRetrievalRanking(bm25Ranking,relevant)},hybrid:{ranking:hybridRanking,...scoreRetrievalRanking(hybridRanking,relevant)},topCandidates:hybrid.slice(0,5).map(({chunk_id,source_title,similarity,lexicalRank,vectorRank,matchSignals})=>({chunkId:chunk_id,sourceTitle:source_title,similarity,lexicalRank,vectorRank,matchSignals}))})
  }
  const mean=fn=>results.reduce((sum,item)=>sum+fn(item),0)/results.length
  const metrics=Object.fromEntries(['vector','postgresFts','bm25Fallback','hybrid'].map(method=>[method,{queries:results.length,recallAt5:mean(item=>item[method].recallAt[String(5)]),recallAt10:mean(item=>item[method].recallAt[String(10)]),mrr:mean(item=>item[method].reciprocalRank)}]))
  const report={runId,generatedAt:new Date().toISOString(),dataset:{queries:results.length,querySet,documents:corpus.length,sources:corpus.length,sourceSet:'independent-holdout-scenarios.mjs H01–H30; unique companies absent from R01–R16',sourceDisjointHoldout:true,independentJudgments:true},model:embedding.model,calls:1,inputTokens:embedding.inputTokens,outputTokens:embedding.outputTokens,costRub:embedding.costRub,latencyMs:embedding.latencyMs,maxCostRub,metrics,results,sourceReferences:corpus.map(({chunk_id,source_title,source_url,company,industry})=>({id:chunk_id,title:source_title,url:source_url,company,industry}))}
  await mkdir(outputDirectory,{recursive:true})
  await writeFile(resolve(outputDirectory,'config.json'),`${JSON.stringify({runId,runner:'benchmark/run-independent-retrieval-live.mjs',scenarioFile:'benchmark/independent-holdout-scenarios.mjs',queryFile:querySet==='hard'?'benchmark/independent-holdout-retrieval-hard-queries.mjs':'benchmark/independent-holdout-retrieval-queries.mjs',querySet,sourceDisjointFrom:'benchmark/real-scenarios.mjs R01–R16',labelsFrozenBeforeRun:true,temporaryProfileOnly:true,maxCostRub,metricDefinitions:{recallAt5:'share of manually relevant chunks found in first five',recallAt10:'share of manually relevant chunks found in first ten',mrr:'mean reciprocal rank of first relevant chunk'}},null,2)}\n`)
  await writeFile(resolve(outputDirectory,'results.json'),`${JSON.stringify(report,null,2)}\n`)
  const pct=value=>`${(value*100).toFixed(1)}%`
  const rows=Object.entries(metrics).map(([method,value])=>`| ${method} | ${value.queries} | ${pct(value.recallAt5)} | ${pct(value.recallAt10)} | ${pct(value.mrr)} |`).join('\n')
  const markdown=`# Independent T10 retrieval benchmark — ${runId}\n\n- ${results.length} ${querySet==='hard'?'paraphrased, harder':'direct, specific'} manually labeled queries across ${corpus.length} official source excerpts from unique companies absent from the R01–R16 regression corpus. Labels were frozen before this run.\n- Production PostgreSQL FTS, pgvector/Qwen search, lexical fallback and production hybrid fusion ran against a temporary T10 profile; it is deleted after scoring.\n- Embedding model: ${embedding.model}; one batched request, ${embedding.inputTokens} input / ${embedding.outputTokens??0} output tokens, ₽${embedding.costRub?.toFixed(6)??'unknown'}, ${embedding.latencyMs} ms.\n\n| Method | Queries | Recall@5 | Recall@10 | MRR |\n|---|---:|---:|---:|---:|\n${rows}\n\nThe 30-document corpus is source-independent but remains a small pilot, not a production-sized repository evaluation. Full query ranks and source URLs are retained in results.json.\n`
  await writeFile(resolve(outputDirectory,'RESULTS.md'),markdown)
  process.stdout.write(`${JSON.stringify({runId,documents:corpus.length,queries:results.length,model:embedding.model,inputTokens:embedding.inputTokens,costRub:embedding.costRub,latencyMs:embedding.latencyMs,metrics},null,2)}\n`)
}finally{
  if(profile){await pool.query('DELETE FROM t10.profiles WHERE profile_id=$1',[profile.profileId]).catch(()=>{});await pool.query('DELETE FROM t10.companies WHERE company_id=$1 AND NOT EXISTS (SELECT 1 FROM t10.profiles WHERE company_id=$1)',[profile.companyId]).catch(()=>{})}
  await closeT10Store()
}
