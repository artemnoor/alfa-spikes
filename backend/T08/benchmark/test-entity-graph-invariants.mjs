import assert from 'node:assert/strict'
import { extractAndLinkEntities, inferEventStatus, normalizeEntityValue } from '../src/entities.mjs'

if (!process.env.POLZA_AI_API_KEY && !process.env.POLZA_API_KEY) throw new Error('Set the Polza AI key for this local mocked API test')

const article1 = 'Заголовок: Компания «ВекторМаш» получила кредит на 3,2 млрд рублей для строительства завода\n\nПресс-служба АО «ВекторМаш» сообщила о подписании кредитного соглашения с банком «Орбита» на сумму 3,2 млрд рублей сроком на семь лет. Средства направят на строительство предприятия по производству промышленных роботов в Тульской области. Запуск производства запланирован на третий квартал 2027 года. Компания рассчитывает создать 450 рабочих мест.'
const article3 = 'Заголовок: «ТрансЛайн» приобретает конкурента за 5,6 млрд рублей\n\nЛогистическая компания «ТрансЛайн» объявила о заключении соглашения по покупке 80% акций транспортного оператора «ЭкспрессКарго» за 5,6 млрд рублей. Закрытие сделки ожидается в декабре после получения необходимых согласований.'
const facilityArticle = 'Заголовок: Компания «Север» запустила новую производственную линию\n\nКомпания «Север» запустила новую производственную линию аккумуляторов в Калуге. Линия может выпускать до 40 тысяч батарей в месяц.'

