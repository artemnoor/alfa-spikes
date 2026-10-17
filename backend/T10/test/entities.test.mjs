import test from 'node:test'
import assert from 'node:assert/strict'
import { extractEntitiesFromChunks, verifyEntityExtraction } from '../src/entities.mjs'

const chunk = {
  chunk_id: 'chunk-1', source_id: 'source-1', start_offset: 100,
  text_content: 'АО «Север» выпускает турбины на заводе в Перми.',
}

test('entity verification accepts only exact source quotes and names evidenced in the quote', () => {
  const result = verifyEntityExtraction(chunk, { entities: [
    { type: 'COMPANY', name: 'АО «Север»', quote: 'АО «Север» выпускает турбины' },
    { type: 'FACILITY', name: 'заводе в Перми', quote: 'заводе в Перми' },
    { type: 'COMPANY', name: 'Невиданная компания', quote: 'АО «Север» выпускает турбины' },
    { type: 'ALIEN', name: 'Несуществующий тип', quote: 'АО «Север»' },
    { type: 'PRODUCT', name: 'Несуществующая цитата', quote: 'АО Север выпускает турбины' },
  ] })
  assert.equal(result.accepted.length, 2)
  assert.equal(result.accepted[0].startOffset, 100)
  assert.equal(result.accepted[1].quote, 'заводе в Перми')
  assert.deepEqual(result.rejected.map((item) => item.code), ['name_not_in_evidence','invalid_entity','quote_not_in_source'])
})

test('runs B04 in batches, maps chunk IDs, and preserves output only when evidence validates', async () => {
  let calls = 0
  const result = await extractEntitiesFromChunks([chunk], {
    callModel: async () => {
      calls += 1
      return { parsed: { chunks: [{ chunkId: 'D1', entities: [{ type: 'COMPANY', name: 'АО «Север»', quote: 'АО «Север» выпускает турбины' }] }] }, model: 'test', inputTokens: 80, outputTokens: 25 }
    },
  })
  assert.equal(calls, 1)
  assert.equal(result.status, 'completed')
  assert.equal(result.mentions.length, 1)
  assert.equal(result.mentions[0].sourceId, 'source-1')
})

test('marks model failure as partial instead of inventing an empty extraction', async () => {
  const result = await extractEntitiesFromChunks([chunk], { callModel: async () => { throw new Error('offline') } })
  assert.equal(result.status, 'partial')
  assert.equal(result.modelCalls[0].status, 'failed')
  assert.equal(result.rejected[0].code, 'model_error')
})

test('keeps only source-present identifiers with valid Russian INN/OGRN checksums', () => {
  const source={...chunk,text_content:'АО «Север» ИНН 7707083893 выпускает турбины. В другом документе указан ИНН 7700000000.'}
  const result=verifyEntityExtraction(source,{entities:[
    {type:'COMPANY',name:'АО «Север»',quote:'АО «Север» ИНН 7707083893 выпускает турбины',identifiers:{inn:'7707083893',ogrn:'1027700132195'}},
    {type:'COMPANY',name:'АО «Север»',quote:'АО «Север» ИНН 7707083893 выпускает турбины',identifiers:{inn:'7700000000'}},
  ]})
  assert.equal(result.accepted.length,2)
  assert.deepEqual(result.accepted[0].identifiers,{inn:'7707083893'})
  assert.equal(result.rejected.length,2)
  assert.ok(result.rejected.some((item)=>item.code==='identifier_not_in_source'))
  assert.ok(result.rejected.some((item)=>item.code==='invalid_identifier_checksum'))
})

test('normalizes an explicitly returned DIVISION type while preserving the model type', () => {
  const result = verifyEntityExtraction(chunk, { entities: [
    { type: 'DIVISION', name: 'АО «Север»', quote: 'АО «Север» выпускает турбины' },
  ] })
  assert.equal(result.accepted[0].type, 'BUSINESS_UNIT')
  assert.equal(result.accepted[0].originalType, 'DIVISION')
  assert.equal(result.accepted[0].typeNormalization, 'DIVISION_TO_BUSINESS_UNIT')
})
