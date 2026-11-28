// Publication plates: the generated graphics a designed document's covers and closing pages carry.
// Line work and dots drawn from a seed, never the logo, so any brand can use them; a brand's six-dot
// (or any circle-grid) symbol is placed whole by the `dots` motifs, never rearranged.
//
//   contour   contour lines of a seeded height field, with a chosen route and two alternatives
//   profile   a road profile: the ground as a silhouette, a design grade, the cut and fill between
//   field     the height field as a halftone of single dots, a route picked out in the accent
//   dots      the brand's symbol as a plate (`motif`: symbol, full, panel, panel-world…)
//
// Each plate is an SVG string with its colours written in (`paint`), so the browser's canvas and
// resvg draw it alike and the document writers place it as a PNG. Ported from the ddcnorth design
// system's collateral renderer (scripts/collateral.mjs), which drew the same shapes with CSS classes.
import { WORLD_LAND } from './world-land.js'

const f1 = (value) => String(Math.round(value * 10) / 10)

/** A small deterministic generator (mulberry32): the same seed always draws the same plate. */
export const random = (seed) => () => {
  seed = seed + 0x6D2B79F5 | 0
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
  return ((t ^ t >>> 14) >>> 0) / 4294967296
}

/** Contour lines of a seeded height field, as two paths: intermediate (`minor`) and index (`major`). */
export const contours = (seed, { width = 600, height = 400, step = 10, levels = 13 } = {}) => {
  const next = random(seed)
  const hills = Array.from({ length: 11 }, () => ({ x: next() * width, y: next() * height, s: 55 + next() * 120, a: (next() - 0.22) * 1.3 }))
  const at = (x, y) => hills.reduce((sum, h) => sum + h.a * Math.exp(-((x - h.x) ** 2 + (y - h.y) ** 2) / (2 * h.s * h.s)), 0) + 0.0011 * x - 0.0007 * y
  const cols = Math.floor(width / step) + 1
  const rows = Math.floor(height / step) + 1
  const grid = Array.from({ length: rows }, (_, j) => Array.from({ length: cols }, (_, i) => at(i * step, j * step)))
  const flat = grid.flat()
  const low = Math.min(...flat)
  const high = Math.max(...flat)
  const out = { minor: '', major: '' }
  for (let k = 1; k < levels; k += 1) {
    const level = low + (high - low) * k / levels
    const segments = []
    for (let j = 0; j < rows - 1; j += 1) for (let i = 0; i < cols - 1; i += 1) {
      const corners = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([a, b]) => ({ x: a * step, y: b * step, v: grid[b][a] }))
      const cross = []
      for (let e = 0; e < 4; e += 1) {
        const p = corners[e]
        const q = corners[(e + 1) % 4]
        if ((p.v < level) !== (q.v < level)) { const t = (level - p.v) / (q.v - p.v); cross.push([p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t]) }
      }
      if (cross.length === 2) segments.push(cross)
      if (cross.length === 4) segments.push([cross[0], cross[1]], [cross[2], cross[3]])
    }
    // Chain the cell segments into lines, then round the corners through their midpoints.
    const key = (p) => `${Math.round(p[0] * 50)},${Math.round(p[1] * 50)}`
    const ends = new Map()
    segments.forEach((segment, index) => segment.forEach((p) => { const id = key(p); if (!ends.has(id)) ends.set(id, []); ends.get(id).push(index) }))
    const used = new Set()
    const grow = (line, forward) => {
      for (;;) {
        const tip = forward ? line[line.length - 1] : line[0]
        const index = (ends.get(key(tip)) ?? []).find((candidate) => !used.has(candidate))
        if (index == null) return
        used.add(index)
        const [a, b] = segments[index]
        const other = key(a) === key(tip) ? b : a
        if (forward) line.push(other); else line.unshift(other)
      }
    }
    let d = ''
    segments.forEach((segment, index) => {
      if (used.has(index)) return
      used.add(index)
      const line = [...segment]
      grow(line, true); grow(line, false)
      if (line.length < 4) return
      d += `M${f1(line[0][0])} ${f1(line[0][1])}`
      for (let i = 1; i < line.length - 1; i += 1) d += `Q${f1(line[i][0])} ${f1(line[i][1])} ${f1((line[i][0] + line[i + 1][0]) / 2)} ${f1((line[i][1] + line[i + 1][1]) / 2)}`
      d += `L${f1(line[line.length - 1][0])} ${f1(line[line.length - 1][1])}`
    })
    out[k % 4 === 0 ? 'major' : 'minor'] += d
  }
  return out
}

