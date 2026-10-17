import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { processDocument } from '../src/documents.mjs'
import { createEmbeddings, polzaConfigured } from '../src/polza.mjs'
import { closeT10Store, createProfile, findLexicalDocumentChunks, findSimilarDocumentChunks, initializeT10Store, listDocumentChunks, pool, saveChunkEmbeddings, saveProcessedDocument, saveSource } from '../src/store.mjs'
import { rankHybridChunks, scoreRetrievalRanking } from '../src/retrieval.mjs'
import { realScenarios } from './real-scenarios.mjs'
import { retrievalQueries } from './retrieval-scenarios.mjs'

if (!polzaConfigured()) throw new Error('Для live retrieval benchmark задайте POLZA_AI_API_KEY')
const maxCostRub = Number(process.env.T10_RETRIEVAL_MAX_COST_RUB ?? 0.15)
const runId = process.env.T10_RETRIEVAL_RUN_ID ?? `2026-10-17-retrieval-32-live-v3`
const outputDirectory = resolve('benchmark/runs', runId)
const corpus = realScenarios.map((scenario) => ({
  chunk_id: scenario.id,
  source_title: scenario.documentTitle,
  text_content: scenario.text,
  source_url: scenario.sourceUrl,
  company: scenario.company,
  industry: scenario.industry,
}))
await initializeT10Store()
let profile
try {
  profile = await createProfile({ companyName: `T10 retrieval benchmark ${runId}` })
  const inputChunks = []
  for (const item of corpus) {
    const source = await saveSource(profile.profileId, { sourceType: 'annual_report', title: item.source_title, url: item.source_url, contentText: item.text_content, accessLevel: 'public', metadata: { benchmark: runId, scenarioId: item.chunk_id, temporary: true } })
    const document = await processDocument({ sourceId: source.source_id, fileName: item.source_title, contentType: 'text/plain', contentText: item.text_content })
    const saved = await saveProcessedDocument(profile.profileId, source.source_id, document)
    inputChunks.push(...document.chunks.map((chunk) => ({ ...chunk, chunkId: chunk.chunkId })))
    item._sourceId = source.source_id
    item._document = saved.document
  }

  const embedding = await createEmbeddings([...corpus.map((chunk) => `${chunk.source_title}\n${chunk.text_content}`), ...retrievalQueries.map((item) => item.query)])
  if (embedding.costRub !== null && embedding.costRub > maxCostRub) throw new Error(`Embedding запрос стоил ${embedding.costRub} ₽, выше лимита ${maxCostRub} ₽; результаты не записаны.`)
  const dbChunks = await listDocumentChunks(profile.profileId)
  if (dbChunks.length !== corpus.length || inputChunks.length !== corpus.length) throw new Error(`Ожидалось по одному индексируемому чанку на источник: DB=${dbChunks.length}, parsed=${inputChunks.length}`)
  const sourceChunkByScenario = new Map(corpus.map((item) => [item.chunk_id, dbChunks.find((chunk) => chunk.source_id === item._sourceId)]))
  if ([...sourceChunkByScenario.values()].some((chunk) => !chunk)) throw new Error('Не удалось однозначно связать эталонные источники с индексированными чанками')
  const corpusOrderedChunks = corpus.map((item) => sourceChunkByScenario.get(item.chunk_id))
  const relevantDbIds = (scenarioIds) => scenarioIds.map((scenarioId) => sourceChunkByScenario.get(scenarioId)?.chunk_id).filter(Boolean)
  await saveChunkEmbeddings(profile.profileId, { ...embedding, vectors: embedding.vectors.slice(0, corpus.length) }, corpusOrderedChunks.map((chunk) => ({ chunkId: chunk.chunk_id })))
  const indexedChunks = await listDocumentChunks(profile.profileId)
  const results = []
  for (const [queryIndex, item] of retrievalQueries.entries()) {
    const queryVector = embedding.vectors[corpus.length + queryIndex]
    const [vectorCandidates, lexicalCandidates] = await Promise.all([
      findSimilarDocumentChunks(profile.profileId, queryVector, corpus.length),
      findLexicalDocumentChunks(profile.profileId, item.query, corpus.length),
    ])
    const vectorRanking = vectorCandidates.map((candidate) => candidate.chunk_id)
    const lexicalRanking = lexicalCandidates.map((candidate) => candidate.chunk_id)
    const bm25Fallback = rankHybridChunks({ query: item.query, chunks: indexedChunks, limit: indexedChunks.length })
    const bm25Ranking = bm25Fallback.map((candidate) => candidate.chunk_id)
    const hybrid = rankHybridChunks({ query: item.query, chunks: indexedChunks, vectorCandidates, lexicalCandidates, limit: indexedChunks.length })
    const hybridRanking = hybrid.map((candidate) => candidate.chunk_id)
    results.push({
      ...item,
      indexedRelevantChunkIds: relevantDbIds(item.relevantChunkIds),
      vector: { ranking: vectorRanking, ...scoreRetrievalRanking(vectorRanking, relevantDbIds(item.relevantChunkIds)) },
      postgresFts: { ranking: lexicalRanking, ...scoreRetrievalRanking(lexicalRanking, relevantDbIds(item.relevantChunkIds)) },
      bm25Fallback: { ranking: bm25Ranking, ...scoreRetrievalRanking(bm25Ranking, relevantDbIds(item.relevantChunkIds)) },
      hybrid: { ranking: hybridRanking, ...scoreRetrievalRanking(hybridRanking, relevantDbIds(item.relevantChunkIds)) },
      topCandidates: hybrid.slice(0, 5).map(({ chunk_id, source_title, similarity, lexicalRank, vectorRank, matchSignals }) => ({ chunkId: chunk_id, sourceTitle: source_title, similarity, lexicalRank, vectorRank, matchSignals })),
    })
  }
  const average = (key) => results.reduce((sum, item) => sum + item[key].reciprocalRank, 0) / results.length
  const averageRecall = (key, k) => results.reduce((sum, item) => sum + item[key].recallAt[String(k)], 0) / results.length
  const metrics = Object.fromEntries(['vector', 'postgresFts', 'bm25Fallback', 'hybrid'].map((method) => [method, {
    recallAt5: averageRecall(method, 5), recallAt10: averageRecall(method, 10), mrr: average(method), queries: results.length,
  }]))
  const report = {
    runId, generatedAt: new Date().toISOString(),
    dataset: { queries: retrievalQueries.length, documents: corpus.length, sources: corpus.length, sourceSet: 'real-scenarios.mjs R01–R16; short excerpts from public primary sources', independentJudgments: true, sourceDisjointHoldout: false },
    model: embedding.model, calls: 1, inputTokens: embedding.inputTokens, outputTokens: embedding.outputTokens,
    costRub: embedding.costRub, latencyMs: embedding.latencyMs, maxCostRub, metrics, results,
    sourceReferences: corpus.map(({ chunk_id, source_title, source_url, company, industry }) => ({ id: chunk_id, title: source_title, url: source_url, company, industry })),
  }
  await mkdir(outputDirectory, { recursive: true })
  await writeFile(resolve(outputDirectory, 'config.json'), `${JSON.stringify({ runId, runner: 'benchmark/run-retrieval-live.mjs', queryFile: 'benchmark/retrieval-scenarios.mjs', corpusFile: 'benchmark/real-scenarios.mjs', maxCostRub, metricDefinitions: { recallAt5: 'share of manually relevant chunks present in first five results', recallAt10: 'share of manually relevant chunks present in first ten results', mrr: 'mean reciprocal rank of first manually relevant chunk' }, comparison: ['Qwen cosine via production pgvector query', 'PostgreSQL Russian+English FTS query', 'BM25 token scorer fallback', 'production reciprocal-rank fusion of FTS and Qwen results'], indexedInTemporaryProfile: true }, null, 2)}\n`)
  await writeFile(resolve(outputDirectory, 'results.json'), `${JSON.stringify(report, null, 2)}\n`)
  const percent = (value) => `${(value * 100).toFixed(1)}%`
  const table = Object.entries(metrics).map(([method, values]) => `| ${method} | ${values.queries} | ${percent(values.recallAt5)} | ${percent(values.recallAt10)} | ${percent(values.mrr)} |`).join('\n')
  const markdown = `# T10 retrieval benchmark — ${runId}\n\n- Queries: ${retrievalQueries.length}; corpus excerpts: ${corpus.length}; Qwen embedding calls: ${report.calls}.\n- Model: ${embedding.model}; token usage input/output: ${embedding.inputTokens ?? 'unknown'}/${embedding.outputTokens ?? 0}; cost: ${embedding.costRub === null ? 'not reported' : `${embedding.costRub.toFixed(6)} ₽`}; embedding latency: ${embedding.latencyMs} ms.\n- PostgreSQL FTS, pgvector and the production fusion code were exercised against chunks in a temporary T10 profile, which was deleted after scoring. Query-to-source labels were written before ranking. The set reuses R01–R16 excerpts, so this is an independent retrieval task but **not a source-disjoint holdout**.\n\n| Method | Queries | Recall@5 | Recall@10 | MRR |\n|---|---:|---:|---:|---:|\n${table}\n\nEach query has ${retrievalQueries[0].relevantChunkIds.length} manually relevant source excerpt; the small 16-item corpus makes Recall@10 uninformative. Candidate ranks and source URLs are retained in results.json.\n`
  await writeFile(resolve(outputDirectory, 'RESULTS.md'), markdown)
  process.stdout.write(`${JSON.stringify({ runId, queries: results.length, documents: corpus.length, model: embedding.model, tokens: embedding.inputTokens, costRub: embedding.costRub, latencyMs: embedding.latencyMs, metrics }, null, 2)}\n`)
} finally {
  if (profile) {
    await pool.query('DELETE FROM t10.profiles WHERE profile_id=$1', [profile.profileId]).catch(() => {})
    await pool.query('DELETE FROM t10.companies WHERE company_id=$1 AND NOT EXISTS (SELECT 1 FROM t10.profiles WHERE company_id=$1)', [profile.companyId]).catch(() => {})
  }
  await closeT10Store()
}
