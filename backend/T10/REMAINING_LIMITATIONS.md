# Remaining T10 limitations

## Accuracy is not ready for production

- On the matched 13-case real-source regression set, entity F1 is **60.5%** and exact directed relationship F1 is **16.7%**. The relation reviewer reduced false positives from 6 to 3, but found no additional true relation: recall remains 12.5%.
- The B07 semantic reviewer is another LLM judgment, not an independent source of truth. Exact quotes plus model review should be presented as supported evidence, never as registry-confirmed fact.
- The source/gold annotation has known ambiguity. In R04, the source expressly describes a planned portfolio containing named services while the expected relation list is empty. This case was retained unchanged and is counted as a false positive.
- No independently labeled 30+ article holdout was created. Existing R04–R16 cases were used for regression and are not blind test data.

## Sources and enrichment

- B01 does not query the FNS EGRUL register. INN/OGRN checksums establish format only, not company identity.
- B02 processes supplied sources and the configured company website path; it is not a general web search or authenticated customer-system integration.
- B10 searches already ingested documents. FNS, Wikidata, GLEIF and broad external enrichment are not configured. Its new recovery pass is capped to one iteration and up to 12 chunks; the default is 8.
- A retrieved text may still be irrelevant. No gold relevant-chunk judgments or retrieval Recall@k/MRR were collected.

## Quality controls and evaluation

- The relationship taxonomy is finite; valid real-world relations outside the supported predicates can be omitted or misrepresented.
- Direction and temporal status are requested from the extractor and semantic reviewer, but were not separately scored because the gold annotations lack those fields.
- B09 uses deterministic structural rules and a synthetic 50-case benchmark. It has no independently measured question usefulness, gap precision/recall or auto-closure rate.
- Per-call latency distribution/P95, concurrent pipeline runs, large-document limits and production load were not tested in this task.
- Clean-database migration and full browser E2E checks are `NOT_RUN`. The API integration suite ran against the configured local database.
- No T08/T09 backend suite was run. Their code was not modified; the root frontend production build passed.

## Operational notes

- Entity completeness retry can increase the number of LLM calls on sparse chunks. It is capped at 60 chunks per run by default and can be lowered with `config.b04RecoveryMaxChunks`.
- B07 fails closed on missing/failed semantic judgments. This protects graph precision at the cost of recall and adds a DeepSeek request when proposals exist.
- The live matched run cost ₽0.402963 for 13 excerpts; the separate non-matched diagnostic cost ₽0.371171. Costs vary with source size, retrieval candidates and model response length.
- The benchmark's configured budget is checked after each complete scenario. It bounds accumulated run cost between cases, not the cost of an individual in-flight profile.