const ROUTES = {
  main: [[0.09, 0.85], [0.2, 0.8, 0.25, 0.62, 0.36, 0.59], [0.5, 0.65, 0.59, 0.53], [0.7, 0.3, 0.91, 0.19]],
  alt: [[0.09, 0.85], [0.12, 0.6, 0.22, 0.42, 0.4, 0.36], [0.56, 0.3, 0.7, 0.34], [0.82, 0.3, 0.91, 0.19]],
  dash: [[0.09, 0.85], [0.23, 0.88, 0.39, 0.82, 0.5, 0.75], [0.7, 0.62, 0.78, 0.47], [0.87, 0.27, 0.91, 0.19]]
}
const routePath = (route, w, h) => route.map((p, i) => {
  const xy = p.map((v, k) => f1(v * (k % 2 ? h : w)))
  if (i === 0) return `M${xy[0]} ${xy[1]}`
  return p.length === 6 ? `C${xy.join(' ')}` : `S${xy.join(' ')}`
}).join('')

/** Contour lines with a chosen route (accent) and two alternatives. */
const contourArt = (seed, { width, height, routes = true }) => {
  const { minor, major } = contours(seed, { width, height, step: 10, levels: 15 })
  const node = ([x, y], cls) => `<circle class="${cls}" cx="${f1(x * width)}" cy="${f1(y * height)}" r="${cls === 'r-end' ? 5 : 4}"/>`
  const drawn = routes ? `<path class="r-alt" d="${routePath(ROUTES.alt, width, height)}"/><path class="r-alt r-dash" d="${routePath(ROUTES.dash, width, height)}"/><path class="r-main" d="${routePath(ROUTES.main, width, height)}"/>${node([0.36, 0.59], 'r-node')}${node([0.59, 0.53], 'r-node')}${node([0.09, 0.85], 'r-end')}${node([0.91, 0.19], 'r-end')}` : ''
  return `<path class="c-minor" d="${minor}"/><path class="c-major" d="${major}"/>${drawn}`
}

