// Postflop range paths encode the hand so far:
//   postflop/<pot type>/<matchup>/<flop>/flop/<flop line>.json
//   postflop/<pot type>/<matchup>/<flop>/turn/<turn card>/<flop line>/<turn line>.json
//   postflop/<pot type>/<matchup>/<flop>/river/<turn card><river card>/<flop line>_<turn line>/<river line>.json
// A line joins action codes with "_": F fold, X check, C call, RAI all-in, B<pct> bet, R<pct> raise.
// "_" is the empty line: the street's first decision. A street's line ends on a call or a second check.

const ALLIN_CODE = 'RAI'
const ACTION_CODE_PATTERN = /^(F|X|C|RAI|[BR]\d+(\.\d+)?)$/
const FLOP_PATTERN = /^([2-9TJQKA][cdhs]){3}$/
const RUNOUT_PATTERN = /^([2-9TJQKA][cdhs]){1,2}$/
export const EMPTY_LINE = '_'
const STREET_NAMES = ['Flop', 'Turn', 'River']
const STREET_FOLDERS = STREET_NAMES.map(name => name.toLowerCase())
const ACTION_TYPES_BY_LETTER = { F: 'FOLD', X: 'CHECK', C: 'CALL', B: 'BET', R: 'RAISE' }
const CARD_ORDER = '23456789TJQKA'

const isActionCode = token => ACTION_CODE_PATTERN.test(token)
const lineTokens = name => (name === EMPTY_LINE ? [] : name.split('_'))
// "KsKd" -> ["Ks", "Kd"]; "X_B37" -> ["X", "B37"]
const nameTokens = name => (RUNOUT_PATTERN.test(name) ? name.match(/../g) : lineTokens(name))

// "B37" -> { type: 'BET', potPct: 37 }; "X" -> { type: 'CHECK', potPct: null }
export function parseActionCode(code) {
  if (code === ALLIN_CODE) return { type: 'ALLIN', potPct: null }
  return {
    type: ACTION_TYPES_BY_LETTER[code[0]],
    potPct: code.length > 1 ? parseFloat(code.slice(1)) : null,
  }
}

const PASSIVE_ACTION_RANK = { FOLD: 0, CHECK: 1, CALL: 2 }

// Fold < check < call < bets and raises by size < all-in.
function actionAggression(code) {
  const { type, potPct } = parseActionCode(code)
  if (type in PASSIVE_ACTION_RANK) return PASSIVE_ACTION_RANK[type]
  if (type === 'ALLIN') return Infinity
  return PASSIVE_ACTION_RANK.CALL + 1 + potPct
}

// Actions sort before cards; cards sort by rank.
function tokenOrder(token) {
  if (isActionCode(token)) return [0, actionAggression(token)]
  return [1, CARD_ORDER.indexOf(token[0])]
}

function compareTokens(tokenA, tokenB) {
  const [kindA, valueA] = tokenOrder(tokenA)
  const [kindB, valueB] = tokenOrder(tokenB)
  return kindA - kindB || valueA - valueB
}

// Lines ("_", "X_B37") and runouts ("Ks", "KsKd").
function isLineName(name) {
  return name === EMPTY_LINE || RUNOUT_PATTERN.test(name) || lineTokens(name).every(isActionCode)
}

// Orders sibling names in the range tree: street folders flop → turn → river; lines token by token,
// most passive first, with a line sorting before any longer line it starts. Returns null for other names.
export function compareSpotNames(nameA, nameB) {
  if (STREET_FOLDERS.includes(nameA) && STREET_FOLDERS.includes(nameB)) {
    return STREET_FOLDERS.indexOf(nameA) - STREET_FOLDERS.indexOf(nameB)
  }
  if (!isLineName(nameA) || !isLineName(nameB)) return null
  const tokensA = nameTokens(nameA)
  const tokensB = nameTokens(nameB)
  const sharedLength = Math.min(tokensA.length, tokensB.length)
  for (let i = 0; i < sharedLength; i++) {
    const difference = compareTokens(tokensA[i], tokensB[i])
    if (difference !== 0) return difference
  }
  return tokensA.length - tokensB.length
}

const closesStreet = (code, previousCode) => code === 'C' || (code === 'X' && previousCode === 'X')

// Splits a line spanning several streets ("B20_C_B37_C") into one action list per street.
function splitLineByStreet(codes) {
  const lines = [[]]
  for (const code of codes) {
    const currentLine = lines[lines.length - 1]
    const previousCode = currentLine[currentLine.length - 1]
    currentLine.push(code)
    if (closesStreet(code, previousCode)) lines.push([])
  }
  return lines
}

// Streets up to the current one: flop cards, then one runout card per later street.
function buildStreets(flopCards, runoutCards, priorLine, currentLine) {
  const priorStreetLines = splitLineByStreet(lineTokens(priorLine)).slice(0, runoutCards.length)
  const streetLines = [...priorStreetLines, lineTokens(currentLine)]
  const streetCards = [flopCards, ...runoutCards]
  return streetCards.map((cards, index) => ({
    name: STREET_NAMES[index],
    cards,
    actions: streetLines[index].map(parseActionCode),
  }))
}

// Returns { context, streets: [{ name, cards, actions }] }, or null for paths outside the postflop layout.
export function parseSpotPath(rangePath) {
  const segments = rangePath.split('/')
  const flopIndex = segments.findIndex(segment => FLOP_PATTERN.test(segment))
  if (flopIndex === -1 || !STREET_FOLDERS.includes(segments[flopIndex + 1])) return null

  const [runout = '', priorLine = EMPTY_LINE] = segments.slice(flopIndex + 2, -1)
  const runoutCards = runout.match(/../g) ?? []
  return {
    context: segments.slice(1, flopIndex),
    streets: buildStreets(segments[flopIndex], runoutCards, priorLine, segments[segments.length - 1]),
  }
}

// Display name for one path segment; "_" reads as "start".
export function segmentLabel(segment) {
  return segment === EMPTY_LINE ? 'start' : segment.replace(/_/g, ' ')
}

// Short name for a range: the file name, prefixed with the street and prior line for postflop spots.
export function spotLabel(rangePath) {
  const segments = rangePath.split('/')
  const streetIndex = segments.findIndex(segment => STREET_FOLDERS.includes(segment))
  const labelSegments = streetIndex === -1 ? segments.slice(-1) : segments.slice(streetIndex)
  return labelSegments.map(segmentLabel).join(' · ')
}
