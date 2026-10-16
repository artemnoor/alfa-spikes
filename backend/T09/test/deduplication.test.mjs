import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { after, before, beforeEach, describe, it } from 'node:test'

let server
let port
let moduleApi
let requests
let nextJev
let nextDeepSeek

const candidates = Array.from({ length: 10 }, (_, index) => ({
  newsId: `candidate-${index + 1}`,
  title: `Архивная новость ${index + 1}`,
  content: `Содержание архивной новости ${index + 1}`,
  publicationDate: `2026-10-${String(index + 1).padStart(2, '0')}`,
  similarity: 0.95 - index * 0.02,
}))

function jevPayload({ match = 'candidate_1', confidence = 0.98, margin = 0.8, relations = {} } = {}) {
  const answers = Object.fromEntries(candidates.map((_, index) => {
    const key = `candidate_${index + 1}`
    const relation = relations[key] || (key === match ? 'SAME' : 'DIFFERENT')
    return [`relation_${key}`, {
      choice: relation,
      confidence: key === match ? confidence : 0.96,
      probabilities: { [relation]: key === match ? confidence : 0.96, other: 1 - (key === match ? confidence : 0.96) },
    }]
  }))
  answers.best_match = {
    choice: match,
    confidence,
    probabilities: { [match]: Math.min(1, (1 + margin) / 2), alternative: Math.max(0, (1 - margin) / 2) },
  }
  return { answers, usage: { input_tokens: 5200, output_tokens: 400, cost_rub: 0.08 } }
}

function deepSeekPayload(answer = { relation: 'SAME', candidate_key: 'candidate_2', confidence: 0.91, reason: 'Событие совпадает.' }) {
  return {
    choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(answer) } }],
    usage: { prompt_tokens: 900, completion_tokens: 55, cost_rub: 0.015 },
  }
}

function json(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json' })
  response.end(JSON.stringify(body))
}

