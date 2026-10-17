# T10 — Business Understanding

T10 builds a traceable company profile from user-entered facts and company documents. It uses its own API, profile run ledger, PostgreSQL schema (`t10`) and independent B01–B11 JSON contracts; it does not depend on T08/T09 news tables or code.

## Run locally

Requires Node.js 22+, the repository's PostgreSQL service with pgvector, and a Polza AI API key for model-backed stages.

```powershell
Copy-Item backend/T10/.env.example backend/T10/.env
# Edit backend/T10/.env and set T10_DATABASE_URL and POLZA_AI_API_KEY.
npm install --prefix backend/T10
npm --prefix backend/T10 start
```

The API listens on `http://127.0.0.1:8095`. Startup applies ordered migrations to the isolated `t10` schema. The Vite app has a T10 tab; start it from the repository root with `npm run dev`.

## Implemented flow

- **B01:** validates and normalizes company names, Russian INN/OGRN checksum digits, and websites. An identifier is not marked verified without a registry response; official registry verification is currently pending.
- **B02:** stores user facts, text/JSON/PDF documents and explicitly supplied public HTTPS URLs; a website entered for the company is queued once as a public source. URL fetching is restricted to public IPs, pinned DNS and no redirects. No undisclosed sources are invented.
- **B03:** extracts text from TXT, JSON and text-layer PDFs, removes noise, chunks with source offsets/page anchors, and stores Qwen3-Embedding-8B vectors in pgvector when Polza is configured.
- **B04:** DeepSeek V4 Flash extracts business entities from bounded chunks; a capped completeness pass retries chunks with fewer than two entities. The backend validates types, chunk references and exact evidence quotes and stores rejected proposals.
- **B05:** links an extracted company to the profile company only on a full normalized legal-name match. For entity types repeated in the profile, Qwen3 embeddings are stored in pgvector and top candidates are ranked by JEV. DeepSeek reviews ambiguous JEV choices in one bounded fallback request. Candidate suggestions are retained for audit; `SAME_ENTITY` is conservative and requires a strong JEV margin, very high vector similarity, exact normalized name and compatible legal form. Other pairs stay unresolved.
- **B06–B08:** DeepSeek extracts typed relationships, including from chunks with a single known participant; JEV is called only when participant types permit multiple predicates. B07 checks exact evidence and uses one bounded DeepSeek semantic review before a relation can enter the graph. Evidence marked `model_supported` is still not externally truth-confirmed.
- **B09:** detects deterministic profile gaps; users can submit answers as new provenance-bearing sources.
- **B10:** searches existing processed documents using Qwen pgvector similarity plus lexical matching, then makes at most one bounded extraction/verification pass over up to 12 candidate chunks (default 8). Verified new facts are saved and gaps are recalculated. FNS/external registry adapters are not configured.
- **B11:** writes a structured profile version with supported facts, unknowns, conflicts, separate processing/identity/source/resolution/evidence/completeness statuses, and JSON export from the React panel.

All model calls retain model, purpose, tokens, reported cost, latency and compact response metadata. A failed model step is partial and does not become an invented empty result.

## API

- `GET /health`
- `GET /profiles`, `POST /profiles`
- `GET /profiles/:id`, `/summary`, `/sources`, `/entities`, `/claims`, `/graph`, `/gaps`, `/runs`, `/versions`
- `POST /profiles/:id/sources` — text/file/URL source
- `POST /profiles/:id/sources/:sourceId/process` — parse one document
- `POST /profiles/:id/known-facts` — record a user assertion with evidence
- `POST /profiles/:id/runs` — run B01–B11
- `POST /profiles/:id/gaps/:gapId/answers` — save an answer for processing in a later run

## Tests and benchmarks

```powershell
npm --prefix backend/T10 test
npm --prefix backend/T10 run benchmark
npm --prefix backend/T10 run benchmark:retrieval-live
npm --prefix backend/T10 run benchmark:negative-live
npm run build
```

The deterministic B06/B07 benchmark has 100 synthetic cases and reports TP/FP/FN, precision, recall and F1. B09 gap rules have a separate 50-case synthetic benchmark. These scores measure the tested deterministic rules only; they are not model-quality estimates for real companies.