const scenarios = [
  {
    article: article1,
    metadata: { date: '15 октября 2026' },
    raw: {
      entities: [
        { id: 'e1', type: 'ORGANIZATION', name: 'ВекторМаш', mention: 'АО «ВекторМаш»', evidence: 'Пресс-служба АО «ВекторМаш»', source: 'article', role: null },
        { id: 'e2', type: 'ORGANIZATION', name: 'ВекторМаш', mention: '«ВекторМаш»', evidence: 'Компания «ВекторМаш» получила кредит', source: 'article', role: null },
      ],
      events: [{ id: 'v1', type: 'CREDIT_AGREEMENT', label: 'Кредит', evidence: 'Пресс-служба АО «ВекторМаш» сообщила о подписании кредитного соглашения с банком «Орбита» на сумму 3,2 млрд рублей сроком на семь лет.', participants: [{ entity_id: 'e1', role: 'borrower' }], attributes: [] }],
      relations: [],
    },
    check(result) {
      const companies = result.entities.filter((entity) => entity.type === 'ORGANIZATION' && entity.normalized_name === 'вектормаш')
      assert.equal(companies.length, 1, 'same organization under two mentions must be deduplicated')
      assert.deepEqual(companies[0].alternate_mentions, ['«ВекторМаш»'])
      assert.equal(companies[0].legal_form, 'АО')
      const bank = result.entities.find((entity) => entity.name === 'Орбита')
      assert.ok(bank, 'bank mentioned only inside the event quote must be recovered')
      const creditLink = result.relations.find((relation) => relation.subject_id === bank.id && relation.predicate === 'provided_credit_to')
      assert.ok(creditLink, 'lender relation must be created from event roles')
      assert.ok(creditLink.evidence.includes('Орбита') && creditLink.evidence.includes('ВекторМаш'))
      assert.ok(result.entities.some((entity) => entity.type === 'FACILITY'), 'factory/plant must be represented in the graph')
      assert.ok(result.relations.some((relation) => relation.predicate === 'located_in'), 'facility location should be linked with compatible endpoint types')
      assert.equal(result.events[0].graph_type, result.events[0].type)
      assert.equal(result.events[0].event_status, 'completed')
      assert.ok(result.events[0].attributes.some((attribute) => attribute.mention === '450 рабочих мест'), 'grounded numerical facts outside the model quote should be recovered')
      assert.ok(result.entities.some((entity) => entity.type === 'DATE' && entity.source === 'metadata' && entity.normalized_value === '2026-10-15'))
    },
  },
  {
    article: article3,
    raw: {
      entities: [
        { id: 'e1', type: 'ORGANIZATION', mention: '«ТрансЛайн»', role: 'acquirer' },
        { id: 'e2', type: 'ORGANIZATION', mention: '«ЭкспрессКарго»', role: 'target' },
      ],
      events: [{ id: 'v1', type: 'ACQUISITION', label: 'Покупка акций', evidence: 'Логистическая компания «ТрансЛайн» объявила о заключении соглашения по покупке 80% акций транспортного оператора «ЭкспрессКарго» за 5,6 млрд рублей.', participants: [{ entity_id: 'e1', role: 'acquirer' }, { entity_id: 'e2', role: 'target' }], attributes: [{ type: 'PERCENT', mention: '80%' }] }],
      relations: [{ subject_id: 'e1', predicate: 'acquisition_of', object_id: 'e2', event_id: 'v1', label: 'приобретает' }],
    },
    check(result) {
      const acquirer = result.entities.find((entity) => entity.name === 'ТрансЛайн')
      const target = result.entities.find((entity) => entity.name === 'ЭкспрессКарго')
      const acquisitionLink = result.relations.find((relation) => relation.subject_id === acquirer.id && relation.object_id === target.id && relation.predicate === 'acquisition_of')
      assert.ok(acquisitionLink)
      assert.ok(article3.includes(acquisitionLink.evidence), 'relation quote must be inherited from its event and remain grounded')
      assert.equal(result.events[0].event_status, 'announced')
      assert.equal(result.events[0].attributes[0].evidence, '80%', 'backend should derive fact evidence from its exact mention')
    },
  },
  {
    article: facilityArticle,
    expectedStatus: 'partial',
    raw: {
      entities: [
        { id: 'e1', type: 'ORGANIZATION', mention: '«Север»', evidence: 'Компания «Север»', source: 'article' },
        { id: 'e2', type: 'FACILITY', mention: 'производственную линию аккумуляторов', evidence: 'новую производственную линию аккумуляторов', source: 'article' },
        { id: 'e3', type: 'LOCATION', mention: 'Калуге', evidence: 'Калуге', source: 'article' },
        { id: 'e4', type: 'FACILITY', mention: 'секретный завод', evidence: 'секретный завод', source: 'article' },
      ],
      events: [
        { id: 'v1', type: 'launch', label: 'Запуск линии', evidence: 'Компания «Север» запустила новую производственную линию аккумуляторов в Калуге.', participants: [{ entity_id: 'e1', role: 'subject' }, { entity_id: 'e2', role: 'facility' }], attributes: [] },
        { id: 'v2', type: 'production', label: 'Производство', evidence: 'Линия может выпускать до 40 тысяч батарей в месяц.', participants: [{ entity_id: 'e1', role: 'subject' }], attributes: [{ type: 'QUANTITY', mention: 'до 40 тысяч батарей в месяц', evidence: 'до 40 тысяч батарей в месяц' }] },
      ],
      relations: [
        { subject_id: 'e1', predicate: 'launches', object_id: 'e3', event_id: 'v1' },
        { subject_id: 'e1', predicate: 'plans_to_build', object_id: 'e2', event_id: 'v1' },
        { subject_id: 'e1', predicate: 'launches', object_id: 'e2', event_id: 'v1' },
        { subject_id: 'e2', predicate: 'located_in', object_id: 'e3', event_id: 'v1' },
      ],
    },
    check(result) {
      assert.equal(result.rejectedEntities, 1, 'an invented facility must be rejected')
      assert.equal(result.rejectedRelations, 2, 'type-incompatible and text-unsupported relations must be rejected')
      assert.equal(result.entities.filter((entity) => entity.type === 'FACILITY').length, 1)
      assert.ok(result.relations.some((relation) => relation.predicate === 'launches'
        && result.entities.find((entity) => entity.id === relation.subject_id)?.type === 'ORGANIZATION'
        && result.entities.find((entity) => entity.id === relation.object_id)?.type === 'FACILITY'))
      assert.ok(result.relations.some((relation) => relation.predicate === 'located_in'
        && result.entities.find((entity) => entity.id === relation.subject_id)?.type === 'FACILITY'
        && result.entities.find((entity) => entity.id === relation.object_id)?.type === 'LOCATION'))
      const quantity = result.events.find((event) => event.type === 'production').attributes[0]
      assert.equal(quantity.qualifier, 'at_most', '“до 40 тысяч” must be a maximum, not an exact quantity')
      assert.deepEqual(quantity.normalized_value, { value: 40000, unit: 'batteries_per_month', qualifier: 'at_most' })
    },
  },
  {
    article: 'Заголовок: Компания может отказаться от проекта\n\nЕсли спрос снизится, компания «Север» будет вынуждена остановить строительство. Решение пока не принято.',
    truncated: true,
    check(result) {
      assert.equal(result.status, 'partial')
      assert.equal(result.finishReason, 'length')
      assert.equal(result.partialReason, 'finish_reason=length')
      assert.equal(result.outputTokens, 3000)
      assert.equal(result.eventGraphMode, 'grounded_sentence_fallback')
      assert.ok(result.events.some((event) => event.event_status === 'conditional'), 'truncated replies should still yield a quoted conditional event')
    },
  },
  {
    article: 'Заголовок: «Меридиан» объявил о соглашении по покупке конкурента\n\nКомпания «Меридиан» объявила о соглашении по покупке 60% акций конкурента «Альтаир» за 1,8 млрд рублей. Передача акций еще не состоялась.',
    expectedStatus: 'partial',
    raw: { entities: [], events: [], relations: [] },
    check(result) {
      assert.equal(result.status, 'partial')
      assert.equal(result.eventGraphMode, 'grounded_sentence_fallback')
      assert.ok(result.events.some((event) => event.event_status === 'announced'))
      assert.ok(result.relations.some((relation) => relation.predicate === 'acquisition_of'), 'fallback event must preserve the acquisition relation')
    },
  },
  {
    article: 'Заголовок: «Север» запустил завод\n\nКомпания «Север» запустила завод в Перми.',
    truncated: true,
    content: '{"events":[{"id":"v1","type":"launch","label":"Запуск завода","evidence":"Компания «Север» запустила завод в Перми.","participants":[{"entity_id":"e1","role":"company"}],"attributes":[]}],"entities":[{"id":"e1","type":"ORGANIZATION","name":"Север","mention":"«Север»","evidence":"Компания «Север»","source":"article","role":"company"}],"relations":[',
    check(result) {
      assert.equal(result.status, 'partial')
      assert.equal(result.extractionMode, 'partial_json_salvage')
      assert.equal(result.events.length, 1)
      assert.equal(result.events[0].event_status, 'completed')
      assert.ok(result.events[0].participants.some((participant) => participant.role === 'company'))
    },
  },
]

