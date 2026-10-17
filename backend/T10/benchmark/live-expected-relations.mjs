// Manually curated, explicitly grounded relation triples for the 13 synthetic live fixtures.
// Unsupported ontology cases (for example, construction) are intentionally not forced into a wrong predicate.
export const liveExpectedRelations = {
  L01: [
    ['PRODUCES','ООО «Мехатрон-Синтез»','промышленные редукторы'],
    ['PURCHASES','ООО «Мехатрон-Синтез»','сталь'],
    ['SUPPLIES','«МеталлРесурс»','сталь'],
    ['SUPPLIES','«МеталлРесурс»','ООО «Мехатрон-Синтез»'],
  ],
  L02: [
    ['PRODUCES','АО «Кодовый Мост»','системы электронного документооборота'],
    ['PROVIDES_SERVICE','АО «Кодовый Мост»','технической поддержке'],
  ],
  L03: [
    ['SUPPLIES','ООО «РегионКомплект»','электротехническое оборудование'],
    ['PURCHASES','ООО «РегионКомплект»','кабельной продукции'],
    ['SUPPLIES','ООО «ПроводТорг»','кабельной продукции'],
  ],
  L04: [
    ['OPERATES','ООО «Восток Карго»','«Терминал Восточный»'],
    ['LOCATED_IN','«Терминал Восточный»','Хабаровск'],
  ],
  L05: [
    ['PRODUCES','АО «Ясный Урожай»','замороженные овощные смеси'],
    ['USES','АО «Ясный Урожай»','горох'],
    ['USES','АО «Ясный Урожай»','морковь'],
    ['USES','АО «Ясный Урожай»','упаковочная плёнка'],
  ],
  L06: [
    ['OPERATES','ООО «Ветроресурс»','«Прибрежный»'],
    ['LOCATED_IN','«Прибрежный»','Мурманской области'],
    ['DEPENDS_ON','«Прибрежный»','«Северная-2»'],
  ],
  L07: [
    ['PRODUCES','ООО «МедТех Лаб»','анализаторы крови'],
    ['REQUIRES','анализаторы крови','поликарбоната'],
  ],
  L08: [
    ['LOCATED_IN','«Олимп»','Владимире'],
    ['OPERATES','МБУ «СпортВлад»','«Олимп»'],
  ],
  L09: [
    ['PRODUCES','КФХ «Зелёная Долина»','семенной картофель'],
    ['USES','КФХ «Зелёная Долина»','«Ладожский»'],
    ['USES','КФХ «Зелёная Долина»','минеральные удобрения'],
    ['SUPPLIES','«АгроСнаб»','минеральные удобрения'],
  ],
  L10: [
    ['PROVIDES_SERVICE','АО «СетьПлюс»','передачи данных'],
    ['OPERATES','АО «СетьПлюс»','волоконно-оптическую сеть'],
    ['LOCATED_IN','волоконно-оптическую сеть','Татарстан'],
    ['CONTRACTED_WITH','АО «СетьПлюс»','ООО «Линия-Сервис»'],
  ],
  L11: [
    ['PRODUCES','ООО «ДрайвПарт»','тормозные диски'],
    ['SUPPLIES','ООО «ДрайвПарт»','тормозные диски'],
    ['SUPPLIES','ООО «ДрайвПарт»','«АвтоВектор»'],
    ['LOCATED_IN','производственная линия','Ярославле'],
  ],
  L12: [
    ['PRODUCES','ООО «Городская Кухня»','комплексные обеды'],
    ['CONTRACTED_WITH','ООО «Городская Кухня»','ООО «ПаркНедвижимость»'],
    ['PURCHASES','ООО «Городская Кухня»','молочную продукцию'],
    ['SUPPLIES','«Рассвет»','молочную продукцию'],
  ],
  L13: [
    ['PRODUCES','ООО «Процесс-Аналитика»','«Поток-М»'],
    ['USES','«Поток-М»','машинного зрения'],
  ],
}

export function normalizeRelationLabel(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('ru-RU')
    .replace(/[«»“”„‟"'`.,;:()[\]{}]+/gu,' ').replace(/\s+/gu,' ').trim()
}

function nameMatches(actual, expected) {
  const a=normalizeRelationLabel(actual), e=normalizeRelationLabel(expected)
  return Boolean(a && e && (a.includes(e) || e.includes(a)))
}

export function scoreLiveRelationTriples(cases) {
  let expected=0, truePositive=0, falsePositive=0, falseNegative=0
  const scoredCases=cases.map((item)=>{
    const gold=item.expectedRelationTriples ?? liveExpectedRelations[item.scenarioId] ?? []
    const predicted=item.relationships ?? []
    const matchedPredictions=new Set()
    const expectedResults=gold.map((label)=>{
      const [predicate,source,target]=Array.isArray(label) ? label : [label.predicate,label.source,label.target]
      const index=predicted.findIndex((relation,i)=>!matchedPredictions.has(i)
        && relation.predicate===predicate && nameMatches(relation.subject,source) && nameMatches(relation.object,target))
      const found=index>=0
      if(found) matchedPredictions.add(index)
      expected+=1
      if(found) truePositive+=1
      else falseNegative+=1
      return {predicate,source,target,found}
    })
    const falsePredictions=predicted.filter((_,index)=>!matchedPredictions.has(index))
    falsePositive+=falsePredictions.length
    return {...item,expectedRelationships:expectedResults,unexpectedRelationships:falsePredictions}
  })
  const precision=truePositive+falsePositive ? truePositive/(truePositive+falsePositive) : null
  const recall=truePositive+falseNegative ? truePositive/(truePositive+falseNegative) : null
  return {cases:scoredCases,metrics:{expected,truePositive,falsePositive,falseNegative,precision,recall,f1:precision!==null&&recall!==null&&precision+recall?2*precision*recall/(precision+recall):null}}
}
