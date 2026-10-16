import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = name => fs.readFileSync(path.join(dir, name), 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const news = read('news.jsonl');
const gold = new Map(read('gold-labels.jsonl').map(x => [x.id, x]));
const predictions = read('run-predictions.jsonl');
const errors = read('run-errors.jsonl');
const metrics = {};
const fields = {
  topic: [x => x.topic.qcode, x => x.topic],
  event: [x => x.event.id, x => x.event],
  genre: [x => x.genre.qcode, x => x.genre],
};
for (const [task, [goldKey, predictedKey]] of Object.entries(fields)) {
  metrics[task] = {};
  for (const split of ['all', 'train', 'dev', 'test']) {
    const rows = predictions.filter(p => split === 'all' || news.find(n => n.id === p.id)?.split === split);
    const correct = rows.filter(p => goldKey(gold.get(p.id)) === predictedKey(p)).length;
    const total = split === 'all' ? news.length : news.filter(n => n.split === split).length;
    metrics[task][split] = { correct, evaluated: rows.length, total, exactAccuracy: rows.length ? Number((correct / rows.length).toFixed(4)) : null };
  }
}
const summary = {
  runDate: new Date().toISOString(), provider: 'Polza AI', model: predictions[0]?.system ?? null,
  benchmarkRecords: news.length, successfulRecords: predictions.length, unavailableRecords: errors.length,
  coverage: Number((predictions.length / news.length).toFixed(4)),
  modelCalls: predictions.reduce((sum, p) => sum + (p.calls ?? 0), 0),
  inputTokens: predictions.reduce((sum, p) => sum + (p.inputTokens ?? 0), 0),
  outputTokens: predictions.reduce((sum, p) => sum + (p.outputTokens ?? 0), 0),
  reportedCostRub: predictions.every(p => Number.isFinite(p.costRub))
    ? Number(predictions.reduce((sum, p) => sum + p.costRub, 0).toFixed(6))
    : null,
  splits: Object.fromEntries(['train', 'dev', 'test'].map(split => [split, {
    total: news.filter(n => n.split === split).length,
    successful: predictions.filter(p => news.find(n => n.id === p.id)?.split === split).length,
    unavailable: errors.filter(e => news.find(n => n.id === e.id)?.split === split).length,
  }])),
  metrics, failures: 'All unavailable responses are listed by id in run-errors.jsonl and excluded from exact-accuracy denominators.',
};
fs.writeFileSync(path.join(dir, 'run-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
