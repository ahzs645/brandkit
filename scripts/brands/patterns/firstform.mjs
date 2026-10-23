// Supporting graphics drawn from First Form's 3:5 block construction, without changing its logo.
export const INTRO = 'First Form’s two-block mark becomes a system of assemblies, folds and construction lines. The original mark remains complete; the supporting planes and block studies use its 3:5 geometry in a restrained monochrome palette.'

export const PALETTES = [
  { id: 'paper', name: 'Ink on white', background: 'white', ink: 'black', accent: 'graphite', secondary: 'ash' },
  { id: 'night', name: 'Light on night', background: 'night', ink: 'ash', accent: 'white', secondary: 'hairline' },
  { id: 'ash', name: 'Ink on ash', background: 'ash', ink: 'black', accent: 'graphite', secondary: 'mist' }
]

export const STUDIES = [
  { id: 'explore-block-weave', name: 'Block weave', description: 'The complete two-block mark alternates between upright and turned arrangements in a steady repeat.', palette: 'paper', kind: 'tile' },
  { id: 'explore-folded-planes', name: 'Folded planes', description: 'Small rhombi share the mark’s 3:5 slope. Three tones make a continuous field of folded material.', palette: 'ash', kind: 'tile' },
  { id: 'explore-mixed-assemblies', name: 'Mixed assemblies', description: 'A single source block repeats at three sizes and four orientations inside a modular grid.', palette: 'paper', kind: 'tile' },
  { id: 'explore-assembly-lines', name: 'Assembly lines', description: 'Stepped 3:5 construction lines cross the field, with a few complete blocks acting as anchors.', palette: 'night', kind: 'tile' },
  { id: 'explore-form-contours', name: 'Form contours', description: 'Nested outlines follow the block silhouette and expand beyond the frame. A focal graphic for a cover.', palette: 'night', kind: 'focal' },
  { id: 'explore-staggered-towers', name: 'Staggered towers', description: 'Larger source blocks alternate upright and inverted along staggered rows, like a collection of assembled parts.', palette: 'ash', kind: 'tile' },
  { id: 'explore-cut-faces', name: 'Cut faces', description: 'Two oversized blocks meet across a clear diagonal gap. Large crops turn the construction into an abstract composition.', palette: 'paper', kind: 'focal' },
  { id: 'explore-micro-joints', name: 'Micro joints', description: 'Tiny three-way junctions borrow the isometric angles. A quiet repeat for backs, dividers and margins.', palette: 'paper', kind: 'tile' }
]

export const supportingSymbols = (brand) => ({
  'explore-block': {
    name: 'explore-source-block', viewBox: [0, 0, 105, 145],
    paths: [structuredClone(brand.symbol.paths[0])],
    title: 'supporting block / source geometry'
  },
  'explore-plane': {
    name: 'explore-isometric-plane', viewBox: [0, 0, 100, 60],
    paths: ['M0 30L50 0L100 30L50 60Z'],
    title: 'supporting plane / 3:5 construction'
  }
})

export const APPLICATIONS = [
  { id: 'explore-assembly-cover', name: 'Mixed assemblies / project cover', pattern: 'explore-mixed-assemblies', layout: 'square', description: 'A project announcement with a modular block panel and a clear title area.', eyebrow: 'FIRST FORM / PROJECT NOTES', exampleTitle: 'Ideas into\nworking form.' },
  { id: 'explore-contour-deck', name: 'Form contours / presentation', pattern: 'explore-form-contours', layout: 'presentation', description: 'A presentation cover with an expanding construction contour beside the editable headline.', eyebrow: 'FIRST FORM / DESIGN & DEVELOPMENT', exampleTitle: 'Make room\nfor the next idea.' }
]

