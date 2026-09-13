// Narrows a parsed range to the hands that take one action: every combo's weight is scaled by
// that action's frequency and it plays the action 100%. Returns rangeData unchanged when actionCode is null.

// Solver averaging: per-hand stats weight combos by range weight; range totals also multiply by
// the opponent weight each combo can face.
const rangeWeight = combo => combo.weight
const matchupWeight = combo => combo.weight * combo.opponentWeight

const weightedAverage = (combos, weightOf, valueOf) => {
  const totalWeight = combos.reduce((sum, combo) => sum + weightOf(combo), 0)
  if (totalWeight === 0) return 0
  return combos.reduce((sum, combo) => sum + weightOf(combo) * valueOf(combo), 0) / totalWeight
}

function filterCombo(combo, actionCode) {
  return {
    ...combo,
    weight: combo.weight * (combo.freqs[actionCode] ?? 0),
    freqs: { [actionCode]: 1 },
    ev: combo.actionEvs[actionCode] ?? combo.ev,
  }
}

function filterHandCounter(hand, actionCode, filteredCombos) {
  const actionFrequency = hand.actions_total_frequencies?.[actionCode] ?? 0
  const totalCombos = hand.actions_total_combos?.[actionCode] ?? hand.total_combos * actionFrequency
  const activeCombos = filteredCombos?.filter(combo => !combo.blocked && combo.weight > 0)
  return {
    ...hand,
    total_combos: totalCombos,
    total_frequency: hand.total_frequency * actionFrequency,
    actions_total_frequencies: totalCombos > 0 ? { [actionCode]: 1 } : {},
    actions_total_combos: { [actionCode]: totalCombos },
    ...(activeCombos && {
      hand_eq: weightedAverage(activeCombos, rangeWeight, combo => combo.equity),
      hand_ev: weightedAverage(activeCombos, rangeWeight, combo => combo.ev),
    }),
  }
}

function filterComboBreakdown(comboBreakdown, actionCode) {
  return Object.fromEntries(Object.entries(comboBreakdown).map(
    ([handName, combos]) => [handName, combos.map(combo => filterCombo(combo, actionCode))]
  ))
}

function filterEquityRange(equityRange, actionCode) {
  const combos = equityRange.combos
    .map(combo => filterCombo(combo, actionCode))
    .filter(combo => combo.weight > 0)
  return {
    ...equityRange,
    totalCombos: combos.reduce((sum, combo) => sum + combo.weight, 0),
    totalEquity: weightedAverage(combos, matchupWeight, combo => combo.equity),
    combos,
  }
}

export default function filterRangeByAction(rangeData, actionCode) {
  if (!rangeData || !actionCode) return rangeData
  const action = rangeData.actions.find(candidate => candidate.code === actionCode)
  if (!action) return rangeData

  const comboBreakdown = rangeData.comboBreakdown && filterComboBreakdown(rangeData.comboBreakdown, actionCode)
  const handCounters = Object.fromEntries(Object.entries(rangeData.handCounters).map(
    ([handName, hand]) => [handName, filterHandCounter(hand, actionCode, comboBreakdown?.[handName])]
  ))

  return {
    ...rangeData,
    selectedAction: action,
    totalCombos: action.total_combos,
    handCounters,
    comboBreakdown,
    equityRange: rangeData.equityRange && filterEquityRange(rangeData.equityRange, actionCode),
  }
}
