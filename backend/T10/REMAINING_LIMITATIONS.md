# Remaining T10 limitations

## Accuracy is not ready for production

- On the latest matched B06 13-case development run, entity F1 is **65.3%** and exact directed relationship F1 is **62.5%** (5 TP, 3 FP, 3 FN). This single run is stochastic; the independent holdout v4 scored relation F1 **34.8%**, unchanged relation recall versus v3 and with 2 additional false positives. The production quality target is not met.
- The B07 semantic reviewer is another LLM judgment, not an independent source of truth. Exact quotes plus model review should be presented as supported evidence, never as registry-confirmed fact.
- The source/gold annotation has known ambiguity. In R04, the source expressly describes a planned portfolio containing named services while the expected relation list is empty. This case was retained unchanged and is counted as a false positive.
- A 30-case source/company-disjoint H01–H30 holdout has four live runs. Latest strict exact entity F1 is **73.5%**, relation F1 **34.8%** (v1/v2/v3 relation F1: 40.8%/34.0%/36.4%). Labels are manually authored with no second annotator; inspection found span/granularity mismatches and plausible system predictions omitted from gold. Repeated-run variation is material. Preserve all raw results and improve annotation quality in a separately versioned set before treating them as stable estimates.
- Retrieval now also has a source-disjoint 30-document corpus with 30 direct and 30 paraphrased queries. The paraphrased set gives Qwen vector 100% Recall@5 and 97.8% MRR, and hybrid 96.7% Recall@5 and 92.2% MRR. This remains a small pilot; the direct set was nondiscriminative and 30 candidates do not establish production-scale behavior.

## Sources and enrichment

- B01 does not query the FNS EGRUL register. INN/OGRN checksums establish format only, not company identity.
- B02 processes supplied sources and the configured company website path; it is not a general web search or authenticated customer-system integration.
- B10 searches already ingested documents. FNS, Wikidata, GLEIF and broad external enrichment are not configured. Its new recovery pass is capped to one iteration and up to 12 chunks; the default is 8.
- A retrieved text may still be irrelevant. The retrieval pilot has 32 judgments but only 16 documents and one relevant excerpt per query; a larger source-disjoint evaluation is still needed.

## Quality controls and evaluation

- The relationship taxonomy is finite; valid real-world relations outside the supported predicates can be omitted or misrepresented.
- B06 completeness recovery is capped at 12 cue-bearing chunks per profile and retries only cue-bearing chunks with no locally accepted relation. A retry recovered three R12 development relations after their first-pass quotes failed exact validation, but the latest independent holdout showed no relation-recall gain and two more false positives than v3. It adds calls/cost and has not demonstrated a generalized gain. Consider disabling (`T10_B06_RECOVERY_MAX_CHUNKS=0`) until a broader development set demonstrates value.
- A deterministic quote-level rule now rejects explicit supplier-as-buyer / buyer-as-supplier mismatches and `CURRENT` proposals contradicted by quoted negation, plans, conditions or termination. The 11-case live B07 adversarial probe had 0 false accepts after deterministic and semantic gates (1 positive, 10 negatives), but this synthetic one-batch result is only diagnostic; independent direction/status labels on real examples are still absent.
- `PART_OF` now requires explicit inclusion/part-whole language; the targeted merger-vs-PART_OF probe and 11-case live negative set each produced zero false accepts. These small synthetic controls cover only the authored cases and do not estimate real-world accuracy.
- B09 uses deterministic structural rules and a synthetic 50-case benchmark. It has no independently measured question usefulness, gap precision/recall or auto-closure rate.
- Per-call latency distribution/P95, concurrent pipeline runs, large-document limits and production load were not tested in this task.
- All 9 migrations, including the new FTS indexes, applied successfully to an isolated empty PostgreSQL database; the disposable database was dropped. API integration also ran against the configured shared database.
- Browser E2E created and removed an isolated temporary profile; repeat processing and JSON export/download parsing completed. The tested Chromium console had no errors or warnings; other browsers and large exports remain unmeasured.
- T08 invariants and T09 unit/PostgreSQL/API suites passed. No T08/T09 code was modified.

## Operational notes

- Entity completeness retry can increase the number of LLM calls on sparse chunks. It is capped at 60 chunks per run by default and can be lowered with `config.b04RecoveryMaxChunks`.
- B07 fails closed on missing/failed semantic judgments. This protects graph precision at the cost of recall and adds a DeepSeek request when proposals exist.
- The latest live matched run cost ₽0.266928 for 13 excerpts; the earlier matched iteration cost ₽0.402963 and the separate R01–R13 diagnostic cost ₽0.371171. Costs vary with source size, retrieval candidates and model response length.
- The benchmark's configured budget is checked after each complete scenario. It bounds accumulated run cost between cases, not the cost of an individual in-flight profile.
