import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const runDir = resolve(`${here}/runs/entity-status-five-news-2026-10-16`)
const [news, report] = await Promise.all([
  readFile(`${runDir}/news.json`, 'utf8').then(JSON.parse),
  readFile(process.argv[2] ? resolve(process.argv[2]) : `${runDir}/results.json`, 'utf8').then(JSON.parse),
])
const byId = new Map(news.map((item) => [item.id, item]))
const allowed = new Set(['completed', 'announced', 'planned', 'conditional', 'denied'])

assert.equal(report.results.length, news.length, 'all five news items should have a result')
for (const result of report.results) {
  const item = byId.get(result.id)
  assert.ok(item, `no benchmark input for result ${result.id}`)
  assert.ok(['model', 'partial'].includes(result.status), `${item.name}: no usable graph result`)
  assert.equal(result.calls, 1, `${item.name}: expected one model request, with no length retry`)
  const entities = new Map(result.entities.map((entity) => [entity.id, entity]))
  const eventIds = new Set(result.events.map((event) => event.event_id))
  for (const entity of result.entities) {
    const source = entity.source === 'metadata' ? item.date : result.article
    assert.ok(source.includes(entity.mention) && source.includes(entity.evidence) && entity.evidence.includes(entity.mention), `${item.name}: invalid entity quote for ${entity.name}`)
  }
  for (const event of result.events) {
    assert.ok(allowed.has(event.event_status), `${item.name}: invalid event_status ${event.event_status}`)
    assert.equal(event.graph_type, event.type, `${item.name}: graph type must remain separate and preserve the original event type`)
    assert.ok(result.article.includes(event.evidence), `${item.name}: event evidence is not an exact article quote`)
    for (const participant of event.participants) assert.ok(entities.has(participant.entity_id), `${item.name}: event participant has no entity`)
    for (const attribute of event.attributes) {
      const source = attribute.source === 'metadata' ? item.date : result.article
      assert.ok(source.includes(attribute.mention) && source.includes(attribute.evidence) && attribute.evidence.includes(attribute.mention), `${item.name}: invalid ${attribute.type} evidence`)
    }
  }
  for (const relation of result.relations) {
    assert.ok(entities.has(relation.subject_id) && entities.has(relation.object_id), `${item.name}: relation endpoint is missing`)
    assert.ok(result.article.includes(relation.evidence), `${item.name}: relation evidence is not an article quote`)
    if (relation.event_id) assert.ok(eventIds.has(relation.event_id), `${item.name}: relation references an unknown event`)
  }
  const expectedEvent = result.events.find((event) => `${event.label} ${event.evidence}`.toLocaleLowerCase('ru-RU').includes(item.expectedEvidence.toLocaleLowerCase('ru-RU')))
  assert.ok(expectedEvent, `${item.name}: no extracted event matched expected evidence “${item.expectedEvidence}”`)
  assert.equal(expectedEvent.event_status, item.expectedStatus, `${item.name}: event status mismatch`)
}

const acquisition = report.results.find((item) => item.id === 2)
const acquisitionLink = acquisition.relations.find((relation) => relation.predicate === 'acquisition_of')
assert.ok(acquisitionLink, 'announced acquisition should connect buyer to target in the graph')
assert.match(acquisition.entities.find((entity) => entity.id === acquisitionLink.subject_id)?.name ?? '', /Меридиан/u)
assert.match(acquisition.entities.find((entity) => entity.id === acquisitionLink.object_id)?.name ?? '', /Альтаир/u)
assert.ok(report.summary.outputTokens <= report.summary.modelCalls * 3000, 'output generation exceeded the 3,000-token per-news cap')

const partial = report.results.filter((item) => item.status === 'partial').length
const counts = Object.fromEntries([...allowed].map((status) => [status, report.results.flatMap((item) => item.events).filter((event) => event.event_status === status).length]))
process.stdout.write(`Verified ${report.results.length} articles, ${report.results.reduce((count, item) => count + item.events.length, 0)} graph events (${partial} partial articles). Expected statuses match; event status counts: ${JSON.stringify(counts)}.\n`)
