// Four-color deck: each card is a chip filled with its suit's color, showing only the rank.
export const SUIT_COLORS = {
  s: '#000',
  h: '#D32F2F',
  d: '#1565C0',
  c: '#2E7D32',
}

const CHIP_SIZES = {
  small: { minWidth: '16px', lineHeight: '16px', fontSize: 'inherit', gap: '2px' },
  large: { minWidth: '26px', lineHeight: '30px', fontSize: '18px', gap: '4px' },
}

function Card({ rank, suit, size }) {
  return (
    <span style={{
      display: 'inline-block',
      minWidth: size.minWidth,
      padding: '0 3px',
      borderRadius: '3px',
      border: '1px solid #444',
      background: SUIT_COLORS[suit],
      color: 'white',
      fontWeight: '700',
      fontSize: size.fontSize,
      textAlign: 'center',
      lineHeight: size.lineHeight,
    }}>
      {rank}
    </span>
  )
}

// cards: a run of cards such as a combo "JsJh" or a board "Ah9d7d".
export default function CardChips({ cards, size = 'small' }) {
  const cardList = cards.match(/../g)
  const chipSize = CHIP_SIZES[size]
  return (
    <span style={{ display: 'inline-flex', gap: chipSize.gap }}>
      {cardList.map(card => <Card key={card} rank={card[0]} suit={card[1]} size={chipSize} />)}
    </span>
  )
}