/** The ground as a silhouette, a design grade through a few vertical curves, and the cut and fill between. */
const profileArt = (seed, { width, height, reach = 0.78 }) => {
  const next = random(seed)
  const waves = Array.from({ length: 5 }, (_, i) => ({ f: (i + 1.3) * 1.7 + next(), a: (0.5 + next()) / (i + 1.6), p: next() * 6.28 }))
  const ground = (t) => (0.9 - 0.8 * t + 0.075 * waves.reduce((sum, w) => sum + w.a * Math.sin(w.f * t * 3.2 + w.p), 0)) * reach
  const steps = 120
  const points = Array.from({ length: steps + 1 }, (_, i) => [i / steps * width, ground(i / steps) * height])
  const stations = [0, 0.2, 0.42, 0.63, 0.82, 1]
  const pvi = stations.map((t, i) => [t * width, (ground(t) + (i % 2 ? -0.03 : 0.026) * reach) * height])
  let grade = `M${f1(pvi[0][0])} ${f1(pvi[0][1])}`
  for (let i = 1; i < pvi.length - 1; i += 1) grade += `Q${f1(pvi[i][0])} ${f1(pvi[i][1])} ${f1((pvi[i][0] + pvi[i + 1][0]) / 2)} ${f1((pvi[i][1] + pvi[i + 1][1]) / 2)}`
  grade += `L${f1(pvi[pvi.length - 1][0])} ${f1(pvi[pvi.length - 1][1])}`
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${f1(x)} ${f1(y)}`).join('')
  const back = [...pvi].reverse().map(([x, y]) => `L${f1(x)} ${f1(y)}`).join('')
  const drop = Math.min(70, height * 0.16)
  const marks = pvi.slice(1, -1).map(([x, y]) => `<path class="p-tick" d="M${f1(x)} ${f1(y)}v${f1(drop)}"/><circle class="p-pvi" cx="${f1(x)}" cy="${f1(y)}" r="5"/>`).join('')
  return `<path class="p-land" d="${line}V${height}H0Z"/><path class="p-cut" d="${line}${back}Z"/><path class="p-ground" d="${line}"/><path class="p-grade" d="${grade}"/>${marks}`
}

/** The same kind of height field as a halftone of single dots, with a route picked out. */
const fieldArt = (seed, { width, height, step = 17, fade = 'top' }) => {
  const next = random(seed)
  const hills = Array.from({ length: 9 }, () => ({ x: next() * width, y: next() * height, s: 70 + next() * 150, a: 0.35 + next() }))
  const at = (x, y) => hills.reduce((sum, h) => sum + h.a * Math.exp(-((x - h.x) ** 2 + (y - h.y) ** 2) / (2 * h.s * h.s)), 0)
  const [a, b, c, d] = [[0.04, 0.8], [0.3, 0.72], [0.52, 0.3], [0.97, 0.22]]
  const route = Array.from({ length: 60 }, (_, i) => { const t = i / 59; const u = 1 - t; return [(u ** 3 * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t ** 3 * d[0]) * width, (u ** 3 * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t ** 3 * d[1]) * height] })
  const cells = []
  let high = 0
  for (let y = step / 2; y < height; y += step) for (let x = step / 2; x < width; x += step) { const v = at(x, y); high = Math.max(high, v); cells.push([x, y, v]) }
  const dots = { field: '', path: '' }
  for (const [x, y, v] of cells) {
    const edge = fade === 'top' ? Math.min(1, y / (height * 0.42)) : fade === 'left' ? Math.min(1, x / (width * 0.5)) : 1
    const near = route.some(([rx, ry]) => (rx - x) ** 2 + (ry - y) ** 2 < (step * 0.62) ** 2)
    const r = (0.07 + 0.36 * (v / high) ** 1.4) * step * edge ** 1.5
    if (near && edge > 0.25) dots.path += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(step * 0.38)}"/>`
    else if (r > 0.35) dots.field += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}"/>`
  }
  return `<g class="f-dot">${dots.field}</g><g class="f-path">${dots.path}</g>`
}

