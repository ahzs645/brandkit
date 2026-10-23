// Northwind's seven equal circles become turns, currents and a quieter field of dots.
// These are supporting graphics; the complete identifying mark and wordmarks stay unchanged.
export const INTRO = 'Northwind’s seven-dot geometry gives the patterns a compact, rounded rhythm. Turning clusters, drifting dots and contour bands suggest movement without introducing arrows or changing the identifying mark.'

export const PALETTES = [
  { id: 'paper', name: 'Paper / green', background: 'paper', ink: 'primary', accent: 'ink', secondary: 'light' },
  { id: 'forest', name: 'Deep green / mint', background: 'primary', ink: 'light', accent: 'paper', secondary: 'ink' },
  { id: 'mint', name: 'Mint / green', background: 'light', ink: 'primary', accent: 'ink', secondary: 'paper' }
]

export const STUDIES = [
  { id: 'explore-turning-field', name: 'Turning field', description: 'Intact seven-dot clusters turn through four visible orientations at three sizes. A modular repeat with a changing direction.', palette: 'paper', kind: 'tile' },
  { id: 'explore-north-current', name: 'North current', description: 'Clusters travel in alternating streams, swelling and receding as they pass. A calm directional repeat for larger surfaces.', palette: 'forest', kind: 'tile' },
  { id: 'explore-drift-lines', name: 'Drift lines', description: 'Individual circles follow gentle, interleaved waves. A light texture for a cover margin, document back or digital panel.', palette: 'paper', kind: 'tile' },
  { id: 'explore-ring-lattice', name: 'Ring lattice', description: 'Hollow circles keep the original seven-dot spacing while opening the pattern. Alternating turns form an airy lattice.', palette: 'forest', kind: 'tile' },
  { id: 'explore-overscale', name: 'Overscale', description: 'Large clusters meet the edge of the tile. Broad, rounded forms suit covers, wraps and environmental graphics.', palette: 'forest', kind: 'tile' },
  { id: 'explore-wind-rose', name: 'Wind rose', description: 'Seven-dot clusters circulate around a clear centre, with smaller dots extending the rhythm. A focal composition rather than a repeat.', palette: 'paper', kind: 'focal' },
  { id: 'explore-dot-canopy', name: 'Dot canopy', description: 'A field of changing circle sizes opens into a soft central clearing. A supporting texture for a quiet title or a photograph.', palette: 'mint', kind: 'focal' },
  { id: 'explore-seven-grid', name: 'Seven grid', description: 'Small clusters keep one direction and one scale. A restrained repeat for borders, stationery and reverse sides.', palette: 'paper', kind: 'tile' }
]

export const APPLICATIONS = [
  { id: 'explore-turning-post', name: 'Turning field / announcement', pattern: 'explore-turning-field', layout: 'square', description: 'A square announcement with a changing field of seven-dot clusters above a clear, editable message area.', eyebrow: 'NORTHWIND / NEW PERSPECTIVES', exampleTitle: 'A change\nin perspective.' },
  { id: 'explore-current-cover', name: 'North current / presentation', pattern: 'explore-north-current', layout: 'presentation', description: 'A presentation cover with a separate stream of seven-dot clusters, leaving the title and identifying logo clear.', eyebrow: 'NORTHWIND / IDEAS IN MOTION', exampleTitle: 'Find your\nnext direction.' }
]

