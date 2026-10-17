# T10 B01–B11 implementation audit

Audit date: 2026-10-17. Scope: current T10 pipeline and its React panel. T08/T09 source code was not changed.

## Findings by block

| Block | Current behavior | Finding and change | Remaining gap |
|---|---|---|---|
| B01 — identity | Validates company name, INN/OGRN checksums and website syntax. | Identity verification is now reported separately from processing status in the final profile. | No live FNS registry lookup is configured; an identifier is not marked verified. |
| B02 — sources | Stores uploaded text/JSON/PDF and supplied URLs; public fetch path validates addresses and blocks redirects. | Existing SSRF checks remain; source availability is represented explicitly. | No general web search or authenticated customer-system connectors. |
| B03 — documents | Parses supported documents, chunks with offsets, stores Qwen embeddings in pgvector. | Existing integration tests cover processing, vector persistence and retrieval. | Clean-database migration and size/format matrix not re-run in this pass. |
| B04 — entities | DeepSeek extracts entities and the backend checks exact quotes/types/identifiers. | Added a bounded second completeness pass for chunks with fewer than two entities; its additions pass the same quote validator and are deduplicated. Prompts now treat document contents as untrusted data. | Sparse recovery can add paid calls; no independent 30-document holdout was assembled. |
| B05 — entity resolution | Exact identifiers/profile names first, then Qwen candidates and JEV; conservative unresolved fallback. | Existing unit/API tests cover exact identity and same-name collisions. | Registry-based linking and false-merge rate on a sufficiently large labeled set remain unmeasured. |
| B06 — relations | DeepSeek proposes triples; participant/type checks run locally; JEV resolves ambiguous predicates. | Removed the blanket skip for chunks with fewer than two known entities. One-participant chunks now reach extraction after B04 recovery; chunks with no usable participants are skipped. | Coreference and relation recall remain weak on the real 13-case test. |
| B07 — evidence | Checks exact source quote, participants, type compatibility, attributes and contradictions. | Added one batched DeepSeek entailment/direction/status review (max 40 proposals); missing/failed review fails closed. Deterministic checks now reject explicit supplier/buyer direction mismatches and CURRENT labels contradicted by quoted negation, expiry, plans or conditions. Stored evidence uses `model_supported` only after this gate. | Model judgment is not independent truth verification; live direction/status check is a small synthetic probe, not a human-labeled production estimate. |
| B08 — graph | Persists supported claims and entity nodes with evidence provenance. | Evidence provenance distinguishes exact text matching from model-supported entailment. Existing claim hash and evidence uniqueness constraints provide repeat-run idempotency. | No concurrency/load test or independent graph-quality benchmark. |
| B09 — gaps | Deterministic rules derive questions from missing graph edges/attributes. | Existing 50-case synthetic rules benchmark and unit coverage were retained. | No independent relevance/usefulness gold labels; no broad industry templates for all requested dependency types. |
| B10 — enrichment | Retrieval over already processed company documents. | B10 now combines PostgreSQL Russian/English full-text candidates and pgvector Qwen candidates using reciprocal-rank fusion, with exact identifier matches promoted; the extraction/verification pass remains bounded to at most 12 chunks (default 8). One recover→extract→B07→gap recheck pass records evidence and only unique new claims. A live 32-query comparison measured Recall@5/10 and MRR on both production retrieval paths. | FNS/public-site enrichment is not configured. Retrieval pilot reuses the R01–R16 excerpt corpus and is not a source-disjoint holdout; only 16 chunks make Recall@10 weakly discriminative. |
| B11 — profile | Generates a versioned JSON profile with facts, unknowns and conflicts. | Added separate processing, identity, source coverage, resolution, evidence quality and completeness summaries; React panel can download the latest version as JSON. The profile, graph, gaps, answer, repeat run and export control were exercised in browser E2E. | React duplicate-key warnings were observed; the JSON download event/file content was not separately asserted. |

## Highest-priority issues

1. Relationship precision/recall remain unsuitable for production. On the latest matched R04–R16 current-checkout run, exact-triple F1 is 14.3% and recall is 12.5%; the earlier hardening iteration scored 16.7% F1.
2. Exact quotation alone does not entail a relation. B07 now adds a semantic gate, but its decision remains model-supported rather than externally verified.
3. A run can complete while the profile remains identity-unverified, source-incomplete or missing facts. B11 exposes these as separate status dimensions.
4. The benchmark has only 13 regression excerpts and is not a holdout. Some labels need review: R04 explicitly says the service portfolio “will include” named services, but the gold file labels it as having no expected relations.

## Data flow

`source → document chunks + embeddings → entity extraction/recovery → entity resolution → relation extraction → exact evidence + semantic entailment → graph → gaps → bounded evidence recovery → versioned profile`

Full stage descriptions and current limits are in [ARCHITECTURE.md](ARCHITECTURE.md). Verification details are in [TEST_REPORT.md](TEST_REPORT.md) and measured quality in [BENCHMARK_COMPARISON.md](BENCHMARK_COMPARISON.md).
