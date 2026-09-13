import CardChips from './CardChips.jsx'
import { getPostflopActionColor } from './parseRange.js'

const mutedText = { fontSize: '12px', color: '#888' }
const STREET_LABEL_WIDTH = '44px'

function actionLabel({ type, potPct }) {
  if (type === 'BET') return `Bet ${potPct}%`
  if (type === 'RAISE') return `Raise ${potPct}%`
  if (type === 'ALLIN') return 'All-in'
  return type[0] + type.slice(1).toLowerCase()
}

function actionColor({ type, potPct }) {
  return getPostflopActionColor({ type, allin: type === 'ALLIN', betsize_by_pot: potPct / 100 })
}

function ActionPill({ position, action }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '10px', background: '#262626', fontSize: '12px', color: '#ddd', whiteSpace: 'nowrap' }}>
      <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: actionColor(action) }} />
      <span style={{ color: '#999' }}>{position}</span>
      {actionLabel(action)}
    </span>
  )
}

// Postflop players keyed by relative position: { OOP: player, IP: player }.
function postflopPlayersByPosition(game) {
  return Object.fromEntries(
    game.players
      .filter(player => player.relative_postflop_position)
      .map(player => [player.relative_postflop_position, player])
  )
}

// The board street by street with each street's actions, OOP acting first, then the player to act.
export default function SpotHistory({ spot, game }) {
  const players = postflopPlayersByPosition(game)
  const actingOrder = [players.OOP, players.IP]
  const actor = game.players.find(player => player.position === game.active_position)
  const opponent = actingOrder.find(player => player !== actor)
  const facingBet = parseFloat(opponent.chips_on_table)

  return (
    <div style={{ background: '#151515', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
        <span style={{ fontSize: '12px', fontWeight: '600', color: '#bbb' }}>{spot.context.map(part => part.replace(/_/g, ' ')).join(' · ')}</span>
        <span style={{ ...mutedText, marginLeft: 'auto' }}>
          Pot <span style={{ color: 'white', fontWeight: '600' }}>{parseFloat(game.pot)}</span>
          {actingOrder.map(player => (
            <span key={player.position}> · {player.position} {parseFloat(player.current_stack)} behind</span>
          ))}
        </span>
      </div>

      {spot.streets.map((street, streetIndex) => {
        const isCurrentStreet = streetIndex === spot.streets.length - 1
        return (
          <div key={street.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ ...mutedText, width: STREET_LABEL_WIDTH }}>{street.name}</span>
            <CardChips cards={street.cards} size="large" />
            {street.actions.map((action, actionIndex) => (
              <ActionPill key={actionIndex} position={actingOrder[actionIndex % 2].position} action={action} />
            ))}
            {isCurrentStreet && (
              <span style={{ fontSize: '12px', color: 'white', fontWeight: '600' }}>
                {actor.position} to act
                {facingBet > 0 && <span style={{ color: '#aaa', fontWeight: '400' }}> · facing {facingBet}</span>}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
