import { createChatCompletion } from './polza.mjs'
import { validateInn, validateOgrn } from './identity.mjs'

export const BUSINESS_ENTITY_TYPES = new Set(['COMPANY','BUSINESS_UNIT','PRODUCT','SERVICE','COMPONENT','FACILITY','RESOURCE','PROCESS','CONTRACT','LOCATION','PERSON','TECHNOLOGY'])

const systemPrompt = `Извлеки все бизнес-сущности, прямо названные в фрагментах. Типы: COMPANY (company, group, legal entity), BUSINESS_UNIT (division, business unit, segment), PRODUCT (goods, commodities, materials sold or made, e.g. gold, nickel, hydrocarbons, natural gas), SERVICE (paid or offered service, e.g. cloud, telecom, delivery), COMPONENT (part/material used by a product or process), FACILITY (plant, factory, warehouse, data centre, production line, store), RESOURCE (energy, water, raw material used by operations), PROCESS (business/production process), CONTRACT, LOCATION, PERSON, TECHNOLOGY. Treat explicit commercial outputs such as metals, fuels, medicines and food as PRODUCT even when the text only reports their production volume. Do not omit an explicit entity merely because it has a quantity or appears in a table-like sentence. Do not infer products from industry knowledge; use only terms in the fragment. Не делай выводов из общих знаний и не дополняй отсутствующие сведения. Для каждой сущности верни короткое точное name как в цитате, type, quote — непрерывную дословную цитату, attributes только если они прямо указаны и identifiers только для явно напечатанных ИНН/ОГРН/LEI/артикулов/номеров договора. Каждый идентификатор должен буквально встречаться в соответствующем фрагменте; не восстанавливай и не форматируй его. Верни только JSON вида {"chunks":[{"chunkId":"D1","entities":[{"type":"COMPANY","name":"АО «Пример»","quote":"АО «Пример» (ИНН 7707083893) производит насосы","attributes":{},"identifiers":{"inn":"7707083893"}}]}]}. Для каждого входного chunk обязательно верни его id и массив entities; если сущностей нет — пустой массив. Не используй типы, отсутствующие в списке.`

