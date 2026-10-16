import { createServer } from 'node:http'
import { getDatabaseStats, listRecords } from './store.mjs'

const port = Number(process.env.PORT || 8093)

function send(response, status, body) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'access-control-allow-methods': 'GET,OPTIONS',
    'access-control-allow-headers': 'content-type',
  })
  response.end(JSON.stringify(body))
}

const server = createServer((request, response) => {
  if (request.method === 'OPTIONS') return send(response, 204, {})
  if (request.method === 'GET' && request.url === '/health') {
    return send(response, 200, { ok: true, ...getDatabaseStats() })
  }
  if (request.method !== 'GET' || !['/records', '/news'].includes(request.url)) {
    return send(response, 404, { error: 'not found' })
  }
  return send(response, 200, { records: listRecords(), ...getDatabaseStats() })
})

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Pipeline archive listening on http://127.0.0.1:${port}\n`)
})
