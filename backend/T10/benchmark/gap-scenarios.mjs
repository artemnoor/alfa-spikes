function makeEntities(index, { full = false, missingFacility = false, supplierRisk = false, incomplete = false } = {}) {
  const company = { entity_id: `co-${index}`, entity_type: 'COMPANY', canonical_name: `ООО Профиль ${index}` }
  if (incomplete) return [company]
  const entities = [company]
  if (!supplierRisk) entities.push({ entity_id: `product-${index}`, entity_type: 'PRODUCT', canonical_name: `Изделие ${index}` })
  if (full || missingFacility) {
    entities.push({ entity_id: `facility-${index}`, entity_type: 'FACILITY', canonical_name: `Площадка ${index}` })
    entities.push({ entity_id: `location-${index}`, entity_type: 'LOCATION', canonical_name: `Регион ${index}` })
  }
  if (full) {
    entities.push({ entity_id: `facility2-${index}`, entity_type: 'FACILITY', canonical_name: `Резервная площадка ${index}` })
    entities.push({ entity_id: `location2-${index}`, entity_type: 'LOCATION', canonical_name: `Регион резервной площадки ${index}` })
    entities.push({ entity_id: `component-${index}`, entity_type: 'COMPONENT', canonical_name: `Материал ${index}` })
    entities.push({ entity_id: `resource-${index}`, entity_type: 'RESOURCE', canonical_name: `Энергия ${index}` })
    entities.push({ entity_id: `supplier-${index}`, entity_type: 'COMPANY', canonical_name: `Поставщик ${index}` })
    entities.push({ entity_id: `tier2-${index}`, entity_type: 'COMPANY', canonical_name: `Поставщик второго уровня ${index}` })
    entities.push({ entity_id: `contract-${index}`, entity_type: 'CONTRACT', canonical_name: `Договор ${index}`, attributes: { validFrom: '2026-01-01' } })
    entities.push({ entity_id: `process-${index}`, entity_type: 'PROCESS', canonical_name: `Сборка ${index}` })
  }
  if (supplierRisk) {
    entities.push({ entity_id: `supplier-${index}`, entity_type: 'COMPANY', canonical_name: `Поставщик ${index}` })
    entities.push({ entity_id: `contract-${index}`, entity_type: 'CONTRACT', canonical_name: `Договор ${index}`, attributes: {} })
    entities.push({ entity_id: `process-${index}`, entity_type: 'PROCESS', canonical_name: `Сборка ${index}` })
  }
  return entities
}

function makeClaims(index, family, entities) {
  const ids = new Set(entities.map((item) => item.entity_id))
  const claim = (subject, predicate, object, attributes = {}) => ({ subject_entity_id: subject, predicate, object_entity_id: object, claim_status: 'SUPPORTED', attributes })
  const claims = []
  if (ids.has(`product-${index}`)) claims.push(claim(`co-${index}`, 'PRODUCES', `product-${index}`))
  if (family === 'complete-multi-site') {
    claims.push(claim(`product-${index}`, 'REQUIRES', `component-${index}`))
    claims.push(claim(`co-${index}`, 'OPERATES', `facility-${index}`))
    claims.push(claim(`facility-${index}`, 'LOCATED_IN', `location-${index}`))
    claims.push(claim(`facility-${index}`, 'REQUIRES', `resource-${index}`))
    claims.push(claim(`co-${index}`, 'OPERATES', `facility2-${index}`))
    claims.push(claim(`facility2-${index}`, 'LOCATED_IN', `location2-${index}`))
    claims.push(claim(`facility2-${index}`, 'USES', `resource-${index}`))
    claims.push(claim(`supplier-${index}`, 'SUPPLIES', `component-${index}`))
    claims.push(claim(`tier2-${index}`, 'SUPPLIES', `supplier-${index}`))
    claims.push(claim(`co-${index}`, 'PURCHASES', `supplier-${index}`, { alternativeSuppliersKnown: true }))
    claims.push(claim(`process-${index}`, 'USES', `resource-${index}`))
    claims.push(claim(`co-${index}`, 'CONTRACTED_WITH', `contract-${index}`, { relationshipStatus: 'CURRENT', validFrom: '2026-01-01' }))
  }
  if (family === 'missing-product-inputs') claims.push(claim(`co-${index}`, 'PRODUCES', `product-${index}`))
  if (family === 'missing-facility-data') claims.push(claim(`co-${index}`, 'PRODUCES', `product-${index}`), claim(`co-${index}`, 'OPERATES', `facility-${index}`))
  if (family === 'supplier-contract-process-risk') claims.push(claim(`co-${index}`, 'PURCHASES', `supplier-${index}`))
  return claims
}

const definitions = [
  { family: 'complete-multi-site', expected: [] },
  { family: 'missing-product-inputs', expected: ['product:inputs'] },
  { family: 'missing-facility-data', expected: ['product:inputs', 'facility:location', 'facility:resources'] },
  { family: 'supplier-contract-process-risk', expected: ['company:offering', 'supplier:alternatives', 'contract:term', 'process:inputs'] },
  { family: 'incomplete-profile', expected: ['company:offering'] },
]

export function createGapBenchmarkScenarios() {
  return definitions.flatMap((definition, familyIndex) => Array.from({ length: 10 }, (_, offset) => {
    const index = familyIndex * 10 + offset + 1
    const options = {
      full: definition.family === 'complete-multi-site',
      missingFacility: definition.family === 'missing-facility-data',
      supplierRisk: definition.family === 'supplier-contract-process-risk',
      incomplete: definition.family === 'incomplete-profile',
    }
    const entities = makeEntities(index, options)
    const claims = makeClaims(index, definition.family, entities)
    const expectedKeys = definition.expected.map((key) => key.startsWith('product:') ? `${key.split(':')[0]}:product-${index}:${key.split(':')[1]}`
      : key.startsWith('facility:') ? `${key.split(':')[0]}:facility-${index}:${key.split(':')[1]}`
        : key.startsWith('supplier:') ? `${key.split(':')[0]}:supplier-${index}:${key.split(':')[1]}`
          : key.startsWith('contract:') ? `${key.split(':')[0]}:contract-${index}:${key.split(':')[1]}`
            : key.startsWith('process:') ? `${key.split(':')[0]}:process-${index}:${key.split(':')[1]}`
              : `company:co-${index}:offering`)
    return { id: `G${String(index).padStart(3, '0')}`, family: definition.family, entities, claims, expectedGapKeys: expectedKeys }
  }))
}