function normalizeForContainment(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('ru-RU').replace(/[\s«»“”„‟"'`.,;:()[\]{}]+/gu, ' ').trim()
}

export function verifyEntityExtraction(chunk, parsed) {
  const accepted = []
  const rejected = []
  if (!parsed || !Array.isArray(parsed.entities)) return { accepted, rejected: [{ code: 'invalid_schema', reason: 'Ожидался массив entities' }] }
  for (const [index, entity] of parsed.entities.entries()) {
    const originalType = String(entity?.type ?? '').trim().toUpperCase().replace(/[\s-]+/gu, '_')
    const normalizedType = ({ DIVISION: 'BUSINESS_UNIT', BUSINESS_SEGMENT: 'BUSINESS_UNIT', SEGMENT: 'BUSINESS_UNIT' })[originalType] ?? originalType
    if (!entity || !BUSINESS_ENTITY_TYPES.has(normalizedType)
      || typeof entity.name !== 'string' || !entity.name.trim() || typeof entity.quote !== 'string' || !entity.quote.trim()) {
      rejected.push({ index, code: 'invalid_entity', reason: 'Нужны допустимый тип, название и цитата' })
      continue
    }
    const quoteStart = chunk.text_content.indexOf(entity.quote)
    if (quoteStart < 0) {
      rejected.push({ index, code: 'quote_not_in_source', reason: 'Цитата отсутствует в исходном фрагменте', proposal: entity })
      continue
    }
    const normalizedName = normalizeForContainment(entity.name)
    if (!normalizedName || !normalizeForContainment(entity.quote).includes(normalizedName)) {
      rejected.push({ index, code: 'name_not_in_evidence', reason: 'Название сущности не подтверждается её цитатой', proposal: entity })
      continue
    }
    const quote = entity.quote.normalize('NFKC')
    const evidenceStart = chunk.text_content.indexOf(quote)
    const identifiers = {}
    for (const [rawKey,rawValue] of Object.entries(entity.identifiers && typeof entity.identifiers==='object' && !Array.isArray(entity.identifiers) ? entity.identifiers : {})) {
      const key=String(rawKey).toLocaleLowerCase('en-US').replace(/[^a-z]/gu,'')
      const value=String(rawValue??'').normalize('NFKC').trim()
      const sourceHasValue=Boolean(value) && (key==='inn' || key==='ogrn' ? chunk.text_content.replace(/\D/gu,'').includes(value.replace(/\D/gu,'')) : chunk.text_content.includes(value))
      const checksumValid=key==='inn' ? validateInn(value) : key==='ogrn' ? validateOgrn(value) : true
      if (!['inn','ogrn','lei','sku','articlecode','contractnumber','registrationnumber'].includes(key) || !sourceHasValue || !checksumValid) {
        rejected.push({ index, code:!sourceHasValue?'identifier_not_in_source':!checksumValid?'invalid_identifier_checksum':'unsupported_identifier_type', reason:`Идентификатор ${rawKey} не прошёл проверку источника или контрольной суммы`, proposal:{type:entity.type,name:entity.name,key:rawKey,value:rawValue},sourceId:chunk.source_id,chunkId:chunk.chunk_id })
        continue
      }
      identifiers[key]=key==='inn'||key==='ogrn' ? value.replace(/\D/gu,'') : value
    }
    accepted.push({
      type: normalizedType, ...(normalizedType !== originalType ? { originalType, typeNormalization: 'DIVISION_TO_BUSINESS_UNIT' } : {}), name: entity.name.normalize('NFKC').trim(),
      normalizedName, identifiers, attributes: entity.attributes && typeof entity.attributes === 'object' && !Array.isArray(entity.attributes) ? entity.attributes : {},
      quote, startOffset: chunk.start_offset + evidenceStart, endOffset: chunk.start_offset + evidenceStart + quote.length,
      chunkId: chunk.chunk_id, sourceId: chunk.source_id,
    })
  }
  return { accepted, rejected }
}

export async function extractEntitiesFromChunks(chunks, { callModel = createChatCompletion, batchSize = 3 } = {}) {
  const entities = []
  const mentions = []
  const rejected = []
  const modelCalls = []
  for (let offset = 0; offset < chunks.length; offset += batchSize) {
    const batch = chunks.slice(offset, offset + batchSize)
    const payload = batch.map((chunk, index) => ({ id: `D${index + 1}`, sourceId: chunk.source_id, chunkId: chunk.chunk_id, text: chunk.text_content }))
    try {
      const result = await callModel({
        purpose: 'B04 business entity extraction', maxTokens: Math.floor(Math.min(6_000, Math.max(1_000, batch.reduce((total, item) => total + (item.text_content ?? item.text).length, 0) / 3))),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify({ chunks: payload }) },
        ],
      })
      modelCalls.push(result)
      const entitiesByChunk = result.parsed?.chunks
      const returned = Array.isArray(entitiesByChunk) ? entitiesByChunk : null
      if (returned) {
        for (const item of returned) {
          const chunk = batch.find((candidate, index) => [`D${index + 1}`, candidate.chunk_id].includes(item.chunkId ?? item.id))
          if (!chunk) { rejected.push({ code: 'unknown_chunk', proposal: item }); continue }
          const verified = verifyEntityExtraction(chunk, { entities: item.entities })
          entities.push(...verified.accepted)
          mentions.push(...verified.accepted)
          rejected.push(...verified.rejected.map((entry) => ({ ...entry, sourceId: chunk.source_id, chunkId: chunk.chunk_id })))
        }
      } else {
        throw new Error('Ожидался массив chunks с ID фрагментов')
      }
    } catch (error) {
      const failed = { status: 'failed', purpose: 'B04 business entity extraction', model: error.model || process.env.T10_DEEPSEEK_MODEL || 'deepseek/deepseek-v4-flash', error: error.message, latencyMs: error.latencyMs ?? null, inputTokens: error.inputTokens ?? null, outputTokens: error.outputTokens ?? null, costRub: error.costRub ?? null, parsed: error.response ?? null }
      modelCalls.push(failed)
      rejected.push({ code: 'model_error', sourceIds: batch.map((item) => item.source_id), message: error.message })
    }
  }
  return { blockId: 'B04', status: rejected.some((item) => item.code === 'model_error') ? 'partial' : 'completed', entities, mentions, rejected, modelCalls }
}
