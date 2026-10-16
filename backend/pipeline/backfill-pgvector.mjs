const archiveUrl = process.env.PIPELINE_ARCHIVE_URL || 'http://127.0.0.1:8094'
const t09Url = process.env.T09_API_URL || 'http://127.0.0.1:8092'
const entityTypeLabels = {
  ORGANIZATION: 'организация', PERSON: 'человек', LOCATION: 'место', MONEY: 'сумма', DATE: 'дата',
  PERCENT: 'процент', PRODUCT: 'продукт', FACILITY: 'объект', LAW: 'закон', QUANTITY: 'количество',
}
const eventStatusLabels = {
  completed: 'завершено', announced: 'объявлено', planned: 'запланировано', conditional: 'условное', denied: 'опровергнуто',
}

function formatBlocks(source, analysis) {
  const classifications = analysis?.classifications || {}
  const topic = classifications.topic || {}
  const event = classifications.event || {}
  const entities = classifications.entities || {}
  const genre = classifications.genre || {}
  const topicPath = (topic.path || []).map((step) => step.label).filter(Boolean).join(' › ')
  const eventPath = (event.path || []).map((step) => step.label).filter(Boolean).join(' › ')
  const genrePath = (genre.path || []).map((step) => step.label).filter(Boolean).join(' › ')
  const entityList = Array.isArray(entities.entities) ? entities.entities : []
  const entityById = new Map(entityList.map((item) => [item.id, item.name]))

  const entityLines = entityList.map((entity) => {
    const type = entityTypeLabels[entity.type] ?? String(entity.type || 'сущность').toLowerCase()
    const legalForm = entity.legal_form ? `; правовая форма: ${entity.legal_form}` : ''
    const normalized = entity.normalized_name && entity.normalized_name !== entity.name ? `; нормализовано: ${entity.normalized_name}` : ''
    const mention = entity.mention && entity.mention !== entity.name ? `; упоминание: ${entity.mention}` : ''
    const evidence = entity.evidence ? `; цитата: «${entity.evidence}»` : ''
    return `${type}: ${entity.name}${legalForm}${normalized}${mention}${entity.role ? `; роль: ${entity.role}` : ''}${evidence}`
  })
  const eventLines = (Array.isArray(entities.events) ? entities.events : []).map((item) => {
    const participants = (item.participants || [])
      .map((participant) => `${entityById.get(participant.entity_id) ?? participant.entity_id}${participant.role ? ` (${participant.role})` : ''}`)
      .join(', ')
    const attributes = (item.attributes || []).map((attribute) => attribute.mention).filter(Boolean).join(', ')
    const status = eventStatusLabels[item.event_status ?? 'announced'] ?? item.event_status ?? 'объявлено'
    return `Событие: ${item.label}; статус: ${status}; участники: ${participants || 'не указаны'}${attributes ? `; факты: ${attributes}` : ''}${item.evidence ? `; цитата: «${item.evidence}»` : ''}`
  })
  const relationLines = (Array.isArray(entities.relations) ? entities.relations : []).map((relation) =>
    `Связь: ${entityById.get(relation.subject_id) ?? relation.subject_id} — ${relation.label ?? relation.predicate} → ${entityById.get(relation.object_id) ?? relation.object_id}${relation.event_status ? `; статус: ${eventStatusLabels[relation.event_status] ?? relation.event_status}` : ''}${relation.evidence ? `; цитата: «${relation.evidence}»` : ''}`,
  )
  const sentivent = entities.sentivent_classification
  const sentiventLines = sentivent ? [
    `Стандартная классификация SENTiVENT: ${sentivent.label ?? 'событие не подходит под типологию'}`,
    sentivent.path?.length ? `Путь SENTiVENT: ${sentivent.path.map((step) => step.label).join(' › ')}` : '',
    sentivent.evidence_text ? `Цитата SENTiVENT: ${sentivent.evidence_text}` : '',
  ] : []

  return [
    {
      key: 'topic', label: 'Тема',
      text: [`Новость: ${source.title}`, `Классификация темы IPTC: ${topic.value?.label ?? 'не определена'}`, topicPath ? `Путь: ${topicPath}` : '', topic.evidenceQuote ? `Подтверждение в тексте: ${topic.evidenceQuote}` : ''].filter(Boolean).join('\n'),
    },
    {
      key: 'event', label: 'Тип события',
      text: [`Новость: ${source.title}`, `Классификация SENTiVENT: ${event.value?.label ?? 'не определено'}`, eventPath ? `Путь: ${eventPath}` : '', event.evidence_text ? `Подтверждение в тексте: ${event.evidence_text}` : '', event.evidence_verified === true ? 'Цитата подтверждена в исходном тексте.' : ''].filter(Boolean).join('\n'),
    },
    {
      key: 'entities', label: 'Сущности и связи',
      text: [`Новость: ${source.title}`, ...sentiventLines, entityLines.length ? `Сущности:\n${entityLines.join('\n')}` : 'Сущности не найдены.', eventLines.length ? eventLines.join('\n') : '', relationLines.length ? `Отношения:\n${relationLines.join('\n')}` : ''].filter(Boolean).join('\n'),
    },
    {
      key: 'genre', label: 'Характер',
      text: [`Новость: ${source.title}`, `Классификация IPTC Genre: ${genre.value?.label ?? 'не определён'}`, genrePath ? `Путь: ${genrePath}` : ''].filter(Boolean).join('\n'),
    },
  ]
}

const archiveResponse = await fetch(`${archiveUrl}/records`)
if (!archiveResponse.ok) throw new Error(`Архив вернул HTTP ${archiveResponse.status}`)
const { records = [] } = await archiveResponse.json()
const targetNewsId = process.env.T09_BACKFILL_NEWS_ID
const candidateRecords = targetNewsId ? records.filter((record) => record.id === targetNewsId) : records
const entries = candidateRecords.flatMap((record) => {
  const latest = record.stageRuns
    .filter((run) => run.stage === 'T08' && run.status === 'completed' && run.output?.classifications)
    .at(-1)
  return latest ? [{ record, analysis: latest.output }] : []
})

let indexed = 0
let failures = 0
for (const { record, analysis } of entries) {
  const response = await fetch(`${t09Url}/vectorize`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      newsId: record.id,
      title: record.title,
      content: record.content,
      publicationDate: record.publicationDate,
      sourceKind: record.sourceKind,
      blocks: formatBlocks(record, analysis),
    }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    failures += 1
    process.stdout.write(`FAIL ${record.id} ${response.status}: ${result.error || 'ошибка без описания'}\n`)
    continue
  }
  indexed += 1
  const resolution = result.decision
    ? `${result.decision.relation} / ${result.decision.resolution} · ${result.decision.decidedBy} ${Math.round(result.decision.confidence * 100)}%`
    : result.nearest?.title || 'не получено'
  process.stdout.write(`OK ${indexed}/${entries.length} · ${record.title} · решение: ${resolution}\n`)
}

process.stdout.write(`Готово: сохранено ${indexed} из ${entries.length} новостей; ошибок: ${failures}.\n`)
if (failures) process.exitCode = 1
