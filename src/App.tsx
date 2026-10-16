import { useState } from 'react'
import { Tab, Tabs } from '@alfalab/core-components/tabs'
import T08 from './blocks/T08'
import T09 from './blocks/T09'
import T10 from './blocks/T10'
import T11 from './blocks/T11'
import T12 from './blocks/T12'
import T13 from './blocks/T13'

const blocks = { T08, T09, T10, T11, T12, T13 }
type BlockId = keyof typeof blocks
const blockIds = Object.keys(blocks) as BlockId[]

export default function App() {
  const [selectedBlock, setSelectedBlock] = useState<BlockId>('T08')
  const ActiveBlock = blocks[selectedBlock]

  return (
    <div className="page">
      <header className="topbar">
        <span className="brand">Альфа spikes</span>
        <div className="variant-nav">
          <Tabs
            aria-label="Варианты"
            selectedId={selectedBlock}
            onChange={(_, payload) => setSelectedBlock(String(payload.selectedId) as BlockId)}
            view="primary"
            size="s"
            scrollable
          >
            {blockIds.map((blockId) => (
              <Tab key={blockId} id={blockId} title={blockId} />
            ))}
          </Tabs>
        </div>
      </header>
      <ActiveBlock />
    </div>
  )
}
