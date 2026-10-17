# T10 pipeline and data contracts

T10 is an independently callable company-profile workflow. It stores data in PostgreSQL schema `t10` and exposes the ordered B01–B11 stage outputs. T08/T09 news records and code are not part of this pipeline.

## Processing path

1. **B01–B02:** accept company identity inputs, keep verification state honest, and collect only user-supplied or explicitly configured sources.
2. **B03:** parse supported documents, retain source/page offsets, chunk content and store Qwen3-Embedding-8B vectors in pgvector.
3. **B04–B05:** extract business entities, check source evidence, perform a bounded completeness retry for sparse chunks, and resolve identities using identifiers/exact names before vector/JEV candidates.
4. **B06:** infer typed relation candidates from chunks. It may extract several triples from one sentence. Relation predicates are constrained by entity-type pairs and JEV helps only when multiple predicates fit.
5. **B07:** verify exact quote, source, participants, types, attributes and conflicts; then batch-review semantic entailment, direction and temporal status. A missing semantic judgment fails closed.
6. **B08–B09:** persist claims/evidence and derive open questions from graph gaps.
7. **B10:** retrieve up to 12 existing document chunks for gaps, run one focused extraction and the same evidence gates, save only verified new claims, then recalculate gaps. There is no unbounded retry loop.
8. **B11:** persist a versioned JSON profile and report processing, identity, source coverage, entity resolution, evidence quality and completeness separately.

## Evidence and graph rules

- Every model-proposed entity and relation must include a literal quote found in the saved source.
- Relation participants must resolve to stored entities; relation predicates must accept their types.
- A matching quote alone means textual support, not external truth. Semantically reviewed relation evidence is stored as `model_supported`; user-provided assertions remain `user_asserted`.
- Relation status (`CURRENT`, `PLANNED`, `CONDITIONAL`, `ENDED`, `UNKNOWN`) is retained separately from claim review status (`SUPPORTED`, `CONFLICTED`, etc.).
- Claims are idempotent by profile-scoped claim hash. Evidence is unique by claim/source/quote.
- A model or database error is recorded as an operational issue. Missing registry identity or open business questions are separate data-completeness states.

## Boundaries and controls

- Polza AI supplies DeepSeek V4 Flash, JEV and Qwen embeddings.
- B07 reviews at most 40 candidate relations in one call. B10 considers at most 12 candidate chunks by default and runs one iteration.
- B04 sparse recovery is capped at 60 chunks per profile run by default; `config.b04RecoveryMaxChunks` may lower the bound.
- External document text is treated as untrusted input by extraction and semantic-review prompts.
- No FNS integration, broad public web search or customer-internal connector is configured.

The public API and block schemas are defined in `src/server.mjs` and `src/contracts.mjs`; SQL state and migrations live in `migrations/` and `src/store.mjs`.
