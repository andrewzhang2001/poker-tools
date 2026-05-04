import { RANKS, getHandName, getCellGradient, isDeadHand } from './parseRange.js'

export default function RangeGrid({ handCounters, actions, onCellHover, hoveredHand }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(13, 1fr)`,
      gridTemplateRows: `repeat(13, 1fr)`,
      gap: '2px',
      width: '100%',
      height: '100%',
    }}>
      {Array.from({ length: 13 }, (_, row) =>
        Array.from({ length: 13 }, (_, col) => {
          const hand = getHandName(row, col)
          const dead = isDeadHand(hand, handCounters)
          const bgStyle = getCellGradient(hand, handCounters, actions)
          const isHovered = hoveredHand === hand

          return (
            <div
              key={`${row}-${col}`}
              onMouseEnter={() => onCellHover?.(hand)}
              onMouseLeave={() => onCellHover?.(null)}
              style={{
                ...bgStyle,
                borderRadius: '3px',
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                padding: '3px 4px',
                cursor: 'default',
                filter: isHovered ? 'brightness(1.25)' : 'none',
                overflow: 'hidden',
                minHeight: 0,
              }}
            >
              <span style={{
                fontSize: 'clamp(8px, 1vw, 13px)',
                fontWeight: '600',
                color: dead ? '#444' : 'white',
                textShadow: dead ? 'none' : '0 1px 2px rgba(0,0,0,0.7)',
                lineHeight: 1,
                userSelect: 'none',
                pointerEvents: 'none',
              }}>
                {hand}
              </span>
            </div>
          )
        })
      )}
    </div>
  )
}
