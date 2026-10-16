import { createServer } from 'node:http'
import { beginStageRun, failStageRun, finishStageRun, hasNews, persistEventDecision, saveNews } from '../../pipeline/store.mjs'
import { findTopSimilarNews, getBlockWeights, getPgVectorStatus, initializePgVector, saveNewsEmbeddings } from './pg-store.mjs'
import { classifyEventRelation } from './deduplication.mjs'

const port = Number(process.env.PORT || 8092)
const model = process.env.POLZA_EMBEDDING_MODEL || 'qwen/qwen3-embedding-8b'
const apiKey = process.env.POLZA_AI_API_KEY || process.env.POLZA_API_KEY || ''
const maxBodyBytes = 512 * 1024
const expectedKeys = ['topic', 'event', 'entities', 'genre']
let pgVectorReady = false

function sumTokens(values) {
  if (values.some((value) => !Number.isFinite(value))) return null
  return values.reduce((sum, value) => sum + value, 0)
}

function embeddingsUrl() {
  const base = (process.env.POLZA_API_BASE_URL || 'https://polza.ai/api').replace(/\/+$/, '')
  if (base.endsWith('/embeddings')) return base
  if (base.endsWith('/v1')) return `${base}/embeddings`
  return `${base}/v1/embeddings`
}

function send(response, statusCode, body) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization',
  })
  response.end(JSON.stringify(body))
}

async function readJson(request) {
  const chunks = []
  let length = 0
  for await (const chunk of request) {
    length += chunk.length
    if (length > maxBodyBytes) {
      const error = new Error('Размер запроса превышает 512 КБ')
      error.statusCode = 413
      throw error
    }
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    const error = new Error('Некорректный JSON')
    error.statusCode = 400
    throw error
  }
}

function validateBlocks(blocks) {
  if (!Array.isArray(blocks) || blocks.length !== expectedKeys.length) {
    throw Object.assign(new Error('Нужно передать ровно четыре блока T08'), { statusCode: 400 })
  }
  const keys = blocks.map((block) => block?.key)
  if (expectedKeys.some((key) => keys.filter((candidate) => candidate === key).length !== 1)) {
    throw Object.assign(new Error('Блоки должны содержать тему, событие, сущности и характер'), { statusCode: 400 })
  }
  for (const block of blocks) {
    if (typeof block.text !== 'string' || !block.text.trim() || block.text.length > 30_000) {
      throw Object.assign(new Error('Каждый блок должен содержать текст до 30 000 символов'), { statusCode: 400 })
    }
    if (typeof block.label !== 'string' || block.label.length > 100) {
      throw Object.assign(new Error('Некорректное название блока'), { statusCode: 400 })
    }
  }
  return expectedKeys.map((key) => blocks.find((block) => block.key === key))
}

function normalizeEmbeddings(data, blocks) {
  if (!Array.isArray(data) || data.length !== blocks.length) {
    throw new Error('Провайдер вернул неполный набор векторов')
  }
  const ordered = new Array(blocks.length)
  for (const [fallbackIndex, row] of data.entries()) {
    const index = Number.isInteger(row?.index) ? row.index : fallbackIndex
    if (index < 0 || index >= blocks.length || ordered[index]) throw new Error('Провайдер вернул некорректный порядок векторов')
    const embedding = row?.embedding
    if (!Array.isArray(embedding) || embedding.length === 0 || embedding.some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
      throw new Error('Провайдер вернул некорректный вектор')
    }
    ordered[index] = embedding
  }
  const dimensions = ordered[0]?.length
  if (!dimensions || ordered.some((embedding) => !embedding || embedding.length !== dimensions)) {
    throw new Error('Размеры векторов не совпадают')
  }
  return ordered.map((embedding, index) => ({
    ...blocks[index],
    dimensions,
    preview: embedding.slice(0, 8).map((value) => Number(value.toFixed(6))),
    embedding,
  }))
}

