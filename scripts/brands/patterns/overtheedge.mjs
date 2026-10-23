// Supporting graphics for the Forest press identity. The identifying logo stays untouched.
export const INTRO = 'The original O becomes a printed texture, while column rules, halftone dots, torn paper and registration marks draw on the newspaper’s production language. These supporting studies extend the Forest press palette without replacing the masthead.'

export const PALETTES = [
  { id: 'newsprint', name: 'Forest on newsprint', background: 'newsprint', ink: 'forest', accent: 'proof', secondary: 'pulp' },
  { id: 'forest', name: 'Newsprint on forest', background: 'forest', ink: 'newsprint', accent: 'lichen', secondary: 'sage' },
  { id: 'night', name: 'Lichen on pine', background: 'pine', ink: 'lichen', accent: 'newsprint', secondary: 'moss' }
]

export const STUDIES = [
  { id: 'explore-o-compass', name: 'O, every way', description: 'The source O turns through several directions at three sizes. A loose editorial texture for posts, covers and backs.', palette: 'newsprint', kind: 'tile' },
  { id: 'explore-press-dots', name: 'Press dots', description: 'A repeating halftone field swells and falls like ink on newsprint. Dense enough for a bold panel, quiet enough at a smaller scale.', palette: 'newsprint', kind: 'tile' },
  { id: 'explore-column-rhythm', name: 'Column rhythm', description: 'Column rules, short line lengths and recurring drop-cap Os turn the newspaper grid into a supporting pattern.', palette: 'newsprint', kind: 'tile' },
  { id: 'explore-torn-edge', name: 'Torn edge', description: 'Broad paper strips alternate a straight edge with a cut edge. A bold field for covers and presentation panels.', palette: 'forest', kind: 'tile' },
  { id: 'explore-double-impression', name: 'Double impression', description: 'A second impression sits just behind the original O. Small registration shifts suggest the physical character of print.', palette: 'newsprint', kind: 'tile' },
  { id: 'explore-growth-rings', name: 'Growth rings', description: 'Irregular woodcut contours bring the forest into the print language. A focal composition, rather than a seamless texture.', palette: 'night', kind: 'focal' },
  { id: 'explore-proof-marks', name: 'Proof marks', description: 'Registration targets in three sizes repeat in a light field. Occasional O characters connect the production marks to the identity.', palette: 'newsprint', kind: 'tile' }
]

export const APPLICATIONS = [
  { id: 'explore-o-compass-post', name: 'Every way / editorial post', pattern: 'explore-o-compass', layout: 'square', description: 'An editorial announcement with a varied O field and a clear, editable headline panel.', eyebrow: 'OVER THE EDGE / INDEPENDENT VOICES', exampleTitle: 'Different voices.\nOne campus.' },
  { id: 'explore-torn-edge-cover', name: 'Torn edge / presentation', pattern: 'explore-torn-edge', layout: 'presentation', description: 'A presentation cover with a torn-paper field beside a clear masthead and editable title.', eyebrow: 'OVER THE EDGE / FOREST PRESS', exampleTitle: 'Make room for\na different view.' }
]

export function supportingSymbols(brand) {
  const source = brand.symbol
  return {
    'explore-o': { name: 'explore-source-o', viewBox: [...source.viewBox], paths: [...source.paths], title: 'Original O / supporting graphic' },
    'explore-paper-strip': { name: 'explore-paper-strip', viewBox: [0, 0, 120, 600], paths: ['M0 0H72L62 25L79 50L66 75L76 100L59 125L74 150L65 175L82 200L68 225L77 250L61 275L73 300L64 325L78 350L67 375L82 400L63 425L76 450L66 475L80 500L62 525L75 550L65 575L72 600H0Z'], title: 'Torn paper strip / supporting graphic' },
    'explore-registration': { name: 'explore-registration', viewBox: [0, 0, 100, 100], paths: ['M50 14A36 36 0 1 0 50 86A36 36 0 1 0 50 14ZM50 18A32 32 0 1 1 50 82A32 32 0 1 1 50 18Z', 'M48 0H52V100H48ZM0 48H100V52H0Z'], title: 'Print registration target / supporting graphic' }
  }
}