/** Patterns on a primary-coloured panel, all built from whole symbols in the light colour. */
const panelPattern = (name, { width, height, margin, group, centres, radius, seed, points, home }) => {
  const g = (cls, body) => `<g class="${cls}">${body}</g>`
  if (name === 'tile') {
    const size = 128
    const step = 184
    let out = ''
    for (let row = -1, y = -60; y < height; row += 1, y += step * 0.78) for (let x = -80 + (row % 2 ? step / 2 : 0); x < width; x += step) out += group(x, y, size)
    return g('f-ice', out)
  }
  if (name === 'step') {
    const size = 150
    const step = 200
    let out = ''
    for (let row = 0, y = -50; y < height; row += 1, y += step) for (let col = 0, x = -40; x < width; col += 1, x += step) {
      const turned = (row + col) % 2 === 1
      out += turned ? `<g transform="rotate(180 ${f1(x + size / 2)} ${f1(y + size / 2)})">${group(x, y, size)}</g>` : group(x, y, size)
    }
    return g('f-ice', out)
  }
  if (name === 'echo') {
    let out = ''
    let x = width - margin
    const base = height - 46
    for (const size of [300, 170, 96, 54, 30]) { x -= size; out += group(x, base - size, size); x -= Math.max(18, size * 0.34) }
    return g('f-ice', out)
  }
  if (name === 'grid') {
    const pitch = 28
    const size = 4 * pitch * 256 / 88
    const r = radius * size / 256
    const ox = width - margin - size + 40 * size / 256 - Math.round((width - margin - size + 40 * size / 256) / pitch) * pitch
    const sx = width - margin - size - ox
    const sy0 = (height - size) / 2
    const sy = sy0 - ((sy0 + 40 * size / 256) % pitch)
    const big = centres.map(([cx, cy]) => [sx + cx * size / 256, sy + cy * size / 256])
    let dots = ''
    for (let y = (sy + 40 * size / 256) % pitch; y < height; y += pitch) for (let x = (sx + 40 * size / 256) % pitch; x < width; x += pitch) {
      if (big.some(([bx, by]) => (bx - x) ** 2 + (by - y) ** 2 < (r + 9) ** 2)) continue
      dots += `<circle cx="${f1(x)}" cy="${f1(y)}" r="3.4"/>`
    }
    return g('f-quiet', dots) + g('f-ice', group(sx, sy, size))
  }
  if (name === 'halftone') {
    const size = height * 0.86
    const x0 = width - margin - size
    const y0 = (height - size) / 2
    const r = radius * size / 256
    const pitch = 13
    let out = ''
    for (const [cx, cy] of centres) {
      const X = x0 + cx * size / 256
      const Y = y0 + cy * size / 256
      for (let y = Y - r; y <= Y + r; y += pitch) for (let x = X - r; x <= X + r; x += pitch) {
        const d = Math.hypot(x - X, y - Y)
        if (d <= r - 3) out += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(4.6 * (1 - 0.45 * d / r))}"/>`
      }
    }
    return g('f-ice', out)
  }
  if (name === 'network') {
    const size = height * 0.78
    const x0 = width - margin - size
    const y0 = (height - size) / 2
    const pts = centres.map(([cx, cy]) => [x0 + cx * size / 256, y0 + cy * size / 256])
    let lines = ''
    for (const y of [...new Set(pts.map((p) => f1(p[1])))]) { const left = Math.min(...pts.filter((p) => f1(p[1]) === y).map((p) => p[0])); lines += `<path d="M0 ${y}H${f1(left)}"/>` }
    for (const x of [...new Set(pts.map((p) => f1(p[0])))]) { const low = Math.max(...pts.filter((p) => f1(p[0]) === x).map((p) => p[1])); lines += `<path d="M${x} ${f1(low)}V${height}"/>` }
    return g('f-line', lines) + g('f-ice', group(x0, y0, size))
  }
  if (name === 'chart') {
    const pitch = 44
    const r = 15
    const base = height - 40
    const rows = Math.floor((base - 30) / pitch)
    const count = Math.floor((width - 2 * margin) / pitch) + 1
    const next = random(seed)
    let dots = ''
    let top = ''
    for (let i = 0; i < count; i += 1) {
      const level = Math.max(1, Math.min(rows, Math.round(1 + (rows - 1) * (i / (count - 1)) ** 1.25 + (next() - 0.5) * 1.6)))
      const tall = i === count - 1 ? rows : level
      for (let k = 0; k < tall; k += 1) { const dot = `<circle cx="${f1(margin + r + i * pitch)}" cy="${f1(base - r - k * pitch)}" r="${r}"/>`; if (i === count - 1 && k === tall - 1) top += dot; else dots += dot }
    }
    return g('f-ice', dots) + g('f-white', top)
  }
  if (name === 'blueprint') {
    const size = height * 0.6
    const x0 = width - margin - size - 36
    const y0 = (height - size) / 2 + 10
    const k = size / 256
    const xs = [40, 128, 216].map((v) => x0 + v * k)
    const ys = [40, 128, 216].map((v) => y0 + v * k)
    const rules = xs.map((x) => `<path d="M${f1(x)} 0V${height}"/>`).join('') + ys.map((y) => `<path d="M0 ${f1(y)}H${width}"/>`).join('')
    const dimY = y0 - 16
    const dimX = x0 + size + 18
    const dims = `<path d="M${f1(xs[0])} ${f1(dimY)}H${f1(xs[1])}M${f1(xs[0])} ${f1(dimY - 4)}v8M${f1(xs[1])} ${f1(dimY - 4)}v8"/><path d="M${f1(dimX)} ${f1(ys[2] - 40 * k)}V${f1(ys[2] + 40 * k)}M${f1(dimX - 4)} ${f1(ys[2] - 40 * k)}h8M${f1(dimX - 4)} ${f1(ys[2] + 40 * k)}h8"/>`
    return g('f-rule', rules) + g('f-line', dims) + g('f-ice', group(x0, y0, size))
  }
  if (name === 'world') {
    // A dot map of the land, with a document's own places picked out; `home` is lit apart, with a ring.
    const world = WORLD_LAND
    const pitch = (width - 2 * 24) / world.cols
    const mapH = world.rows * pitch
    const ox = 24
    const oy = (height - mapH) / 2
    const marked = new Set(points.map(([lon, lat]) => `${Math.floor((lon - world.west) / world.step)}:${Math.floor((world.north - lat) / world.step)}`))
    const homeCell = home ? [Math.floor((home[0] - world.west) / world.step), Math.floor((world.north - home[1]) / world.step)] : null
    let land = ''
    let picked = ''
    let base = ''
    world.land.forEach((hex, row) => {
      const bits = BigInt(`0x${hex}`).toString(2).padStart(world.cols, '0')
      for (let col = 0; col < world.cols; col += 1) {
        const cx = f1(ox + (col + 0.5) * pitch)
        const cy = f1(oy + (row + 0.5) * pitch)
        if (homeCell && homeCell[0] === col && homeCell[1] === row) base = `<circle cx="${cx}" cy="${cy}" r="${f1(pitch * 0.62)}"/><circle class="f-ring" cx="${cx}" cy="${cy}" r="${f1(pitch * 1.3)}"/>`
        else if (marked.has(`${col}:${row}`)) picked += `<circle cx="${cx}" cy="${cy}" r="${f1(pitch * 0.62)}"/>`
        else if (bits[col] === '1') land += `<circle cx="${cx}" cy="${cy}" r="${f1(pitch * 0.3)}"/>`
      }
    })
    return g('f-quiet f-quiet--map', land) + g('f-ice', picked) + g('f-white', base)
  }
  throw new Error(`Unknown panel pattern: ${name}`)
}

