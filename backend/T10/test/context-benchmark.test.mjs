import test from 'node:test'
import assert from 'node:assert/strict'
import { contextLiveScenarios } from '../benchmark/context-live-scenarios.mjs'

test('targeted live context benchmark covers unique antecedent, ambiguity and quoted-participant recovery',()=>{
  assert.equal(contextLiveScenarios.length,3)
  assert.deepEqual(contextLiveScenarios.map((scenario)=>scenario.family),[
    'unique-cross-chunk-company-reference',
    'ambiguous-cross-chunk-company-reference',
    'quoted-unique-type-participant-recovery',
  ])
  const ambiguous=contextLiveScenarios.find((scenario)=>scenario.id==='CC02')
  assert.equal(ambiguous.expectedSupported,false)
  assert.equal(ambiguous.entities.filter((entity)=>entity.type==='COMPANY'&&entity.chunkId===ambiguous.chunks[0].chunk_id).length,2)
  const recovery=contextLiveScenarios.find((scenario)=>scenario.id==='CC03')
  assert.equal(recovery.expected.targetName,'rhodium')
  assert.equal(recovery.entities.some((entity)=>entity.name==='rhodium'),false)
  assert.ok(contextLiveScenarios.every((scenario)=>scenario.chunks.every((chunk)=>chunk.source_id===scenario.chunks[0].source_id)))
})
