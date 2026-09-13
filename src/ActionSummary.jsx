const DIMMED_OPACITY = 0.35

// selectedActionCode dims every other action. onActionSelect makes the tiles clickable.
export default function ActionSummary({ actions, selectedActionCode, onActionSelect }) {
  const opacityFor = action => (selectedActionCode && action.code !== selectedActionCode ? DIMMED_OPACITY : 1)

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
            onClick={onActionSelect && (() => onActionSelect(action.code))}
            style={{
              background: action.color,
              borderRadius: '8px',
              padding: '12px 10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '90px',
              cursor: onActionSelect ? 'pointer' : 'default',
              opacity: opacityFor(action),
              boxShadow: action.code === selectedActionCode ? 'inset 0 0 0 2px white' : 'none',
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
              opacity: opacityFor(action),
            }}
          />
        ))}
      </div>
    </div>
  )
}
