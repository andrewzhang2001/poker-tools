import { useState, useCallback, useRef } from 'react'
import { SUIT_COLORS } from './CardChips.jsx'

const SUIT_SYMBOLS = { s: '♠', h: '♥', d: '♦', c: '♣' }

// Picks one exact combo, weighted by how much of it is in range.
function pickCombo(combos) {
  const totalWeight = combos.reduce((sum, combo) => sum + combo.weight, 0)
  let remaining = Math.random() * totalWeight
  for (const combo of combos) {
    remaining -= combo.weight
    if (remaining <= 0) return combo
  }
  return combos[combos.length - 1]
}

function calcScore(fractions, gtoFreqs, actions) {
  const tv = actions.reduce((s, a, i) => {
    return s + Math.abs((fractions[i] ?? 0) - (gtoFreqs[a.code] ?? 0))
  }, 0) / 2
  return (1 - tv) * 100
}

const mixEV = (weightFor, actions, actionEvs) =>
  actions.reduce((sum, action, i) => sum + weightFor(action, i) * actionEvs[action.code], 0)

// EV loss is measured against the combo's best single action, so it is never negative.
function calcEVs(fractions, gtoFreqs, actions, actionEvs) {
  const bestEV = Math.max(...actions.map(action => actionEvs[action.code]))
  const gtoEV = mixEV(action => gtoFreqs[action.code] ?? 0, actions, actionEvs)
  const userEV = mixEV((_, i) => fractions[i] ?? 0, actions, actionEvs)
  return { bestEV, gtoEV, userEV, evLoss: bestEV - userEV }
}

function scoreColor(score) {
  if (score >= 90) return '#66BB6A'
  if (score >= 75) return '#FFA726'
  if (score >= 60) return '#FF7043'
  return '#EF5350'
}

function evLossColor(loss) {
  if (loss < 0.05) return '#66BB6A'
  if (loss < 0.25) return '#FFA726'
  if (loss < 0.75) return '#FF7043'
  return '#EF5350'
}

function getCumul(fracs) {
  return fracs.reduce((acc, f) => [...acc, acc[acc.length - 1] + f], [0])
}

function formatSpotTitle(rangePath) {
  const parts = rangePath.split('/')
  const spotName = parts[parts.length - 1].replace(/_/g, ' ')
  const hierarchy = parts.slice(0, -1).map(p => p.replace(/_/g, ' ')).join(' · ')
  return { spotName, hierarchy }
}

const CARD_SIZES = {
  hero: { width: 88, height: 124, rank: 19, cornerSuit: 13, centerSuit: 38 },
  board: { width: 56, height: 80, rank: 14, cornerSuit: 10, centerSuit: 24 },
}

// Four-color deck, matching the card chips elsewhere in the app.
function Card({ card, size }) {
  const [rank, suitLetter] = card
  const suit = SUIT_SYMBOLS[suitLetter]
  const dims = CARD_SIZES[size]
  return (
    <div style={{
      width: `${dims.width}px`,
      height: `${dims.height}px`,
      background: 'white',
      borderRadius: '10px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.7)',
      position: 'relative',
      color: SUIT_COLORS[suitLetter],
      userSelect: 'none',
      flexShrink: 0,
    }}>
      <div style={{ position: 'absolute', top: '7px', left: '9px', lineHeight: 1 }}>
        <div style={{ fontSize: `${dims.rank}px`, fontWeight: '800' }}>{rank}</div>
        <div style={{ fontSize: `${dims.cornerSuit}px`, marginTop: '1px' }}>{suit}</div>
      </div>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: `${dims.centerSuit}px`,
      }}>
        {suit}
      </div>
      <div style={{
        position: 'absolute', bottom: '7px', right: '9px', lineHeight: 1,
        transform: 'rotate(180deg)',
      }}>
        <div style={{ fontSize: `${dims.rank}px`, fontWeight: '800' }}>{rank}</div>
        <div style={{ fontSize: `${dims.cornerSuit}px`, marginTop: '1px' }}>{suit}</div>
      </div>
    </div>
  )
}

