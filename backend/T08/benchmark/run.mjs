import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Sends the synthetic benchmark to the locally running T08 API and stores raw label IDs.
const dir = path.dirname(fileURLToPath(import.meta.url));
const api = process.env.T08_API_URL || 'http://127.0.0.1:8088';
const concurrency = Math.max(1, Number(process.env.T08_BENCHMARK_CONCURRENCY || 2));
const news = fs.readFileSync(path.join(dir, 'news.jsonl'), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const predictionsPath = path.join(dir, 'run-predictions.jsonl');
const errorsPath = path.join(dir, 'run-errors.jsonl');
fs.writeFileSync(predictionsPath, '');
fs.writeFileSync(errorsPath, '');
let next = 0;
let done = 0;
let failed = 0;
let totalCalls = 0;
let totalTokens = 0;
const started = Date.now();

async function worker() {
  while (true) {
    const index = next++;
    if (index >= news.length) return;
    const article = news[index];
    try {
      const response = await fetch(`${api}/classify`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ state: article.text }),
      });
      const payload = await response.json();
      if (!response.ok || payload.status !== 'model') throw new Error(`HTTP ${response.status}; status=${payload.status ?? 'unknown'}`);
      const row = {
        id: article.id,
        topic: payload.classifications?.topic?.value?.qcode ?? null,
        event: payload.classifications?.event?.value?.id ?? null,
        genre: payload.classifications?.genre?.value?.qcode ?? null,
        split: article.split,
        system: payload.model,
        status: payload.status,
        calls: payload.calls,
        inputTokens: payload.inputTokens,
        outputTokens: payload.outputTokens,
        costRub: payload.costRub,
      };
      if (!row.topic || !row.event || !row.genre) throw new Error('missing classification label');
      fs.appendFileSync(predictionsPath, `${JSON.stringify(row)}\n`);
      totalCalls += payload.calls ?? 0;
      totalTokens += payload.inputTokens ?? 0;
    } catch (error) {
      failed++;
      fs.appendFileSync(errorsPath, `${JSON.stringify({ id: article.id, message: String(error?.message ?? error) })}\n`);
    }
    done++;
    if (done % 10 === 0 || done === news.length) {
      process.stdout.write(`${done}/${news.length} done; ${failed} failed; ${totalCalls} model calls; ${totalTokens} input tokens; ${Math.round((Date.now() - started) / 1000)}s elapsed\n`);
    }
  }
}

const health = await fetch(`${api}/health`).then(r => r.json());
if (!health.configured) throw new Error(`T08 API is not configured: ${JSON.stringify(health)}`);
console.log(`Running ${news.length} records against ${health.provider} / ${health.model} at ${api}; concurrency=${concurrency}`);
await Promise.all(Array.from({ length: concurrency }, () => worker()));
console.log(JSON.stringify({ evaluated: done - failed, failed, calls: totalCalls, inputTokens: totalTokens, elapsedSeconds: Number(((Date.now() - started) / 1000).toFixed(1)), predictionsPath, errorsPath }, null, 2));
if (failed) process.exitCode = 1;