// Serialized verbatim into the offline explorer: all runtime helpers are deliberately local.
export function buildPattern(brand, studyId, options = {}) {
  const p = options.palette ?? { background: 'white', ink: 'black', accent: 'graphite', secondary: 'ash' }
  const size = (options.scale ?? 100) / 100, density = (options.density ?? 100) / 100
  const width = 960, height = 600, place = [], lines = []
  const round = value => Number(value.toFixed(5))
  const add = (cx, cy, h, colour, symbol, rotation = 0) => {
    const shape = symbol ? brand.symbols[symbol] : brand.symbol
    const [vx, vy, sw, sh] = shape.viewBox, scale = h / sh
    place.push({ x: round(cx - (vx + sw / 2) * scale), y: round(cy - (vy + sh / 2) * scale), scale: round(scale), colour, ...(symbol ? { symbol } : {}), ...(rotation ? { rotation } : {}) })
  }
  const segment = (a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1]
    let low = 0, high = 1
    for (const [v, q] of [[-dx, a[0]], [dx, width - a[0]], [-dy, a[1]], [dy, height - a[1]]]) {
      if (v === 0) { if (q < 0) return null; continue }
      const t = q / v
      if (v < 0) low = Math.max(low, t)
      else high = Math.min(high, t)
      if (low > high) return null
    }
    return [[round(a[0] + low * dx), round(a[1] + low * dy)], [round(a[0] + high * dx), round(a[1] + high * dy)]]
  }
  const draw = (points, colour, stroke = 1, opacity = 1) => {
    const pieces = []
    for (let i = 1; i < points.length; i++) {
      const part = segment(points[i - 1], points[i])
      if (!part) continue
      const prev = pieces.at(-1)
      if (prev && prev.at(-1).every((v, k) => v === part[0][k])) prev.push(part[1])
      else pieces.push(part)
    }
    for (const part of pieces) lines.push({ points: part, colour, width: stroke, ...(opacity < 1 ? { opacity } : {}) })
  }
  if (studyId === 'explore-block-weave') {
    const cols = Math.max(2, Math.round(10 * density)), rows = Math.max(2, Math.round(6 * density)), dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      add((col + .5) * dx, (row + .5) * dy, Math.min(dx, dy) * .78 * size, (col + row * 3) % 11 === 0 ? p.accent : p.ink, undefined, (col + row) % 2 ? 90 : 0)
    }
  } else if (studyId === 'explore-folded-planes') {
    // At the preset, 48 columns and 50 rows make the oblique lattice meet at every tile edge.
    const cols = Math.max(6, Math.round(48 * density / 6) * 6), rows = Math.max(4, Math.round(50 * density / 2) * 2)
    const dx = width / cols, dy = height / rows
    for (let row = -1; row <= rows + 1; row++) for (let col = -1; col <= cols + 1; col++) {
      if ((col + row) % 2) continue
      const tone = ((col % 6) + 6) % 6
      add(col * dx, row * dy, dy * 2 * size, tone === 0 ? p.ink : tone === 2 ? p.accent : p.secondary, 'explore-plane')
    }
  } else if (studyId === 'explore-mixed-assemblies') {
    const cols = Math.max(1, Math.round(4 * density)), rows = Math.max(1, Math.round(2 * density)), dx = width / cols, dy = height / rows
    const depths = [0, 2, 1, 2, 1, 0, 2, 1]
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const divisions = 2 ** depths[(row * cols + col) % depths.length]
      for (let y = 0; y < divisions; y++) for (let x = 0; x < divisions; x++) {
        add((col + (x + .5) / divisions) * dx, (row + (y + .5) / divisions) * dy, Math.min(dx, dy) / divisions * .66 * size, (col + row + x + y) % 5 === 0 ? p.accent : p.ink, 'explore-block', (col + row + x + y) % 4 * 90)
      }
    }
  } else if (studyId === 'explore-assembly-lines') {
    const pitch = 24 / density
    // Both diagonal families retain the 3:5 edge slope and use clipped polylines only.
    for (let i = -45; i < 80; i++) {
      const y = i * pitch
      draw([[-40, y - 24], [1000, y + 600]], p.secondary, 1 * size)
      draw([[-40, y + 624], [1000, y]], p.secondary, 1 * size)
    }
    for (const [x, y, h, turn] of [[180, 180, 130, 0], [500, 420, 104, 180], [820, 180, 78, 0]]) add(x, y, h * size, p.ink, 'explore-block', turn)
  } else if (studyId === 'explore-form-contours') {
    const vertices = [[70, 0], [105, 21], [105, 62], [70, 83], [70, 124], [35, 145], [0, 124], [0, 42], [70, 0]]
    const count = Math.max(8, Math.round(18 * density))
    for (let i = 0; i < count; i++) {
      const s = (.7 + i * .34) * size
      draw(vertices.map(([x, y]) => [600 + (x - 52.5) * s, 300 + (y - 72.5) * s]), i === 7 ? p.accent : p.ink, i === 7 ? 4 : 1.2, i === 7 ? 1 : .55)
    }
  } else if (studyId === 'explore-staggered-towers') {
    const cols = Math.max(2, Math.round(6 * density)), rows = Math.max(2, Math.round(3 * density)), dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) for (let col = -1; col <= cols; col++) {
      add((col + (row % 2 ? .75 : .25)) * dx, (row + .5) * dy, Math.min(dx, dy) * 1.05 * size, (col + row) % 3 === 0 ? p.accent : p.ink, 'explore-block', row % 2 * 180)
    }
  } else if (studyId === 'explore-cut-faces') {
    add(180, 250, 700 * size, p.ink, 'explore-block')
    add(810, 400, 620 * size, p.accent, 'explore-block', 180)
    const count = Math.max(2, Math.round(6 * density))
    for (let i = 0; i < count; i++) {
      const x = 402 + i * 24, y = 162 + i * 14.4
      draw([[x, y], [x, y + 140 * size], [x + 70 * size, y + 182 * size]], p.secondary, 1.5)
    }
  } else if (studyId === 'explore-micro-joints') {
    const cols = Math.max(4, Math.round(24 * density)), rows = Math.max(4, Math.round(15 * density)), dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const cx = (col + .5) * dx, cy = (row + .5) * dy, length = Math.min(dx, dy) * .15 * size
      const c = (col + row * 8) % 24 === 0 ? p.ink : p.secondary
      draw([[cx - length, cy - length * .6], [cx, cy], [cx + length, cy - length * .6]], c, 1)
      draw([[cx, cy], [cx, cy + length * 1.2]], c, 1)
    }
  } else throw new Error(`Unknown First Form pattern: ${studyId}`)
  return { id: studyId, width, height, background: p.background, ...(place.length ? { place } : {}), ...(lines.length ? { lines } : {}) }
}
