# T10 B01–B11 implementation audit

Audit date: 2026-10-17. Scope: current T10 pipeline and its React panel. T08/T09 source code was not changed.

## Findings by block

| Block | Current behavior | Finding and change | Remaining gap |
|---|---|---|---|
| B01 — identity | Validates company name, INN/OGRN checksums and website syntax. | Identity verification is now reported separately from processing status in the final profile. | No live FNS registry lookup is configured; an identifier is not marked verified. |
| B02 — sources | Stores uploaded text/JSON/PDF and supplied URLs; public fetch path validates addresses and blocks redirects. | Existing SSRF checks remain; source availability is represented explicitly. | No general web search or authenticated customer-system connectors. |
| B03 — documents | Parses supported documents, chunks with offsets, stores Qwen embeddings in pgvector. | Existing integration tests cover processing, vector persistence and retrieval. | Clean-database migration and size/format matrix not re-run in this pass. |
| B04 — entities | DeepSeek extracts entities and the backend checks exact quotes/types/identifiers. | Added a bounded second completeness pass for chunks with fewer than two entities; additions pass the same quote validator and are deduplicated. | Sparse recovery costs extra calls; latest independent H01–H30 entity F1 is 75.6% under strict exact scoring. |
| B05 — entity resolution | Exact identifiers/profile names first, then Qwen candidates and JEV; conservative unresolved fallback. | Existing unit/API tests cover exact identity and same-name collisions. | Registry-based linking and false-merge rate on a sufficiently large labeled set remain unmeasured. |
| B06 — relations | DeepSeek proposes triples; participant/type checks run locally; JEV resolves ambiguous predicates. | Removed the blanket skip for chunks with fewer than two known entities; added bounded retry, exact Russian inflected mention matching, unique preceding-company references, quoted participant recovery and deterministic PART_OF evidence gating. | Matched R04–R16 relation F1 varied 50.0% to 28.6% across repeated runs; holdout relation F1 is 36.4% on v3. Completeness retry itself has not recovered additional relations in these full runs. |
| B07 — evidence | Checks exact source quote, participants, type compatibility, attributes and contradictions. | Added one batched DeepSeek entailment/direction/status review (max 40 proposals); missing/failed review fails closed. Deterministic checks now reject explicit supplier/buyer direction mismatches, CURRENT labels contradicted by quoted negation/expiry/plans/conditions, and PART_OF claims without explicit part-whole evidence. Stored evidence uses `model_supported` only after this gate. | Model judgment is not independent truth verification; live direction/status check is a small synthetic probe, not a human-labeled production estimate. |
| B08 — graph | Persists supported claims and entity nodes with evidence provenance. | Evidence provenance distinguishes exact text matching from model-supported entailment. Existing claim hash and evidence uniqueness constraints provide repeat-run idempotency. | No concurrency/load test or independent graph-quality benchmark. |
| B09 — gaps | Deterministic rules derive questions from missing graph edges/attributes. | Existing 50-case synthetic rules benchmark and unit coverage were retained. | No independent relevance/usefulness gold labels; no broad industry templates for all requested dependency types. |
| B10 — enrichment | Retrieval over already processed company documents. | B10 now combines PostgreSQL Russian/English full-text candidates and pgvector Qwen candidates using reciprocal-rank fusion, with exact identifier matches promoted; the extraction/verification pass remains bounded to at most 12 chunks (default 8). One recover→extract→B07→gap recheck pass records evidence and only unique new claims. Direct and paraphrased live retrieval comparisons each use 30 source-disjoint documents and 30 queries. | FNS/public-site enrichment is not configured. Source-disjoint retrieval is still a small pilot; direct queries do not discriminate ranking, and the larger production corpus remains untested. |
| B11 — profile | Generates a versioned JSON profile with facts, unknowns and conflicts. | Added separate processing, identity, source coverage, resolution, evidence quality and completeness summaries; React panel can download the latest version as JSON. The profile, graph, gaps, answer, repeat run and export control were exercised in browser E2E. | React duplicate-key warnings were observed; the JSON download event/file content was not separately asserted. |

## Highest-priority issues

1. Relationship precision/recall remain unsuitable for production. Across repeated matched R04–R16 runs, exact-triple F1 varied from 14.3% to 50.0%; the latest run scored 28.6% (2/8 gold relations found). Recall and precision remain insufficient for production.
2. Exact quotation alone does not entail a relation. B07 now adds a semantic gate, but its decision remains model-supported rather than externally verified.
3. A run can complete while the profile remains identity-unverified, source-incomplete or missing facts. B11 exposes these as separate status dimensions.
4. The benchmark has only 13 regression excerpts and is not a holdout. Some labels need review: R04 explicitly says the service portfolio “will include” named services, but the gold file labels it as having no expected relations.

## Data flow

`source → document chunks + embeddings → entity extraction/recovery → entity resolution → relation extraction → exact evidence + semantic entailment → graph → gaps → bounded evidence recovery → versioned profile`

Full stage descriptions and current limits are in [ARCHITECTURE.md](ARCHITECTURE.md). Verification details are in [TEST_REPORT.md](TEST_REPORT.md) and measured quality in [BENCHMARK_COMPARISON.md](BENCHMARK_COMPARISON.md).
