# T10 retrieval benchmark — 2026-10-17-retrieval-32-live-v3

- Queries: 32; corpus excerpts: 16; Qwen embedding calls: 1.
- Model: Qwen/Qwen3-Embedding-8B; token usage input/output: 1471/0; cost: 0.001744 ₽; embedding latency: 9375 ms.
- PostgreSQL FTS, pgvector and the production fusion code were exercised against chunks in a temporary T10 profile, which was deleted after scoring. Query-to-source labels were written before ranking. The set reuses R01–R16 excerpts, so this is an independent retrieval task but **not a source-disjoint holdout**.

| Method | Queries | Recall@5 | Recall@10 | MRR |
|---|---:|---:|---:|---:|
| vector | 32 | 100.0% | 100.0% | 100.0% |
| postgresFts | 32 | 84.4% | 87.5% | 77.5% |
| bm25Fallback | 32 | 93.8% | 93.8% | 87.5% |
| hybrid | 32 | 96.9% | 100.0% | 91.1% |

Each query has 1 manually relevant source excerpt; the small 16-item corpus makes Recall@10 uninformative. Candidate ranks and source URLs are retained in results.json.
