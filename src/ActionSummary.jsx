export default function ActionSummary({ actions, totalCombos }) {
  const totalFreq = actions.reduce((s, a) => s + a.total_frequency, 0)

  return (
    <div>
      {/* Action tiles */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${actions.length}, 1fr)`,
        gap: '8px',
        marginBottom: '8px',
      }}>
        {actions.map(action => (
          <div
            key={action.code}
            style={{
              background: action.color,
              borderRadius: '8px',
              padding: '12px 10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '90px',
            }}
          >
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
              {action.label}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '22px', fontWeight: '700', color: 'white' }}>
                {(action.total_frequency * 100).toFixed(1)}%
              </span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', textAlign: 'right' }}>
                {action.total_combos.toFixed(2)}<br />combos
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
        {actions.map(action => (
          <div
            key={action.code}
            style={{
              flex: action.total_frequency,
              background: action.color,
            }}
          />
        ))}
      </div>
    </div>
  )
}
