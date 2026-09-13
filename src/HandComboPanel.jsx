import CardChips from './CardChips.jsx'
import { formatEV, inactiveReason } from './ComboTable.jsx'
import { getComboGradient } from './parseRange.js'

// Offsuit combos arrive grouped by the high card's suit in threes, so they fill column by column.
function tileGridShape(handName) {
  const isPair = handName.length === 2
  const isSuited = handName.endsWith('s')
  if (isPair) return { columns: 3, rows: 2, flow: 'row' }
  if (isSuited) return { columns: 2, rows: 2, flow: 'row' }
  return { columns: 4, rows: 3, flow: 'column' }
}

const statStyle = { fontSize: '13px', color: '#ddd', fontVariantNumeric: 'tabular-nums' }

// One combo, drawn like a zoomed-in grid bar: dark top for the out-of-range share, action colors below.
function ComboTile({ combo, actions }) {
  const reason = inactiveReason(combo)
  const tileStyle = { borderRadius: '6px', minWidth: 0, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', overflow: 'hidden' }

  if (reason) {
    return (
      <div style={{ ...tileStyle, background: '#000', flexDirection: 'column', gap: '6px' }}>
        <span style={{ opacity: 0.25 }}><CardChips cards={combo.cards} size="large" /></span>
        <span style={{ fontSize: '11px', color: '#444', fontStyle: 'italic' }}>{reason}</span>
      </div>
    )
  }

  const activeActions = actions.filter(action => (combo.freqs[action.code] ?? 0) >= 0.005)

  return (
    <div style={{ ...tileStyle, ...getComboGradient(combo, actions) }}>
      <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: '6px', padding: '8px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <CardChips cards={combo.cards} size="large" />
        <span style={statStyle}>{(combo.equity * 100).toFixed(1)}% eq</span>
        <span style={statStyle}>{formatEV(combo.ev)} EV</span>
        <span style={{ ...statStyle, color: '#999', fontSize: '11px' }}>{combo.weight.toFixed(3)} in range</span>
        {activeActions.map(action => (
          <span key={action.code} style={{ ...statStyle, fontSize: '12px', whiteSpace: 'nowrap' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '2px', background: action.color, marginRight: '5px' }} />
            {action.label} {((combo.freqs[action.code]) * 100).toFixed(0)}%
          </span>
        ))}
      </div>
    </div>
  )
}

// Postflop hover detail: the hovered hand's totals, then one tile per suit combo.
export default function HandComboPanel({ handName, hand, combos, actions }) {
  if (!handName) {
    return <div style={{ fontSize: '12px', color: '#555', fontStyle: 'italic' }}>Hover a hand to break it down by combo.</div>
  }

  const inRange = hand && hand.total_combos > 0
  const shape = tileGridShape(handName)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexShrink: 0 }}>
        <span style={{ fontSize: '20px', fontWeight: '700', color: 'white' }}>{handName}</span>
        <span style={{ fontSize: '12px', color: '#aaa' }}>
          {inRange ? hand.total_combos.toFixed(2) : 0} / {hand?.total_combos_available ?? 0} combos
        </span>
        {inRange && (
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#aaa' }}>
            {(hand.hand_eq * 100).toFixed(1)}% eq · {formatEV(hand.hand_ev)} EV
          </span>
        )}
      </div>
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: `repeat(${shape.columns}, 1fr)`,
        gridTemplateRows: `repeat(${shape.rows}, 1fr)`,
        gridAutoFlow: shape.flow,
        gap: '6px',
      }}>
        {combos.map(combo => <ComboTile key={combo.cards} combo={combo} actions={actions} />)}
      </div>
    </div>
  )
}
