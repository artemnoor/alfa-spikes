# Independent T10 retrieval benchmark — 2026-10-17-independent-retrieval-hard-v1

- 30 paraphrased, harder manually labeled queries across 30 official source excerpts from unique companies absent from the R01–R16 regression corpus. Labels were frozen before this run.
- Production PostgreSQL FTS, pgvector/Qwen search, lexical fallback and production hybrid fusion ran against a temporary T10 profile; it is deleted after scoring.
- Embedding model: Qwen/Qwen3-Embedding-8B; one batched request, 1666 input / 0 output tokens, ₽0.001975, 9930 ms.

| Method | Queries | Recall@5 | Recall@10 | MRR |
|---|---:|---:|---:|---:|
| vector | 30 | 100.0% | 100.0% | 97.8% |
| postgresFts | 30 | 86.7% | 86.7% | 76.4% |
| bm25Fallback | 30 | 90.0% | 90.0% | 86.1% |
| hybrid | 30 | 96.7% | 100.0% | 92.2% |

The 30-document corpus is source-independent but remains a small pilot, not a production-sized repository evaluation. Full query ranks and source URLs are retained in results.json.
