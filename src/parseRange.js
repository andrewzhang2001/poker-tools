export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']

export function getHandName(row, col) {
  if (row === col) return RANKS[row] + RANKS[col]
  if (row < col) return RANKS[row] + RANKS[col] + 's'
  return RANKS[col] + RANKS[row] + 'o'
}

export const ACTION_COLORS = {
  FOLD: '#1976D2',
  CALL: '#43A047',
  RAISE: '#E64A19',
  ALLIN: '#8E24AA',
}

export function getActionColor(action) {
  if (action.type === 'FOLD') return ACTION_COLORS.FOLD
  if (action.type === 'CALL') return ACTION_COLORS.CALL
  if (action.allin || action.display_name === 'ALLIN') return ACTION_COLORS.ALLIN
  if (action.type === 'RAISE') return ACTION_COLORS.RAISE
  return '#757575'
}

export function formatActionLabel(action) {
  if (action.type === 'FOLD') return 'Fold'
  if (action.type === 'CALL') return `Call ${action.betsize}`
  if (action.allin || action.display_name === 'ALLIN') return `Allin ${parseFloat(action.betsize).toFixed(0)}`
  if (action.type === 'RAISE') return `Raise ${action.betsize}`
  return action.display_name
}

export function parseRange(data) {
  // Find the active player (has populated actions_total_frequencies)
  const activePlayer = data.players_info.find(p =>
    Object.values(p.simple_hand_counters).some(h =>
      h.actions_total_frequencies && Object.keys(h.actions_total_frequencies).length > 0
    )
  ) ?? data.players_info[1]

  const actions = data.action_solutions.map(sol => ({
    code: sol.action.code,
    type: sol.action.type,
    betsize: sol.action.betsize,
    display_name: sol.action.display_name,
    allin: sol.action.allin,
    total_frequency: sol.total_frequency,
    total_combos: sol.total_combos,
    color: getActionColor(sol.action),
    label: formatActionLabel(sol.action),
  }))

  // EVs arrays are indexed alphabetically by hand name.
  // Build: handName -> { actionCode -> ev }
  const handNames = Object.keys(activePlayer.simple_hand_counters).sort()
  const handEvs = {}
  for (let i = 0; i < handNames.length; i++) {
    const name = handNames[i]
    handEvs[name] = {}
    for (const sol of data.action_solutions) {
      handEvs[name][sol.action.code] = sol.evs[i]
    }
  }

  return {
    actions,
    handCounters: activePlayer.simple_hand_counters,
    totalCombos: activePlayer.total_combos,
    game: data.game,
    handEvs,
  }
}

export function isDeadHand(handName, handCounters) {
  const hand = handCounters?.[handName]
  return !hand || hand.total_combos === 0
}

export function getCellGradient(handName, handCounters, actions) {
  const hand = handCounters?.[handName]

  // Hand not reached at this node (e.g. BU didn't open this hand preflop)
  if (!hand || hand.total_combos === 0) {
    return { background: '#222' }
  }

  const freqs = hand.actions_total_frequencies
  if (!freqs || Object.keys(freqs).length === 0) {
    return { background: ACTION_COLORS.FOLD }
  }

  // total_frequency < 1 means only some combos of this hand are in range.
  // Dark portion fills the top; action colors fill the bottom.
  // Render actions largest-bet-first (Allin→Raise→Call→Fold) so aggressive
  // actions appear at the top of the colored region, matching solver UIs.
  const totalFreq = Math.min(1, hand.total_frequency)
  const darkPct = (1 - totalFreq) * 100

  const stops = []

  if (darkPct > 0.05) {
    stops.push(`#222 0% ${darkPct.toFixed(2)}%`)
  }

  let pos = darkPct
  for (const action of actions) {
    const pct = (freqs[action.code] ?? 0) * totalFreq * 100
    if (pct > 0.001) {
      stops.push(`${action.color} ${pos.toFixed(2)}% ${(pos + pct).toFixed(2)}%`)
      pos += pct
    }
  }

  if (stops.length === 0) return { background: '#222' }
  if (stops.length === 1) return { background: stops[0].split(' ')[0] }
  // Extend last stop to 100% to prevent float rounding gaps
  const lastParts = stops[stops.length - 1].split(' ')
  stops[stops.length - 1] = `${lastParts[0]} ${lastParts[1]} 100%`
  return { background: `linear-gradient(to bottom, ${stops.join(', ')})` }
}