export function supportingSymbols(brand) {
  const centres = brand.symbol.centres
  const outer = brand.symbol.radius
  const inner = outer * .62
  const ring = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`
  return {
    'explore-seven-rings': { name: 'seven-ring-supporting-graphic', viewBox: [...brand.symbol.viewBox], paths: [{ d: centres.map(([x, y]) => ring(x, y, outer) + ring(x, y, inner)).join(''), fillRule: 'evenodd' }], title: 'seven-ring supporting graphic' }
  }
}

// All constants and helpers stay inside this function: the offline explorer embeds it verbatim.
export function buildPattern(brand, studyId, options = {}) {
  const palettes = {
    paper: { background: 'paper', ink: 'primary', accent: 'ink', secondary: 'light' },
    forest: { background: 'primary', ink: 'light', accent: 'paper', secondary: 'ink' },
    mint: { background: 'light', ink: 'primary', accent: 'ink', secondary: 'paper' }
  }
  const defaultPalette = ['explore-north-current', 'explore-ring-lattice', 'explore-overscale'].includes(studyId) ? 'forest' : studyId === 'explore-dot-canopy' ? 'mint' : 'paper'
  const p = options.palette ?? palettes[defaultPalette]
  const size = (options.scale ?? 100) / 100, density = (options.density ?? 100) / 100
  const width = 960, height = 600, place = [], dots = [], lines = []
  const n = value => Number(value.toFixed(5))
  const add = (cx, cy, h, colour = p.ink, rotation = 0, symbol) => {
    const shape = symbol ? brand.symbols[symbol] : brand.symbol
    const [vx, vy, sw, sh] = shape.viewBox
    const scale = h / sh
    place.push({ x: n(cx - (vx + sw / 2) * scale), y: n(cy - (vy + sh / 2) * scale), scale: n(scale), colour, ...(rotation ? { rotation: n(rotation) } : {}), ...(symbol ? { symbol } : {}) })
  }
  const dot = (x, y, r, colour, opacity) => {
    if (x < 0 || x > width || y < 0 || y > height) return
    dots.push({ cx: n(x), cy: n(y), r: n(r), colour, ...(opacity != null ? { opacity } : {}) })
  }
  if (studyId === 'explore-turning-field') {
    const cols = Math.max(2, Math.round(4 * density)), rows = Math.max(1, Math.round(2 * density))
    const dx = width / cols, dy = height / rows
    const levels = [1, 2, 1, 0, 2, 0, 1, 2]
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const level = levels[(row * cols + col) % levels.length], splits = 2 ** level
      for (let y = 0; y < splits; y++) for (let x = 0; x < splits; x++) {
        const h = Math.min(dx, dy) / splits * .57 * size
        const rotation = (row + col * 2 + x + y * 3) % 4 * 45
        add((col + (x + .5) / splits) * dx, (row + (y + .5) / splits) * dy, h, (col + row + x * 2 + y) % 5 === 0 ? p.accent : p.ink, rotation)
      }
    }
  } else if (studyId === 'explore-north-current') {
    const cols = Math.max(3, Math.round(8 * density)), rows = Math.max(2, Math.round(3 * density))
    const dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const phase = (col + .5) / cols * Math.PI * 2 + row * Math.PI
      const cy = (row + .5) * dy + Math.sin(phase) * dy * .15
      const h = Math.min(dx, dy) * (.35 + .27 * (1 + Math.cos(phase)) / 2) * size
      add((col + .5) * dx, cy, h, col % 4 === row % 4 ? p.accent : p.ink, (row % 2 ? 135 : 45) + Math.cos(phase) * 12)
    }
  } else if (studyId === 'explore-drift-lines') {
    const cols = Math.max(8, Math.round(40 * density)), rows = Math.max(3, Math.round(10 * density))
    const dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const phase = (col + .5) / cols * Math.PI * 2
      const cy = (row + .5) * dy + Math.sin(phase + row * .65) * dy * .3
      const r = Math.min(dx, dy) * (.09 + .095 * (1 + Math.sin(phase + row * .65)) / 2) * size
      dot((col + .5) * dx, cy, r, row % 3 === 0 ? p.ink : p.secondary)
    }
  } else if (studyId === 'explore-ring-lattice') {
    const cols = Math.max(2, Math.round(5 * density)), rows = Math.max(2, Math.round(3 * density))
    const dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      add((col + .5) * dx, (row + .5) * dy, Math.min(dx, dy) * .68 * size, (col + row * 2) % 5 === 0 ? p.accent : p.ink, (col + row) % 2 * 90, 'explore-seven-rings')
    }
  } else if (studyId === 'explore-overscale') {
    const cols = Math.max(1, Math.round(3 * density)), rows = Math.max(1, Math.round(2 * density))
    const dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) for (let col = -1; col <= cols; col++) {
      const offset = row % 2 * .5
      const wrappedCol = (col % cols + cols) % cols
      add((col + offset) * dx, (row + .5) * dy, Math.min(dx, dy) * .92 * size, (wrappedCol + row) % 3 === 0 ? p.accent : p.ink, row % 2 * 90)
    }
  } else if (studyId === 'explore-wind-rose') {
    const cx = width / 2, cy = height / 2
    for (let ring = 0; ring < 3; ring++) {
      const radius = [135, 215, 290][ring], count = Math.max(6, Math.round([8, 16, 28][ring] * density))
      for (let i = 0; i < count; i++) {
        const angle = (i + (ring % 2) * .5) / count * Math.PI * 2
        const x = cx + Math.cos(angle) * radius, y = cy + Math.sin(angle) * radius
        if (ring === 2) dot(x, y, 3.7 * size, p.secondary)
        else add(x, y, [48, 29][ring] * size, i % 4 === 0 ? p.accent : p.ink, angle * 180 / Math.PI + 45)
      }
    }
  } else if (studyId === 'explore-dot-canopy') {
    const cols = Math.max(5, Math.round(20 * density)), rows = Math.max(4, Math.round(12 * density))
    const dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const x = (col + .5) * dx, y = (row + .5) * dy
      const distance = Math.hypot((x - width * .5) / (width * .38), (y - height * .5) / (height * .42))
      const opening = Math.max(0, Math.min(1, (distance - .55) / .7))
      const wave = .5 + .5 * Math.sin(col * .65 + row * .45)
      const r = Math.min(dx, dy) * (.035 + opening * (.13 + wave * .17)) * size
      dot(x, y, r, (col + row * 3) % 9 === 0 ? p.accent : p.ink)
    }
  } else if (studyId === 'explore-seven-grid') {
    const cols = Math.max(3, Math.round(12 * density)), rows = Math.max(2, Math.round(7 * density))
    const dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      add((col + .5) * dx, (row + .5) * dy, Math.min(dx, dy) * .43 * size, (col + row * 3) % 13 === 0 ? p.ink : p.secondary)
    }
  } else throw new Error(`Unknown northwind pattern: ${studyId}`)
  return { id: studyId, width, height, background: p.background, ...(place.length ? { place } : {}), ...(dots.length ? { dots } : {}), ...(lines.length ? { lines } : {}) }
}
