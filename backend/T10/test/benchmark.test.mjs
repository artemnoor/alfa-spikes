import test from 'node:test'
import assert from 'node:assert/strict'
import { scoreLiveRelationTriples } from '../benchmark/live-expected-relations.mjs'

test('scores live relationship triples only when predicate, source and target match',()=>{
  const {cases,metrics}=scoreLiveRelationTriples([{scenarioId:'L01',relationships:[
    {predicate:'PRODUCES',subject:'ООО «Мехатрон-Синтез»',object:'промышленные редукторы'},
    {predicate:'SUPPLIES',subject:'«МеталлРесурс»',object:'ООО «Мехатрон-Синтез»'},
    {predicate:'SUPPLIES',subject:'ООО «Мехатрон-Синтез»',object:'«МеталлРесурс»'},
  ]}])
  assert.equal(metrics.expected,4)
  assert.equal(metrics.truePositive,2)
  assert.equal(metrics.falsePositive,1)
  assert.equal(metrics.falseNegative,2)
  assert.equal(cases[0].expectedRelationships.filter((item)=>item.found).length,2)
  assert.equal(cases[0].unexpectedRelationships.length,1)
})
