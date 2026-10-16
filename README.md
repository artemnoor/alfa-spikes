# Alfa Spikes

React/Vite prototype for news classification experiments. The interface is split into blocks T08–T13; the active backend implementation and reproducible classification benchmarks are in `backend/T08`.

## Run the frontend

```powershell
npm install
npm run dev
```

## Run the T08 backend

Use Node.js 22 or newer. Set `POLZA_AI_API_KEY` (or `POLZA_API_KEY`) in the environment, then run:

```powershell
cd backend/T08
npm start
```

The backend listens on `http://127.0.0.1:8091` by default. The API and model configuration are documented in [`backend/T08/README.md`](backend/T08/README.md). Do not commit local API keys; `.env` files are ignored.

## T08 verification and saved results

The final five-news entity graph benchmark is saved in [`backend/T08/benchmark/runs/entity-graph-facilities-typed-relations-final-2026-10-16/RESULTS.md`](backend/T08/benchmark/runs/entity-graph-facilities-typed-relations-final-2026-10-16/RESULTS.md), alongside its machine-readable `results.json`.

- 5 sample news articles and 5 DeepSeek V4 Flash requests.
- 7,160 tokens total (2,809 input; 4,351 output); reported cost: ₽0.13925841.
- 22 entities, 10 events, 8 relations, and 17 attributes.
- The verifier found 0 evidence, relation-type, or facility-grounding errors. All five model outputs are marked `partial`: four had unsupported proposals rejected, and one used a grounded fallback after reaching the output-token limit.

Run the local graph invariants, saved-result verifier, and frontend production build from the repository root:

```powershell
npm --prefix backend/T08 run test:entities:graph
npm --prefix backend/T08 run verify:entities -- benchmark/runs/entity-graph-facilities-typed-relations-final-2026-10-16/results.json
npm run build
```

The benchmark report explains the comparison limits and the reason `partial` is preserved in every result.
