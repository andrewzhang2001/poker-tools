import { useState, useEffect, useRef } from 'react'
import { getHorizontalActionGradient } from './parseRange.js'
import CardChips from './CardChips.jsx'
import ComboTable from './ComboTable.jsx'

const BUCKET_COUNT = 20
const BUCKET_SIZE_PCT = 100 / BUCKET_COUNT
const SINGLE_CHART_HEIGHT = 320
const STACKED_CHART_HEIGHT = 220
const Y_AXIS_WIDTH = 36
const DETAILS_WIDTH = 400
const SURFACE = '#1a1a1a'
const GRIDLINE = '#2a2a2a'
const X_TICKS = [0, 25, 50, 75, 100]
const POSITION_ORDER = ['OOP', 'IP']

const formatPct = (fraction, digits = 1) => `${(fraction * 100).toFixed(digits)}%`

function bucketIndexForEquity(equity) {
  return Math.min(BUCKET_COUNT - 1, Math.floor(equity * BUCKET_COUNT))
}

// Buckets a range's combos by equity. Each bucket lists its combos highest equity first.
function buildEquityBuckets(range) {
  const buckets = Array.from({ length: BUCKET_COUNT }, (_, i) => ({
    lowPct: i * BUCKET_SIZE_PCT,
    highPct: (i + 1) * BUCKET_SIZE_PCT,
    weight: 0,
    combos: [],
  }))
  for (const combo of range.combos) {
    const bucket = buckets[bucketIndexForEquity(combo.equity)]
    bucket.weight += combo.weight
    bucket.combos.push(combo)
  }
  const rangeWeight = range.combos.reduce((sum, combo) => sum + combo.weight, 0)
  for (const bucket of buckets) {
    bucket.share = rangeWeight > 0 ? bucket.weight / rangeWeight : 0
    bucket.combos.sort((a, b) => b.equity - a.equity)
  }
  return buckets
}

// Rounds the tallest bucket up to a clean axis top with at most 5 tick steps.
function buildYAxis(maxShare) {
  const maxPct = Math.max(1, maxShare * 100)
  const step = [1, 2, 5, 10, 20].find(s => Math.ceil(maxPct / s) <= 5) ?? 25
  const topPct = step * Math.ceil(maxPct / step)
  const ticks = Array.from({ length: topPct / step + 1 }, (_, i) => i * step)
  return { topPct, ticks }
}

function ActionLegend({ actions }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
      {actions.map(action => (
        <div key={action.code} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: action.color }} />
          <span style={{ fontSize: '11px', color: '#aaa' }}>{action.label}</span>
        </div>
      ))}
    </div>
  )
}

function ChartHeader({ chart }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', marginLeft: `${Y_AXIS_WIDTH}px` }}>
      <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{chart.range.position}</span>
      <span style={{ fontSize: '12px', color: '#888' }}>{chart.range.relativePosition}</span>
      <span style={{ fontSize: '12px', color: '#666' }}>{chart.label}</span>
      <span style={{ fontSize: '12px', color: '#aaa' }}>
        · {chart.range.totalCombos.toFixed(1)} combos · {formatPct(chart.range.totalEquity)} avg equity
      </span>
      <div style={{ marginLeft: 'auto' }}>
        <ActionLegend actions={chart.actions} />
      </div>
    </div>
  )
}