// The explorer serializes this function verbatim. Keep all runtime geometry local.
export function buildPattern(brand, studyId, options = {}) {
  const scale = (options.scale ?? 100) / 100, density = (options.density ?? 100) / 100
  const palette = options.palette ?? { background: 'newsprint', ink: 'forest', accent: 'proof', secondary: 'pulp' }
  const width = 960, height = 600, place = [], lines = [], dots = []
  const r = n => Number(n.toFixed(5))
  const put = (symbol, cx, cy, h, colour, rotation = 0) => {
    const shape = brand.symbols?.[symbol] ?? brand.symbol
    const [vx, vy, sw, sh] = shape.viewBox
    const s = h / sh
    place.push({ x: r(cx - (vx + sw / 2) * s), y: r(cy - (vy + sh / 2) * s), scale: r(s), colour, symbol, ...(rotation ? { rotation: r(rotation) } : {}) })
  }
  const rule = (points, colour, lineWidth = 1, opacity = 1) => lines.push({ points: points.map(p => p.map(r)), colour, width: r(lineWidth), ...(opacity < 1 ? { opacity } : {}) })
  const segment = (a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1]
    let low = 0, high = 1
    for (const [p, q] of [[-dx, a[0]], [dx, width - a[0]], [-dy, a[1]], [dy, height - a[1]]]) {
      if (p === 0) { if (q < 0) return null; continue }
      const t = q / p
      if (p < 0) low = Math.max(low, t); else high = Math.min(high, t)
      if (low > high) return null
    }
    return [[a[0] + low * dx, a[1] + low * dy], [a[0] + high * dx, a[1] + high * dy]]
  }
  const clipped = (points, colour, lineWidth, opacity) => {
    let run = []
    const emit = () => { if (run.length > 1) rule(run, colour, lineWidth, opacity); run = [] }
    for (let i = 1; i < points.length; i++) {
      const part = segment(points[i - 1], points[i])
      if (!part) { emit(); continue }
      if (run.length && Math.abs(run.at(-1)[0] - part[0][0]) < .001 && Math.abs(run.at(-1)[1] - part[0][1]) < .001) run.push(part[1])
      else { emit(); run = part }
    }
    emit()
  }
  if (studyId === 'explore-o-compass') {
    const cols = Math.max(3, Math.round(8 * density)), rows = Math.max(2, Math.round(5 * density))
    const dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const level = (col * 2 + row) % 3, rotation = [0, -25, 90, 30, -90, 65][(col + row * 3) % 6]
      const h = Math.min(dx, dy) * [.28, .48, .71][level] * scale
      put('explore-o', (col + .5) * dx, (row + .5) * dy, h, (col + row * 2) % 9 === 0 ? palette.accent : palette.ink, rotation)
    }
  } else if (studyId === 'explore-press-dots') {
    const cols = Math.max(12, Math.round(60 * density)), rows = Math.max(8, Math.round(38 * density))
    const dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const x = (col + .5) / cols, y = (row + .5) / rows
      const wave = Math.sin(x * Math.PI * 4 + Math.sin(y * Math.PI * 2) * 1.5) * Math.cos(y * Math.PI * 2)
      const radius = Math.min(dx, dy) * (.06 + .35 * (wave + 1) / 2) * scale
      dots.push({ cx: r(x * width), cy: r(y * height), r: r(radius), colour: palette.ink })
    }
  } else if (studyId === 'explore-column-rhythm') {
    const cols = Math.max(2, Math.round(4 * density)), rows = Math.max(1, Math.round(2 * density))
    const dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const x = col * dx + dx * .1, y = row * dy + dy * .12
      const band = dx * .8, lineCount = Math.max(5, Math.round(10 * density)), step = dy * .68 / lineCount
      rule([[x, y], [x + band, y]], palette.ink, 3 * scale)
      put('explore-o', x + band * .1, y + step * 2.8, Math.min(45, dy * .2) * scale, (row + col) % 3 === 0 ? palette.accent : palette.ink)
      for (let i = 1; i < lineCount; i++) {
        const offset = i < 4 ? band * .25 : 0
        const length = [.82, 1, .91, .65, .95][(i + col + row) % 5]
        rule([[x + offset, y + step * i], [x + offset + (band - offset) * length, y + step * i]], palette.ink, Math.max(1, step * .18 * scale), .8)
      }
      rule([[x + band + dx * .06, y], [x + band + dx * .06, y + dy * .7]], palette.secondary, 1)
    }
  } else if (studyId === 'explore-torn-edge') {
    const cols = Math.max(3, Math.round(6 * density)), dx = width / cols
    for (let col = -1; col <= cols; col++) {
      const h = height * scale
      const symbolWidth = 120 / 600 * h
      const cx = col * dx + symbolWidth / 2
      put('explore-paper-strip', cx, height / 2, h, col % 3 === 0 ? palette.secondary : palette.ink, col % 2 ? 180 : 0)
    }
  } else if (studyId === 'explore-double-impression') {
    const cols = Math.max(2, Math.round(6 * density)), rows = Math.max(2, Math.round(3 * density)), dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const cx = (col + .5) * dx, cy = (row + .5) * dy, h = Math.min(dx, dy) * .8 * scale
      const rotation = (col + row) % 2 ? 90 : 0
      const shift = Math.min(dx, dy) * .045
      put('explore-o', cx - shift, cy - shift, h, palette.secondary, rotation)
      put('explore-o', cx + shift, cy + shift, h, (col + row * 2) % 5 === 0 ? palette.accent : palette.ink, rotation)
    }
  } else if (studyId === 'explore-growth-rings') {
    const count = Math.max(8, Math.round(28 * density))
    for (let ring = 0; ring < count; ring++) {
      const radius = (30 + ring * 14) * scale
      const points = Array.from({ length: 145 }, (_, i) => {
        const angle = i / 144 * Math.PI * 2
        const drift = 1 + .08 * Math.cos(angle * 5 + .5) + .035 * Math.sin(angle * 9 - .4)
        return [width * .53 + Math.cos(angle) * radius * drift * 1.65, height * .5 + Math.sin(angle) * radius * drift * .83]
      })
      clipped(points, ring === Math.round(count * .3) ? palette.accent : palette.ink, ring === Math.round(count * .3) ? 4 : 1.3, ring === Math.round(count * .3) ? 1 : .7)
    }
  } else if (studyId === 'explore-proof-marks') {
    const cols = Math.max(3, Math.round(8 * density)), rows = Math.max(2, Math.round(5 * density)), dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const level = (col + row * 2) % 3, isO = (col + row * 3) % 7 === 0
      const h = Math.min(dx, dy) * [.24, .4, .64][level] * scale
      put(isO ? 'explore-o' : 'explore-registration', (col + .5) * dx, (row + .5) * dy, h, isO ? palette.accent : palette.ink, isO ? 0 : (col + row) % 2 * 45)
    }
  } else throw new Error(`Unknown Over the Edge study: ${studyId}`)
  return { id: studyId, width, height, background: palette.background, ...(place.length ? { place } : {}), ...(lines.length ? { lines } : {}), ...(dots.length ? { dots } : {}) }
}
