import { useState } from 'react'
import { Tab, Tabs } from '@alfalab/core-components/tabs'
import T08 from './blocks/T08'
import T09 from './blocks/T09'
import T10 from './blocks/T10'
import T11 from './blocks/T11'
import T12 from './blocks/T12'
import T13 from './blocks/T13'
import type { T08Snapshot } from './blocks/T08'
import Archive from './archive'

const blocks = { T08, T09, T10, T11, T12, T13 }
type BlockId = keyof typeof blocks
type ViewId = BlockId | 'DB'
const viewIds = [...Object.keys(blocks), 'DB'] as ViewId[]

export default function App() {
  const [selectedBlock, setSelectedBlock] = useState<ViewId>('T08')
  const [t08Snapshot, setT08Snapshot] = useState<T08Snapshot | null>(null)
  const renderActiveBlock = () => {
    switch (selectedBlock) {
      case 'T08':
        return <T08 initialSnapshot={t08Snapshot} onAnalysisComplete={setT08Snapshot} />
      case 'T09':
        return null
      case 'DB':
        return <Archive />
      default: {
        const OtherBlock = blocks[selectedBlock]
        return <OtherBlock />
      }
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <span className="brand">Альфа spikes</span>
        <div className="variant-nav">
          <Tabs
            aria-label="Варианты"
            selectedId={selectedBlock}
            onChange={(_, payload) => setSelectedBlock(String(payload.selectedId) as ViewId)}
            view="primary"
            size="s"
            scrollable
          >
            {viewIds.map((viewId) => (
              <Tab key={viewId} id={viewId} title={viewId === 'DB' ? 'База' : viewId} />
            ))}
          </Tabs>
        </div>
      </header>
      {renderActiveBlock()}
      <div hidden={selectedBlock !== 'T09'}>
        <T09 source={t08Snapshot} onReturnToT08={() => setSelectedBlock('T08')} />
      </div>
    </div>
  )
}
