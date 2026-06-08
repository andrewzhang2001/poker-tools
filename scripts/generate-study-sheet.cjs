const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')

const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']

function getHandName(row, col) {
  if (row === col) return RANKS[row] + RANKS[col]
  if (row < col) return RANKS[row] + RANKS[col] + 's'
  return RANKS[col] + RANKS[row] + 'o'
}

function getActionColor(action) {
  if (action.type === 'FOLD') return '#1976D2'
  if (action.type === 'CALL') return '#43A047'
  if (action.allin || action.display_name === 'ALLIN') return '#8E24AA'
  if (action.type === 'RAISE') return '#E64A19'
  return '#757575'
}

function formatLabel(action) {
  if (action.type === 'FOLD') return 'Fold'
  if (action.type === 'CALL') return `Call ${action.betsize}`
  if (action.allin || action.display_name === 'ALLIN') return 'All-in'
  if (action.type === 'RAISE') return `Raise ${action.betsize}`
  return action.display_name
}

function parseRange(data) {
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
    color: getActionColor(sol.action),
    label: formatLabel(sol.action),
    total_frequency: sol.total_frequency,
    total_combos: sol.total_combos,
  }))

  return { actions, handCounters: activePlayer.simple_hand_counters }
}

function getCellBg(handName, handCounters, actions) {
  const hand = handCounters[handName]
  if (!hand || hand.total_combos === 0) return { bg: '#1a1a1a', isDead: true }

  const freqs = hand.actions_total_frequencies
  if (!freqs || !Object.keys(freqs).length) return { bg: '#1976D2', isDead: false }

  const totalFreq = Math.min(1, hand.total_frequency)
  const darkPct = (1 - totalFreq) * 100
  const stops = []

  if (darkPct > 0.05) stops.push(`#1a1a1a 0% ${darkPct.toFixed(2)}%`)

  let pos = darkPct
  for (const action of actions) {
    const pct = (freqs[action.code] ?? 0) * totalFreq * 100
    if (pct > 0.001) {
      stops.push(`${action.color} ${pos.toFixed(2)}% ${(pos + pct).toFixed(2)}%`)
      pos += pct
    }
  }

  if (!stops.length) return { bg: '#1a1a1a', isDead: true }
  if (stops.length === 1) return { bg: stops[0].split(' ')[0], isDead: false }
  const last = stops[stops.length - 1].split(' ')
  stops[stops.length - 1] = `${last[0]} ${last[1]} 100%`
  return { bg: `linear-gradient(to bottom, ${stops.join(', ')})`, isDead: false }
}

function nlines(n) {
  return Array(n).fill('<div class="nline"></div>').join('\n    ')
}

function renderBlock(rangeData, title, noteCount, extraClass = '') {
  const { actions, handCounters } = rangeData

  let cells = ''
  for (let row = 0; row < 13; row++) {
    for (let col = 0; col < 13; col++) {
      const hand = getHandName(row, col)
      const { bg, isDead } = getCellBg(hand, handCounters, actions)
      const color = isDead ? '#444' : 'rgba(255,255,255,0.82)'
      cells += `<div class="cell" style="background:${bg}"><span style="color:${color}">${hand}</span></div>`
    }
  }

  let legend = ''
  for (const a of actions) {
    const pct = (a.total_frequency * 100).toFixed(1)
    legend += `<div class="li"><div class="swatch" style="background:${a.color}"></div><span>${a.label} ${pct}%</span></div>`
  }

  return `<div class="block${extraClass ? ' ' + extraClass : ''}">
  <div class="block-title">${title}</div>
  <div class="grid">${cells}</div>
  <div class="legend">${legend}</div>
  <div class="notes">
    ${nlines(noteCount)}
  </div>
</div>`
}

const RANGES = [
  { file: 'ranges/chip_ev/mtt_ante/20bb/SB_vs_BU_2.json',   title: '20bb — SB vs BU 2bb open',   notes: 5 },
  { file: 'ranges/chip_ev/mtt_ante/30bb/SB_vs_BU_2.json',   title: '30bb — SB vs BU 2bb open',   notes: 5 },
  { file: 'ranges/chip_ev/mtt_ante/50bb/SB_vs_BU_2.1.json', title: '50bb — SB vs BU 2.1bb open', notes: 6 },
  { file: 'ranges/chip_ev/mtt_ante/70bb/SB_vs_BU_2.2.json', title: '70bb — SB vs BU 2.2bb open', notes: 6 },
]

const renderedBlocks = RANGES.map(({ file, title, notes }) => {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'))
  return renderBlock(parseRange(raw), title, notes)
})

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>SB vs BU — Stack Depth Study Sheet</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}

body{
  background:#111;
  color:#ddd;
  font-family:-apple-system,system-ui,sans-serif;
  padding:16px;
}

.page-title{
  text-align:center;
  font-size:13px;
  font-weight:700;
  letter-spacing:0.12em;
  color:#666;
  text-transform:uppercase;
  margin-bottom:14px;
}

.sheet{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:18px;
}

.sheet-2{
  margin-top:40px;
  padding-top:24px;
  border-top:2px dashed #2a2a2a;
}

.block{
  display:flex;
  flex-direction:column;
  gap:7px;
}

.block-title{
  font-size:11px;
  font-weight:700;
  letter-spacing:0.06em;
  text-transform:uppercase;
  color:#999;
}

.grid{
  display:grid;
  grid-template-columns:repeat(13,1fr);
  grid-template-rows:repeat(13,1fr);
  gap:1.5px;
  width:100%;
  aspect-ratio:1;
}

.cell{
  border-radius:2px;
  display:flex;
  align-items:flex-start;
  justify-content:flex-start;
  padding:2px 2px;
  overflow:hidden;
}

.cell span{
  font-size:clamp(5px,0.85vw,9px);
  font-weight:600;
  line-height:1;
  user-select:none;
  white-space:nowrap;
}

.legend{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}

.li{
  display:flex;
  align-items:center;
  gap:4px;
  font-size:9px;
  color:#888;
}

.swatch{width:8px;height:8px;border-radius:1px;flex-shrink:0}

.notes{
  display:flex;
  flex-direction:column;
  gap:6px;
  margin-top:4px;
}

.nline{
  border-bottom:1px solid #333;
  height:16px;
}

.print-btn{
  position:fixed;
  top:14px;
  right:16px;
  padding:8px 18px;
  background:#1565C0;
  border:none;
  border-radius:6px;
  color:white;
  font-size:13px;
  font-weight:600;
  cursor:pointer;
}

@media print{
  @page{ size:letter landscape; margin:10mm 12mm }

  body{
    background:white;
    color:black;
    padding:0;
    -webkit-print-color-adjust:exact;
    print-color-adjust:exact;
  }

  .print-btn{ display:none }
  .page-title{ color:#555 }
  .block-title{ color:#333 }
  .li{ color:#555 }
  .nline{ border-color:#ccc }

  /* Block-level page-break-after works cleanly; grid-item breaks don't */
  .sheet-1{ page-break-after:always }
  .sheet-2{ border-top:none; margin-top:0; padding-top:0 }
}
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">Print / Save PDF</button>
<div class="page-title">SB vs BU Open — Stack Depth Study</div>
<div class="sheet sheet-1">
${renderedBlocks[0]}
${renderedBlocks[1]}
</div>
<div class="sheet sheet-2">
${renderedBlocks[2]}
${renderedBlocks[3]}
</div>
</body>
</html>`

const out = path.join(ROOT, 'study_sheet.html')
fs.writeFileSync(out, html)
console.log(`Written: ${out}`)
