import test from 'node:test'
import assert from 'node:assert/strict'
import { independentHoldoutScenarios } from '../benchmark/independent-holdout-scenarios.mjs'
import { independentRetrievalQueries } from '../benchmark/independent-holdout-retrieval-queries.mjs'
import { independentRetrievalQueries as independentHardRetrievalQueries } from '../benchmark/independent-holdout-retrieval-hard-queries.mjs'
import { realScenarios } from '../benchmark/real-scenarios.mjs'

test('frozen live holdout has 30 unique official sources and manually labeled relation/entity cases',()=>{
  assert.equal(independentHoldoutScenarios.length,30)
  assert.equal(new Set(independentHoldoutScenarios.map(item=>item.sourceUrl)).size,30)
  assert.equal(new Set(independentHoldoutScenarios.map(item=>item.company)).size,30)
  assert.equal(new Set(independentHoldoutScenarios.map(item=>item.id)).size,30)
  assert.ok(independentHoldoutScenarios.every(item=>/^https:\/\//u.test(item.sourceUrl)))
  assert.ok(independentHoldoutScenarios.every(item=>item.expectedEntities.length>0))
  assert.ok(independentHoldoutScenarios.every(item=>Array.isArray(item.expectedRelationships)))
  const oldCompanies=new Set(realScenarios.map(item=>item.company.toLocaleLowerCase('en-US')))
  assert.ok(independentHoldoutScenarios.every(item=>!oldCompanies.has(item.company.toLocaleLowerCase('en-US'))))
  const industries=new Set(independentHoldoutScenarios.map(item=>item.industry))
  for(const industry of ['oil and gas','telecommunications','pharmaceuticals','steel manufacturing','parcel logistics','electric utilities','commercial aviation','retail and distribution','cloud computing and software','fertilizer manufacturing'])assert.ok(industries.has(industry),`missing industry ${industry}`)
})

test('independent retrieval benchmark labels exactly one source for each of 30 prewritten queries',()=>{
  assert.equal(independentRetrievalQueries.length,30)
  assert.equal(new Set(independentRetrievalQueries.map(item=>item.id)).size,30)
  assert.ok(independentRetrievalQueries.every(item=>item.relevantChunkIds.length===1))
  assert.deepEqual(independentRetrievalQueries.map(item=>item.relevantChunkIds[0]).sort(),independentHoldoutScenarios.map(item=>item.id).sort())
  assert.ok(independentRetrievalQueries.every(item=>item.query.length>=15))
})

test('paraphrased retrieval challenge covers the same 30 frozen source labels',()=>{
  assert.equal(independentHardRetrievalQueries.length,30)
  assert.equal(new Set(independentHardRetrievalQueries.map(item=>item.id)).size,30)
  assert.ok(independentHardRetrievalQueries.every(item=>item.relevantChunkIds.length===1))
  assert.deepEqual(independentHardRetrievalQueries.map(item=>item.relevantChunkIds[0]).sort(),independentHoldoutScenarios.map(item=>item.id).sort())
  assert.ok(independentHardRetrievalQueries.every(item=>item.query.length>=15))
})
