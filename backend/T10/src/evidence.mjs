import { RELATION_COMPATIBILITY } from './relationships.mjs'

const normalizeText = (value) => String(value ?? '').normalize('NFKC').toLocaleLowerCase('ru-RU').replace(/[«»“”„‟"'`.,;:()[\]{}]+/gu,' ').replace(/\s+/gu,' ').trim()
const numericAttributeKeys = new Set(['amount','quantity','volume','capacity','percentage','percent','duration','employees','workplaces','value','count','shares','share_percent'])
const dateAttributeKeys = new Set(['validfrom','validto','date','publishedat','startdate','enddate'])
const ignoredAttributeKeys = new Set(['relationshipstatus','status','source','sourceid','chunkid'])

function flattenAttributes(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [[prefix, value]]
  return Object.entries(value).flatMap(([key, child])=>flattenAttributes(child,prefix ? `${prefix}.${key}` : key))
}

function sourceContainsNumber(quote, value) {
  const numeric = Number(String(value).replace(',','.'))
  if (!Number.isFinite(numeric)) return normalizeText(quote).includes(normalizeText(value))
  const tokens = String(quote).match(/\d+(?:[.,]\d+)?/gu) ?? []
  return tokens.some((token)=>Number(token.replace(',','.'))===numeric)
}

export function validateAttributesAgainstQuote(attributes, quote) {
  const problems=[]
  for (const [path,value] of flattenAttributes(attributes)) {
    const key=path.split('.').at(-1).toLocaleLowerCase('en-US').replace(/[_-]/gu,'')
    if (value == null || ignoredAttributeKeys.has(key)) continue
    if (numericAttributeKeys.has(key)) {
      if (!sourceContainsNumber(quote,value)) problems.push(`Числовой атрибут ${path} не подтверждён цитатой`)
      continue
    }
    if (dateAttributeKeys.has(key)) {
      const text=normalizeText(quote)
      const dateText=normalizeText(value)
      if (!dateText || !text.includes(dateText)) problems.push(`Дата ${path} не совпадает с текстом цитаты`)
      continue
    }
    if (['unit','currency','qualifier'].includes(key)) {
      if (typeof value==='string' && !normalizeText(quote).includes(normalizeText(value))) problems.push(`Единица или квалификатор ${path} не подтверждён цитатой`)
      continue
    }
    if (typeof value === 'string' && /[\p{L}\p{N}]{3}/u.test(value) && !normalizeText(quote).includes(normalizeText(value))) {
      problems.push(`Атрибут ${path} не подтверждён цитатой`)
    }
  }
  return problems
}

function explicitInterval(attributes) {
  const from=attributes?.validFrom ?? attributes?.startDate
  const to=attributes?.validTo ?? attributes?.endDate
  if (!from || !to) return null
  const start=Date.parse(from), end=Date.parse(to)
  if (!Number.isFinite(start) || !Number.isFinite(end) || start>end) return null
  return {start,end}
}

function intervalsOverlap(left,right) { return Boolean(left && right && left.start<=right.end && right.start<=left.end) }

function contradictoryAttributes(left = {}, right = {}) {
  const ignored=new Set(['relationshipStatus','validFrom','validTo','startDate','endDate'])
  for (const [key,value] of Object.entries(left)) {
    if (ignored.has(key) || !(key in right)) continue
    const other=right[key]
    if (value == null || other == null || typeof value === 'object' || typeof other === 'object') continue
    if (normalizeText(value)!==normalizeText(other)) return {key,left:value,right:other}
  }
  const leftStatus=left.relationshipStatus, rightStatus=right.relationshipStatus
  if (leftStatus && rightStatus && leftStatus!==rightStatus && ['CURRENT','ENDED'].includes(leftStatus) && ['CURRENT','ENDED'].includes(rightStatus)) return {key:'relationshipStatus',left:leftStatus,right:rightStatus}
  return null
}

function sameRelationship(left,right) {
  return normalizeText(left.subject?.name ?? left.sourceName ?? left.subject_name)===normalizeText(right.subject?.name ?? right.sourceName ?? right.subject_name)
    && normalizeText(left.object?.name ?? left.targetName ?? left.object_name)===normalizeText(right.object?.name ?? right.targetName ?? right.object_name)
    && left.predicate===right.predicate
}

export function verifyBusinessProposal(proposal, { sourceText, sourceId, sourceStatus = 'available', sourceAccessLevel = 'customer_internal', subject, object }) {
  const errors = []
  if (!sourceId || !['available','processed'].includes(sourceStatus)) errors.push('Источник отсутствует или недоступен')
  if (typeof sourceText !== 'string' || !sourceText) errors.push('Не сохранён исходный текст')
  const quote = String(proposal.quote ?? '')
  const offset = sourceText?.indexOf(quote) ?? -1
  if (!quote || offset < 0) errors.push('Цитата не совпадает с исходным документом')
  const pair = RELATION_COMPATIBILITY[proposal.predicate]
  if (!pair) errors.push('Неизвестный тип связи')
  else if (!subject || !object || !pair[0].includes(subject.type) || !pair[1].includes(object.type)) errors.push('Типы сущностей несовместимы с отношением')
  const subjectQuoted = subject && quote.toLocaleLowerCase('ru-RU').includes(subject.name.toLocaleLowerCase('ru-RU'))
  const objectQuoted = object && quote.toLocaleLowerCase('ru-RU').includes(object.name.toLocaleLowerCase('ru-RU'))
  if (subject && !subjectQuoted) {
    const reference = proposal.sourceResolution?.evidenceTerm ?? subject.resolution?.evidenceTerm
    const method = proposal.sourceResolution?.method ?? subject.resolution?.method
    const aliasQuoted = method === 'exact_alias_quote' && reference && normalizeText(quote).includes(normalizeText(reference))
    const uniqueLocalReference = method === 'unique_preceding_mention' && reference && normalizeText(quote).includes(normalizeText(reference))
    if (!aliasQuoted && !uniqueLocalReference) errors.push('Цитата не содержит субъект и не имеет однозначной локальной ссылки')
  }
  if (object && !objectQuoted) {
    const reference = proposal.targetResolution?.evidenceTerm ?? object.resolution?.evidenceTerm
    const method = proposal.targetResolution?.method ?? object.resolution?.method
    const aliasQuoted = method === 'exact_alias_quote' && reference && normalizeText(quote).includes(normalizeText(reference))
    const uniqueLocalReference = method === 'unique_preceding_mention' && reference && normalizeText(quote).includes(normalizeText(reference))
    if (!aliasQuoted && !uniqueLocalReference) errors.push('Цитата не содержит объект и не имеет однозначной локальной ссылки')
  }
  if (proposal.status && !['CURRENT','PLANNED','CONDITIONAL','ENDED','UNKNOWN'].includes(proposal.status)) errors.push('Недопустимый статус отношения')
  const date = proposal.attributes?.validFrom ?? proposal.attributes?.validTo
  if (date != null && Number.isNaN(Date.parse(date))) errors.push('Дата отношения не распознана backend')
  errors.push(...validateAttributesAgainstQuote(proposal.attributes ?? {}, quote))
  return errors.length ? {
    accepted: false, status: 'REJECTED', errors,
    rejectedProposal: { proposal, sourceId, reason: errors.join('; ') },
  } : {
    accepted: true,
    claimStatus: 'SUPPORTED', // Exact text evidence does not establish independent truth.
    evidence: { sourceId, quote, startOffset: offset, endOffset: offset + quote.length, quoteMatchesSource: true, sourceAccessLevel, factValidation: 'text_match_only' },
    relationshipStatus: proposal.status ?? 'UNKNOWN',
  }
}

export function verifyBatch(proposals, sourceLookup, existingClaims = []) {
  const accepted = []
  const rejected = []
  const conflicts = []
  for (const proposal of proposals) {
    const source = sourceLookup(proposal.sourceId)
    const result = verifyBusinessProposal(proposal, {
      sourceText: source?.content_text,
      sourceId: source?.source_id,
      sourceStatus: source?.source_status,
      sourceAccessLevel: source?.access_level,
      subject: proposal.subject,
      object: proposal.object,
    })
    if (result.accepted) accepted.push({ ...proposal, ...result })
    else rejected.push(result.rejectedProposal)
  }
  const knownClaims=[...existingClaims.map((claim)=>({ ...claim, existing:true })),...accepted]
  for (const item of accepted) {
    for (let index=0;index<knownClaims.length;index+=1) {
      const previous=knownClaims[index]
      if (previous===item || !sameRelationship(item,previous)) continue
      if (!previous.existing && accepted.indexOf(previous)>=accepted.indexOf(item)) continue
      const previousAttributes={...(previous.attributes??{}),relationshipStatus:previous.relationshipStatus??previous.status??previous.attributes?.relationshipStatus}
      const currentAttributes={...(item.attributes??{}),relationshipStatus:item.relationshipStatus??item.status??item.attributes?.relationshipStatus}
      const previousInterval=explicitInterval(previousAttributes)
      const currentInterval=explicitInterval(currentAttributes)
      if (!intervalsOverlap(previousInterval,currentInterval)) continue
      const conflict=contradictoryAttributes(currentAttributes,previousAttributes)
      if (!conflict) continue
      item.claimStatus='CONFLICTED'
      item.conflictsWithClaimIds=[...(item.conflictsWithClaimIds??[]),previous.claim_id].filter(Boolean)
      conflicts.push({ proposal:item, conflictingClaimId:previous.claim_id??null, conflictingEvidence:previous.evidence??[], reason:`Противоречие в атрибуте ${conflict.key} для пересекающихся периодов: ${String(conflict.left)} vs ${String(conflict.right)}` })
      if (!previous.existing) {
        previous.claimStatus='CONFLICTED'
        previous.conflictsWithClaimIds=[...(previous.conflictsWithClaimIds??[]),item.claim_id].filter(Boolean)
      }
    }
  }
  return { blockId: 'B07', status: rejected.length || conflicts.length ? (accepted.length ? 'partial' : 'failed') : 'completed', accepted, rejected, conflicts }
}
