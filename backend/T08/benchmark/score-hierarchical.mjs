import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const readJsonl = name => fs.readFileSync(path.join(dir, name), 'utf8').trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const predictionPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(dir, 'predictions.jsonl');
if (!fs.existsSync(predictionPath)) {
  console.error(`Predictions file not found: ${predictionPath}\nPass a JSONL path: node score-hierarchical.mjs path/to/predictions.jsonl`);
  process.exit(2);
}

const predictions = fs.readFileSync(predictionPath, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const labels = new Map(readJsonl('gold-labels.jsonl').map(row => [row.id, row]));
const news = new Map(readJsonl('news.jsonl').map(row => [row.id, row]));
const taxonomy = JSON.parse(fs.readFileSync(path.join(dir, '..', '..', '..', 'src', 'blocks', 'T08', 'datasets', 'iptc-media-topics-tree-en-US.json'), 'utf8'));
const pathByQcode = new Map();

function index(nodes, parents = []) {
  for (const node of nodes) {
    const qcode = node.value?.qcode ?? node.id;
    const currentPath = [...parents, qcode];
    pathByQcode.set(qcode, currentPath);
    index(node.children ?? [], currentPath);
  }
}

index(taxonomy.roots);

function scores(predictionQcode, goldQcode) {
  const predictedPath = pathByQcode.get(predictionQcode);
  const goldPath = pathByQcode.get(goldQcode);
  if (!predictedPath || !goldPath) return null;

  let commonNodes = 0;
  while (
    commonNodes < predictedPath.length &&
    commonNodes < goldPath.length &&
    predictedPath[commonNodes] === goldPath[commonNodes]
  ) commonNodes++;

  return {
    exact: predictionQcode === goldQcode,
    sameTopLevel: predictedPath[0] === goldPath[0],
    hierarchicalF1: (2 * commonNodes) / (predictedPath.length + goldPath.length),
  };
}

const groups = ['all', 'train', 'dev', 'test'];
const metrics = {};
for (const group of groups) {
  const rows = predictions.filter(prediction => {
    const article = news.get(prediction.id);
    return labels.has(prediction.id) && article && (group === 'all' || article.split === group);
  });
  let exact = 0;
  let sameTopLevel = 0;
  let hierarchicalF1 = 0;
  let invalid = 0;

  for (const prediction of rows) {
    const predictedQcode = prediction.topic?.qcode ?? prediction.topic;
    const expectedQcode = labels.get(prediction.id).topic.qcode;
    const result = scores(predictedQcode, expectedQcode);
    if (!result) {
      invalid++;
      continue;
    }
    if (result.exact) exact++;
    if (result.sameTopLevel) sameTopLevel++;
    hierarchicalF1 += result.hierarchicalF1;
  }

  const evaluated = rows.length - invalid;
  metrics[group] = {
    evaluated,
    exactQcodeAccuracy: evaluated ? Number((exact / evaluated).toFixed(4)) : null,
    sameTopLevelAccuracy: evaluated ? Number((sameTopLevel / evaluated).toFixed(4)) : null,
    meanHierarchicalF1: evaluated ? Number((hierarchicalF1 / evaluated).toFixed(4)) : null,
    invalidTopicQcodes: invalid,
  };
}

const report = {
  models: [...new Set(predictions.map(prediction => prediction.system ?? prediction.model).filter(Boolean))],
  metric: 'IPTC topic path F1: 2 × shared ancestor count / (predicted path depth + gold path depth)',
  interpretation: 'Exact QCode accuracy is retained; shared ancestors receive partial credit, while broad predictions lose precision and wrong top-level branches receive no hierarchy credit.',
  predictions: predictions.length,
  unavailableRecords: [...news.keys()].filter(id => !predictions.some(prediction => prediction.id === id)).length,
  metrics,
};
const output = JSON.stringify(report, null, 2);
if (process.argv[3]) fs.writeFileSync(path.resolve(process.argv[3]), `${output}\n`);
console.log(output);
