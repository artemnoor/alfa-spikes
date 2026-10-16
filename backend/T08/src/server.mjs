import { createServer } from 'node:http'
import { classifyNews, classifierConfig } from './classifier.mjs'

const port = Number(process.env.PORT || 8091)
const maxBodyBytes = 64 * 1024

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
      const error = new Error('request body is too large')
      error.statusCode = 413
      throw error
    }
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return send(response, 204, {})

  if (request.method === 'GET' && request.url === '/health') {
    return send(response, 200, {
      ok: classifierConfig.hasApiKey,
      provider: 'Polza AI',
      model: classifierConfig.model,
      models: {
        topic: `${classifierConfig.model} + ${classifierConfig.topicModel} only when uncertain`,
        topicFallback: classifierConfig.topicModel,
        event: `${classifierConfig.model} selection + ${classifierConfig.eventEvidenceModel} evidence review`,
        eventEvidence: classifierConfig.eventEvidenceModel,
        eventEvidenceThreshold: classifierConfig.eventEvidenceThreshold,
        entities: classifierConfig.entitiesModel,
        genre: classifierConfig.model,
      },
      configured: classifierConfig.hasApiKey,
      taxonomies: Object.fromEntries(
        Object.entries(classifierConfig.taxonomies).map(([key, taxonomy]) => [
          key,
          taxonomy.activeConceptCount,
        ]),
      ),
    })
  }

  if (request.method !== 'POST' || request.url !== '/classify') {
    return send(response, 404, { error: 'not found' })
  }

  try {
    const body = await readJson(request)
    const result = await classifyNews(body?.state, body?.metadata)
    return send(response, result.status === 'model' ? 200 : 502, result)
  } catch (error) {
    process.stderr.write(`Classification failed: ${error.stack ?? error.message}\n`)
    const statusCode = error.statusCode || 502
    return send(response, statusCode, {
      error: statusCode === 400 || statusCode === 413 ? error.message : 'classification failed',
    })
  }
})

server.listen(port, '127.0.0.1', () => {
    process.stdout.write(`T08 classifier listening on http://127.0.0.1:${port}\n`)
})
