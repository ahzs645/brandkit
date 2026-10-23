// New supporting studies for the reconstructed 1977 kit. These are not historical manual
// artwork or approved provincial standards. No study uses, fragments or rotates the arms.
export const INTRO = 'New supporting studies informed by the kit’s brown, gold and cream palette, the manuals’ measured layouts and British Columbia’s Pacific dogwood. The floral forms are new geometric drawings, not reproductions of an official emblem. The identifying coat of arms remains complete and upright.'

export const PALETTES = [
  { id: 'cream', name: 'Brown / cream', background: 'cream', ink: 'brown', accent: 'gold', secondary: 'kraft' },
  { id: 'brown', name: 'Cream / brown', background: 'brown', ink: 'cream', accent: 'gold', secondary: 'kraft' },
  { id: 'paper', name: 'Brown / white', background: 'white', ink: 'brown', accent: 'gold', secondary: 'cream' }
]

export const STUDIES = [
  { id: 'explore-dogwood-repeat', name: 'Dogwood repeat', description: 'Complete six-bract flowers repeat in a measured, alternating rhythm. A new geometric interpretation of Pacific dogwood.', palette: 'cream', kind: 'tile' },
  { id: 'explore-petal-mosaic', name: 'Petal mosaic', description: 'Single bracts turn through six directions at three scales, with a recurring gold accent.', palette: 'brown', kind: 'tile' },
  { id: 'explore-measured-rules', name: 'Measured rules', description: 'Fine paired rules and short registration ticks borrow the discipline of the manuals’ measured layouts.', palette: 'paper', kind: 'tile' },
  { id: 'explore-contour-bands', name: 'Contour bands', description: 'Parallel curves suggest terrain and a shifting coastline without representing a measured map.', palette: 'cream', kind: 'tile' },
  { id: 'explore-rule-lattice', name: 'Rule lattice', description: 'Offset bundles of diagonal rules form a woven field, with one gold course in each repeat.', palette: 'brown', kind: 'tile' },
  { id: 'explore-dogwood-bower', name: 'Dogwood bower', description: 'Flowers in several sizes frame an open centre. A focal composition for a cover or invitation.', palette: 'brown', kind: 'focal' },
  { id: 'explore-seed-field', name: 'Seed field', description: 'Tiny flowers punctuate an even field of dots. A quiet texture for reverse sides and borders.', palette: 'cream', kind: 'tile' },
  { id: 'explore-stepped-courses', name: 'Stepped courses', description: 'Broad stepped forms alternate direction and scale to make a bold geometric repeat.', palette: 'cream', kind: 'tile' }
]

export function supportingSymbols() {
  const bract = 'M50 39C34 34 32 19 45 5L50 10L55 5C68 19 66 34 50 39Z'
  const petals = Array.from({ length: 6 }, (_, i) => `<path d="${bract}" transform="rotate(${i * 60} 50 50)"/>`).join('')
  return {
    'explore-dogwood': { name: 'explore-dogwood', title: 'New geometric dogwood / supporting graphics', viewBox: [0, 0, 100, 100], markup: `${petals}<circle cx="50" cy="50" r="4"/>` },
    'explore-bract': { name: 'explore-bract', title: 'New geometric bract / supporting graphics', viewBox: [0, 0, 40, 80], paths: ['M20 78C0 61 0 29 14 3L20 9L26 3C40 29 40 61 20 78Z'] },
    'explore-course': { name: 'explore-course', title: 'Stepped course / supporting graphics', viewBox: [0, 0, 120, 60], paths: ['M0 40H40V20H80V0H120V20H100V40H60V60H0Z'] }
  }
}

