import { useState, useCallback, useRef } from 'react'

function pickHand(handCounters) {
  // Only pick hands that are actually reachable at this node
  const entries = Object.entries(handCounters).filter(([, h]) => h.total_combos > 0)
  const total = entries.reduce((s, [, h]) => s + h.total_combos_available, 0)
  let r = Math.random() * total
  for (const [name, hand] of entries) {
    r -= hand.total_combos_available
    if (r <= 0) return { name, hand }
  }
  const last = entries[entries.length - 1]
  return { name: last[0], hand: last[1] }
}

function calcScore(fractions, gtoFreqs, actions) {
  const tv = actions.reduce((s, a, i) => {
    return s + Math.abs((fractions[i] ?? 0) - (gtoFreqs[a.code] ?? 0))
  }, 0) / 2
  return (1 - tv) * 100
}

// EV of a mixed strategy given per-action EVs.
// Returns { gtoEV, userEV, evLoss }
function calcEVs(fractions, gtoFreqs, actions, handEvs) {
  if (!handEvs) return null
  const gtoEV = actions.reduce((s, a) => s + (gtoFreqs[a.code] ?? 0) * (handEvs[a.code] ?? 0), 0)
  const userEV = actions.reduce((s, a, i) => s + (fractions[i] ?? 0) * (handEvs[a.code] ?? 0), 0)
  return { gtoEV, userEV, evLoss: gtoEV - userEV }
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

      // Resolve which divider to use on first significant movement
      if (activeIdx === null) {
        const delta = clientX - startClientX
        if (Math.abs(delta) < 3) return
        const goingRight = delta > 0

        // Find the divider position closest to where user clicked
        const positions = frac.slice(0, -1).map((_, i) => cumul[i + 1])
        let nearestPos = positions[0]
        let nearestDist = Infinity
        positions.forEach(pos => {
          const dist = Math.abs(pos - clickFrac)
          if (dist < nearestDist) { nearestDist = dist; nearestPos = pos }
        })

        // Collect all dividers at that position (handles 0%-width segments)
        const tied = positions
          .map((pos, i) => ({ i, pos }))
          .filter(({ pos }) => Math.abs(pos - nearestPos) < 1e-9)

        if (goingRight) {
          // Need a divider whose RIGHT segment can shrink (fractions[i+1] > 0)
          // i.e. cumul[i+2] > cumul[i+1]. Pick rightmost qualifying one.
          const ok = [...tied].reverse().find(({ i }) => cumul[i + 2] > cumul[i + 1])
          activeIdx = (ok ?? tied[tied.length - 1]).i
        } else {
          // Need a divider whose LEFT segment can shrink (fractions[i] > 0)
          // i.e. cumul[i+1] > cumul[i]. Pick leftmost qualifying one.
          const ok = tied.find(({ i }) => cumul[i + 1] > cumul[i])
          activeIdx = (ok ?? tied[0]).i
        }
      }

      // Move the resolved divider
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

      // Normalize to prevent float drift and clamp negatives
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

        {/* Divider handles — visual only, drag is handled by the whole bar */}
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

export default function TrainerPage({ rangeData, onBack }) {
  const { actions, handCounters, handEvs } = rangeData

  const evenSplit = () => actions.map(() => 1 / actions.length)

  const [current, setCurrent] = useState(() => pickHand(handCounters))
  const [fractions, setFractions] = useState(evenSplit)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)  // { score, evLoss, gtoEV, userEV }
  const [session, setSession] = useState({ scoreTotal: 0, evLossTotal: 0, count: 0 })

  const gtoFreqs = current.hand.actions_total_frequencies ?? {}
  const gtoFractions = actions.map(a => gtoFreqs[a.code] ?? 0)

  const handleSubmit = useCallback(() => {
    const score = calcScore(fractions, gtoFreqs, actions)
    const evCalc = calcEVs(fractions, gtoFreqs, actions, handEvs?.[current.name])
    const res = { score, ...evCalc }
    setResult(res)
    setSubmitted(true)
    setSession(prev => ({
      scoreTotal: prev.scoreTotal + score,
      evLossTotal: prev.evLossTotal + (evCalc?.evLoss ?? 0),
      count: prev.count + 1,
    }))
  }, [fractions, gtoFreqs, actions, handEvs, current.name])

  const handleNext = useCallback(() => {
    setCurrent(pickHand(handCounters))
    setFractions(evenSplit())
    setSubmitted(false)
    setResult(null)
  }, [handCounters])

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
        <span style={{ fontSize: '15px', fontWeight: '600', color: '#ddd' }}>Trainer</span>
        {session.count > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#888', display: 'flex', gap: '16px' }}>
            <span>
              avg score:{' '}
              <span style={{ color: scoreColor(session.scoreTotal / session.count), fontWeight: '600' }}>
                {(session.scoreTotal / session.count).toFixed(1)}%
              </span>
            </span>
            {handEvs && (
              <span>
                avg EV loss:{' '}
                <span style={{ color: evLossColor(session.evLossTotal / session.count), fontWeight: '600' }}>
                  {(session.evLossTotal / session.count).toFixed(3)}
                </span>
              </span>
            )}
            <span style={{ color: '#555' }}>{session.count} hand{session.count !== 1 ? 's' : ''}</span>
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Hand */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '80px', fontWeight: '800', color: 'white', letterSpacing: '-3px', lineHeight: 1 }}>
              {current.name}
            </div>
            <div style={{ fontSize: '12px', color: '#555', marginTop: '6px' }}>
              {current.hand.total_combos_available} combos
            </div>
          </div>

          {/* User's bar */}
          <PartitionBar
            actions={actions}
            fractions={fractions}
            onChange={setFractions}
            frozen={submitted}
            label={submitted ? 'YOUR ANSWER' : undefined}
          />

          {/* GTO bar — shown after submit */}
          {submitted && (
            <PartitionBar
              actions={actions}
              fractions={gtoFractions}
              onChange={() => {}}
              frozen
              label="GTO"
            />
          )}

          {/* Score + EV loss — shown after submit */}
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
                    GTO: {result.gtoEV.toFixed(3)} · You: {result.userEV.toFixed(3)}
                  </div>
                </div>
              )}
            </div>
          )}

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
