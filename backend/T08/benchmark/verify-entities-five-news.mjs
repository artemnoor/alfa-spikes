import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeEntityValue } from '../src/entities.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const newsPath = resolve(`${here}/runs/jev-recovering-top3-topic-2026-10-15/news.json`)
const resultPath = resolve(process.argv[2] ?? `${here}/runs/entity-graph-five-news-2026-10-16/results.json`)
const [news, report] = await Promise.all([
  readFile(newsPath, 'utf8').then(JSON.parse),
  readFile(resultPath, 'utf8').then(JSON.parse),
])
const inputById = new Map(news.map((item) => [item.id, item]))
const allowedRelationTypes = {
  launches: [['ORGANIZATION', 'FACILITY']],
  builds: [['ORGANIZATION', 'FACILITY']],
  plans_to_build: [['ORGANIZATION', 'FACILITY']],
  plans_to_merge: [['ORGANIZATION', 'FACILITY']],
  may_cancel_construction_of: [['ORGANIZATION', 'FACILITY']],
  located_in: [['FACILITY', 'LOCATION']],
  executive_of: [['PERSON', 'ORGANIZATION']],
  interview_published_by: [['PERSON', 'ORGANIZATION']],
  provided_credit_to: [['ORGANIZATION', 'ORGANIZATION']],
  acquisition_of: [['ORGANIZATION', 'ORGANIZATION']],
  supplies_to: [['ORGANIZATION', 'ORGANIZATION']],
  produces: [['ORGANIZATION', 'PRODUCT'], ['FACILITY', 'PRODUCT']],
  operates: [['ORGANIZATION', 'FACILITY']],
}
let evidenceErrors = 0
for (const item of report.results) {
  const source = inputById.get(item.id)
  if (!source) throw new Error(`No source news for result ${item.id}`)
  const article = `Заголовок: ${source.title}\n\n${source.content}`
  const itemEntities = new Map()
  const itemEventIds = new Set()
  const organizationKeys = new Set()
  for (const entity of item.entities) {
    const origin = entity.source === 'metadata' ? source.date : article
    if (!origin.includes(entity.evidence) || !entity.evidence.includes(entity.mention)) evidenceErrors += 1
    if (entity.type === 'FACILITY' && !/(?:завод|фабрик|предприяти|лини\p{L}*|склад|комплекс|дата[- ]?центр|производственн\p{L}*\s+объект)/iu.test(entity.mention)) evidenceErrors += 1
    if (entity.source === 'metadata' && entity.normalized_value !== '2026-10-' + source.date.match(/^\d{1,2}/u)?.[0].padStart(2, '0')) evidenceErrors += 1
    itemEntities.set(entity.id, entity)
    if (entity.type === 'ORGANIZATION') {
      const key = `${entity.normalized_name}:${entity.legal_form ?? ''}`
      if (organizationKeys.has(key)) evidenceErrors += 1
      organizationKeys.add(key)
    }
  }
  for (const event of item.events) {
    if (!article.includes(event.evidence)) evidenceErrors += 1
    itemEventIds.add(event.event_id)
    for (const participant of event.participants) if (!itemEntities.has(participant.entity_id)) evidenceErrors += 1
    for (const attribute of event.attributes) {
      const origin = attribute.source === 'metadata' ? source.date : article
      if (!origin.includes(attribute.evidence) || !attribute.evidence.includes(attribute.mention)) evidenceErrors += 1
    }
  }
  for (const relation of item.relations) {
    const subject = itemEntities.get(relation.subject_id)
    const object = itemEntities.get(relation.object_id)
    if (!subject || !object || !article.includes(relation.evidence)) evidenceErrors += 1
    if (subject && ![subject.mention, subject.name, ...(subject.alternate_mentions ?? [])].some((mention) => relation.evidence.includes(mention))) evidenceErrors += 1
    if (object && ![object.mention, object.name, ...(object.alternate_mentions ?? [])].some((mention) => relation.evidence.includes(mention))) evidenceErrors += 1
    if (relation.event_id && !itemEventIds.has(relation.event_id)) evidenceErrors += 1
    if (!subject || !object || !(allowedRelationTypes[relation.predicate] ?? []).some(([subjectType, objectType]) => subject.type === subjectType && object.type === objectType)) evidenceErrors += 1
  }
}
if (report.results.length !== 5) throw new Error(`Expected 5 results, found ${report.results.length}`)
if (report.results.some((item) => !['model', 'partial'].includes(item.status))) throw new Error('A news result has neither a complete model graph nor a grounded fallback')
if (evidenceErrors) throw new Error(`Found ${evidenceErrors} invalid evidence quotes`)
const first = report.results.find((item) => item.id === 1)
const bank = first?.entities.find((entity) => entity.type === 'ORGANIZATION' && entity.name.toLocaleLowerCase('ru-RU').includes('орбита'))
if (!bank) throw new Error('News 1 must contain the bank “Орбита”')
const loanRelation = first.relations.find((relation) => relation.subject_id === bank.id && /credit|кредит|provided/i.test(`${relation.predicate} ${relation.label}`))
if (!loanRelation) throw new Error('News 1 must link Bank Orbita to the credit event')
if (!first.relations.some((relation) => relation.predicate === 'located_in'
  && first.entities.find((entity) => entity.id === relation.subject_id)?.type === 'FACILITY'
  && first.entities.find((entity) => entity.id === relation.object_id)?.type === 'LOCATION')) {
  throw new Error('News 1 must link the facility to its stated location')
}
const quantityMentions = report.results.flatMap((item) => item.events.flatMap((event) => event.attributes.map((attribute) => attribute.mention)))
for (const expected of ['450 рабочих мест', '80%', '25 минут']) {
  if (!quantityMentions.some((mention) => mention.toLocaleLowerCase('ru-RU').includes(expected.toLocaleLowerCase('ru-RU')))) {
    throw new Error(`Expected event attribute not found: ${expected}`)
  }
}
if (!report.results.find((item) => item.id === 3).events.some((event) => event.evidence.includes('80% акций'))) {
  throw new Error('The 80% fact must be linked to the acquisition of shares')
}
for (const id of [1, 3, 4, 5]) {
  if (!report.results.find((item) => item.id === id).entities.some((entity) => entity.type === 'FACILITY')) {
    throw new Error(`Expected a grounded facility/object in news ${id}`)
  }
}
const metadataDate = first.entities.find((entity) => entity.type === 'DATE' && entity.source === 'metadata')
if (!metadataDate) throw new Error('News 1 publication date must be marked as metadata')
const acquisition = report.results.find((item) => item.id === 3)
if (!acquisition.relations.some((relation) => relation.predicate === 'acquisition_of')) throw new Error('News 3 must link the acquirer and acquisition target')
if (!acquisition.relations.some((relation) => relation.predicate === 'plans_to_merge')) throw new Error('News 3 must link the planned warehouse consolidation to the facility')
if (!report.results.find((item) => item.id === 2).relations.some((relation) => relation.predicate === 'supplies_to')) throw new Error('News 2 must link the supplier to its customer')
await writeFile(resultPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
const partial = report.results.filter((item) => item.status === 'partial').length
const fallback = report.results.filter((item) => ['grounded_fallback', 'partial_json_salvage'].includes(item.extractionMode)).length
process.stdout.write(`Verified ${report.results.length} news (${partial} partial results, ${fallback} fallback), ${report.summary.entities} entities, ${report.summary.events} events, ${report.summary.relations} relations, and ${report.summary.eventAttributes} event attributes; typed relation, facility grounding, and evidence errors: ${evidenceErrors}.\n`)
