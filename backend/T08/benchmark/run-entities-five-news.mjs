import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractAndLinkEntities } from '../src/entities.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const inputPath = resolve(process.argv[2] ?? `${here}/runs/jev-recovering-top3-topic-2026-10-15/news.json`)
const outputPath = resolve(process.argv[3] ?? `${here}/runs/entity-graph-five-news-2026-10-16/results.json`)
const news = JSON.parse(await readFile(inputPath, 'utf8'))
const requestedIds = process.env.T08_BENCHMARK_NEWS_IDS?.split(',').map((id) => Number(id.trim())).filter(Number.isFinite)
const selectedNews = requestedIds?.length ? news.filter((item) => requestedIds.includes(item.id)) : news
if (!Array.isArray(news) || (!requestedIds?.length && news.length !== 5)) throw new Error(`Expected five news items, received ${news?.length ?? 'invalid input'}`)
if (!selectedNews.length || (requestedIds?.length && selectedNews.length !== requestedIds.length)) throw new Error('One or more selected news IDs were not found')

const results = []
await mkdir(dirname(outputPath), { recursive: true })
for (const item of selectedNews) {
  const state = `Заголовок: ${item.title}\n\n${item.content}`
  const result = await extractAndLinkEntities(state, { date: item.date }).catch((error) => ({
    status: 'unavailable', model: 'deepseek/deepseek-v4-flash', entities: [], events: [], relations: [], calls: 1,
    inputTokens: 0, outputTokens: 0, costRub: null, registryLookups: 0, error: error.message,
  }))
  results.push({ id: item.id, name: item.name, date: item.date, title: item.title, article: state, ...result })
  process.stdout.write(`${results.length}/${selectedNews.length} ${item.name}: ${result.status === 'model' ? `${result.entities.length} entities` : result.status === 'partial' ? `${result.entities.length} entities (grounded fallback)` : `unavailable (${result.error})`}, ${result.calls} model calls\n`)
  await writeFile(outputPath, `${JSON.stringify({ model: 'deepseek/deepseek-v4-flash', input: inputPath, partial: results.length < selectedNews.length, results }, null, 2)}\n`, 'utf8')
}

const summary = results.reduce((total, item) => ({
  news: total.news + 1,
  failedNews: total.failedNews + (item.status === 'unavailable' ? 1 : 0),
  partialNews: total.partialNews + (item.status === 'partial' ? 1 : 0),
  modelCalls: total.modelCalls + item.calls,
  inputTokens: total.inputTokens + item.inputTokens,
  outputTokens: total.outputTokens + item.outputTokens,
  costRub: total.costRub === null || item.costRub === null ? null : total.costRub + item.costRub,
  registryApiCalls: total.registryApiCalls + item.registryLookups,
  entities: total.entities + item.entities.length,
  events: total.events + item.events.length,
  relations: total.relations + item.relations.length,
  eventAttributes: total.eventAttributes + item.events.reduce((sum, event) => sum + event.attributes.length, 0),
  eventStatusCounts: item.events.reduce((counts, event) => ({ ...counts, [event.event_status ?? 'unknown']: (counts[event.event_status ?? 'unknown'] ?? 0) + 1 }), total.eventStatusCounts),
  rejectedEntities: total.rejectedEntities + item.rejectedEntities,
}), { news: 0, failedNews: 0, partialNews: 0, modelCalls: 0, inputTokens: 0, outputTokens: 0, costRub: 0, registryApiCalls: 0, entities: 0, events: 0, relations: 0, eventAttributes: 0, eventStatusCounts: {}, rejectedEntities: 0 })

await writeFile(outputPath, `${JSON.stringify({ model: 'deepseek/deepseek-v4-flash', input: inputPath, summary, results }, null, 2)}\n`, 'utf8')
process.stdout.write(`\nSaved: ${outputPath}\n${JSON.stringify(summary, null, 2)}\n`)
