import { useState, useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import RangeGrid from './RangeGrid.jsx'
import ActionSummary from './ActionSummary.jsx'
import HoverTooltip from './HoverTooltip.jsx'
import TrainerPage from './TrainerPage.jsx'
import { parseRange } from './parseRange.js'

const rangeFiles = import.meta.glob('/ranges/**/*.json')

function buildFileTree(paths) {
  const tree = {}
  for (const path of paths) {
    const parts = path.replace('/ranges/', '').split('/')
    let node = tree
    for (let i = 0; i < parts.length - 1; i++) {
      node[parts[i]] = node[parts[i]] || {}
      node = node[parts[i]]
    }
    node[parts[parts.length - 1]] = path
  }
  return tree
}

function FileTree({ tree, onSelect, activeJsonKey, depth = 0 }) {
  return (
    <div style={{ paddingLeft: depth > 0 ? '14px' : 0 }}>
      {Object.entries(tree).map(([key, value]) => {
        if (typeof value === 'string') {
          const active = activeJsonKey === value
          return (
            <div
              key={key}
              onClick={() => onSelect(value)}
              style={{
                padding: '4px 8px',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '12px',
                color: active ? 'white' : '#aaa',
                background: active ? '#333' : 'transparent',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {key.replace('.json', '')}
            </div>
          )
        }
        return (
          <details key={key} open>
            <summary style={{
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '12px',
              color: '#ddd',
              fontWeight: '600',
              letterSpacing: '0.02em',
              listStyle: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <span style={{ opacity: 0.5 }}>▶</span> {key}
            </summary>
            <FileTree tree={value} onSelect={onSelect} activeJsonKey={activeJsonKey} depth={depth + 1} />
          </details>
        )
      })}
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [rangeData, setRangeData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [hoveredHand, setHoveredHand] = useState(null)

  const isTrainer = location.pathname.endsWith('/train')
  const rangePath = location.pathname.replace(/^\//, '').replace(/\/train$/, '')
  const jsonKey = rangePath ? `/ranges/${rangePath}.json` : null

  const fileTree = buildFileTree(Object.keys(rangeFiles))

  useEffect(() => {
    if (!jsonKey || !rangeFiles[jsonKey]) {
      setRangeData(null)
      return
    }
    setLoading(true)
    setHoveredHand(null)
    rangeFiles[jsonKey]()
      .then(mod => setRangeData(parseRange(mod.default)))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [jsonKey])

  const handleSelect = useCallback((jsonPath) => {
    const urlPath = jsonPath.replace('/ranges/', '').replace('.json', '')
    navigate('/' + urlPath)
  }, [navigate])

  if (isTrainer && rangeData) {
    return (
      <TrainerPage
        rangeData={rangeData}
        onBack={() => navigate('/' + rangePath)}
      />
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{
        width: '200px',
        flexShrink: 0,
        background: '#111',
        borderRight: '1px solid #2a2a2a',
        overflow: 'auto',
        padding: '12px 8px',
      }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#666', letterSpacing: '0.1em', marginBottom: '10px', padding: '0 8px' }}>
          RANGES
        </div>
        <FileTree tree={fileTree} onSelect={handleSelect} activeJsonKey={jsonKey} />
      </div>

      {/* Main content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        overflow: 'auto',
        minWidth: 0,
      }}>
        {!rangeData && !loading && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#555',
            fontSize: '15px',
          }}>
            Select a range from the sidebar
          </div>
        )}

        {loading && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#555',
          }}>
            Loading…
          </div>
        )}

        {rangeData && !loading && (
          <>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
              flexShrink: 0,
            }}>
              <div style={{ fontSize: '13px', color: '#888' }}>
                {rangePath.replace(/\//g, ' / ')}
              </div>
              <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#555' }}>
                {rangeData.totalCombos.toFixed(0)} total combos
              </div>
            </div>

            {/* Grid + right panel */}
            <div style={{
              display: 'flex',
              gap: '16px',
              flex: 1,
              minHeight: 0,
              alignItems: 'flex-start',
            }}>
              {/* Square grid */}
              <div style={{
                flexShrink: 0,
                height: '100%',
                aspectRatio: '1',
                maxWidth: '100%',
              }}>
                <RangeGrid
                  handCounters={rangeData.handCounters}
                  actions={rangeData.actions}
                  onCellHover={setHoveredHand}
                  hoveredHand={hoveredHand}
                />
              </div>

              {/* Right panel */}
              <div style={{
                flex: 1,
                minWidth: '200px',
                paddingTop: '4px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}>
                <ActionSummary
                  actions={rangeData.actions}
                  totalCombos={rangeData.totalCombos}
                />
                <button
                  onClick={() => navigate('/' + rangePath + '/train')}
                  style={{
                    padding: '10px 16px',
                    background: '#1565C0',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    letterSpacing: '0.02em',
                  }}
                >
                  Train this range →
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {rangeData && (
        <HoverTooltip
          hoveredHand={hoveredHand}
          handCounters={rangeData.handCounters}
          actions={rangeData.actions}
        />
      )}
    </div>
  )
}
