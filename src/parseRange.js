export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']

const COMBO_COUNT = 1326
const SUIT_DISPLAY_ORDER = ['s', 'h', 'd', 'c']
const SOLVER_DECK = [...RANKS].reverse().flatMap(rank => ['c', 'd', 'h', 's'].map(suit => rank + suit))

// Solver combo arrays list every 2-card combo of the deck 2c 2d 2h 2s 3c … As,
// with the higher deck card j as the outer loop. Names put that higher card first (JsJh, AsQh).
const SOLVER_COMBOS = SOLVER_DECK.flatMap((highCard, j) => SOLVER_DECK.slice(0, j).map(lowCard => highCard + lowCard))
const SOLVER_COMBO_INDEX = new Map(SOLVER_COMBOS.map((cards, index) => [cards, index]))
const SOLVER_COMBO_DECK_INDICES = SOLVER_DECK.flatMap((_, j) => SOLVER_DECK.slice(0, j).map((_, i) => [j, i]))

// For each combo, the opponent's range weight on combos that share no card with it.
function buildOpponentCompatibleWeights(opponentRange) {
  const weightByCard = new Array(SOLVER_DECK.length).fill(0)
  let totalWeight = 0
  SOLVER_COMBO_DECK_INDICES.forEach(([highCard, lowCard], index) => {
    weightByCard[highCard] += opponentRange[index]
    weightByCard[lowCard] += opponentRange[index]
    totalWeight += opponentRange[index]
  })
  return SOLVER_COMBO_DECK_INDICES.map(([highCard, lowCard], index) =>
    totalWeight - weightByCard[highCard] - weightByCard[lowCard] + opponentRange[index]
  )
}

// Returns the active player's 1326 combos in solver order, each with its weight, equity, EV,
// per-action frequencies and EVs, and the opponent weight it can face (the solver's averaging weight).
function buildActivePlayerCombos(data, activePlayer, opponent) {
  const opponentWeights = buildOpponentCompatibleWeights(opponent.range)
  return SOLVER_COMBOS.map((cards, index) => {
    const freqs = {}
    const actionEvs = {}
    for (const sol of data.action_solutions) {
      freqs[sol.action.code] = sol.strategy[index]
      actionEvs[sol.action.code] = sol.evs[index]
    }
    return {
      cards,
      weight: activePlayer.range[index],
      equity: activePlayer.hand_eqs[index],
      ev: activePlayer.hand_evs[index],
      freqs,
      actionEvs,
      opponentWeight: opponentWeights[index],
    }
  })
}

function buildEquityRange(activePlayer, combos) {
  return {
    position: activePlayer.player.position,
    relativePosition: activePlayer.relative_postflop_position,
    totalCombos: activePlayer.total_combos,
    totalEquity: activePlayer.total_eq,
    combos: combos.filter(combo => combo.weight > 0),
  }
}

function suitPairsForHand(handName) {
  const isPair = handName.length === 2
  const isSuited = handName.endsWith('s')
  if (isPair) return SUIT_DISPLAY_ORDER.flatMap((s1, i) => SUIT_DISPLAY_ORDER.slice(i + 1).map(s2 => [s1, s2]))
  if (isSuited) return SUIT_DISPLAY_ORDER.map(suit => [suit, suit])
  return SUIT_DISPLAY_ORDER.flatMap(s1 => SUIT_DISPLAY_ORDER.filter(s2 => s2 !== s1).map(s2 => [s1, s2]))
}

// Returns handName -> [{ cards, blocked, weight, equity, ev, freqs }], one entry per suit combo.
function buildComboBreakdown(data, combos) {
  const boardCards = data.game.board.match(/../g) ?? []
  const breakdown = {}
  for (let row = 0; row < 13; row++) {
    for (let col = 0; col < 13; col++) {
      const handName = getHandName(row, col)
      const [highRank, lowRank] = handName
      breakdown[handName] = suitPairsForHand(handName).map(([highSuit, lowSuit]) => {
        const card1 = highRank + highSuit
        const card2 = lowRank + lowSuit
        return {
          ...combos[SOLVER_COMBO_INDEX.get(card1 + card2)],
          blocked: boardCards.includes(card1) || boardCards.includes(card2),
        }
      })
    }
  }
  return breakdown
}

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

export const POSTFLOP_ACTION_COLORS = {
  CHECK: '#43A047',
  BET_UNDER_45: '#F57C00',
  BET_45_TO_90: '#D32F2F',
  BET_90_PLUS: '#8E24AA',
  ALLIN: '#1A237E',
}

// Bets and raises are colored by size as a fraction of the pot.
export function getPostflopActionColor(action) {
  if (action.type === 'FOLD') return ACTION_COLORS.FOLD
  if (action.type === 'CALL') return ACTION_COLORS.CALL
  if (action.type === 'CHECK') return POSTFLOP_ACTION_COLORS.CHECK
  if (action.allin) return POSTFLOP_ACTION_COLORS.ALLIN
  const potFraction = parseFloat(action.betsize_by_pot)
  if (potFraction < 0.45) return POSTFLOP_ACTION_COLORS.BET_UNDER_45
  if (potFraction < 0.9) return POSTFLOP_ACTION_COLORS.BET_45_TO_90
  return POSTFLOP_ACTION_COLORS.BET_90_PLUS
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

  const isPreflop = data.game.current_street.type === 'PREFLOP'
  const colorForAction = isPreflop ? getActionColor : getPostflopActionColor

  const actions = data.action_solutions.map(sol => ({
    code: sol.action.code,
    type: sol.action.type,
    betsize: sol.action.betsize,
    display_name: sol.action.display_name,
    allin: sol.action.allin,
    total_frequency: sol.total_frequency,
    total_combos: sol.total_combos,
    color: colorForAction(sol.action),
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

  const hasComboData = activePlayer.range.length === COMBO_COUNT
  const opponent = data.players_info.find(player => player !== activePlayer)
  const combos = hasComboData ? buildActivePlayerCombos(data, activePlayer, opponent) : null

  return {
    actions,
    handCounters: activePlayer.simple_hand_counters,
    totalCombos: activePlayer.total_combos,
    game: data.game,
    handEvs,
    comboBreakdown: hasComboData ? buildComboBreakdown(data, combos) : null,
    equityRange: hasComboData ? buildEquityRange(activePlayer, combos) : null,
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

  return getActionGradient(Math.min(1, hand.total_frequency), freqs, actions)
}

export function getComboGradient(combo, actions) {
  return getActionGradient(combo.weight, combo.freqs, actions)
}

// Full-width action mix, colors laid out left to right.
export function getHorizontalActionGradient(freqs, actions) {
  return getActionGradient(1, freqs, actions, 'to right')
}

// inRangeFraction < 1 means the hand is only partly in range.
// Dark portion fills the start; action colors fill the rest.
// Render actions largest-bet-first (Allin→Raise→Call→Fold) so aggressive
// actions appear at the start of the colored region, matching solver UIs.
function getActionGradient(inRangeFraction, freqs, actions, direction = 'to bottom') {
  const darkPct = (1 - inRangeFraction) * 100

  const stops = []

  if (darkPct > 0.05) {
    stops.push(`#222 0% ${darkPct.toFixed(2)}%`)
  }

  let pos = darkPct
  for (const action of actions) {
    const pct = (freqs[action.code] ?? 0) * inRangeFraction * 100
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
  return { background: `linear-gradient(${direction}, ${stops.join(', ')})` }
}