async function vectorize(blocks) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90_000)
  try {
    const upstream = await fetch(embeddingsUrl(), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model, input: blocks.map((block) => block.text) }),
      signal: controller.signal,
    })
    const payload = await upstream.json().catch(() => null)
    if (!upstream.ok) {
      const detail = typeof payload?.error?.message === 'string' ? payload.error.message : ''
      const error = new Error(detail ? `Polza AI: ${detail.slice(0, 400)}` : `Polza AI вернула HTTP ${upstream.status}`)
      error.statusCode = 502
      throw error
    }
    const resultBlocks = normalizeEmbeddings(payload?.data, blocks)
    return {
      status: 'success',
      provider: 'Polza AI',
      model: payload?.model || model,
      calls: 1,
      inputTokens: Number.isFinite(payload?.usage?.prompt_tokens)
        ? payload.usage.prompt_tokens
        : Number.isFinite(payload?.usage?.total_tokens) ? payload.usage.total_tokens : null,
      dimensions: resultBlocks[0].dimensions,
      blocks: resultBlocks,
    }
  } finally {
    clearTimeout(timeout)
  }
}

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return send(response, 204, {})

  if (request.method === 'GET' && request.url === '/health') {
    let pgvector = { ready: pgVectorReady, dimensions: 4096, news_count: 0, indexed_news_count: 0 }
    if (pgVectorReady) {
      try { pgvector = await getPgVectorStatus() } catch { pgVectorReady = false; pgvector = { ...pgvector, ready: false } }
    }
    return send(response, 200, {
      ok: Boolean(apiKey) && pgvector.ready,
      configured: Boolean(apiKey),
      provider: 'Polza AI',
      model,
      pgvector,
      blockWeights: getBlockWeights(),
    })
  }

  if (request.method !== 'POST' || request.url !== '/vectorize') {
    return send(response, 404, { error: 'not found' })
  }
  if (!apiKey) return send(response, 503, { error: 'Не задан ключ POLZA_AI_API_KEY' })
  if (!pgVectorReady) return send(response, 503, { error: 'PostgreSQL с pgvector пока не готов' })

  try {
    const body = await readJson(request)
    const blocks = validateBlocks(body?.blocks)
    const articleTitle = body?.title || blocks[0].text.match(/^Новость:\s*(.+)$/m)?.[1]?.trim() || 'Новость без заголовка'
    const articleContent = body?.content || blocks.map((block) => `${block.label}: ${block.text}`).join('\n\n')
    const sourceKind = body?.sourceKind || 't08_classification'
    let newsId = body?.newsId
    if (!newsId) {
      newsId = saveNews({
        title: articleTitle,
        content: articleContent,
        publicationDate: body?.publicationDate,
        sourceKind,
      })
    } else if (body?.title || body?.content) {
      saveNews({
        id: newsId,
        title: articleTitle,
        content: articleContent,
        publicationDate: body?.publicationDate,
        sourceKind,
      })
    } else if (!hasNews(newsId)) {
      newsId = saveNews({ id: newsId, title: 'Новость, импортированная через T09', content: blocks.map((block) => `${block.label}: ${block.text}`).join('\n\n'), sourceKind: 't09_unlinked' })
    }
    const stageRunId = beginStageRun({
      newsId,
      stage: 'T09',
      input: { blocks },
      provider: 'Polza AI',
      model,
    })
    try {
      const result = await vectorize(blocks)
      await saveNewsEmbeddings({
        newsId,
        title: articleTitle,
        content: articleContent,
        publicationDate: body?.publicationDate,
        sourceKind,
        model: result.model,
        blocks: result.blocks,
      })
      const candidates = await findTopSimilarNews(newsId, result.blocks, result.model, 10)
      const matching = await classifyEventRelation({
        article: { title: articleTitle, content: articleContent },
        candidates,
      })
      const eventRegistry = sourceKind === 't09_benchmark'
        ? { persisted: false, reason: 'Для чистоты контрольного прогона события не записываются в реестр.' }
        : {
            persisted: true,
            ...persistEventDecision({
              newsId,
              stageRunId,
              decision: matching.decision,
              candidateNews: candidates.find((candidate) => candidate.newsId === matching.decision.candidateId) || null,
            }),
          }
      const usage = {
        embedding: { calls: result.calls, inputTokens: result.inputTokens, outputTokens: 0, costRub: null },
        jev: matching.usage.jev,
        deepseek: matching.usage.deepseek,
      }
      const totalCalls = usage.embedding.calls + usage.jev.calls + usage.deepseek.calls
      const totalInputTokens = sumTokens([usage.embedding.inputTokens, usage.jev.inputTokens, usage.deepseek.inputTokens])
      const totalOutputTokens = sumTokens([usage.embedding.outputTokens, usage.jev.outputTokens, usage.deepseek.outputTokens])
      const persistedResult = {
        ...result,
        calls: totalCalls,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        nearest: candidates[0] ? {
          newsId: candidates[0].newsId,
          title: candidates[0].title,
          publicationDate: candidates[0].publicationDate,
          similarity: candidates[0].similarity,
          matchedBlocks: candidates[0].matchedBlocks,
          blocks: candidates[0].blocks,
        } : null,
        topCandidates: matching.comparisons,
        decision: matching.decision,
        eventRegistry,
        usage,
        models: { embedding: result.model, jev: matching.models.jev, deepseek: matching.models.deepseek },
      }
      finishStageRun(stageRunId, {
        status: 'completed',
        output: persistedResult,
        provider: 'Polza AI + PostgreSQL/pgvector',
        model: `${result.model} + ${matching.models.jev}${matching.models.deepseek ? ` + ${matching.models.deepseek}` : ''}`,
        calls: totalCalls,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      })
      return send(response, 200, { ...persistedResult, newsId, stageRunId })
    } catch (error) {
      failStageRun(stageRunId, error)
      throw error
    }
  } catch (error) {
    const statusCode = error.statusCode || (error.name === 'AbortError' ? 504 : 502)
    if (statusCode >= 500) process.stderr.write(`T09 vectorization failed: ${error.message}\n`)
    return send(response, statusCode, {
      error: statusCode < 500 ? error.message : error.name === 'AbortError' ? 'Превышено время ожидания ответа Polza AI' : error.message || 'Ошибка векторизации',
    })
  }
})

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`T09 vectorizer listening on http://127.0.0.1:${port}\n`)
})

const retryInitialization = () => {
  void initializePgVector()
    .then(() => {
      pgVectorReady = true
      process.stdout.write('T09 PostgreSQL + pgvector ready\n')
    })
    .catch((error) => {
      pgVectorReady = false
      process.stderr.write(`T09 PostgreSQL initialization failed: ${error.message}\n`)
    })
}
retryInitialization()
setInterval(() => {
  if (!pgVectorReady) retryInitialization()
}, 5000).unref()