// cards: a run of cards such as "JsJh" or "Ah9d7d".
function CardRow({ cards, size, gap }) {
  return (
    <div style={{ display: 'flex', gap, justifyContent: 'center' }}>
      {cards.match(/../g).map(card => <Card key={card} card={card} size={size} />)}
    </div>
  )
}

const formatEV = ev => `${ev >= 0 ? '+' : ''}${ev.toFixed(2)}`

// Per-action GTO frequency and EV for the dealt combo, with each action's gap to the best action.
function ActionEVTable({ actions, combo }) {
  const bestEV = Math.max(...actions.map(action => combo.actionEvs[action.code]))
  const cellStyle = { padding: '6px 8px', textAlign: 'right' }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontVariantNumeric: 'tabular-nums', background: '#1a1a1a', borderRadius: '12px', overflow: 'hidden' }}>
      <thead>
        <tr style={{ color: '#555', fontSize: '10px', letterSpacing: '0.1em' }}>
          <th style={{ ...cellStyle, textAlign: 'left', fontWeight: '700' }}>ACTION</th>
          <th style={{ ...cellStyle, fontWeight: '700' }}>GTO</th>
          <th style={{ ...cellStyle, fontWeight: '700' }}>EV (bb)</th>
          <th style={{ ...cellStyle, fontWeight: '700' }}>VS BEST</th>
        </tr>
      </thead>
      <tbody>
        {actions.map(action => {
          const ev = combo.actionEvs[action.code]
          return (
            <tr key={action.code} style={{ color: '#ccc', borderTop: '1px solid #2a2a2a' }}>
              <td style={{ ...cellStyle, textAlign: 'left' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: action.color, marginRight: '8px', verticalAlign: 'middle' }} />
                {action.label}
              </td>
              <td style={cellStyle}>{((combo.freqs[action.code] ?? 0) * 100).toFixed(1)}%</td>
              <td style={{ ...cellStyle, color: 'white', fontWeight: '600' }}>{formatEV(ev)}</td>
              <td style={{ ...cellStyle, color: evLossColor(bestEV - ev) }}>{formatEV(ev - bestEV)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function PartitionBar({ actions, fractions, onChange, frozen = false, label }) {
  const barRef = useRef(null)
  const fractionsRef = useRef(fractions)
  fractionsRef.current = fractions

  const handleMouseDown = useCallback((e) => {
    if (frozen || !barRef.current) return
    e.preventDefault()

    const rect = barRef.current.getBoundingClientRect()
    const clickFrac = (e.clientX - rect.left) / rect.width
    const startClientX = e.clientX
    let activeIdx = null

    function doDrag(clientX) {
      const frac = fractionsRef.current
      const cumul = getCumul(frac)

      if (activeIdx === null) {
        const delta = clientX - startClientX
        if (Math.abs(delta) < 3) return
        const goingRight = delta > 0

        const positions = frac.slice(0, -1).map((_, i) => cumul[i + 1])
        let nearestPos = positions[0]
        let nearestDist = Infinity
        positions.forEach(pos => {
          const dist = Math.abs(pos - clickFrac)
          if (dist < nearestDist) { nearestDist = dist; nearestPos = pos }
        })

        const tied = positions
          .map((pos, i) => ({ i, pos }))
          .filter(({ pos }) => Math.abs(pos - nearestPos) < 1e-9)

        if (goingRight) {
          const ok = [...tied].reverse().find(({ i }) => cumul[i + 2] > cumul[i + 1])
          activeIdx = (ok ?? tied[tied.length - 1]).i
        } else {
          const ok = tied.find(({ i }) => cumul[i + 1] > cumul[i])
          activeIdx = (ok ?? tied[0]).i
        }
      }

      const frac2 = fractionsRef.current
      const cumul2 = getCumul(frac2)
      const barRect = barRef.current.getBoundingClientRect()
      const rawPos = (clientX - barRect.left) / barRect.width
      const minPos = cumul2[activeIdx]
      const maxPos = cumul2[activeIdx + 2]
      const newPos = Math.max(minPos, Math.min(maxPos, rawPos))

      const next = [...frac2]
      next[activeIdx] = newPos - cumul2[activeIdx]
      next[activeIdx + 1] = cumul2[activeIdx + 2] - newPos

      const sum = next.reduce((s, f) => s + f, 0)
      onChange(next.map(f => Math.max(0, f) / sum))
    }

    const onMove = (e) => doDrag(e.clientX)
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [frozen, onChange])

  const cumul = getCumul(fractions)
  const height = frozen ? 56 : 72

  return (
    <div>
      {label && (
        <div style={{ fontSize: '10px', color: '#555', fontWeight: '700', letterSpacing: '0.1em', marginBottom: '5px' }}>
          {label}
        </div>
      )}
      <div
        ref={barRef}
        onMouseDown={handleMouseDown}
        style={{
          position: 'relative',
          height,
          display: 'flex',
          borderRadius: '10px',
          overflow: 'visible',
          userSelect: 'none',
          cursor: frozen ? 'default' : 'ew-resize',
          touchAction: 'none',
          clipPath: 'inset(0 round 10px)',
        }}
      >
        {actions.map((action, i) => {
          const pct = fractions[i] * 100
          return (
            <div
              key={action.code}
              style={{
                width: `${pct}%`,
                background: action.color,
                opacity: frozen ? 0.75 : 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
                gap: '1px',
              }}
            >
              {pct >= 10 && (
                <span style={{
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.8)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}>
                  {action.label}
                </span>
              )}
              {pct >= 5 && (
                <span style={{
                  fontSize: frozen ? '16px' : '20px',
                  fontWeight: '700',
                  color: 'white',
                  textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}>
                  {Math.round(pct)}%
                </span>
              )}
            </div>
          )
        })}

        {!frozen && actions.slice(0, -1).map((_, i) => {
          const pos = cumul[i + 1] * 100
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${pos}%`,
                top: '12%',
                bottom: '12%',
                width: '4px',
                background: 'rgba(255,255,255,0.55)',
                borderRadius: '3px',
                transform: 'translateX(-50%)',
                pointerEvents: 'none',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

export default function PostflopTrainerPage({ rangeData, rangePath, onBack }) {
  const { actions, equityRange, game } = rangeData
  const { spotName, hierarchy } = formatSpotTitle(rangePath)

  const evenSplit = () => actions.map(() => 1 / actions.length)

  const [current, setCurrent] = useState(() => pickCombo(equityRange.combos))
  const [fractions, setFractions] = useState(evenSplit)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)
  const [session, setSession] = useState({ scoreTotal: 0, evLossTotal: 0, count: 0 })

  const gtoFreqs = current.freqs
  const gtoFractions = actions.map(a => gtoFreqs[a.code] ?? 0)

  const handleSubmit = useCallback(() => {
    const score = calcScore(fractions, gtoFreqs, actions)
    const evCalc = calcEVs(fractions, gtoFreqs, actions, current.actionEvs)
    const res = { score, ...evCalc }
    setResult(res)
    setSubmitted(true)
    setSession(prev => ({
      scoreTotal: prev.scoreTotal + score,
      evLossTotal: prev.evLossTotal + evCalc.evLoss,
      count: prev.count + 1,
    }))
  }, [fractions, gtoFreqs, actions, current])

  const handleNext = useCallback(() => {
    setCurrent(pickCombo(equityRange.combos))
    setFractions(evenSplit())
    setSubmitted(false)
    setResult(null)
  }, [equityRange])

  const setAllTo = useCallback((actionIdx) => {
    setFractions(actions.map((_, i) => i === actionIdx ? 1 : 0))
  }, [actions])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '14px 20px',
        borderBottom: '1px solid #2a2a2a',
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{ background: '#2a2a2a', border: 'none', color: '#ccc', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
        >
          ← Back
        </button>
        <div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#ddd' }}>{spotName}</div>
          {hierarchy && (
            <div style={{ fontSize: '11px', color: '#555', marginTop: '1px' }}>{hierarchy}</div>
          )}
        </div>
        {session.count > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#888', display: 'flex', gap: '16px' }}>
            <span>
              avg score:{' '}
              <span style={{ color: scoreColor(session.scoreTotal / session.count), fontWeight: '600' }}>
                {(session.scoreTotal / session.count).toFixed(1)}%
              </span>
            </span>
            <span>
              avg EV loss:{' '}
              <span style={{ color: evLossColor(session.evLossTotal / session.count), fontWeight: '600' }}>
                {(session.evLossTotal / session.count).toFixed(3)}bb
              </span>
            </span>
            <span style={{ color: '#555' }}>{session.count} hand{session.count !== 1 ? 's' : ''}</span>
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Board */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div style={{ fontSize: '10px', color: '#555', fontWeight: '700', letterSpacing: '0.1em' }}>
              BOARD · POT {game.pot}
            </div>
            <CardRow cards={game.board} size="board" gap="6px" />
          </div>

          {/* Hero combo + info */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
            <CardRow cards={current.cards} size="hero" gap="10px" />
            <div style={{ fontSize: '12px', color: '#555' }}>
              {equityRange.position} {equityRange.relativePosition} · {current.weight.toFixed(3)} of this combo in range
              {submitted && (
                <span style={{ color: '#888', marginLeft: '6px' }}>
                  · {(current.equity * 100).toFixed(1)}% equity
                </span>
              )}
            </div>
          </div>

          {/* Quick action buttons */}
          {!submitted && (
            <div style={{ display: 'flex', gap: '6px' }}>
              {actions.map((action, i) => (
                <button
                  key={action.code}
                  onClick={() => setAllTo(i)}
                  style={{
                    flex: 1,
                    padding: '7px 0',
                    background: action.color,
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    opacity: 0.85,
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* User's bar */}
          <PartitionBar
            actions={actions}
            fractions={fractions}
            onChange={setFractions}
            frozen={submitted}
            label={submitted ? 'YOUR ANSWER' : undefined}
          />

          {/* GTO bar */}
          {submitted && (
            <PartitionBar
              actions={actions}
              fractions={gtoFractions}
              onChange={() => {}}
              frozen
              label="GTO"
            />
          )}

          {/* Score + EV loss */}
          {submitted && result && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: result.evLoss != null ? '1fr 1fr' : '1fr',
              gap: '8px',
            }}>
              <div style={{
                textAlign: 'center',
                padding: '16px',
                background: '#1a1a1a',
                borderRadius: '12px',
                border: '1px solid #2a2a2a',
              }}>
                <div style={{ fontSize: '10px', color: '#555', fontWeight: '700', letterSpacing: '0.1em', marginBottom: '4px' }}>SCORE</div>
                <div style={{ fontSize: '48px', fontWeight: '800', color: scoreColor(result.score), lineHeight: 1 }}>
                  {result.score.toFixed(1)}%
                </div>
              </div>
              {result.evLoss != null && (
                <div style={{
                  textAlign: 'center',
                  padding: '16px',
                  background: '#1a1a1a',
                  borderRadius: '12px',
                  border: '1px solid #2a2a2a',
                }}>
                  <div style={{ fontSize: '10px', color: '#555', fontWeight: '700', letterSpacing: '0.1em', marginBottom: '4px' }}>EV LOSS</div>
                  <div style={{ fontSize: '48px', fontWeight: '800', color: evLossColor(result.evLoss), lineHeight: 1 }}>
                    {result.evLoss.toFixed(3)}
                  </div>
                  <div style={{ fontSize: '10px', color: '#444', marginTop: '4px' }}>
                    bb · Best: {result.bestEV.toFixed(3)} · GTO mix: {result.gtoEV.toFixed(3)} · You: {result.userEV.toFixed(3)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Per-action EVs */}
          {submitted && <ActionEVTable actions={actions} combo={current} />}

          {/* CTA */}
          {!submitted ? (
            <button
              onClick={handleSubmit}
              style={{ padding: '14px', background: '#1565C0', border: 'none', borderRadius: '8px', color: 'white', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
            >
              Submit
            </button>
          ) : (
            <button
              onClick={handleNext}
              style={{ padding: '14px', background: '#2e7d32', border: 'none', borderRadius: '8px', color: 'white', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
            >
              Next Hand →
            </button>
          )}

        </div>
      </div>
    </div>
  )
}