function EquityHistogram({ buckets, actions, axis, height, selection, onHover, onPin }) {
  return (
    <div>
      <div style={{ display: 'flex', height: `${height}px` }}>
        {/* Y axis */}
        <div style={{ position: 'relative', width: `${Y_AXIS_WIDTH}px`, flexShrink: 0 }}>
          {axis.ticks.map(tick => (
            <span key={tick} style={{
              position: 'absolute',
              right: '6px',
              bottom: `${(tick / axis.topPct) * 100}%`,
              transform: 'translateY(50%)',
              fontSize: '10px',
              color: '#777',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {tick}%
            </span>
          ))}
        </div>

        {/* Plot */}
        <div style={{ position: 'relative', flex: 1, borderBottom: '1px solid #444' }}>
          {axis.ticks.slice(1).map(tick => (
            <div key={tick} style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: `${(tick / axis.topPct) * 100}%`,
              borderTop: `1px solid ${GRIDLINE}`,
            }} />
          ))}

          <div
            style={{ position: 'absolute', inset: 0, display: 'flex' }}
            onMouseLeave={() => onHover(null)}
          >
            {buckets.map((bucket, bucketIndex) => {
              const isSelected = selection?.bucketIndex === bucketIndex
              return (
                <div
                  key={bucketIndex}
                  onMouseEnter={() => onHover({ bucketIndex, cards: null })}
                  onClick={() => onPin(bucketIndex)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    cursor: bucket.weight > 0 ? 'pointer' : 'default',
                    background: isSelected ? 'rgba(255,255,255,0.06)' : 'transparent',
                  }}
                >
                  <div style={{
                    width: '70%',
                    maxWidth: '24px',
                    height: `${(bucket.share * 100 / axis.topPct) * 100}%`,
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '4px 4px 0 0',
                    overflow: 'hidden',
                  }}>
                    {bucket.combos.map(combo => {
                      const isHighlighted = isSelected && selection.cards === combo.cards
                      return (
                        <div
                          key={combo.cards}
                          onMouseEnter={() => onHover({ bucketIndex, cards: combo.cards })}
                          style={{
                            ...getHorizontalActionGradient(combo.freqs, actions),
                            height: `${(combo.weight / bucket.weight) * 100}%`,
                            flexShrink: 0,
                            boxShadow: `inset 0 -1px 0 ${SURFACE}`,
                            filter: isHighlighted ? 'brightness(1.5)' : 'none',
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* X axis */}
      <div style={{ position: 'relative', height: '18px', marginLeft: `${Y_AXIS_WIDTH}px` }}>
        {X_TICKS.map(tick => (
          <span key={tick} style={{
            position: 'absolute',
            left: `${tick}%`,
            top: '4px',
            transform: 'translateX(-50%)',
            fontSize: '10px',
            color: '#777',
          }}>
            {tick}%
          </span>
        ))}
      </div>
    </div>
  )
}

// Scrolls a row to the middle of its scroll container when any part of it is out of view.
function scrollRowIntoView(container, cards) {
  const row = container.querySelector(`[data-cards="${cards}"]`)
  if (!row) return
  const containerRect = container.getBoundingClientRect()
  const rowRect = row.getBoundingClientRect()
  const isOutOfView = rowRect.top < containerRect.top || rowRect.bottom > containerRect.bottom
  if (!isOutOfView) return
  const rowOffsetFromCenter = (rowRect.top + rowRect.height / 2) - (containerRect.top + containerRect.height / 2)
  container.scrollTop += rowOffsetFromCenter
}

function BucketDetails({ chart, bucket, highlightedCards, onRowHover }) {
  if (!bucket) {
    return <div style={{ fontSize: '12px', color: '#555', fontStyle: 'italic' }}>Hover a bar to list its combos. Click a bar to pin it.</div>
  }

  return (
    <div>
      <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
        {chart.range.position} · {bucket.lowPct}–{bucket.highPct}% equity
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '18px', fontWeight: '700', color: 'white' }}>{formatPct(bucket.share)}</span>
        <span style={{ fontSize: '12px', color: '#aaa' }}>of range · {bucket.weight.toFixed(2)} combos</span>
      </div>
      {bucket.combos.length === 0 ? (
        <div style={{ fontSize: '12px', color: '#555', fontStyle: 'italic' }}>No combos</div>
      ) : (
        <ComboTable
          combos={bucket.combos}
          actions={chart.actions}
          highlightedCards={highlightedCards}
          onRowHover={onRowHover}
        />
      )}
    </div>
  )
}

// charts: [{ label, range, actions }]. One chart shows a single range; two stack OOP above IP.
export default function EquityDistribution({ charts, board, onClose }) {
  const [hovered, setHovered] = useState(null)
  const [pinned, setPinned] = useState(null)
  const [hoveredRowCards, setHoveredRowCards] = useState(null)
  const detailsScrollRef = useRef(null)

  useEffect(() => {
    const closeOnEscape = event => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const orderedCharts = [...charts].sort(
    (a, b) => POSITION_ORDER.indexOf(a.range.relativePosition) - POSITION_ORDER.indexOf(b.range.relativePosition)
  )
  const bucketsByChart = orderedCharts.map(chart => buildEquityBuckets(chart.range))
  const axis = buildYAxis(Math.max(...bucketsByChart.flat().map(bucket => bucket.share)))
  const chartHeight = orderedCharts.length > 1 ? STACKED_CHART_HEIGHT : SINGLE_CHART_HEIGHT

  const selection = hovered ?? (pinned && { ...pinned, cards: hoveredRowCards })
  const selectedChart = selection ? orderedCharts[selection.chartIndex] : null
  const selectedBucket = selection ? bucketsByChart[selection.chartIndex][selection.bucketIndex] : null

  const highlightedCards = selection?.cards
  useEffect(() => {
    if (highlightedCards && detailsScrollRef.current) scrollRowIntoView(detailsScrollRef.current, highlightedCards)
  }, [highlightedCards, selection?.chartIndex, selection?.bucketIndex])

  const togglePin = (chartIndex, bucketIndex) => setPinned(current =>
    current?.chartIndex === chartIndex && current.bucketIndex === bucketIndex ? null : { chartIndex, bucketIndex }
  )

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '4vh' }}
      onClick={onClose}
    >
      <div
        style={{ background: SURFACE, border: '1px solid #333', borderRadius: '12px', padding: '20px', width: 'min(1400px, 96vw)', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '6px' }}>
          <span style={{ fontSize: '16px', fontWeight: '700', color: 'white' }}>Equity distribution</span>
          <span style={{ fontSize: '13px' }}><CardChips cards={board} /></span>
          <button
            onClick={onClose}
            style={{ marginLeft: 'auto', padding: '6px 14px', background: '#2a2a2a', border: 'none', borderRadius: '6px', color: '#aaa', fontSize: '12px', cursor: 'pointer' }}
          >
            ✕ Close
          </button>
        </div>
        <div style={{ fontSize: '11px', color: '#666', marginBottom: '16px' }}>
          Bar height is the share of the range in each {BUCKET_SIZE_PCT}% equity bucket. Each slice is one combo, highest equity on top, colored by its action mix.
        </div>

        <div style={{ display: 'flex', gap: '24px', minHeight: 0 }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {orderedCharts.map((chart, chartIndex) => (
              <div key={chartIndex}>
                <ChartHeader chart={chart} />
                <EquityHistogram
                  buckets={bucketsByChart[chartIndex]}
                  actions={chart.actions}
                  axis={axis}
                  height={chartHeight}
                  selection={selection?.chartIndex === chartIndex ? selection : null}
                  onHover={target => setHovered(target && { chartIndex, ...target })}
                  onPin={bucketIndex => togglePin(chartIndex, bucketIndex)}
                />
              </div>
            ))}
            <div style={{ textAlign: 'center', fontSize: '10px', color: '#666', marginLeft: `${Y_AXIS_WIDTH}px`, marginTop: '-16px' }}>equity</div>
          </div>

          {/* Absolutely positioned content keeps the details list from changing the panel's height */}
          <div style={{ position: 'relative', width: `${DETAILS_WIDTH}px`, flexShrink: 0, borderLeft: '1px solid #2a2a2a' }}>
            <div ref={detailsScrollRef} style={{ position: 'absolute', inset: 0, overflow: 'auto', paddingLeft: '16px' }}>
              <BucketDetails
                chart={selectedChart}
                bucket={selectedBucket}
                highlightedCards={highlightedCards}
                onRowHover={setHoveredRowCards}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