/** Motifs a `dots` plate takes: the symbol as a plate, on its own or on a panel. */
export const DOT_MOTIFS = Object.freeze(['symbol', 'full', 'left', 'horizon', 'tonal', 'panel', 'panel-crop', 'panel-horizon', 'panel-hang', 'panel-card', 'panel-split',
  'panel-tile', 'panel-step', 'panel-echo', 'panel-grid', 'panel-halftone', 'panel-network', 'panel-chart', 'panel-blueprint', 'panel-world', 'night', 'tiles', 'side', 'top', 'type'])

const groupArt = (seed, { width, height, motif = 'symbol', centres, radius = 40, points = [], home = null }) => {
  const group = (x, y, size) => centres.map(([cx, cy]) => `<circle cx="${f1(x + cx * size / 256)}" cy="${f1(y + cy * size / 256)}" r="${f1(radius * size / 256)}"/>`).join('')
  const margin = 68
  const panel = `<rect class="f-dot" width="${width}" height="${height}"/>`
  const kind = motif
  if (kind === 'symbol') { const size = height * 1.08; return `<g class="f-dot">${group(width - size * 0.84, height - size * 0.93, size)}</g>` }
  if (kind === 'full') { const size = height * 0.86; return `<g class="f-dot">${group(width - margin - size, (height - size) / 2, size)}</g>` }
  if (kind === 'left') { const size = height * 0.86; return `<g class="f-dot">${group(margin, (height - size) / 2, size)}</g>` }
  if (kind === 'horizon') { const size = width - 2 * margin; return `<g class="f-dot">${group(margin, height - size * 0.4, size)}</g>` }
  if (kind === 'tonal') { const size = height * 0.86; return `<g class="f-white">${group(width - margin - size, (height - size) / 2, size)}</g>` }
  if (kind === 'panel') { const size = height * 0.7; return `${panel}<g class="f-ice">${group(width - margin - size, (height - size) / 2, size)}</g>` }
  if (kind === 'panel-crop') { const size = height * 1.25; return `${panel}<g class="f-ice">${group(width - size * 0.8, height - size * 0.86, size)}</g>` }
  if (kind === 'panel-horizon') { const size = width - 2 * margin; return `${panel}<g class="f-ice">${group(margin, height - size * 0.4, size)}</g>` }
  if (kind === 'panel-hang') { const size = height * 1.1; return `${panel}<g class="f-ice">${group(width - margin - size * 0.85, -size * 0.34, size)}</g>` }
  if (kind === 'panel-card') { const size = height * 0.56; const h = height - 40; return `<rect class="f-dot" x="${margin}" y="0" width="${width - 2 * margin}" height="${h}" rx="14"/><g class="f-ice">${group(width - margin - 48 - size, (h - size) / 2, size)}</g>` }
  if (kind === 'panel-split') { const size = height * 0.62; const x0 = width * 0.5; return `<rect class="f-dot" x="${x0}" width="${width - x0}" height="${height}"/><g class="f-ice">${group(x0 + (width - x0 - size) / 2, (height - size) / 2, size)}</g>` }
  if (kind === 'night') { const size = height * 1.08; return `<g class="f-ice">${group(width - size * 0.84, height - size * 0.93, size)}</g>` }
  if (kind === 'tiles') {
    const size = height * 0.9
    const x0 = width - margin - size
    const y0 = (height - size) / 2
    const k = size / 256
    const side = 88 * k
    return `<g class="f-dot">${centres.map(([cx, cy]) => `<rect x="${f1(x0 + (cx - 44) * k)}" y="${f1(y0 + (cy - 44) * k)}" width="${f1(side + 0.5)}" height="${f1(side + 0.5)}"/>`).join('')}</g><g class="f-ice">${group(x0, y0, size)}</g>`
  }
  if (kind === 'side') { const size = width - 2 * 44; return `${panel}<g class="f-ice">${group(44, height - 68 - size, size)}</g>` }
  if (kind === 'top') { const size = height * 0.62; return `${panel}<g class="f-ice">${group(width - margin - size, (height - size) / 2, size)}</g>` }
  if (kind === 'type') { const size = 84; return `<g class="f-dot">${group(margin, height - size - 44, size)}</g>` }
  if (kind.startsWith('panel-')) return `${panel}${panelPattern(kind.slice(6), { width, height, margin, group, centres, radius, seed, points, home })}`
  throw new Error(`Unknown dot motif: ${kind}`)
}

