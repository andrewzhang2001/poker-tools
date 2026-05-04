export default function HoverTooltip({ hoveredHand, handCounters, actions }) {
  if (!hoveredHand) return null

  const hand = handCounters?.[hoveredHand]
  if (!hand) return null

  const freqs = hand.actions_total_frequencies ?? {}
  const combos = hand.actions_total_combos ?? {}
  const available = hand.total_combos_available ?? 0

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      background: '#222',
      border: '1px solid #333',
      borderRadius: '10px',
      padding: '12px 14px',
      minWidth: '180px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      zIndex: 1000,
      pointerEvents: 'none',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
        <span style={{ fontSize: '18px', fontWeight: '700', color: 'white' }}>{hoveredHand}</span>
        <span style={{ fontSize: '11px', color: '#888' }}>{available} combos</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {actions.map(action => {
          const freq = freqs[action.code] ?? 0
          const combo = combos[action.code] ?? 0
          if (freq === 0) return null
          return (
            <div key={action.code} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: action.color, flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: '#ccc', flex: 1 }}>{action.label}</span>
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'white' }}>
                {(freq * 100).toFixed(1)}%
              </span>
              <span style={{ fontSize: '11px', color: '#777', minWidth: '36px', textAlign: 'right' }}>
                {combo.toFixed(2)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Mini color bar */}
      <div style={{ display: 'flex', height: '4px', borderRadius: '2px', overflow: 'hidden', marginTop: '10px' }}>
        {actions.map(action => (
          <div
            key={action.code}
            style={{ flex: freqs[action.code] ?? 0, background: action.color }}
          />
        ))}
      </div>
    </div>
  )
}
