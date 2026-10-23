// New supporting studies informed by circular construction, transmission and water flow.
// The identifying Hydro H/ring and every official signature remain separate and unedited.
export const INTRO = 'New supporting studies informed by the 1983 system’s circular construction, green and blue, and the movement of water and energy. These abstract graphics are contemporary kit explorations, not patterns prescribed by the historical manual. Keep the official signature complete and separate from the patterned field.'

export const PALETTES = [
  { id: 'paper', name: 'Blue and green on white', background: 'white', ink: 'blue', accent: 'green', secondary: 'tint' },
  { id: 'blue', name: 'White and tint on blue', background: 'blue', ink: 'white', accent: 'tint', secondary: 'green' },
  { id: 'mono', name: 'Monochrome', background: 'white', ink: 'black', accent: 'grey', secondary: 'emboss' }
]

export const STUDIES = [
  { id: 'explore-ring-cadence', name: 'Ring cadence', description: 'An abstract annulus repeats at three sizes. Paired rings establish a measured rhythm without using the identifying Hydro symbol.', palette: 'paper', kind: 'tile' },
  { id: 'explore-current-bands', name: 'Current bands', description: 'Three parallel strands travel through broad, alternating waves. A strong field for covers and large announcement panels.', palette: 'blue', kind: 'tile' },
  { id: 'explore-transmission', name: 'Transmission', description: 'Orthogonal routes meet circular junctions in a repeating grid. An abstract supporting diagram for systems and project stories.', palette: 'paper', kind: 'tile' },
  { id: 'explore-radial-pulse', name: 'Radial pulse', description: 'Short radial strokes and independent rings concentrate around an open centre. A focal graphic for title pages and presentation covers.', palette: 'paper', kind: 'focal' },
  { id: 'explore-phase-steps', name: 'Phase steps', description: 'Stepped channels form a dense, measured repeat. Use it at a larger scale for a bolder alternative to flowing curves.', palette: 'blue', kind: 'tile' },
  { id: 'explore-reservoir', name: 'Reservoir contours', description: 'Nested organic contours suggest water and terrain. A quiet focal composition for reports, dividers and technical stories.', palette: 'blue', kind: 'focal' }
]

export const supportingSymbols = () => ({
  'explore-annulus': {
    name: 'explore-annulus', title: 'abstract supporting annulus', viewBox: [0, 0, 100, 100],
    paths: [{ d: 'M100 50A50 50 0 1 0 0 50A50 50 0 1 0 100 50ZM93 50A43 43 0 1 1 7 50A43 43 0 1 1 93 50Z', fillRule: 'evenodd' }],
    construction: { note: 'Generic concentric circles for a contemporary supporting study; contains no Hydro H or identifying artwork.' }
  }
})