before(async () => {
  requests = []
  server = createServer(async (request, response) => {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    requests.push({ path: request.url, body })
    if (request.url.endsWith('/systemone')) return json(response, 200, nextJev)
    if (request.url.endsWith('/chat/completions')) {
      if (nextDeepSeek instanceof Error) return json(response, 503, { error: { message: nextDeepSeek.message } })
      return json(response, 200, nextDeepSeek)
    }
    return json(response, 404, { error: 'not found' })
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  port = server.address().port
  process.env.POLZA_AI_API_KEY = 'test-key'
  process.env.POLZA_API_BASE_URL = `http://127.0.0.1:${port}/api`
  process.env.T09_MATCH_CONFIDENCE_THRESHOLD = '0.7'
  process.env.T09_MATCH_MARGIN_THRESHOLD = '0.12'
  moduleApi = await import(`../src/deduplication.mjs?test=${Date.now()}`)
})

beforeEach(() => {
  requests.length = 0
  nextJev = jevPayload()
  nextDeepSeek = deepSeekPayload()
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
  delete process.env.POLZA_AI_API_KEY
  delete process.env.POLZA_API_BASE_URL
  delete process.env.T09_MATCH_CONFIDENCE_THRESHOLD
  delete process.env.T09_MATCH_MARGIN_THRESHOLD
})

describe('T09 relation decisions', () => {
  it('maps all four relation labels to the intended resolution', () => {
    assert.equal(moduleApi.resolutionFor('SAME'), 'APPEND_TO_EVENT')
    assert.equal(moduleApi.resolutionFor('RELATED'), 'CREATE_RELATED_EVENT')
    assert.equal(moduleApi.resolutionFor('DIFFERENT'), 'CREATE_NEW_EVENT')
    assert.equal(moduleApi.resolutionFor('UNSURE'), 'MANUAL_REVIEW')
  })

  it('keeps a high-confidence JEV match and skips DeepSeek', async () => {
    const result = await moduleApi.classifyEventRelation({
      article: { title: 'Та же новость', content: 'Продолжение сообщения о сделке.' },
      candidates,
    })

    assert.equal(result.decision.relation, 'SAME')
    assert.equal(result.decision.resolution, 'APPEND_TO_EVENT')
    assert.equal(result.decision.candidateId, 'candidate-1')
    assert.equal(result.decision.decidedBy, 'JEV')
    assert.equal(result.decision.fallback.called, false)
    assert.deepEqual(result.usage.jev, { calls: 1, inputTokens: 5200, outputTokens: 400, costRub: 0.08 })
    assert.equal(result.usage.deepseek.calls, 0)
    assert.equal(requests.length, 1)
    assert.equal(requests[0].path, '/api/v1/systemone')
    assert.equal(Object.keys(requests[0].body.questions).length, 11)
    assert.equal(requests[0].body.state.includes('Архивная новость 10'), true)
  })

  it('sends all ten candidates to one DeepSeek review when JEV confidence is low', async () => {
    nextJev = jevPayload({ match: 'candidate_1', confidence: 0.52, margin: 0.72 })
    nextDeepSeek = deepSeekPayload({ relation: 'RELATED', candidate_key: 'candidate_2', confidence: 0.88, reason: 'Прямое продолжение истории.' })
    const result = await moduleApi.classifyEventRelation({ article: { title: 'Продолжение', content: 'Новый этап этой истории.' }, candidates })

    assert.equal(result.decision.relation, 'RELATED')
    assert.equal(result.decision.resolution, 'CREATE_RELATED_EVENT')
    assert.equal(result.decision.candidateId, 'candidate-2')
    assert.equal(result.decision.decidedBy, 'DeepSeek V4 Flash')
    assert.equal(result.decision.fallback.status, 'resolved')
    assert.equal(result.usage.jev.calls, 1)
    assert.equal(result.usage.deepseek.calls, 1)
    assert.equal(result.usage.deepseek.inputTokens, 900)
    assert.equal(result.usage.deepseek.outputTokens, 55)
    assert.equal(requests.length, 2)
    assert.equal(requests[1].path, '/api/v1/chat/completions')
    const sent = JSON.parse(requests[1].body.messages[1].content)
    assert.equal(sent.candidates.length, 10)
    assert.equal(sent.candidates[9].candidate_key, 'candidate_10')
  })

  it('lets DeepSeek repair a conflict between JEV candidate comparison and best match', async () => {
    nextJev = jevPayload({ match: 'candidate_1', relations: { candidate_1: 'DIFFERENT', candidate_2: 'RELATED' } })
    nextDeepSeek = deepSeekPayload({ relation: 'SAME', candidate_key: 'candidate_2', confidence: 0.9, reason: 'Совпадает конкретная сделка.' })
    const result = await moduleApi.classifyEventRelation({ article: { title: 'Обновление сделки', content: 'Те же стороны и соглашение.' }, candidates })

    assert.equal(result.decision.relation, 'SAME')
    assert.equal(result.decision.candidateId, 'candidate-2')
    assert.equal(result.decision.fallback.called, true)
    assert.match(result.decision.fallback.reasons.join(' '), /расхождение/)
    assert.equal(requests.filter((item) => item.path.endsWith('/chat/completions')).length, 1)
  })

  it('uses manual review when DeepSeek returns confidence below the automatic threshold', async () => {
    nextJev = jevPayload({ confidence: 0.61, margin: 0.7 })
    nextDeepSeek = deepSeekPayload({ relation: 'SAME', candidate_key: 'candidate_1', confidence: 0.42, reason: 'Сведения похожи, но неполны.' })
    const result = await moduleApi.classifyEventRelation({ article: { title: 'Возможное совпадение', content: 'Короткое сообщение.' }, candidates })

    assert.equal(result.decision.relation, 'UNSURE')
    assert.equal(result.decision.resolution, 'MANUAL_REVIEW')
    assert.equal(result.decision.fallback.status, 'still_uncertain')
  })

  it('rejects a DeepSeek answer that points to an unknown candidate', async () => {
    nextJev = jevPayload({ confidence: 0.4, margin: 0.7 })
    nextDeepSeek = deepSeekPayload({ relation: 'SAME', candidate_key: 'candidate_99', confidence: 0.99, reason: 'Не существует.' })
    const result = await moduleApi.classifyEventRelation({ article: { title: 'Несовпадающий ID', content: 'Проверка.' }, candidates })

    assert.equal(result.decision.relation, 'UNSURE')
    assert.equal(result.decision.candidateId, null)
    assert.equal(result.decision.fallback.status, 'invalid_response')
  })

  it('does not call either model when the nearest-neighbour list is empty', async () => {
    const result = await moduleApi.classifyEventRelation({ article: { title: 'Первая новость', content: 'Нет кандидатов.' }, candidates: [] })

    assert.equal(result.decision.relation, 'DIFFERENT')
    assert.equal(result.decision.resolution, 'CREATE_NEW_EVENT')
    assert.equal(result.usage.jev.calls, 0)
    assert.equal(result.usage.deepseek.calls, 0)
    assert.equal(requests.length, 0)
  })

  it('fails closed to manual review if DeepSeek is unavailable', async () => {
    nextJev = jevPayload({ confidence: 0.4, margin: 0.6 })
    nextDeepSeek = new Error('simulated provider outage')
    const result = await moduleApi.classifyEventRelation({ article: { title: 'Проверь API', content: 'Неполная история.' }, candidates })

    assert.equal(result.decision.relation, 'UNSURE')
    assert.equal(result.decision.resolution, 'MANUAL_REVIEW')
    assert.equal(result.decision.fallback.status, 'failed')
    assert.match(result.decision.fallback.error, /simulated provider outage/)
    assert.equal(result.usage.deepseek.calls, 1)
  })

  it('keeps a confident no-match as DIFFERENT without paying for DeepSeek', async () => {
    nextJev = jevPayload({ match: 'none', confidence: 0.98, margin: 0.8 })
    const result = await moduleApi.classifyEventRelation({ article: { title: 'Другое событие', content: 'Независимая история.' }, candidates })

    assert.equal(result.decision.relation, 'DIFFERENT')
    assert.equal(result.decision.resolution, 'CREATE_NEW_EVENT')
    assert.equal(result.decision.candidateId, null)
    assert.equal(result.decision.fallback.called, false)
    assert.equal(result.usage.deepseek.calls, 0)
    assert.equal(requests.length, 1)
  })

  it('accepts a confident RELATED match and chooses the correct candidate', async () => {
    nextJev = jevPayload({ match: 'candidate_3', relations: { candidate_3: 'RELATED' } })
    const result = await moduleApi.classifyEventRelation({ article: { title: 'Следующий этап', content: 'Прямое продолжение проекта.' }, candidates })

    assert.equal(result.decision.relation, 'RELATED')
    assert.equal(result.decision.candidateId, 'candidate-3')
    assert.equal(result.decision.resolution, 'CREATE_RELATED_EVENT')
    assert.equal(result.usage.deepseek.calls, 0)
  })

  it('treats a small JEV match margin as a reason for exactly one DeepSeek call', async () => {
    nextJev = jevPayload({ match: 'candidate_1', confidence: 0.96, margin: 0.05 })
    const result = await moduleApi.classifyEventRelation({ article: { title: 'Два похожих кандидата', content: 'Неоднозначная статья.' }, candidates })

    assert.equal(result.decision.fallback.called, true)
    assert.match(result.decision.fallback.reasons.join(' '), /малый разрыв/)
    assert.equal(result.usage.deepseek.calls, 1)
    assert.equal(requests.filter((item) => item.path.endsWith('/chat/completions')).length, 1)
  })

  it('accepts a confident DIFFERENT result from DeepSeek only with a null candidate key', async () => {
    nextJev = jevPayload({ confidence: 0.4, margin: 0.7 })
    nextDeepSeek = deepSeekPayload({ relation: 'DIFFERENT', candidate_key: null, confidence: 0.93, reason: 'События независимы.' })
    const result = await moduleApi.classifyEventRelation({ article: { title: 'Нет связи', content: 'Другая компания и событие.' }, candidates })

    assert.equal(result.decision.relation, 'DIFFERENT')
    assert.equal(result.decision.resolution, 'CREATE_NEW_EVENT')
    assert.equal(result.decision.candidateId, null)
    assert.equal(result.decision.fallback.status, 'resolved')
  })

  it('handles malformed DeepSeek JSON as a failed review and retains usage', async () => {
    nextJev = jevPayload({ confidence: 0.4, margin: 0.7 })
    nextDeepSeek = { choices: [{ finish_reason: 'length', message: { content: '{"relation":' } }], usage: { prompt_tokens: 730, completion_tokens: 30, cost_rub: 0.02 } }
    const result = await moduleApi.classifyEventRelation({ article: { title: 'Урезанный JSON', content: 'Тест лимита вывода.' }, candidates })

    assert.equal(result.decision.resolution, 'MANUAL_REVIEW')
    assert.equal(result.decision.fallback.status, 'failed')
    assert.equal(result.usage.deepseek.calls, 1)
    assert.equal(result.usage.deepseek.inputTokens, 730)
    assert.equal(result.usage.deepseek.outputTokens, 30)
    assert.match(result.decision.fallback.error, /invalid JSON/)
  })

  it('rejects malformed JEV answer envelopes instead of silently creating an event', async () => {
    nextJev = { answers: {}, usage: { input_tokens: 100 } }
    await assert.rejects(
      moduleApi.classifyEventRelation({ article: { title: 'Пустой JEV', content: 'Неверный ответ.' }, candidates }),
      /valid relation|unknown best-match/,
    )
    assert.equal(requests.length, 1)
  })

  it('requests one batch with every candidate and does not split the comparison into per-candidate calls', async () => {
    const result = await moduleApi.classifyEventRelation({ article: { title: 'Пакетное сравнение', content: 'Сравнить 10.' }, candidates })
    const systemOneRequests = requests.filter((item) => item.path.endsWith('/systemone'))

    assert.equal(systemOneRequests.length, 1)
    assert.equal(Object.keys(systemOneRequests[0].body.questions).filter((key) => key.startsWith('relation_')).length, 10)
    assert.equal(result.comparisons.length, 10)
  })
})
