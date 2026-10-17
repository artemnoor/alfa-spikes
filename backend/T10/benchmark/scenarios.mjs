const directRelations = [
  { predicate:'PRODUCES', sourceType:'COMPANY', targetType:'PRODUCT', sourcePrefix:'ООО', verb:'производит', targetPrefix:'Продукт' },
  { predicate:'PROVIDES_SERVICE', sourceType:'COMPANY', targetType:'SERVICE', sourcePrefix:'АО', verb:'оказывает услугу', targetPrefix:'Услуга' },
  { predicate:'SUPPLIES', sourceType:'COMPANY', targetType:'COMPONENT', sourcePrefix:'Поставщик', verb:'поставляет', targetPrefix:'Компонент' },
  { predicate:'PURCHASES', sourceType:'COMPANY', targetType:'RESOURCE', sourcePrefix:'Компания', verb:'закупает', targetPrefix:'Ресурс' },
  { predicate:'OPERATES', sourceType:'COMPANY', targetType:'FACILITY', sourcePrefix:'Компания', verb:'эксплуатирует', targetPrefix:'Площадка' },
  { predicate:'LOCATED_IN', sourceType:'FACILITY', targetType:'LOCATION', sourcePrefix:'Завод', verb:'расположен в', targetPrefix:'Регион' },
  { predicate:'USES', sourceType:'PRODUCT', targetType:'TECHNOLOGY', sourcePrefix:'Изделие', verb:'использует технологию', targetPrefix:'Технология' },
  { predicate:'REQUIRES', sourceType:'PRODUCT', targetType:'COMPONENT', sourcePrefix:'Продукт', verb:'требует компонент', targetPrefix:'Материал' },
  { predicate:'PART_OF', sourceType:'FACILITY', targetType:'COMPANY', sourcePrefix:'Комплекс', verb:'входит в', targetPrefix:'Группа' },
  { predicate:'DEPENDS_ON', sourceType:'PROCESS', targetType:'RESOURCE', sourcePrefix:'Процесс', verb:'зависит от', targetPrefix:'Ресурс' },
]

function entity(type, name, startOffset) { return { type, name, startOffset } }

function directScenario(index, templateIndex) {
  const item = directRelations[templateIndex]
  const source = `${item.sourcePrefix} ${index}`
  const target = `${item.targetPrefix} ${index}`
  const quote = `${source} ${item.verb} ${target}.`
  return { id:`T10-D-${String(index).padStart(3,'0')}`, family:'direct-supported', text:quote, expectedAccepted:true, proposal:{sourceName:source,predicate:item.predicate,targetName:target,quote,status:'CURRENT'}, entities:[entity(item.sourceType,source,0),entity(item.targetType,target,quote.indexOf(target))] }
}

function incompatibleScenario(index) {
  const source = `ООО Завод ${index}`
  const target = `Пермь ${index}`
  const quote = `${source} производит в городе ${target}.`
  return { id:`T10-I-${String(index).padStart(3,'0')}`, family:'incompatible-types', text:quote, expectedAccepted:false, proposal:{sourceName:source,predicate:'PRODUCES',targetName:target,quote}, entities:[entity('COMPANY',source,0),entity('LOCATION',target,quote.indexOf(target))] }
}

function fabricatedQuoteScenario(index) {
  const source = `Компания ${index}`
  const target = `Компонент ${index}`
  const quote = `${source} использует ${target}.`
  return { id:`T10-Q-${String(index).padStart(3,'0')}`, family:'fabricated-quote', text:quote, expectedAccepted:false, proposal:{sourceName:source,predicate:'USES',targetName:target,quote:`${source} производит ${target}.`}, entities:[entity('COMPANY',source,0),entity('COMPONENT',target,quote.indexOf(target))] }
}

function contextualScenario(index) {
  const source = `ООО Клиент ${index}`
  const target = `Сталь ${index}`
  const supplier = `АО Поставщик ${index}`
  const text = `${source} производит оборудование. Компания закупает ${target} у ${supplier}.`
  const quote = `Компания закупает ${target} у ${supplier}.`
  return { id:`T10-C-${String(index).padStart(3,'0')}`, family:'unique-local-coreference', text, expectedAccepted:true, proposal:{sourceName:source,predicate:'PURCHASES',targetName:target,quote}, entities:[entity('COMPANY',source,0),entity('COMPANY',supplier,text.indexOf(supplier)),entity('PRODUCT',`оборудование ${index}`,text.indexOf('оборудование')),entity('RESOURCE',target,text.indexOf(target))] }
}

function ambiguousScenario(index) {
  const first = `ООО Первая ${index}`
  const second = `АО Вторая ${index}`
  const material = `Сталь ${index}`
  const quote = `Компания закупает ${material}.`
  const text = `${first} и ${second} работают вместе. ${quote}`
  const quoteStart = text.indexOf(quote)
  // Equal-offset company candidates deliberately model an unresolved mention without a safe nearest antecedent.
  return { id:`T10-A-${String(index).padStart(3,'0')}`, family:'ambiguous-coreference', text, expectedAccepted:false, proposal:{sourceName:'Компания',predicate:'PURCHASES',targetName:material,quote}, entities:[entity('COMPANY',first,quoteStart-1),entity('COMPANY',second,quoteStart-1),entity('RESOURCE',material,text.indexOf(material))] }
}

export function createBenchmarkScenarios() {
  const scenarios = []
  for (let index=1; index<=40; index++) scenarios.push(directScenario(index, (index-1)%directRelations.length))
  for (let index=41; index<=60; index++) scenarios.push(incompatibleScenario(index))
  for (let index=61; index<=80; index++) scenarios.push(fabricatedQuoteScenario(index))
  for (let index=81; index<=90; index++) scenarios.push(contextualScenario(index))
  for (let index=91; index<=100; index++) scenarios.push(ambiguousScenario(index))
  return scenarios
}