// This function is also embedded verbatim in the offline explorer. Keep all helpers local.
export function buildPattern(brand, studyId, options = {}) {
  const width = 960, height = 600
  const r = value => Number(value.toFixed(4))
  const scale = (options.scale ?? 100) / 100, density = (options.density ?? 100) / 100
  const dark = ['explore-petal-mosaic', 'explore-rule-lattice', 'explore-dogwood-bower'].includes(studyId)
  const palette = options.palette ?? (dark
    ? { background: 'brown', ink: 'cream', accent: 'gold', secondary: 'kraft' }
    : { background: studyId === 'explore-measured-rules' ? 'white' : 'cream', ink: 'brown', accent: 'gold', secondary: studyId === 'explore-measured-rules' ? 'cream' : 'kraft' })
  const place = [], dots = [], lines = []
  const add = (symbol, cx, cy, h, colour, rotation = 0) => {
    const [, , sw, sh] = brand.symbols[symbol].viewBox, factor = h / sh
    place.push({ symbol, x: r(cx - sw * factor / 2), y: r(cy - h / 2), scale: r(factor), colour, ...(rotation ? { rotation: r(rotation) } : {}) })
  }
  const segment = (a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1]
    let low = 0, high = 1
    for (const [p, q] of [[-dx, a[0]], [dx, width - a[0]], [-dy, a[1]], [dy, height - a[1]]]) {
      if (p === 0) { if (q < 0) return null; continue }
      const t = q / p
      if (p < 0) low = Math.max(low, t)
      else high = Math.min(high, t)
      if (low > high) return null
    }
    return [[r(a[0] + low * dx), r(a[1] + low * dy)], [r(a[0] + high * dx), r(a[1] + high * dy)]]
  }
  const line = (points, colour, strokeWidth = 1) => {
    let previous = null
    for (let i = 1; i < points.length; i++) {
      const part = segment(points[i - 1], points[i])
      if (!part) { previous = null; continue }
      if (previous && previous.points.at(-1).every((v, axis) => v === part[0][axis])) previous.points.push(part[1])
      else { previous = { points: part, colour, width: r(strokeWidth) }; lines.push(previous) }
    }
  }
  if (studyId === 'explore-dogwood-repeat') {
    const cols = Math.max(2, Math.round(8 * density)), rows = Math.max(2, Math.round(5 * density))
    const dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const size = Math.min(dx, dy) * ((col + row) % 3 === 0 ? .68 : .43) * scale
      add('explore-dogwood', (col + .5) * dx, (row + .5) * dy, size, (col + row * 2) % 7 === 0 ? palette.accent : palette.ink)
    }
  } else if (studyId === 'explore-petal-mosaic') {
    const cols = Math.max(2, Math.round(10 * density)), rows = Math.max(2, Math.round(5 * density))
    const dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const level = (col + row * 2) % 3, rotation = ((col * 2 + row) % 6) * 60
      add('explore-bract', (col + .5) * dx, (row + .5) * dy, Math.min(dx, dy) * [.32, .52, .76][level] * scale, (col + row * 3) % 8 === 0 ? palette.accent : level === 0 ? palette.secondary : palette.ink, rotation)
    }
  } else if (studyId === 'explore-measured-rules') {
    const rows = Math.max(3, Math.round(12 * density)), cols = Math.max(3, Math.round(16 * density))
    const dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) {
      const cy = (row + .5) * dy
      line([[0, cy], [width, cy]], row % 4 === 0 ? palette.accent : palette.ink, .8 * scale)
      line([[0, cy + 5 * scale], [width, cy + 5 * scale]], palette.secondary, 1.4 * scale)
      for (let col = 0; col < cols; col++) {
        const cx = (col + .5) * dx, length = col % 4 === 0 ? 12 : 5
        line([[cx, cy - length * scale], [cx, cy]], palette.ink, .8 * scale)
      }
    }
  } else if (studyId === 'explore-contour-bands') {
    const pitch = 24 / density, amplitude = 62 * scale
    for (let index = -7; index < height / pitch + 7; index++) {
      const points = Array.from({ length: 97 }, (_, step) => {
        const x = step / 96 * width, phase = x / width * Math.PI * 2
        return [x, index * pitch + amplitude * (Math.sin(phase) + .27 * Math.sin(phase * 2 + .6))]
      })
      line(points, index % 8 === 0 ? palette.accent : palette.ink, index % 8 === 0 ? 2.6 * scale : .85 * scale)
    }
  } else if (studyId === 'explore-rule-lattice') {
    const pitch = 120 / density
    for (let index = -8; index < 14 * density; index++) for (let course = 0; course < 3; course++) {
      const offset = index * pitch + course * 8 * scale
      line([[offset - 600, 600], [offset, 0]], index % 5 === 0 ? palette.accent : palette.ink, course === 1 ? 1.8 * scale : .65 * scale)
      line([[offset, 0], [offset + 600, 600]], index % 5 === 0 ? palette.secondary : palette.ink, course === 1 ? 1.8 * scale : .65 * scale)
    }
  } else if (studyId === 'explore-dogwood-bower') {
    const count = Math.max(10, Math.round(18 * density))
    for (let i = 0; i < count; i++) {
      const angle = (i + .5) / count * Math.PI * 2
      const size = [50, 72, 60, 42][i % 4] * scale
      add('explore-dogwood', 480 + Math.cos(angle) * 355, 300 + Math.sin(angle) * 205, size, i % 5 === 0 ? palette.accent : palette.ink)
    }
    for (let i = 0; i < 24; i++) {
      const angle = i / 24 * Math.PI * 2
      dots.push({ cx: r(480 + Math.cos(angle) * 276), cy: r(300 + Math.sin(angle) * 142), r: r(1.7 * scale), colour: palette.secondary })
    }
  } else if (studyId === 'explore-seed-field') {
    const cols = Math.max(3, Math.round(16 * density)), rows = Math.max(3, Math.round(10 * density))
    const dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const cx = (col + .5) * dx, cy = (row + .5) * dy
      if ((col + row * 3) % 9 === 0) add('explore-dogwood', cx, cy, Math.min(dx, dy) * .4 * scale, palette.accent)
      else dots.push({ cx: r(cx), cy: r(cy), r: r(1.2 * scale), colour: palette.ink })
    }
  } else if (studyId === 'explore-stepped-courses') {
    const cols = Math.max(2, Math.round(6 * density)), rows = Math.max(2, Math.round(5 * density))
    const dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const size = Math.min(dx / 2, dy) * ((col + row) % 3 === 0 ? .8 : .55) * scale
      add('explore-course', (col + .5) * dx, (row + .5) * dy, size, (col + row * 2) % 7 === 0 ? palette.accent : palette.ink, (row + col) % 2 ? 180 : 0)
    }
  } else throw new Error(`Unknown Province pattern: ${studyId}`)
  return { id: studyId, width, height, background: palette.background, ...(place.length ? { place } : {}), ...(dots.length ? { dots } : {}), ...(lines.length ? { lines } : {}) }
}

export const APPLICATIONS = [
  { id: 'explore-dogwood-announcement', name: 'Dogwood / announcement', pattern: 'explore-dogwood-repeat', layout: 'square', description: 'A measured flower field above a clear information panel. A new supporting layout for this reconstructed kit.', eyebrow: 'PLACES / PEOPLE / PUBLIC LIFE', exampleTitle: 'Public places.\nShared stories.' },
  { id: 'explore-contour-presentation', name: 'Contours / presentation', pattern: 'explore-contour-bands', layout: 'presentation', description: 'A presentation cover pairing a landscape-like contour field with a clear area for the complete upright signature and editable title.', eyebrow: 'BRITISH COLUMBIA / IN PERSPECTIVE', exampleTitle: 'A province\nin perspective.' }
]