export function buildPattern(brand, studyId, options = {}) {
  const width = 960, height = 600
  const scale = (options.scale ?? 100) / 100, density = (options.density ?? 100) / 100
  const blueDefault = ['explore-current-bands', 'explore-phase-steps', 'explore-reservoir'].includes(studyId)
  const palette = options.palette ?? (blueDefault
    ? { background: 'blue', ink: 'white', accent: 'tint', secondary: 'green' }
    : { background: 'white', ink: 'blue', accent: 'green', secondary: 'tint' })
  const lines = [], dots = [], place = []
  const r = v => Math.round(v * 10000) / 10000
  const ring = (cx, cy, diameter, colour) => place.push({ x: r(cx - diameter / 2), y: r(cy - diameter / 2), scale: r(diameter / 100), colour, symbol: 'explore-annulus' })
  // Liang–Barsky clipping keeps contour and route coordinates inside the graphic panel.
  const addLine = (points, colour, strokeWidth = 2, opacity = 1) => {
    let current = []
    const flush = () => {
      if (current.length > 1) lines.push({ points: current, colour, width: r(strokeWidth), ...(opacity < 1 ? { opacity } : {}) })
      current = []
    }
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], dx = b[0] - a[0], dy = b[1] - a[1]
      let low = 0, high = 1, valid = true
      for (const [p, q] of [[-dx, a[0]], [dx, width - a[0]], [-dy, a[1]], [dy, height - a[1]]]) {
        if (p === 0) { if (q < 0) { valid = false; break } }
        else { const t = q / p; if (p < 0) low = Math.max(low, t); else high = Math.min(high, t); if (low > high) { valid = false; break } }
      }
      if (!valid) { flush(); continue }
      const start = [r(a[0] + low * dx), r(a[1] + low * dy)], end = [r(a[0] + high * dx), r(a[1] + high * dy)]
      if (current.length && current.at(-1).some((v, k) => Math.abs(v - start[k]) > .0001)) flush()
      if (!current.length) current.push(start)
      current.push(end)
    }
    flush()
  }
  if (studyId === 'explore-ring-cadence') {
    const cols = Math.max(2, Math.round(4 * density)), rows = Math.max(2, Math.round(3 * density))
    const dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const level = (col + row * 2) % 3, d = Math.min(dx, dy) * Math.min(.9, [.3, .48, .67][level] * scale)
      const cx = (col + .5) * dx, cy = (row + .5) * dy
      ring(cx, cy, d, level === 2 ? palette.accent : palette.ink)
      if (level !== 0) ring(cx, cy, d * .58, level === 2 ? palette.ink : palette.accent)
    }
  } else if (studyId === 'explore-current-bands') {
    const rows = Math.max(2, Math.round(4 * density)), step = height / rows
    const cycles = Math.max(1, Math.round(2 * density))
    for (let row = 0; row < rows; row++) for (let strand = -1; strand <= 1; strand++) {
      const points = Array.from({ length: 193 }, (_, i) => {
        const x = i / 192 * width
        return [x, (row + .5) * step + Math.sin(i / 192 * Math.PI * 2 * cycles + row % 2 * Math.PI) * step * Math.min(.35, .28 * scale) + strand * step * .1]
      })
      addLine(points, strand === 0 ? palette.accent : palette.ink, (strand === 0 ? 5 : 2) * scale)
    }
  } else if (studyId === 'explore-transmission') {
    const cols = Math.max(2, Math.round(4 * density)), rows = Math.max(2, Math.round(3 * density))
    const dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) {
      const y = (row + .5) * dy, shift = dy * .18 * scale
      const route = [[0, y]]
      for (let col = 0; col < cols; col++) {
        const x = col * dx
        route.push([x + dx * .25, y], [x + dx * .25, y - shift], [x + dx * .65, y - shift], [x + dx * .65, y], [x + dx, y])
        dots.push({ cx: r(x + dx * .25), cy: r(y - shift), r: r(4 * scale), colour: palette.accent })
        ring(x + dx * .65, y, Math.min(dx, dy) * .1 * scale, palette.ink)
      }
      addLine(route, row % 2 ? palette.accent : palette.ink, 2.5 * scale)
    }
    for (let col = 0; col < cols; col++) {
      const x = (col + .45) * dx
      addLine([[x, 0], [x, height]], palette.ink, 1, .23)
    }
  } else if (studyId === 'explore-radial-pulse') {
    const cx = width / 2, cy = height / 2
    for (let band = 0; band < 4; band++) {
      const radius = [88, 154, 220, 286][band], count = Math.max(12, Math.round([18, 30, 42, 54][band] * density))
      const length = [25, 34, 20, 12][band] * scale
      for (let i = 0; i < count; i++) {
        const angle = (i + band % 2 * .5) / count * Math.PI * 2
        const inner = radius - length / 2, outer = radius + length / 2
        addLine([[cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner], [cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer]], band === 1 ? palette.accent : palette.ink, (band === 1 ? 4 : 2) * scale, band === 3 ? .5 : 1)
      }
    }
    ring(cx, cy, 92 * scale, palette.accent)
    ring(cx, cy, 44 * scale, palette.ink)
  } else if (studyId === 'explore-phase-steps') {
    const rows = Math.max(3, Math.round(7 * density)), cols = Math.max(3, Math.round(8 * density))
    const dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) {
      const base = (row + .5) * dy, amplitude = dy * .2 * scale, points = [[0, base + amplitude], [0, base - amplitude]]
      for (let col = 0; col < cols; col++) {
        const x = col * dx
        points.push([x + dx * .5, base - amplitude], [x + dx * .5, base + amplitude], [x + dx, base + amplitude], [x + dx, base - amplitude])
      }
      addLine(points, row % 3 === 1 ? palette.accent : palette.ink, 4 * scale, row % 3 === 2 ? .38 : 1)
    }
  } else if (studyId === 'explore-reservoir') {
    const count = Math.max(7, Math.round(17 * density)), cx = width * .58, cy = height * .52
    for (let ringIndex = 0; ringIndex < count; ringIndex++) {
      const radius = 34 + ringIndex * 22 / density
      const points = Array.from({ length: 145 }, (_, i) => {
        const angle = i / 144 * Math.PI * 2
        const contour = 1 + .12 * scale * Math.sin(3 * angle + .7) + .05 * scale * Math.cos(5 * angle)
        return [cx + Math.cos(angle) * radius * contour * 1.42, cy + Math.sin(angle) * radius * contour * .79]
      })
      const accent = ringIndex === Math.floor(count * .39)
      addLine(points, accent ? palette.accent : palette.ink, (accent ? 4 : 1.25) * scale, accent ? 1 : .65)
    }
  } else throw new Error(`Unknown Hydro supporting study: ${studyId}`)
  return { id: studyId, width, height, background: palette.background, ...(lines.length ? { lines } : {}), ...(dots.length ? { dots } : {}), ...(place.length ? { place } : {}) }
}

export const APPLICATIONS = [
  { id: 'explore-current-announcement', name: 'Current bands / announcement', pattern: 'explore-current-bands', layout: 'square', description: 'A square announcement with a separate flowing graphic panel and a clear information area. Contemporary supporting study.', eyebrow: 'Ideas in motion', exampleTitle: 'A connected\nenergy system.' },
  { id: 'explore-reservoir-presentation', name: 'Reservoir contours / presentation', pattern: 'explore-reservoir', layout: 'presentation', description: 'A presentation cover with organic contours in a distinct side panel. Keep the corporate signature complete and upright.', eyebrow: 'Research / Planning / Systems', exampleTitle: 'A clear view\nof what comes next.' }
]
