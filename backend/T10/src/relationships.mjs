import { createChatCompletion } from './polza.mjs'

export const RELATION_COMPATIBILITY = Object.freeze({
  PRODUCES: [['COMPANY','BUSINESS_UNIT'], ['PRODUCT']],
  PROVIDES_SERVICE: [['COMPANY','BUSINESS_UNIT'], ['SERVICE']],
  SUPPLIES: [['COMPANY'], ['COMPANY','PRODUCT','COMPONENT','RESOURCE']],
  PURCHASES: [['COMPANY'], ['COMPANY','PRODUCT','COMPONENT','RESOURCE']],
  OWNS: [['COMPANY'], ['COMPANY','FACILITY','PRODUCT']],
  OPERATES: [['COMPANY','BUSINESS_UNIT'], ['FACILITY','PROCESS']],
  USES: [['COMPANY','BUSINESS_UNIT','PROCESS','PRODUCT'], ['COMPONENT','RESOURCE','TECHNOLOGY']],
  REQUIRES: [['COMPANY','FACILITY','PROCESS','PRODUCT'], ['RESOURCE','COMPONENT']],
  LOCATED_IN: [['COMPANY','FACILITY'], ['LOCATION']],
  PART_OF: [['COMPANY','BUSINESS_UNIT','PRODUCT','SERVICE','FACILITY','PROCESS','COMPONENT'], ['COMPANY','BUSINESS_UNIT','PRODUCT','SERVICE','FACILITY','PROCESS']],
  CONTRACTED_WITH: [['COMPANY'], ['COMPANY']],
  DEPENDS_ON: [['COMPANY','FACILITY','PROCESS'], ['COMPANY','FACILITY','SERVICE','COMPONENT','RESOURCE']],
})

const prompt = `Извлеки все бизнес-отношения, прямо выраженные в каждом фрагменте; одно предложение может подтверждать несколько разных связей. Не делай выводов из общих знаний. Участников выбирай только из переданного списка entities, сохраняя name и тип без изменений. Не пропускай связь только потому, что участник выражен местоимением или словом «компания»: используй уникальную явно названную компанию из этого фрагмента; при неоднозначности не создавай связь.

Выбирай predicate по смыслу и направлению:
- PRODUCES: компания производит, выращивает, строит или разрабатывает продукт.
- PROVIDES_SERVICE: компания оказывает услугу клиенту.
- SUPPLIES: поставщик/продавец передаёт товар компании-покупателю; источник — поставщик, объект — товар или компания-покупатель.
- PURCHASES: компания покупает/закупает товар или ресурс; источник — покупатель, объект — товар/ресурс.
- OWNS: компания владеет компанией, продуктом или активом.
- OPERATES: компания эксплуатирует площадку или процесс.
- USES: компания, процесс или продукт использует технологию/ресурс/компонент.
- REQUIRES: продукт, площадка или процесс требует компонент/ресурс.
- LOCATED_IN: компания или площадка расположена в географическом объекте.
- PART_OF: сущность является частью другой компании, продукта, услуги, площадки или процесса.
- CONTRACTED_WITH: между двумя компаниями прямо указаны договор, аренда или подряд.
- DEPENDS_ON: явно сказано, что деятельность зависит от другой организации, площадки, услуги, компонента или ресурса.

Примеры направления: «Компания X закупает сталь у Y» подтверждает PURCHASES(X→сталь) и SUPPLIES(Y→сталь), если X, Y и сталь есть в entities и цитата поддерживает обе связи. «Завод в Твери» подтверждает LOCATED_IN(завод→Тверь). «Подрядчик обслуживает сеть компании» подтверждает CONTRACTED_WITH только если текст явно задаёт подрядные отношения.

Для каждой связи верни sourceName, predicate, targetName, quote — короткую непрерывную дословную цитату из фрагмента, status из CURRENT, PLANNED, CONDITIONAL, ENDED, UNKNOWN и attributes только если они явно указаны. Статус фиксирует формулировку источника: запланированное не превращай в действующее, арендуемое не превращай в собственное. Не дублируй одну связь и не меняй её направление.

Важно: используй только перечисленные predicates, не вводи новые. Если текст говорит «A включает B» или «A состоит из B», верни PART_OF в обратном направлении: B → PART_OF → A. Не используй несуществующий predicate INCLUDES.

Верни только JSON {"chunks":[{"chunkId":"D1","relationships":[{"sourceName":"ООО «Пример»","predicate":"PRODUCES","targetName":"Промышленные насосы","quote":"ООО «Пример» производит промышленные насосы","status":"CURRENT","attributes":{}}]}]}. Каждый входной id верни; без подтверждённых отношений используй пустой массив. Допустимые predicates: ${Object.keys(RELATION_COMPATIBILITY).join(', ')}.`

