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

// In compare mode: height-based grid so it fits the viewport without scrolling.
// The grid is sized to the remaining column height, then aspect-ratio makes it square,
// leaving empty space to the right rather than overflowing below.
function RangeColumn({ rangeData, rangePath, hoveredHand, onCellHover }) {
  const spotName = rangePath.split('/').pop().replace(/_/g, ' ')
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0, minHeight: 0 }}>
      <div style={{ fontSize: '13px', fontWeight: '600', color: '#bbb', flexShrink: 0 }}>{spotName}</div>
      <div style={{ flexShrink: 0 }}>
        <ActionSummary actions={rangeData.actions} totalCombos={rangeData.totalCombos} />
      </div>
      {/* Outer: takes remaining column height. Inner: square sized to that height. */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'flex-start' }}>
        <div style={{ height: '100%', aspectRatio: '1 / 1', maxWidth: '100%' }}>
          <RangeGrid
            handCounters={rangeData.handCounters}
            actions={rangeData.actions}
            onCellHover={onCellHover}
            hoveredHand={hoveredHand}
          />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [rangeData1, setRangeData1] = useState(null)
  const [rangeData2, setRangeData2] = useState(null)
  const [loading1, setLoading1] = useState(false)
  const [loading2, setLoading2] = useState(false)
  const [hoveredHand, setHoveredHand] = useState(null)
  const [showComparePicker, setShowComparePicker] = useState(false)

  const isTrainer = location.pathname.endsWith('/train')
  const rawPath = location.pathname.replace(/^\//, '').replace(/\/train$/, '')

  const compareIdx = !isTrainer ? rawPath.indexOf('/compare/') : -1
  const isCompare = compareIdx !== -1

  const rangePath1 = isCompare ? rawPath.slice(0, compareIdx) : rawPath
  const rangePath2 = isCompare ? rawPath.slice(compareIdx + '/compare/'.length) : null

  const jsonKey1 = rangePath1 ? `/ranges/${rangePath1}.json` : null
  const jsonKey2 = rangePath2 ? `/ranges/${rangePath2}.json` : null

  const fileTree = buildFileTree(Object.keys(rangeFiles))

  useEffect(() => {
    if (!jsonKey1 || !rangeFiles[jsonKey1]) { setRangeData1(null); return }
    setLoading1(true)
    setHoveredHand(null)
    rangeFiles[jsonKey1]()
      .then(mod => setRangeData1(parseRange(mod.default)))
      .catch(console.error)
      .finally(() => setLoading1(false))
  }, [jsonKey1])

  useEffect(() => {
    if (!jsonKey2 || !rangeFiles[jsonKey2]) { setRangeData2(null); return }
    setLoading2(true)
    rangeFiles[jsonKey2]()
      .then(mod => setRangeData2(parseRange(mod.default)))
      .catch(console.error)
      .finally(() => setLoading2(false))
  }, [jsonKey2])

  const handleSelect = useCallback((jsonPath) => {
    const urlPath = jsonPath.replace('/ranges/', '').replace('.json', '')
    navigate('/' + urlPath)
  }, [navigate])

  const handleCompareSelect = useCallback((jsonPath) => {
    const urlPath = jsonPath.replace('/ranges/', '').replace('.json', '')
    navigate('/' + rangePath1 + '/compare/' + urlPath)
    setShowComparePicker(false)
  }, [navigate, rangePath1])

  if (isTrainer && rangeData1) {
    return (
      <TrainerPage
        rangeData={rangeData1}
        rangePath={rangePath1}
        onBack={() => navigate('/' + rangePath1)}
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
        <FileTree tree={fileTree} onSelect={handleSelect} activeJsonKey={jsonKey1} />
      </div>

      {/* Main content — overflow:hidden in compare so flexbox controls all sizing */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        overflow: isCompare ? 'hidden' : 'auto',
        minWidth: 0,
      }}>
        {!rangeData1 && !loading1 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: '15px' }}>
            Select a range from the sidebar
          </div>
        )}

        {loading1 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
            Loading…
          </div>
        )}

        {rangeData1 && !loading1 && (
          /* Wrapper div (not fragment) so flex chain is unbroken for compare height propagation */
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexShrink: 0 }}>
              {isCompare ? (
                <>
                  <div style={{ fontSize: '13px', color: '#888' }}>
                    <span style={{ color: '#ccc', fontWeight: '600' }}>{rangePath1.split('/').pop().replace(/_/g, ' ')}</span>
                    <span style={{ color: '#444', margin: '0 10px' }}>vs</span>
                    <span style={{ color: '#ccc', fontWeight: '600' }}>{rangePath2?.split('/').pop().replace(/_/g, ' ')}</span>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => navigate('/' + rangePath1 + '/train')}
                      style={{ padding: '6px 14px', background: '#1565C0', border: 'none', borderRadius: '6px', color: 'white', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      Train →
                    </button>
                    <button
                      onClick={() => navigate('/' + rangePath1)}
                      style={{ padding: '6px 14px', background: '#2a2a2a', border: 'none', borderRadius: '6px', color: '#aaa', fontSize: '12px', cursor: 'pointer' }}
                    >
                      ✕ Close compare
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '13px', color: '#888' }}>{rangePath1.replace(/\//g, ' / ')}</div>
                  <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#555' }}>
                    {rangeData1.totalCombos.toFixed(0)} total combos
                  </div>
                </>
              )}
            </div>

            {isCompare ? (
              /* Compare: two columns, summary above each grid, flex: 1 fills remaining height */
              <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}>
                <RangeColumn
                  rangeData={rangeData1}
                  rangePath={rangePath1}
                  hoveredHand={hoveredHand}
                  onCellHover={setHoveredHand}
                />
                {loading2 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
                    Loading…
                  </div>
                ) : rangeData2 ? (
                  <RangeColumn
                    rangeData={rangeData2}
                    rangePath={rangePath2}
                    hoveredHand={hoveredHand}
                    onCellHover={setHoveredHand}
                  />
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
                    Range not found
                  </div>
                )}
              </div>
            ) : (
              /* Single view: square grid on left, summary + buttons on right */
              <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0, alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0, height: '100%', aspectRatio: '1', maxWidth: '100%' }}>
                  <RangeGrid
                    handCounters={rangeData1.handCounters}
                    actions={rangeData1.actions}
                    onCellHover={setHoveredHand}
                    hoveredHand={hoveredHand}
                  />
                </div>
                <div style={{ flex: 1, minWidth: '200px', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <ActionSummary actions={rangeData1.actions} totalCombos={rangeData1.totalCombos} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => navigate('/' + rangePath1 + '/train')}
                      style={{ flex: 1, padding: '10px 8px', background: '#1565C0', border: 'none', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      Train →
                    </button>
                    <button
                      onClick={() => setShowComparePicker(true)}
                      style={{ flex: 1, padding: '10px 8px', background: '#2a2a2a', border: '1px solid #444', borderRadius: '8px', color: '#ccc', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      Compare →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {rangeData1 && (
        <HoverTooltip
          hoveredHand={hoveredHand}
          handCounters={rangeData1.handCounters}
          actions={rangeData1.actions}
        />
      )}

      {/* Compare picker modal */}
      {showComparePicker && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowComparePicker(false)}
        >
          <div
            style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', padding: '16px', width: '280px', maxHeight: '500px', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#555', letterSpacing: '0.1em', marginBottom: '12px' }}>
              PICK RANGE TO COMPARE
            </div>
            <FileTree tree={fileTree} onSelect={handleCompareSelect} activeJsonKey={jsonKey2} />
          </div>
        </div>
      )}
    </div>
  )
}
