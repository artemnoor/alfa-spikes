# T10 retrieval benchmark — 2026-10-17-retrieval-32-live-v1

- Queries: 32; corpus excerpts: 16; embedding calls: 1.
- Model: Qwen/Qwen3-Embedding-8B; token usage input/output: 1471/0; cost: 0.001744 ₽; latency: 6898 ms.
- Query-to-source relevance labels were written before model retrieval and were not inferred from the ranking. The set reuses R01–R16 primary-source excerpts, so it is an independent retrieval task but **not a source-disjoint holdout**.

| Method | Queries | Recall@5 | Recall@10 | MRR |
|---|---:|---:|---:|---:|
| vector | 32 | 100.0% | 100.0% | 100.0% |
| bm25 | 32 | 93.8% | 93.8% | 87.5% |
| hybrid | 32 | 100.0% | 100.0% | 100.0% |

Each query has 1 manually relevant source excerpt. Candidate rank lists and source URLs are retained in results.json. BM25 in this offline comparison uses the same Unicode token scorer as the fallback; production PostgreSQL FTS uses Russian and English dictionaries. The live vector comparison uses Qwen3-Embedding-8B.
