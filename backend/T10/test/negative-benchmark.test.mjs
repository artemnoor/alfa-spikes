import test from 'node:test'
import assert from 'node:assert/strict'
import { negativeScenarios } from '../benchmark/negative-scenarios.mjs'

test('adversarial B07 live set covers the required semantic failure modes with exact evidence spans', () => {
  const required = ['direct-positive-control','negation','conditional','future-status-mismatch','reversed-direction','co-mention-without-relation','ended-relationship','source-contradiction','prompt-injection','indirect-not-entailing']
  assert.deepEqual(negativeScenarios.map((scenario) => scenario.family), required)
  assert.equal(new Set(negativeScenarios.map((scenario) => scenario.id)).size, negativeScenarios.length)
  for (const scenario of negativeScenarios) {
    assert.ok(scenario.text.includes(scenario.proposal.quote), `${scenario.id} quote must be an exact source substring`)
    assert.equal(scenario.expectedSupported, scenario.family === 'direct-positive-control')
  }
})
