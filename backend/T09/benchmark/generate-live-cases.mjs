import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const seeds = JSON.parse(await readFile(path.resolve(here, '../../pipeline/news-seed.json'), 'utf8'))
const original = JSON.parse(await readFile(new URL('./live-cases.json', import.meta.url), 'utf8')).cases

function entityFrom(title) {
  return title.match(/[«"]([^»"]+)[»"]/u)?.[1] || title.split(/\s+/u).slice(0, 2).join(' ')
}

function blocksFor({ title, content, candidate, relation, entity, scenario }) {
  const firstCandidateSentence = candidate.content.split(/[.!?]\s/u)[0]
  const eventText = relation === 'SAME'
    ? `То же конкретное событие или договор, что в кандидате «${candidate.title}». ${content}`
    : relation === 'RELATED'
      ? `Отдельное событие, прямо связанное с конкретным событием кандидата «${candidate.title}». Цитата исходного факта: ${firstCandidateSentence}`
      : relation === 'UNSURE'
        ? `Общая заметка без установленного события или связи с кандидатом «${candidate.title}».`
        : `Независимое событие, не связанное с кандидатом «${candidate.title}»: ${scenario}.`

  return [
    { key: 'topic', label: 'Тема', text: `Деловая новость; ${candidate.title}; ${title}.` },
    { key: 'event', label: 'Тип события', text: eventText },
    { key: 'entities', label: 'Сущности', text: `Компания: ${entity}. Упоминание кандидата: ${firstCandidateSentence}.` },
    { key: 'genre', label: 'Характер', text: `Русскоязычная деловая новость. ${relation === 'SAME' ? 'Уточнение того же события.' : relation === 'RELATED' ? 'Последующее событие с прямой связью.' : relation === 'UNSURE' ? 'Недостаточно фактов для связи.' : 'Самостоятельное событие.'}` },
  ]
}

function makeCase(candidate, kind, suffix) {
  const entity = entityFrom(candidate.title)
  const firstCandidateSentence = candidate.content.split(/[.!?]\s/u)[0]
  const candidateQuote = firstCandidateSentence.length >= 18 ? firstCandidateSentence : candidate.content.slice(0, Math.min(160, candidate.content.length))
  let expectedRelation
  let title
  let content
  let scenario

  if (kind === 'same') {
    expectedRelation = 'SAME'
    title = `Дополнение к новости: ${candidate.title}`
    content = `${candidate.content} В дополнительном сообщении компания уточнила параметры именно этого события: стороны, объект и ранее названные условия остаются теми же.`
    scenario = 'Парафраз того же события с подтверждёнными сторонами и условиями'
  } else if (kind === 'related') {
    expectedRelation = 'RELATED'
    title = `Последствия события: ${entity} сообщила о следующем шаге`
    content = `В связи с опубликованным сообщением «${candidateQuote}» компания ${entity} приняла отдельное решение по устранению прямых последствий именно этого события. Это новый этап, а не повтор исходного действия.`
    scenario = 'Отдельный ответ или последствие с явной текстовой связью и проверяемыми цитатами'
  } else if (kind === 'different_report') {
    expectedRelation = 'DIFFERENT'
    title = `${entity} опубликовала финансовые результаты за квартал`
    content = `${entity} сообщила о квартальной выручке и прибыли по итогам нового отчётного периода. Это самостоятельная публикация от 18 ноября и не связано с событием из сообщения «${candidateQuote}».`
    scenario = 'Другое корпоративное событие той же компании, но отдельная отчётность и период'
  } else if (kind === 'different_contract') {
    expectedRelation = 'DIFFERENT'
    title = `${entity} заключила новый договор на поставку оборудования`
    content = `${entity} подписала отдельный договор № T09-${suffix} на закупку офисного оборудования у нового поставщика. Это самостоятельная сделка, не связанная с ранее опубликованным событием «${candidateQuote}».`
    scenario = 'Новый самостоятельный договор той же компании с другим объектом и сторонами'
  } else {
    expectedRelation = 'UNSURE'
    title = `${entity} сообщила об изменениях в работе`
    content = `${entity} сообщила, что в её деятельности произошли изменения. Текст не указывает конкретные событие, дату, объект или контрагента и не говорит, связана ли новость с публикацией «${candidate.title}».`
    scenario = 'Недостаточно конкретики, чтобы подтвердить тождество, связь или независимость события'
  }

  return {
    id: `extended_${candidate.id}_${kind}`,
    scenario,
    expectedRelation,
    expectedCandidateId: candidate.id,
    title,
    publicationDate: `2026-11-${String((suffix % 27) + 1).padStart(2, '0')}`,
    content,
    blocks: blocksFor({ title, content, candidate, relation: expectedRelation, entity, scenario }),
  }
}

const generated = seeds.flatMap((candidate, index) => [
  makeCase(candidate, 'same', index + 1),
  makeCase(candidate, 'related', index + 1),
  makeCase(candidate, 'different_report', index + 1),
  makeCase(candidate, 'different_contract', index + 1),
  makeCase(candidate, 'unsure', index + 1),
])

const output = { description: 'Reproducible synthetic T09 benchmark: five relation scenarios per seeded event.', cases: [...original, ...generated] }
await writeFile(path.resolve(here, 'live-cases-expanded.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8')
process.stdout.write(`Wrote ${output.cases.length} live benchmark cases (${original.length} original + ${generated.length} generated).\n`)