/** Plate types and the options each takes. */
export const PLATE_TYPES = Object.freeze(['contour', 'profile', 'field', 'dots'])

const HEX6 = /^#[0-9a-f]{6}$/i
/** `a` mixed into `b`: `amount` (0–1) of `a`, as CSS color-mix(in srgb, a amount, b). */
export const mixHex = (a, b, amount) => {
  const parse = (value) => String(value).slice(1).match(/../g).map((part) => parseInt(part, 16))
  if (!HEX6.test(a) || !HEX6.test(b)) throw new TypeError(`Colours to mix must be six-digit hex values: ${a}, ${b}.`)
  const [x, y] = [parse(a), parse(b)]
  return `#${x.map((v, i) => Math.round(v * amount + y[i] * (1 - amount)).toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

/**
 * The colours a plate is drawn in. `line` is what the original drew in currentColor (contour lines,
 * the profile's ground, the halftone's dots); `accent`/`accentDark` the route and grade; `primary` and
 * `light` the panel and its symbol; `ground` what the plate sits on.
 */
const plateCss = (paint) => {
  const { line, accent, accentDark = accent, ground, primary, light, reverse = '#FFFFFF', muted = line, night = false } = paint
  return [
    `.c-minor{fill:none;stroke:${line};stroke-width:.7;stroke-opacity:.55}`,
    `.c-major{fill:none;stroke:${line};stroke-width:1.3;stroke-opacity:.8}`,
    `.r-main{fill:none;stroke:${accent};stroke-width:2.4}`,
    `.r-alt{fill:none;stroke:${muted};stroke-width:1.2}`,
    '.r-dash{stroke-dasharray:5 5}',
    `.r-node{fill:${ground};stroke:${accent};stroke-width:2}`,
    `.r-end{fill:${accent}}`,
    `.p-land{fill:${mixHex(primary, light, 0.88)}}`,
    `.p-ground{fill:none;stroke:${line};stroke-width:1.2;stroke-opacity:.75}`,
    `.p-grade{fill:none;stroke:${accentDark};stroke-width:3}`,
    `.p-cut{fill:${accentDark};fill-opacity:.28}`,
    `.p-tick{stroke:${accentDark};stroke-width:1;stroke-dasharray:3 4}`,
    `.p-pvi{fill:${primary};stroke:${accentDark};stroke-width:2}`,
    `.f-dot{fill:${line}${night ? ';fill-opacity:.5' : ''}}`,
    `.f-path{fill:${night ? accentDark : accent}}`,
    `.f-white{fill:${reverse}}`,
    `.f-white .f-ring{fill:none;stroke:${reverse};stroke-width:1.2}`,
    `.f-ice{fill:${light}}`,
    `.f-quiet{fill:${mixHex(light, primary, 0.26)}}`,
    `.f-quiet--map{fill:${mixHex(light, primary, 0.44)}}`,
    `.f-rule path{fill:none;stroke:${mixHex(light, primary, 0.3)};stroke-width:1}`,
    `.f-line path{fill:none;stroke:${light};stroke-width:1.5}`
  ].join('')
}

/**
 * A plate's drawing, without its `<svg>`: `{ defs, art }` at `width` × `height` user units, its colours
 * in the returned `css`. `spec` is `{ type, seed, motif, routes, reach, step, fade, points }`; `symbol`
 * is the brand's (`centres`, `radius`) for `dots`; `home` a `[longitude, latitude]` always lit on a
 * world plate.
 */
export const plateArt = (spec, { width, height, symbol, home } = {}) => {
  const seed = Number(spec.seed ?? 7)
  if (spec.type === 'contour') return contourArt(seed, { width, height, routes: spec.routes !== false })
  if (spec.type === 'profile') return profileArt(seed, { width, height, reach: spec.reach ?? 0.78 })
  if (spec.type === 'field') return fieldArt(seed, { width, height, step: spec.step ?? 17, fade: spec.fade ?? 'top' })
  if (spec.type === 'dots') {
    if (!Array.isArray(symbol?.centres) || !symbol.centres.length) throw new Error('A dots plate needs a symbol drawn as circles (symbol.centres and radius).')
    return groupArt(seed, { width, height, motif: spec.motif ?? 'symbol', centres: symbol.centres, radius: symbol.radius ?? 40, points: spec.points ?? [], home })
  }
  throw new Error(`Unknown plate type: ${spec.type}. Choose ${PLATE_TYPES.join(', ')}.`)
}

/** The `<style>` that colours a plate's art. */
export const plateStyle = (paint) => `<style>${plateCss(paint)}</style>`

/**
 * A plate as a standalone SVG of `width` × `height`, coloured by `paint`, on its `paint.ground` when
 * `background` is set. `fade: [from, to]` fades it in from the left (shares of the width), as a title
 * slide's profile is.
 */
export const plateSvg = (spec, { width, height, paint, symbol, home, background = false, fade } = {}) => {
  const art = plateArt(spec, { width, height, symbol, home })
  const mask = fade ? `<defs><linearGradient id="fade" x1="0" x2="1" y1="0" y2="0"><stop offset="${fade[0]}" stop-color="#fff" stop-opacity="0"/><stop offset="${fade[1]}" stop-color="#fff" stop-opacity="1"/></linearGradient><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="url(#fade)"/></mask></defs>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${plateStyle(paint)}${mask}${background ? `<rect width="100%" height="100%" fill="${paint.ground}"/>` : ''}<g${fade ? ' mask="url(#m)"' : ''}>${art}</g></svg>`
}
