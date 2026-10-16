import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { classifyNews } from '../src/classifier.mjs'

const defaultInput = new URL('./runs/jev-recovering-top3-topic-2026-10-15/news.json', import.meta.url)
const inputPath = resolve(process.argv[2] || fileURLToPath(defaultInput))
const outputPath = resolve(process.argv[3] || dirname(inputPath), 'results.json')
const news = JSON.parse(await readFile(inputPath, 'utf8'))
const newsToRun = Number(process.env.T08_NEWS_LIMIT) > 0 ? news.slice(0, Number(process.env.T08_NEWS_LIMIT)) : news
const output = {
  startedAt: new Date().toISOString(),
  input: inputPath,
  models: { topic: 'typesafe/jev', fallback: 'deepseek/deepseek-v4-flash', event: 'typesafe/jev', genre: 'typesafe/jev' },
  results: [],
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, JSON.stringify(output, null, 2), 'utf8')

for (const item of newsToRun) {
  const state = `Дата публикации: ${item.date}\nЗаголовок: ${item.title}\n\n${item.content}`
  try {
    const result = await classifyNews(state)
    output.results.push({ input: item, result })
  } catch (error) {
    output.results.push({ input: item, error: error?.stack ?? String(error) })
  }
  output.updatedAt = new Date().toISOString()
  await writeFile(outputPath, JSON.stringify(output, null, 2), 'utf8')
  process.stdout.write(`${item.id}/5 ${item.name}: ${output.results.at(-1).result?.classifications?.topic?.value?.label ?? 'ERROR'}\n`)
}

const completed = output.results.filter((item) => item.result)
output.summary = {
  newsCount: newsToRun.length,
  completed: completed.length,
  failed: newsToRun.length - completed.length,
  deepseekFallbackCount: completed.filter((item) => item.result.classifications.topic.deepseekUsed).length,
  totalCalls: completed.reduce((sum, item) => sum + item.result.calls, 0),
  totalInputTokens: completed.reduce((sum, item) => sum + item.result.inputTokens, 0),
  totalCostRub: completed.every((item) => Number.isFinite(item.result.costRub))
    ? completed.reduce((sum, item) => sum + item.result.costRub, 0)
    : null,
}
output.finishedAt = new Date().toISOString()
await writeFile(outputPath, JSON.stringify(output, null, 2), 'utf8')
process.stdout.write(`Saved ${output.results.length} results to ${outputPath}\n`)
