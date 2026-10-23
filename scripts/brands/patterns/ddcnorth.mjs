// Supporting studies use the approved six-dot artwork and its circle geometry.
// They add compositions; the identifying symbol and approved v2.3 history stay untouched.
export const INTRO = 'The six-dot identity becomes an index, a field and a network. Complete six-dot groups carry the recognizable shape, while individual circles supply quieter textures. These supporting studies extend the palette and geometry already used by ddcnorth; they do not change the approved identifying artwork.'

export const PALETTES = [
  { id: 'paper', name: 'Paper / midnight', background: 'off-white', ink: 'midnight', accent: 'graphite', secondary: 'ice' },
  { id: 'midnight', name: 'Midnight / ice', background: 'midnight', ink: 'ice', accent: 'white', secondary: 'graphite' },
  { id: 'ice', name: 'Ice / midnight', background: 'ice', ink: 'midnight', accent: 'black', secondary: 'off-white' }
]

export const STUDIES = [
  { id: 'explore-micro-index', name: 'Micro index', description: 'Small, complete six-dot groups repeat on a tight registration grid. A restrained texture for the back of a card or a border.', palette: 'paper', kind: 'tile' },
  { id: 'explore-turning-groups', name: 'Turning groups', description: 'Three sizes and four quarter-turns share a modular field. The repeat changes direction while every six-dot group stays intact.', palette: 'midnight', kind: 'tile' },
  { id: 'explore-resolution', name: 'Resolution', description: 'Individual circles grow and shrink through a repeating wave. A quiet field informed by data density, without implying measured values.', palette: 'paper', kind: 'tile' },
  { id: 'explore-step-repeat', name: 'Step repeat', description: 'Medium six-dot groups alternate orientation and rhythm. A bolder repeat for covers, wrapping and presentation dividers.', palette: 'ice', kind: 'tile' },
  { id: 'explore-connection-lanes', name: 'Connection lanes', description: 'Six-dot groups meet along stepped paths. Solid junctions and a single bright route give a network field a clear rhythm.', palette: 'midnight', kind: 'tile' },
  { id: 'explore-convergence', name: 'Convergence', description: 'Small and large six-dot groups gather around a central group. A focal composition for an invitation, chapter break or presentation.', palette: 'midnight', kind: 'focal' },
  { id: 'explore-circle-weave', name: 'Circle weave', description: 'Three circle sizes interleave in diagonal runs. A repeating texture drawn from the identity’s simplest unit.', palette: 'ice', kind: 'tile' },
  { id: 'explore-scale-contrast', name: 'Scale contrast', description: 'One large six-dot group balances a dense micro field. Use the open middle as a visual pause rather than a text container.', palette: 'paper', kind: 'focal' }
]

export const APPLICATIONS = [
  { id: 'explore-turning-post', name: 'Turning groups / announcement', pattern: 'explore-turning-groups', layout: 'square', description: 'An editable square announcement with a mixed-scale field and a separate information panel.', eyebrow: 'DATA / DESIGN / CONNECTION', exampleTitle: 'A different angle.\nA clearer idea.' },
  { id: 'explore-connection-cover', name: 'Connection lanes / presentation', pattern: 'explore-connection-lanes', layout: 'presentation', description: 'A presentation cover with a network panel and a clear title area. Keep the diagram as supporting artwork.', eyebrow: 'DDCNORTH / WORKING TOGETHER', exampleTitle: 'Connect the dots.\nFind the next step.' }
]

export function supportingSymbols() { return {} }

