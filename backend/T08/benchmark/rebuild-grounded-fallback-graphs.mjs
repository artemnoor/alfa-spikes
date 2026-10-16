import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildGroundedFallbackGraph } from '../src/entities.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const defaultPath = resolve(`${here}/runs/entity-status-five-news-2026-10-16/results.json`)
const resultPath = resolve(process.argv[2] ?? defaultPath)
const report = JSON.parse(await readFile(resultPath, 'utf8'))

for (const item of report.results) {
  if (item.extractionMode !== 'grounded_fallback') continue
  const oldOrganizations = new Map(item.entities.filter((entity) => entity.type === 'ORGANIZATION').map((entity) => [entity.normalized_name, entity]))
  const graph = buildGroundedFallbackGraph(item.article, { date: item.date })
  for (const entity of graph.entities) {
    if (entity.type !== 'ORGANIZATION') continue
    const previous = oldOrganizations.get(entity.normalized_name)
    if (!previous) continue
    for (const key of ['entity_id', 'inn', 'link_source', 'link_status']) {
      if (previous[key] !== undefined) entity[key] = previous[key]
    }
  }
  item.entities = graph.entities
  item.events = graph.events
  item.relations = graph.relations
  item.eventGraphMode = 'grounded_sentence_fallback'
}

report.summary.entities = report.results.reduce((count, item) => count + item.entities.length, 0)
report.summary.events = report.results.reduce((count, item) => count + item.events.length, 0)
report.summary.relations = report.results.reduce((count, item) => count + item.relations.length, 0)
report.summary.eventAttributes = report.results.reduce((count, item) => count + item.events.reduce((sum, event) => sum + event.attributes.length, 0), 0)
report.summary.eventStatusCounts = report.results.flatMap((item) => item.events).reduce((counts, event) => {
  counts[event.event_status ?? 'unknown'] = (counts[event.event_status ?? 'unknown'] ?? 0) + 1
  return counts
}, {})

await writeFile(resultPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
process.stdout.write(`Rebuilt grounded graphs for ${report.results.filter((item) => item.extractionMode === 'grounded_fallback').length} partial articles without additional model calls.\n`)
