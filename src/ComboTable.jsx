import CardChips from './CardChips.jsx'

const cellStyle = { padding: '3px 6px' }
const formatPct = (fraction, digits) => `${(fraction * 100).toFixed(digits)}%`

// Rounds tiny negatives to 0 so they don't print as -0.00.
export const formatEV = ev => (Math.abs(ev) < 0.005 ? 0 : ev).toFixed(2)

export function inactiveReason(combo) {
  if (combo.blocked) return 'blocked by board'
  if (combo.weight === 0) return 'not in range'
  return null
}

// One row per combo: equity, EV, range weight, and each action's frequency.
// Blocked and out-of-range combos show a reason in place of their numbers.
export default function ComboTable({ combos, actions, highlightedCards, onRowHover }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontVariantNumeric: 'tabular-nums' }}>
      <thead>
        <tr style={{ color: '#666', textAlign: 'right' }}>
          <th style={{ ...cellStyle, textAlign: 'left', fontWeight: '600' }}>Combo</th>
          <th style={{ ...cellStyle, fontWeight: '600' }}>Eq</th>
          <th style={{ ...cellStyle, fontWeight: '600' }}>EV</th>
          <th style={{ ...cellStyle, fontWeight: '600' }}>Wt</th>
          {actions.map(action => (
            <th key={action.code} style={{ ...cellStyle, fontWeight: '600', whiteSpace: 'nowrap' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '2px', background: action.color, marginRight: '4px', verticalAlign: 'middle' }} />
              {action.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {combos.map(combo => {
          const reason = inactiveReason(combo)
          return (
            <tr
              key={combo.cards}
              data-cards={combo.cards}
              onMouseEnter={() => onRowHover?.(combo.cards)}
              onMouseLeave={() => onRowHover?.(null)}
              style={{
                color: '#ccc',
                textAlign: 'right',
                background: highlightedCards === combo.cards ? '#333' : 'transparent',
                opacity: reason ? 0.4 : 1,
              }}
            >
              <td style={{ ...cellStyle, textAlign: 'left' }}><CardChips cards={combo.cards} /></td>
              {reason ? (
                <td colSpan={3 + actions.length} style={{ ...cellStyle, textAlign: 'left', fontStyle: 'italic', color: '#888' }}>{reason}</td>
              ) : (
                <>
                  <td style={cellStyle}>{formatPct(combo.equity, 1)}</td>
                  <td style={cellStyle}>{formatEV(combo.ev)}</td>
                  <td style={cellStyle}>{combo.weight.toFixed(3)}</td>
                  {actions.map(action => (
                    <td key={action.code} style={cellStyle}>{formatPct(combo.freqs[action.code] ?? 0, 0)}</td>
                  ))}
                </>
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
