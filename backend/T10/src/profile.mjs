export function buildBusinessProfile({ profile, entities, claims, gaps, sources, version, generatedAt = new Date().toISOString() }) {
  const entityById = new Map(entities.map((entity) => [entity.entity_id, entity]))
  const supported = claims.filter((claim) => ['CONFIRMED','SUPPORTED'].includes(claim.claim_status))
  const conflicts = claims.filter((claim) => claim.claim_status === 'CONFLICTED')
  const relations = supported.map((claim) => ({
    subject: entityById.get(claim.subject_entity_id)?.canonical_name ?? null,
    subjectType: entityById.get(claim.subject_entity_id)?.entity_type ?? null,
    predicate: claim.predicate,
    object: entityById.get(claim.object_entity_id)?.canonical_name ?? claim.object_value ?? null,
    objectType: entityById.get(claim.object_entity_id)?.entity_type ?? null,
    status: claim.attributes?.relationshipStatus ?? 'UNKNOWN',
    claimStatus: claim.claim_status,
    attributes: claim.attributes,
    evidence: claim.evidence ?? [],
  }))
  return {
    profileId: profile.profile_id,
    version,
    generatedAt,
    company: {
      companyId: profile.company_id,
      legalName: profile.legal_name,
      inn: profile.inn,
      ogrn: profile.ogrn,
      website: profile.website,
      identityStatus: profile.identity_status,
    },
    business: {
      products: entities.filter((entity) => entity.entity_type === 'PRODUCT').map((entity) => entity.canonical_name),
      services: entities.filter((entity) => entity.entity_type === 'SERVICE').map((entity) => entity.canonical_name),
      facilities: entities.filter((entity) => entity.entity_type === 'FACILITY').map((entity) => entity.canonical_name),
      suppliers: relations.filter((relation) => relation.predicate === 'SUPPLIES'),
      customers: relations.filter((relation) => relation.predicate === 'PURCHASES'),
      processes: entities.filter((entity) => entity.entity_type === 'PROCESS').map((entity) => entity.canonical_name),
      resources: entities.filter((entity) => entity.entity_type === 'RESOURCE').map((entity) => entity.canonical_name),
      relations,
    },
    entities,
    sources: sources.map((source) => ({ sourceId: source.source_id, title: source.title, type: source.source_type, url: source.url, accessLevel: source.access_level, status: source.source_status, retrievedAt: source.retrieved_at })),
    conflicts,
    unknowns: gaps.map((gap) => ({ gapId: gap.gap_id ?? null, relatedEntityId: gap.related_entity_id, missingFact: gap.missing_fact ?? gap.missingFact, priority: gap.priority, question: gap.question, status: gap.status ?? 'open' })),
  }
}
