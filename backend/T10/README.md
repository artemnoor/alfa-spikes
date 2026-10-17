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
- **B04:** DeepSeek V4 Flash extracts business entities from bounded chunks; a capped second pass retries sparse chunks, then a third document-context pass checks relation-bearing chunks for missed entities and explicit cross-chunk references. New entities require an exact local quote. References can only resolve to a unique compatible entity from an earlier chunk of the same source; ambiguous references remain unlinked. The backend validates types and quotes and stores rejected proposals. Set `T10_B04_DOCUMENT_CONTEXT_MAX_CHUNKS` from 0 to 12 (default 12) to bound or disable the third pass.
- **B05:** links an extracted company to the profile company only on a full normalized legal-name match. For entity types repeated in the profile, Qwen3 embeddings are stored in pgvector and top candidates are ranked by JEV. DeepSeek reviews ambiguous JEV choices in one bounded fallback request. Candidate suggestions are retained for audit; `SAME_ENTITY` is conservative and requires a strong JEV margin, very high vector similarity, exact normalized name and compatible legal form. Other pairs stay unresolved.
- **B06–B08:** DeepSeek extracts typed relationships, including from chunks with a single known participant; JEV is called only when participant types permit multiple predicates. A capped retry rechecks relation-cue chunks with at least two participants when the first pass returns no candidate (`T10_B06_RECOVERY_MAX_CHUNKS`, default 12; set 0 to disable). Recovered claims go through the same quote/type checks, deduplication and B07 semantic review. Evidence marked `model_supported` is still not externally truth-confirmed.
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
npm --prefix backend/T10 run benchmark:holdout-live
npm --prefix backend/T10 run benchmark:holdout-retrieval-live
npm run build
```

The deterministic B06/B07 benchmark has 100 synthetic cases and reports TP/FP/FN, precision, recall and F1. B09 gap rules have a separate 50-case synthetic benchmark. These scores measure the tested deterministic rules only; they are not model-quality estimates for real companies.

The live benchmark runner accepts `T10_REAL_SCENARIO_START`, `T10_REAL_SCENARIO_LIMIT`, `T10_REAL_MAX_COST_RUB` and `T10_REAL_BENCHMARK_RUN_ID`; it saves a `checkpoint.json` after every completed case. The run budget is checked between full profile runs, so it cannot interrupt one in-flight scenario.

The targeted B04 document-context probe makes one batched DeepSeek request for a unique and an ambiguous cross-chunk company reference, then records exact-quote validation, tokens and reported cost: `node --env-file-if-exists=backend/T10/.env backend/T10/benchmark/run-b04-document-context-live.mjs` (run from the repository root) or `node --env-file-if-exists=.env benchmark/run-b04-document-context-live.mjs` from `backend/T10`.

The source-disjoint extraction holdout uses 30 manually labeled official-source excerpts from companies absent from R01–R16. Run it with `benchmark:holdout-live`; the default reported-cost ceiling is ₽1.50 and can be changed with `T10_HOLDOUT_MAX_COST_RUB`. The latest v4 score is entity F1 73.5%, exact ordered-relation F1 34.8%, with 218 calls and reported spend ₽0.455116. Unchanged-label v1/v2/v3 runs scored entity/relation F1 75.3%/40.8%, 76.4%/34.0%, and 75.6%/36.4% at ₽0.910891/₽0.552483/₽0.524357. These are small, single-annotator evaluations with span/granularity ambiguity and notable run variance; preserve all four raw runs and do not tune prompts against this set.

The source-disjoint retrieval benchmark uses the same 30 held-out source excerpts and 30 pre-labeled queries. Direct queries run by default. To run the harder paraphrase set, set `T10_HOLDOUT_RETRIEVAL_QUERY_SET=hard`; use `T10_HOLDOUT_RETRIEVAL_RUN_ID` to choose a new output directory. Each variant makes one batched Qwen embedding request and defaults to a ₽0.15 cost ceiling (`T10_HOLDOUT_RETRIEVAL_MAX_COST_RUB`). The paraphrased set scored vector Recall@5/MRR 100.0/97.8%, and hybrid 96.7/92.2%; see [`independent-retrieval-hard-v1`](benchmark/runs/2026-10-17-independent-retrieval-hard-v1/RESULTS.md). Direct-query and full case details are stored alongside it. The earlier 16-source retrieval pilot and synthetic B07 diagnostic remain documented below; they are not independent extraction accuracy estimates.

The live synthetic benchmark processes 13 profiles through real Polza calls. The latest run is [`benchmark/runs/2026-10-17-live-13-case-v8/RESULTS.md`](benchmark/runs/2026-10-17-live-13-case-v8/RESULTS.md); it used 76 calls and cost 0.431028 ₽. The offline manual triple score is in [`RELATION_EVALUATION.md`](benchmark/runs/2026-10-17-live-13-case-v8/RELATION_EVALUATION.md): 12/40 expected subject-predicate-object triples, 100% precision, 30% recall and 46.2% F1. A three-case official-source pilot from NLMK, X5 and Rostelecom is recorded in [`benchmark/runs/2026-10-17-real-3-case-v1/RESULTS.md`](benchmark/runs/2026-10-17-real-3-case-v1/RESULTS.md). The first 13 additional real-source cases are saved in [`benchmark/runs/2026-10-17-real-13-case-v1/RESULTS.md`](benchmark/runs/2026-10-17-real-13-case-v1/RESULTS.md). After fixing profile-company aliases, relation quote validation and `DIVISION` normalization, the same 13 cases were rerun on the current checkout; results are in [`benchmark/runs/2026-10-17-real-13-case-v2/RESULTS.md`](benchmark/runs/2026-10-17-real-13-case-v2/RESULTS.md). The rerun used 66 successful calls, 26,916 input and 3,445 output tokens, and cost 0.319121 ₽. Entity precision/recall/F1 moved from 80%/33.3%/47.1% to 62.5%/62.5%/62.5%; strict relation triples moved from 0/8 to 1/8, with six unannotated extra predictions. This is a recall improvement, but precision and relation quality remain too weak for production. All 13 profile runs are marked `partial`; identity is not externally verified and FNS integration is not configured. Treat the report as a small diagnostic pilot; some generic or contextual entity annotations also need a stricter review.

## Hardening audit and current evaluation

See [AUDIT.md](AUDIT.md), [ARCHITECTURE.md](ARCHITECTURE.md), [TEST_REPORT.md](TEST_REPORT.md), [BENCHMARK_COMPARISON.md](BENCHMARK_COMPARISON.md) and [REMAINING_LIMITATIONS.md](REMAINING_LIMITATIONS.md). The latest matched R04–R16 development run is [`b06-validation-retry-R04-R16-v1`](benchmark/runs/2026-10-17-b06-validation-retry-R04-R16-v1/RESULTS.md): entity F1 65.3%, exact relation F1 62.5%, 110 calls, ₽0.283928. The independent holdout v4 scored relation F1 34.8% with no recall increase vs v3, showing the development result did not generalize. This is a development result, not a holdout estimate. The independent H01–H30 holdout is separate and relation quality targets remain unmet.