The live benchmark runner accepts `T10_REAL_SCENARIO_START`, `T10_REAL_SCENARIO_LIMIT`, `T10_REAL_MAX_COST_RUB` and `T10_REAL_BENCHMARK_RUN_ID`; it saves a `checkpoint.json` after every completed case. The run budget is checked between full profile runs, so it cannot interrupt one in-flight scenario.

The live retrieval comparison [`benchmark/runs/2026-10-17-retrieval-32-live-v3/RESULTS.md`](benchmark/runs/2026-10-17-retrieval-32-live-v3/RESULTS.md) measures 32 manually labeled queries against 16 primary-source excerpts using the real T10 PostgreSQL FTS/pgvector queries and Qwen embeddings. The 32 query labels are a separate retrieval task, but their documents overlap the R01–R16 relation regression set; this is not a source-disjoint holdout. It records Recall@5/10 and MRR for Qwen vector, PostgreSQL FTS, the lexical fallback and hybrid ranking. The separate one-call DeepSeek negative/adversarial B07 diagnostic is [`benchmark/runs/2026-10-17-negative-b07-live-v2/RESULTS.md`](benchmark/runs/2026-10-17-negative-b07-live-v2/RESULTS.md). Both live runners accept a configurable reported-cost ceiling; the provider charge for a single request cannot be interrupted mid-call.

The live synthetic benchmark processes 13 profiles through real Polza calls. The latest run is [`benchmark/runs/2026-10-17-live-13-case-v8/RESULTS.md`](benchmark/runs/2026-10-17-live-13-case-v8/RESULTS.md); it used 76 calls and cost 0.431028 ₽. The offline manual triple score is in [`RELATION_EVALUATION.md`](benchmark/runs/2026-10-17-live-13-case-v8/RELATION_EVALUATION.md): 12/40 expected subject-predicate-object triples, 100% precision, 30% recall and 46.2% F1. A three-case official-source pilot from NLMK, X5 and Rostelecom is recorded in [`benchmark/runs/2026-10-17-real-3-case-v1/RESULTS.md`](benchmark/runs/2026-10-17-real-3-case-v1/RESULTS.md). The first 13 additional real-source cases are saved in [`benchmark/runs/2026-10-17-real-13-case-v1/RESULTS.md`](benchmark/runs/2026-10-17-real-13-case-v1/RESULTS.md). After fixing profile-company aliases, relation quote validation and `DIVISION` normalization, the same 13 cases were rerun on the current checkout; results are in [`benchmark/runs/2026-10-17-real-13-case-v2/RESULTS.md`](benchmark/runs/2026-10-17-real-13-case-v2/RESULTS.md). The rerun used 66 successful calls, 26,916 input and 3,445 output tokens, and cost 0.319121 ₽. Entity precision/recall/F1 moved from 80%/33.3%/47.1% to 62.5%/62.5%/62.5%; strict relation triples moved from 0/8 to 1/8, with six unannotated extra predictions. This is a recall improvement, but precision and relation quality remain too weak for production. All 13 profile runs are marked `partial`; identity is not externally verified and FNS integration is not configured. Treat the report as a small diagnostic pilot; some generic or contextual entity annotations also need a stricter review.

## Hardening audit and current evaluation

See [AUDIT.md](AUDIT.md), [ARCHITECTURE.md](ARCHITECTURE.md), [TEST_REPORT.md](TEST_REPORT.md), [BENCHMARK_COMPARISON.md](BENCHMARK_COMPARISON.md) and [REMAINING_LIMITATIONS.md](REMAINING_LIMITATIONS.md). The latest current-checkout matched R04–R16 live run is [`benchmark/runs/2026-10-17-final-live-R04-R16-v1/RESULTS.md`](benchmark/runs/2026-10-17-final-live-R04-R16-v1/RESULTS.md): 99 successful calls, 52,788 input / 6,530 output tokens, ₽0.266928, entity F1 70.8%, exact relation F1 14.3%. Entity recall improved; relation recall remains 12.5% and quality targets are not met. The previous matched iteration is retained at [`benchmark/runs/2026-10-17-hardening-real-R04-R16-v1/RESULTS.md`](benchmark/runs/2026-10-17-hardening-real-R04-R16-v1/RESULTS.md). The separate R01–R13 diagnostic is [`benchmark/runs/2026-10-17-hardening-real-13-v1/RESULTS.md`](benchmark/runs/2026-10-17-hardening-real-13-v1/RESULTS.md) and should not be compared directly to the R04–R16 baseline.