// This function is deliberately self-contained: the offline explorer serializes it verbatim.
export function buildPattern(brand, studyId, options = {}) {
  const width = 960, height = 600
  const scale = Math.max(.5, Math.min(1.5, (options.scale ?? 100) / 100))
  const density = Math.max(.5, Math.min(1.5, (options.density ?? 100) / 100))
  const palettes = {
    paper: { background: 'off-white', ink: 'midnight', accent: 'graphite', secondary: 'ice' },
    midnight: { background: 'midnight', ink: 'ice', accent: 'white', secondary: 'graphite' },
    ice: { background: 'ice', ink: 'midnight', accent: 'black', secondary: 'off-white' }
  }
  const defaults = { 'explore-micro-index': 'paper', 'explore-turning-groups': 'midnight', 'explore-resolution': 'paper', 'explore-step-repeat': 'ice', 'explore-connection-lanes': 'midnight', 'explore-convergence': 'midnight', 'explore-circle-weave': 'ice', 'explore-scale-contrast': 'paper' }
  if (!Object.hasOwn(defaults, studyId)) throw new Error(`Unknown ddcnorth pattern: ${studyId}`)
  const palette = options.palette ?? palettes[defaults[studyId]]
  const round = n => Number(n.toFixed(5))
  const [, , symbolWidth, symbolHeight] = brand.symbol.viewBox
  const place = [], dots = [], lines = []
  const group = (cx, cy, h, colour = palette.ink, rotation = 0) => {
    const s = h / symbolHeight
    place.push({ x: round(cx - symbolWidth * s / 2), y: round(cy - h / 2), scale: round(s), colour, ...(rotation ? { rotation } : {}) })
  }
  const dot = (cx, cy, r, colour = palette.ink) => dots.push({ cx: round(cx), cy: round(cy), r: round(r), colour })
  const line = (points, colour = palette.secondary, thickness = 1.5) => lines.push({ points: points.map(p => p.map(round)), colour, width: thickness })

  if (studyId === 'explore-micro-index') {
    const cols = Math.max(4, Math.round(20 * density)), rows = Math.max(3, Math.round(12 * density))
    const dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const accent = (col + row * 5) % 17 === 0
      group((col + .5) * dx, (row + .5) * dy, Math.min(dx, dy) * .46 * scale, accent ? palette.ink : palette.secondary)
    }
  } else if (studyId === 'explore-turning-groups') {
    const cols = Math.max(2, Math.round(4 * density)), rows = Math.max(1, Math.round(2 * density))
    const dx = width / cols, dy = height / rows, depths = [0, 2, 1, 2, 1, 0, 2, 1]
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const depth = depths[(row * cols + col) % depths.length], divisions = 2 ** depth
      for (let y = 0; y < divisions; y++) for (let x = 0; x < divisions; x++) {
        const size = Math.min(dx, dy) / divisions * .62 * scale
        const colour = (col + row + x + y) % 6 === 0 ? palette.accent : depth === 2 ? palette.secondary : palette.ink
        group((col + (x + .5) / divisions) * dx, (row + (y + .5) / divisions) * dy, size, colour, ((col * 3 + row + x + y * 3) % 4) * 90)
      }
    }
  } else if (studyId === 'explore-resolution') {
    const cols = Math.max(8, Math.round(30 * density)), rows = Math.max(5, Math.round(18 * density))
    const dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const wave = (1 + Math.cos((col + .5) / cols * Math.PI * 4 + Math.sin((row + .5) / rows * Math.PI * 2) * 1.6)) / 2
      dot((col + .5) * dx, (row + .5) * dy, Math.min(dx, dy) * (.045 + wave * .25) * scale, wave > .82 ? palette.ink : palette.secondary)
    }
  } else if (studyId === 'explore-step-repeat') {
    const cols = Math.max(2, Math.round(4 * density)), rows = Math.max(2, Math.round(3 * density))
    const dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      group((col + .5) * dx, (row + .5) * dy, Math.min(dx, dy) * .78 * scale, (col + row) % 3 === 0 ? palette.accent : palette.ink, (row + col) % 2 * 180)
    }
  } else if (studyId === 'explore-connection-lanes') {
    const lanes = Math.max(2, Math.round(5 * density)), dy = height / (lanes + 1), amplitude = Math.min(32, dy * .24)
    for (let lane = 0; lane < lanes; lane++) {
      const y = (lane + 1) * dy
      const points = [[0, y], [156, y], [264, y - amplitude], [488, y - amplitude], [652, y + amplitude], [812, y + amplitude], [880, y], [960, y]]
      const active = lane === Math.floor(lanes / 2)
      line(points, active ? palette.accent : palette.secondary, active ? 3 : 1.5)
      for (const index of [1, 2, 3, 4]) dot(points[index][0], points[index][1], active ? 4.5 : 2.5, active ? palette.accent : palette.secondary)
      const h = Math.min(58, dy * .58) * scale
      group(lane % 2 ? 372 : 782, y + (lane % 2 ? -amplitude : amplitude), h, active ? palette.accent : palette.ink)
    }
    const cols = Math.round(16 * density), rows = Math.round(10 * density)
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) dot((col + .5) * width / cols, (row + .5) * height / rows, 1.2 * scale, palette.secondary)
  } else if (studyId === 'explore-convergence') {
    const inner = Math.max(6, Math.round(6 * density)), outer = Math.max(8, Math.round(12 * density))
    for (let i = 0; i < inner; i++) {
      const angle = (i / inner - .25) * Math.PI * 2
      group(480 + Math.cos(angle) * 255, 300 + Math.sin(angle) * 175, 90 * scale, i % 3 === 0 ? palette.accent : palette.ink, (i % 4) * 90)
    }
    for (let i = 0; i < outer; i++) {
      const angle = (i + .5) / outer * Math.PI * 2
      group(480 + Math.cos(angle) * 415, 300 + Math.sin(angle) * 245, 34 * scale, palette.secondary, i % 2 * 180)
    }
    group(480, 300, 48 * scale, palette.accent)
  } else if (studyId === 'explore-circle-weave') {
    const cols = Math.max(5, Math.round(20 * density)), rows = Math.max(4, Math.round(12 * density))
    const dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const level = (col + 2 * row) % 3
      const radius = [.07, .18, .31][level] * Math.min(dx, dy) * scale
      dot((col + .5) * dx, (row + .5) * dy, radius, (col - row) % 7 === 0 ? palette.accent : palette.ink)
    }
  } else if (studyId === 'explore-scale-contrast') {
    group(278, 300, 420 * scale, palette.ink)
    const cols = Math.max(2, Math.round(6 * density)), rows = Math.max(4, Math.round(10 * density))
    const dx = 360 / cols, dy = 500 / rows
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      group(582 + (col + .5) * dx, 50 + (row + .5) * dy, Math.min(dx, dy) * .55 * scale, (col + row * 3) % 11 === 0 ? palette.accent : palette.secondary)
    }
  }
  return { id: studyId, width, height, background: palette.background, ...(place.length ? { place } : {}), ...(dots.length ? { dots } : {}), ...(lines.length ? { lines } : {}) }
}
