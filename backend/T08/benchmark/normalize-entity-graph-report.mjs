import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const path = resolve(process.argv[2] ?? `${here}/runs/entity-graph-five-news-2026-10-16/results.json`)
const report = JSON.parse(await readFile(path, 'utf8'))

for (const item of report.results) {
  const ids = new Map()
  const unique = new Map()
  const orgForm = (entity) => {
    if (entity.type !== 'ORGANIZATION') return ''
    if (entity.legal_form) return entity.legal_form
    const escaped = entity.name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
    const match = item.article.match(new RegExp(`(?:ООО|АО|ПАО|ОАО|ЗАО|ИП)\\s*[«"“]?${escaped}[»"”]?`, 'iu'))
    const form = match?.[0].match(/^(ООО|АО|ПАО|ОАО|ЗАО|ИП)/iu)?.[1]
    if (form) entity.legal_form = form.toLocaleUpperCase('ru-RU')
    return entity.legal_form ?? ''
  }
  for (const entity of item.entities) {
    const key = `${entity.type}:${entity.normalized_name ?? entity.normalized_value ?? entity.name}:${orgForm(entity)}`.toLocaleLowerCase('ru-RU')
    if (!unique.has(key)) {
      unique.set(key, entity)
      ids.set(entity.id, entity.id)
      continue
    }
    const canonical = unique.get(key)
    canonical.alternate_mentions = [...new Set([...(canonical.alternate_mentions ?? []), canonical.mention, entity.mention])].filter((mention) => mention !== canonical.mention)
    if (!canonical.role && entity.role) canonical.role = entity.role
    ids.set(entity.id, canonical.id)
  }
  item.entities = [...unique.values()]
  const entityById = new Map(item.entities.map((entity) => [entity.id, entity]))
  for (const event of item.events) {
    const seen = new Set()
    event.participants = event.participants.map((participant) => ({ ...participant, entity_id: ids.get(participant.entity_id) ?? participant.entity_id }))
      .filter((participant) => entityById.has(participant.entity_id) && !seen.has(participant.entity_id) && seen.add(participant.entity_id))
  }
  item.relations = item.relations.map((relation) => ({
    ...relation,
    subject_id: ids.get(relation.subject_id) ?? relation.subject_id,
    object_id: ids.get(relation.object_id) ?? relation.object_id,
  })).filter((relation) => relation.subject_id !== relation.object_id && entityById.has(relation.subject_id) && entityById.has(relation.object_id))

  const rules = [
    { from: /^(?:acquirer|buyer)$/iu, to: /^(?:target|seller)$/iu, predicate: 'acquisition_of', label: 'приобретает' },
    { from: /^(?:supplier|vendor)$/iu, to: /^(?:customer|buyer)$/iu, predicate: 'supplies_to', label: 'поставляет' },
    { from: /^(?:lender|creditor)$/iu, to: /^(?:borrower|debtor)$/iu, predicate: 'provided_credit_to', label: 'выдал кредит' },
  ]
  for (const event of item.events) for (const rule of rules) {
    const from = event.participants.find((participant) => rule.from.test(participant.role ?? ''))
    const to = event.participants.find((participant) => rule.to.test(participant.role ?? ''))
    const subject = entityById.get(from?.entity_id)
    const object = entityById.get(to?.entity_id)
    if (!subject || !object || (!event.evidence.includes(subject.mention) && !event.evidence.includes(subject.name)) || (!event.evidence.includes(object.mention) && !event.evidence.includes(object.name))) continue
    if (item.relations.some((relation) => relation.subject_id === subject.id && relation.object_id === object.id && relation.predicate === rule.predicate)) continue
    item.relations.push({ subject_id: subject.id, predicate: rule.predicate, object_id: object.id, event_id: event.event_id, label: rule.label, evidence: event.evidence })
  }
  item.relations = item.relations.filter((relation) => {
    const subject = entityById.get(relation.subject_id)
    const object = entityById.get(relation.object_id)
    return subject && object && item.article.includes(relation.evidence)
      && (relation.evidence.includes(subject.mention) || relation.evidence.includes(subject.name))
      && (relation.evidence.includes(object.mention) || relation.evidence.includes(object.name))
  })
}

report.summary = report.results.reduce((summary, item) => ({
  news: summary.news + 1,
  failedNews: summary.failedNews + (item.status === 'unavailable' ? 1 : 0),
  partialNews: summary.partialNews + (item.status === 'partial' ? 1 : 0),
  modelCalls: summary.modelCalls + item.calls,
  inputTokens: summary.inputTokens + item.inputTokens,
  outputTokens: summary.outputTokens + item.outputTokens,
  costRub: summary.costRub === null || item.costRub === null ? null : summary.costRub + item.costRub,
  registryApiCalls: summary.registryApiCalls + (item.registryLookups ?? 0),
  entities: summary.entities + item.entities.length,
  events: summary.events + item.events.length,
  relations: summary.relations + item.relations.length,
  eventAttributes: summary.eventAttributes + item.events.reduce((sum, event) => sum + event.attributes.length, 0),
  rejectedEntities: summary.rejectedEntities + (item.rejectedEntities ?? 0),
}), { news: 0, failedNews: 0, partialNews: 0, modelCalls: 0, inputTokens: 0, outputTokens: 0, costRub: 0, registryApiCalls: 0, entities: 0, events: 0, relations: 0, eventAttributes: 0, rejectedEntities: 0 })

await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
process.stdout.write(`Normalized report: ${path}\n${JSON.stringify(report.summary, null, 2)}\n`)