let scenarioIndex = 0
let modelCalls = 0
const originalFetch = globalThis.fetch
globalThis.fetch = async (input) => {
  const url = new URL(input)
  if (url.hostname === 'egrul.nalog.ru') return Response.json({ captchaRequired: true })
  if (!url.hostname.includes('polza.ai')) throw new Error(`Unexpected test request: ${url.hostname}`)
  modelCalls += 1
  const scenario = scenarios[scenarioIndex++]
  return Response.json({
    choices: [{ finish_reason: scenario.truncated ? 'length' : 'stop', message: { content: scenario.content ?? (scenario.truncated ? '{"entities":[' : JSON.stringify(scenario.raw)) } }],
    usage: { prompt_tokens: 10, completion_tokens: scenario.truncated ? 3000 : 100, cost_rub: 0 },
  })
}

try {
  for (const scenario of scenarios) {
    const result = await extractAndLinkEntities(scenario.article, scenario.metadata ?? {})
    assert.equal(result.status, scenario.expectedStatus ?? (scenario.truncated ? 'partial' : 'model'), scenario.article.slice(0, 80))
    scenario.check(result)
  }
  assert.equal(modelCalls, scenarios.length, 'a length-truncated response must not trigger a retry')
} finally {
  globalThis.fetch = originalFetch
}

for (const [input, expected] of [
  ['Компания запустила производство.', 'completed'],
  ['Компания объявила о запуске продукта.', 'announced'],
  ['Компания планирует открыть производство.', 'planned'],
  ['Если спрос упадёт, компания может остановить завод.', 'conditional'],
  ['Представитель опроверг информацию о взломе.', 'denied'],
]) assert.equal(inferEventStatus({ evidence: input }), expected)
assert.equal(normalizeEntityValue({ type: 'DATE', name: '2028 году' }, article3), '2028')

process.stdout.write('Verified graph entities/relations, event statuses, and one-call partial fallback at finish_reason=length.\n')
