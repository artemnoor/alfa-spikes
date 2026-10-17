import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { closeT10Store, listRuns } from '../src/store.mjs'

const directory=dirname(fileURLToPath(import.meta.url))
const file=resolve(directory,'runs/2026-10-17-live-13-case-v3/results.json')
const report=JSON.parse(await readFile(file,'utf8'))
try {
  for (const item of report.cases) {
    const run=(await listRuns(item.profileId)).find((entry)=>entry.run_id===item.runId)
    if (!run) throw new Error(`T10 run not found for ${item.scenarioId}`)
    item.stageOutputs=Object.fromEntries(run.blocks.map((block)=>[block.blockId,{input:block.input,output:block.output,errors:block.metrics?.errors??[]}]))
  }
} finally { await closeT10Store() }
await writeFile(file,`${JSON.stringify(report,null,2)}\n`,'utf8')
process.stdout.write(`Attached stored stage outputs to ${report.cases.length} benchmark cases\n`)