function normalize(value) { return String(value ?? '').normalize('NFKC').toLocaleLowerCase('ru-RU').replace(/[\s«»“”„‟"'`.,;:()[\]{}]+/gu, ' ').trim() }

function entityByLabel(label, entities) {
  const key = normalize(label)
  return entities.find((entity) => normalize(entity.name) === key
    || (entity.aliases ?? []).some((alias) => normalize(alias) === key)) ?? null
}

export function normalizeRelationshipProposal(proposal, entities) {
  const predicate = String(proposal?.predicate ?? '').trim().toUpperCase()
  if (predicate !== 'INCLUDES') return { ...proposal, predicate }
  const source = entityByLabel(proposal.sourceName, entities)
  const target = entityByLabel(proposal.targetName, entities)
  if (!source || !target || source.type !== 'COMPANY' && source.type !== 'BUSINESS_UNIT') return { ...proposal, predicate }
  return {
    ...proposal,
    sourceName: proposal.targetName,
    predicate: 'PART_OF',
    targetName: proposal.sourceName,
    predicateNormalization: { original: 'INCLUDES', normalized: 'PART_OF', directionReversed: true },
  }
}

export function companyNameAliases(name) {
  const legalForms = new Set(['ооо','ао','пао','оао','зао','llc','inc','ltd','limited','corp','corporation','plc'])
  const words = String(name ?? '').normalize('NFKC').replace(/[«»“”„‟"'`()\[\]{}.,;:]/gu, ' ').split(/\s+/u).filter(Boolean)
  const meaningful = words.filter((word) => !legalForms.has(word.toLocaleLowerCase('ru-RU')))
  if (meaningful.length < 2) return []
  const acronym = meaningful.map((word) => [...word][0]).join('').toLocaleUpperCase('ru-RU')
  return [...acronym].length >= 2 && [...acronym].length <= 6 ? [acronym] : []
}

function resolveParticipant(label, allowedTypes, quote, chunk, entities, predicate, side) {
  const candidates = entities.filter((entity) => allowedTypes.includes(entity.type))
  const exact = candidates.find((entity) => normalize(entity.name) === normalize(label))
  if (exact && normalize(quote).includes(normalize(exact.name))) return { entity: exact, method: 'exact_quote', evidenceTerm: exact.name }
  const aliasExact = candidates.map((entity) => ({ entity, alias: (entity.aliases ?? []).find((alias) => normalize(alias) === normalize(label) && normalize(quote).includes(normalize(alias))) })).find((item) => item.alias)
  if (aliasExact) return { entity: aliasExact.entity, method: 'exact_alias_quote', evidenceTerm: aliasExact.alias }
  const explicit = candidates.filter((entity) => [entity.name, ...(entity.aliases ?? [])].some((name) => normalize(name) && normalize(quote).includes(normalize(name))))

  const quoteStart = chunk.start_offset + chunk.text_content.indexOf(quote)
  const quoteText = normalize(quote)
  const facilityWords = /(?:^|[^\p{L}])(завод|фабрик|площадк|склад|офис|цех|терминал|plant|factory|facility|warehouse|site|store|terminal)[\p{L}]*/iu
  const companyWords = /(?:^|[^\p{L}])(компан|предприят|поставщик|производител|заказчик|организац|company|group|producer|supplier|manufacturer|operator)[\p{L}]*/iu
  let preferredType = null
  if (predicate === 'LOCATED_IN' && side === 'source' && facilityWords.test(quoteText)) preferredType = 'FACILITY'
  else if ((predicate === 'SUPPLIES' || predicate === 'PURCHASES' || predicate === 'CONTRACTED_WITH') && side === 'source' && companyWords.test(quoteText)) preferredType = 'COMPANY'
  else if (companyWords.test(quoteText)) preferredType = 'COMPANY'
  if (preferredType) {
    const prior = candidates.filter((entity) => entity.type === preferredType && Number.isInteger(entity.startOffset) && entity.startOffset <= quoteStart)
      .sort((a, b) => b.startOffset - a.startOffset)
    if (prior.length && (!prior[1] || prior[0].startOffset !== prior[1].startOffset)) {
      const pattern = preferredType === 'FACILITY' ? facilityWords : companyWords
      return { entity: prior[0], method: 'unique_preceding_mention', evidenceTerm: proposalReference(quote, pattern) }
    }
  }
  if (explicit.length === 1) {
    const quotedName = [explicit[0].name, ...(explicit[0].aliases ?? [])]
      .find((name) => normalize(quote).includes(normalize(name)))
    const isAlias = quotedName && normalize(quotedName) !== normalize(explicit[0].name)
    return { entity: explicit[0], method: isAlias ? 'exact_alias_quote' : 'exact_quote', evidenceTerm: quotedName }
  }
  if (explicit.length > 1) {
    const candidate = explicit.find((entity) => normalize(entity.name) === normalize(label))
    if (!candidate) return null
    const quotedName = [candidate.name, ...(candidate.aliases ?? [])].find((name) => normalize(quote).includes(normalize(name)))
    const isAlias = quotedName && normalize(quotedName) !== normalize(candidate.name)
    return { entity: candidate, method: isAlias ? 'exact_alias_quote' : 'exact_quote', evidenceTerm: quotedName }
  }
  return null
}

function proposalReference(quote, pattern) {
  const flags = pattern.flags.includes('i') ? pattern.flags : `${pattern.flags}i`
  return String(quote).match(new RegExp(pattern.source, flags))?.[0].trim() ?? null
}

export function verifyRelationship(chunk, proposal, entities) {
  const errors = []
  const predicate = String(proposal?.predicate ?? '').toUpperCase()
  const schema = RELATION_COMPATIBILITY[predicate]
  if (!schema) return { ok: false, code: 'unknown_predicate', reason: 'Неизвестный тип связи', proposal }
  const namedSource = entities.find((entity) => normalize(entity.name) === normalize(proposal.sourceName))
  const namedTarget = entities.find((entity) => normalize(entity.name) === normalize(proposal.targetName))
  if (namedSource && namedTarget && (!schema[0].includes(namedSource.type) || !schema[1].includes(namedTarget.type))) {
    return { ok: false, code: 'incompatible_entity_types', reason: `Типы ${namedSource.type} → ${predicate} → ${namedTarget.type} несовместимы`, proposal }
  }
  if (typeof proposal.quote !== 'string' || !proposal.quote || !chunk.text_content.includes(proposal.quote)) errors.push('Цитата отсутствует в исходном фрагменте')
  const source = resolveParticipant(proposal.sourceName, schema[0], proposal.quote ?? '', chunk, entities, predicate, 'source')
  const target = resolveParticipant(proposal.targetName, schema[1], proposal.quote ?? '', chunk, entities, predicate, 'target')
  if (source && target && (source.entity.entityId && source.entity.entityId === target.entity.entityId
    || source.entity.type === target.entity.type && normalize(source.entity.name) === normalize(target.entity.name))) {
    return { ok: false, code: 'self_relationship', reason: 'Субъект и объект связи разрешились в одну сущность', proposal }
  }
  if (!source || !target) errors.push('Участники связи не совпали с извлечёнными сущностями')
  if (source && target && (!schema[0].includes(source.entity.type) || !schema[1].includes(target.entity.type))) errors.push(`Типы ${source.entity.type} → ${predicate} → ${target.entity.type} несовместимы`)
  if (!source) errors.push('Субъект не сопоставлен с допустимой сущностью по цитате и локальному контексту')
  if (!target) errors.push('Объект не сопоставлен с допустимой сущностью по цитате и локальному контексту')
  if (errors.length) return { ok: false, code: 'relationship_validation_failed', reason: errors.join('; '), proposal }
  return { ok: true, relationship: {
    sourceName: source.entity.name, sourceType: source.entity.type, sourceResolution: source, predicate,
    targetName: target.entity.name, targetType: target.entity.type, targetResolution: target,
    quote: proposal.quote, status: ['CURRENT','PLANNED','CONDITIONAL','ENDED','UNKNOWN'].includes(proposal.status) ? proposal.status : 'UNKNOWN',
    attributes: proposal.attributes && typeof proposal.attributes === 'object' && !Array.isArray(proposal.attributes) ? proposal.attributes : {},
    sourceId: chunk.source_id, chunkId: chunk.chunk_id,
    startOffset: chunk.start_offset + chunk.text_content.indexOf(proposal.quote),
  } }
}

export async function extractRelationshipsFromChunks(chunks, entities, { callModel = createChatCompletion, batchSize = 3, profileCompany = null } = {}) {
  const relationships = []
  const rejected = []
  const modelCalls = []
  for (let offset = 0; offset < chunks.length; offset += batchSize) {
    const batch = chunks.slice(offset, offset + batchSize)
    const payload = batch.map((chunk, index) => {
      const chunkEntities = entities.filter((entity) => entity.sourceId === chunk.source_id && entity.chunkId === chunk.chunk_id)
        .map((entity) => ({ name: entity.name, type: entity.type, startOffset: entity.startOffset, entityId: entity.entityId }))
      if (profileCompany?.name) {
        const explicitNames = [profileCompany.name, ...(profileCompany.aliases ?? [])]
        const explicitMention = explicitNames.map((name) => ({ name, start: chunk.text_content.indexOf(name) }))
          .filter((item) => item.start >= 0)
          .sort((a, b) => a.start - b.start)[0]
        const alreadyPresent = chunkEntities.some((entity) => entity.entityId === profileCompany.entityId
          || normalize(entity.name) === normalize(profileCompany.name))
        if (explicitMention && !alreadyPresent) chunkEntities.push({
          name: profileCompany.name, type: 'COMPANY', entityId: profileCompany.entityId,
          aliases: profileCompany.aliases ?? [], startOffset: chunk.start_offset + explicitMention.start,
        })
        else if (alreadyPresent) {
          const existing = chunkEntities.find((entity) => entity.entityId === profileCompany.entityId || normalize(entity.name) === normalize(profileCompany.name))
          existing.aliases = [...new Set([...(existing.aliases ?? []), ...(profileCompany.aliases ?? [])])]
        }
      }
      return {
        id: `D${index + 1}`, sourceId: chunk.source_id, chunkId: chunk.chunk_id,
        text: chunk.text_content,
        entities: chunkEntities,
      }
    })
    if (payload.every((item) => item.entities.length < 2)) continue
    try {
      const result = await callModel({ purpose: 'B06 business relationship extraction', maxTokens: Math.floor(Math.min(6_000, Math.max(1_000, batch.reduce((sum, item) => sum + item.text_content.length, 0) / 2))), messages: [
        { role: 'system', content: prompt }, { role: 'user', content: JSON.stringify({ chunks: payload.map((item) => ({ ...item, entities: item.entities.map(({ aliases, ...entity }) => ({ ...entity, ...(aliases?.length ? { aliases } : {}) })) })) }) },
      ] })
      modelCalls.push(result)
      if (!Array.isArray(result.parsed?.chunks)) throw new Error('Ожидался массив chunks')
      for (const item of result.parsed.chunks) {
        const index = Number(String(item.chunkId ?? item.id ?? '').replace(/^D/u, '')) - 1
        const chunk = batch.find((candidate, batchIndex) => candidate.chunk_id === (item.chunkId ?? item.id)) ?? batch[index]
        if (!chunk) { rejected.push({ code: 'unknown_chunk', proposal: item }); continue }
        const payloadIndex = batch.findIndex((candidate) => candidate.chunk_id === chunk.chunk_id)
        const chunkEntities = payload[payloadIndex]?.entities ?? []
        for (const proposal of Array.isArray(item.relationships) ? item.relationships : []) {
          const normalizedProposal = normalizeRelationshipProposal(proposal, chunkEntities)
          const checked = verifyRelationship(chunk, normalizedProposal, chunkEntities)
          if (checked.ok) relationships.push(checked.relationship)
          else rejected.push({ ...checked, sourceId: chunk.source_id, chunkId: chunk.chunk_id })
        }
      }
    } catch (error) {
      modelCalls.push({ status: 'failed', purpose: 'B06 business relationship extraction', model: error.model || process.env.T10_DEEPSEEK_MODEL || 'deepseek/deepseek-v4-flash', error: error.message, latencyMs: error.latencyMs ?? null, inputTokens: error.inputTokens ?? null, outputTokens: error.outputTokens ?? null, costRub: error.costRub ?? null, parsed: error.response ?? null })
      rejected.push({ code: 'model_error', sourceIds: batch.map((chunk) => chunk.source_id), message: error.message })
    }
  }
  return { blockId: 'B06', status: rejected.some((item) => item.code === 'model_error') ? 'partial' : 'completed', relationships, rejected, modelCalls }
}
