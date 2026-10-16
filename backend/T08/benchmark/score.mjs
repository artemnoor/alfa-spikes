import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const readJsonl = name => fs.readFileSync(path.join(dir, name), 'utf8').trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const goldNews = readJsonl('news.jsonl');
const goldLabels = readJsonl('gold-labels.jsonl');
const predPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(dir, 'predictions.jsonl');
if (!fs.existsSync(predPath)) {
  console.error(`Predictions file not found: ${predPath}\nPass a JSONL path: node score.mjs path/to/predictions.jsonl`);
  process.exit(2);
}
const predictions = fs.readFileSync(predPath, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const goldById = new Map(goldLabels.map(x => [x.id, x]));
const splitById = new Map(goldNews.map(x => [x.id, x.split]));
const tasks = [
  ['topic', x => x.topic?.qcode ?? x.topic],
  ['event', x => x.event?.id ?? x.event],
  ['genre', x => x.genre?.qcode ?? x.genre],
];
const groups = ['all', 'train', 'dev', 'test'];
const report = {};
for (const [task, get] of tasks) {
  report[task] = {};
  for (const group of groups) {
    const rows = predictions.filter(p => goldById.has(p.id) && (group === 'all' || splitById.get(p.id) === group));
    const correct = rows.filter(p => get(p) === get(goldById.get(p.id))).length;
    report[task][group] = { evaluated: rows.length, accuracy: rows.length ? Number((correct / rows.length).toFixed(4)) : null };
  }
}
const missing = [...goldById.keys()].filter(id => !predictions.some(p => p.id === id)).length;
const duplicates = predictions.length - new Set(predictions.map(p => p.id)).size;
console.log(JSON.stringify({ predictions: predictions.length, missingGoldRecords: missing, duplicatePredictionIds: duplicates, metrics: report }, null, 2));
