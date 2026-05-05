function RangeBreakdown({ hand, actions }) {
  if (!hand || hand.total_combos === 0) {
    return <div style={{ fontSize: '11px', color: '#555', fontStyle: 'italic' }}>Not in range</div>
  }

  const freqs = hand.actions_total_frequencies ?? {}
  const combos = hand.actions_total_combos ?? {}

  return (
    <div>
      <div style={{ fontSize: '10px', color: '#666', marginBottom: '5px' }}>
        {hand.total_combos.toFixed(2)} / {hand.total_combos_available} combos
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {actions.map(action => {
          const freq = freqs[action.code] ?? 0
          const combo = combos[action.code] ?? 0
          if (freq === 0) return null
          return (
            <div key={action.code} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: action.color, flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: '#ccc', flex: 1, whiteSpace: 'nowrap' }}>{action.label}</span>
              <span style={{ fontSize: '11px', fontWeight: '600', color: 'white' }}>{(freq * 100).toFixed(1)}%</span>
              <span style={{ fontSize: '10px', color: '#777', minWidth: '32px', textAlign: 'right' }}>{combo.toFixed(2)}</span>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', height: '3px', borderRadius: '2px', overflow: 'hidden', marginTop: '7px' }}>
        {actions.map(action => (
          <div key={action.code} style={{ flex: freqs[action.code] ?? 0, background: action.color }} />
        ))}
      </div>
    </div>
  )
}

export default function HoverTooltip({ hoveredHand, handCounters, actions, handCounters2, actions2, label1, label2 }) {
  if (!hoveredHand) return null

  const hand1 = handCounters?.[hoveredHand]
  const hand2 = handCounters2?.[hoveredHand]
  const isCompare = !!handCounters2

  if (!hand1 && !hand2) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      background: '#222',
      border: '1px solid #333',
      borderRadius: '10px',
      padding: '12px 14px',
      minWidth: isCompare ? '400px' : '180px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      zIndex: 1000,
      pointerEvents: 'none',
    }}>
      <div style={{ marginBottom: '10px' }}>
        <span style={{ fontSize: '18px', fontWeight: '700', color: 'white' }}>{hoveredHand}</span>
        {!isCompare && (
          <span style={{ fontSize: '11px', color: '#888', marginLeft: '8px' }}>
            {hand1?.total_combos_available ?? 0} combos
          </span>
        )}
      </div>

      {isCompare ? (
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {label1 && <div style={{ fontSize: '10px', color: '#555', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '6px' }}>{label1}</div>}
            <RangeBreakdown hand={hand1} actions={actions} />
          </div>
          <div style={{ width: '1px', background: '#333', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {label2 && <div style={{ fontSize: '10px', color: '#555', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '6px' }}>{label2}</div>}
            <RangeBreakdown hand={hand2} actions={actions2} />
          </div>
        </div>
      ) : (
        <RangeBreakdown hand={hand1} actions={actions} />
      )}
    </div>
  )
}
