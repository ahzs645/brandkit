// Writes brands/firstform/brand.json: First Form, a consulting, design and development practice.
//
//   npm run make:firstform
//
// The supplied kit (First Form Brand Kit V1.0) has the logo only as PNGs, 372 px wide. This script
// rebuilds it as vectors so the engine can draw it at any size:
//
// - The mark is two identical isometric blocks, the second turned 180° about the centre. Each block
//   is its silhouette (top and left faces solid) with the stepped front face cut out, leaving a
//   1.6-unit outline. Units are the pixels of the kit's mark-black.png (150 × 215 visible), and
//   every edge runs at 3:5 (about 31°), the slope measured from the PNG.
// - The wordmark is "FIRST / FORM" in Sora Bold, outlined, on the kit lockup's proportions (cap
//   height 50, line pitch 72, mark 214 tall, gap 22, all measured from logo-black.png). Sora Bold is
//   the nearest open face to the kit's lettering, not the lettering itself: replace the glyphs when
//   vector masters of the original wordmark exist. The PNGs are kept in reference/.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { bakeWordmark, createStarterBrand } from '../../src/engine/starter.js'
import { loadBrandFontsFromDisk } from '../../src/fonts/node.js'
import { n } from '../../src/engine/format.js'
import { updateManifest } from './common.mjs'
import { lockupMarkup, markMarkup, motionCss, motionPage, motionReadme, RULES, STUDIES, TOKENS } from './firstform-motion.mjs'

const folder = new URL('../../brands/firstform/', import.meta.url).pathname
mkdirSync(folder, { recursive: true })

const sora = (file, weight, style) => ({ family: 'Sora', stack: 'Sora, Helvetica, Arial, sans-serif', weight, file: `fonts/${file}`, web: `fonts/${file}`, label: `Sora ${style} ${weight}` })
const FONTS = {
  body: sora('Sora-Regular.ttf', 400, 'Regular'),
  bold: sora('Sora-SemiBold.ttf', 600, 'SemiBold'),
  display: sora('Sora-SemiBold.ttf', 600, 'SemiBold'),
  displayRegular: sora('Sora-Regular.ttf', 400, 'Regular'),
  extra: sora('Sora-Bold.ttf', 700, 'Bold'),
  label: sora('Sora-Regular.ttf', 400, 'Regular'),
  light: sora('Sora-Light.ttf', 300, 'Light')
}
const fonts = await loadBrandFontsFromDisk({ fonts: FONTS }, folder)

// --- The mark ------------------------------------------------------------------------------------

const SLOPE = 0.6
const WIDTH = 150
const HEIGHT = 215
const OUTLINE = 1.6
const MICRO_OUTLINE = 5

// One block, clockwise from its top corner: top face, stepped right side, bottom, left face.
const SILHOUETTE = [[70, 0], [105, 21], [105, 62], [70, 83], [70, 124], [35, 145], [0, 124], [0, 42]]
// Its front face, the part left open inside the outline.
const FACE = [[35, 63], [105, 21], [105, 62], [70, 83], [70, 124], [35, 145]]
const turn = ([x, y]) => [WIDTH - x, HEIGHT - y]
// The two solid faces, for drawing and animating a block part by part.
const TOP = [[70, 0], [105, 21], [35, 63], [0, 42]]
const SIDE = [[0, 42], [35, 63], [35, 145], [0, 124]]

const inside = ([px, py], poly) => {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

/** The polygon moved `d` inwards on every edge (mitred corners). */
const inset = (poly, d) => {
  const lines = poly.map((a, i) => {
    const b = poly[(i + 1) % poly.length]
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]]
    const len = Math.hypot(dx, dy)
    let [nx, ny] = [-dy / len, dx / len]
    const mid = [(a[0] + b[0]) / 2 + nx * 0.01, (a[1] + b[1]) / 2 + ny * 0.01]
    if (!inside(mid, poly)) [nx, ny] = [-nx, -ny]
    return { p: [a[0] + nx * d, a[1] + ny * d], v: [dx, dy] }
  })
  return lines.map((line, i) => {
    const prev = lines[(i - 1 + lines.length) % lines.length]
    const cross = prev.v[0] * line.v[1] - prev.v[1] * line.v[0]
    const t = ((line.p[0] - prev.p[0]) * line.v[1] - (line.p[1] - prev.p[1]) * line.v[0]) / cross
    return [prev.p[0] + prev.v[0] * t, prev.p[1] + prev.v[1] * t]
  })
}

const outline = (poly) => `M${poly.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}Z`
const block = (outlineWidth, place = (p) => p) => ({
  // The open face is wound the other way, so it cuts out under the non-zero rule as well as even-odd.
  d: outline(SILHOUETTE.map(place)) + outline(inset(FACE.map(place), outlineWidth).reverse()),
  fillRule: 'evenodd'
})

const symbol = {
  name: 'two-blocks',
  viewBox: [0, 0, WIDTH, HEIGHT],
  paths: [block(OUTLINE), block(OUTLINE, turn)],
  microPaths: [block(MICRO_OUTLINE), block(MICRO_OUTLINE, turn)],
  title: 'mark',
  masterTitle: 'mark master',
  microDescription: 'Small-size variant: the same blocks with a heavier front-face outline, for favicons and marks below 32 pixels.',
  construction: { slope: '3:5', outline: OUTLINE, microOutline: MICRO_OUTLINE, rotation: 180, centre: [WIDTH / 2, HEIGHT / 2] }
}

// --- The wordmark --------------------------------------------------------------------------------

const first = bakeWordmark(fonts, 'FIRST', 'extra', 100, 0)
const form = bakeWordmark(fonts, 'FORM', 'extra', 100, 0)
const capHeight = Math.max(first.height, form.height)
const pitch = Math.round(capHeight * 72 / 50 * 1000) / 1000
const wordmark = {
  height: pitch + form.height,
  left: Math.min(first.left, form.left),
  glyphs: { first: first.glyph, form: form.glyph },
  variants: { firstform: { width: Math.max(first.width, form.width), parts: [{ glyph: 'first', x: 0, y: 0, attrs: { 'data-word': 'FIRST' } }, { glyph: 'form', x: 0, y: pitch, attrs: { 'data-word': 'FORM' } }] } },
  editable: {
    text: {
      family: 'firstform', wrap: true, title: '{name} / text / font-dependent approximation',
      parts: ['FIRST', 'FORM'].map((word, index) => ({ element: 'text', attrs: { x: '0', y: n(first.baseline + index * pitch), 'font-family': FONTS.extra.stack, 'font-size': '100', 'font-weight': '700' }, content: word }))
    }
  }
}

// --- Drawing helpers for templates and guide pages -----------------------------------------------

const t = (id, text, x, y, size, colour, extra = {}) => ({ type: 'text', id, text, x, y, size, colour, ...extra })
const label = (id, text, x, y, size, colour, extra = {}) => t(id, text, x, y, size, colour, { font: 'label', tracking: size * 0.08, ...extra })
const shape = (id, d, fill) => ({ type: 'path', id, d, fill })
const strokeShape = (id, d, stroke, strokeWidth) => ({ type: 'path', id, d, fill: 'none', stroke, strokeWidth })

/** A rounded rectangle; with r = h / 2 it is a pill. */
const rounded = (x, y, w, h, r = Math.min(w, h) / 2) =>
  `M${n(x + r)} ${n(y)}H${n(x + w - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w)} ${n(y + r)}V${n(y + h - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w - r)} ${n(y + h)}H${n(x + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y + h - r)}V${n(y + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)}Z`

/** A segment clipped to a box (Liang-Barsky), or null. */
const clip = ([x0, y0], [x1, y1], [bx0, by0, bx1, by1]) => {
  let [t0, t1] = [0, 1]
  const [dx, dy] = [x1 - x0, y1 - y0]
  for (const [p, q] of [[-dx, x0 - bx0], [dx, bx1 - x0], [-dy, y0 - by0], [dy, by1 - y0]]) {
    if (p === 0) { if (q < 0) return null; continue }
    const r = q / p
    if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r } else { if (r < t0) return null; if (r < t1) t1 = r }
  }
  return [[x0 + t0 * dx, y0 + t0 * dy], [x0 + t1 * dx, y0 + t1 * dy]]
}

/** The isometric grid: verticals and lines at the mark's 3:5 slope, inside a box, through `origin`. */
const isoGrid = (box, step, origin = [box[0], box[1]]) => {
  const [bx0, by0, bx1, by1] = box
  const [ox, oy] = origin
  const mod = (a, m) => ((a % m) + m) % m
  const segments = []
  for (let x = bx0 + mod(ox - bx0, step); x <= bx1; x += step) segments.push([[x, by0], [x, by1]])
  const span = (bx1 - bx0) * SLOPE
  const period = step * SLOPE * 2
  // Rising lines meet x = bx0 at oy + (ox - bx0)·slope, falling ones at oy - (ox - bx0)·slope, plus whole periods.
  const down = by0 - span - period + mod(oy - SLOPE * (ox - bx0) - (by0 - span), period)
  for (let c = down; c <= by1 + period; c += period) segments.push(clip([bx0, c], [bx1, c + span], box))
  const up = by0 - period + mod(oy + SLOPE * (ox - bx0) - by0, period)
  for (let c = up; c <= by1 + span + period; c += period) segments.push(clip([bx0, c], [bx1, c - span], box))
  return segments.filter(Boolean).map(([[x0, y0], [x1, y1]]) => `M${n(x0)} ${n(y0)}L${n(x1)} ${n(y1)}`).join('')
}

/** Stacked isometric blocks filling a box from its bottom edge up; three faces, three paths. */
const blocks = (box, size) => {
  const [bx0, by0, bx1, by1] = box
  const w = size
  const h = size * SLOPE
  const faces = { top: '', left: '', right: '' }
  for (let row = 0, y = by1 + h; y - 2 * h > by0 - h; row++, y -= 3 * h) {
    for (let x = bx0 - w + (row % 2) * w, col = 0; x < bx1 + w; x += 2 * w, col++) {
      const top = [[x, y - 2 * h], [x + w, y - 3 * h], [x + 2 * w, y - 2 * h], [x + w, y - h]]
      const left = [[x, y - 2 * h], [x + w, y - h], [x + w, y + h], [x, y]]
      const right = [[x + w, y - h], [x + 2 * w, y - 2 * h], [x + 2 * w, y], [x + w, y + h]]
      faces.top += outline(top)
      faces.left += outline(left)
      faces.right += outline(right)
    }
  }
  return faces
}

/** Viewfinder corner brackets around a box: where a photo of the real part goes. */
const brackets = (x, y, w, h, arm, r) => [
  `M${n(x)} ${n(y + arm)}V${n(y + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)}H${n(x + arm)}`,
  `M${n(x + w - arm)} ${n(y)}H${n(x + w - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w)} ${n(y + r)}V${n(y + arm)}`,
  `M${n(x + w)} ${n(y + h - arm)}V${n(y + h - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w - r)} ${n(y + h)}H${n(x + w - arm)}`,
  `M${n(x + arm)} ${n(y + h)}H${n(x + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y + h - r)}V${n(y + h - arm)}`
].join('')

// --- Templates -----------------------------------------------------------------------------------

const card = { width: 960, height: 560, physical: ['96mm', '56mm'], raster: 1920, group: 'Business cards', print: { trim: [90, 50], bleed: 3, unit: 'mm' } }
const cardGuides = { type: 'printGuides', colour: 'muted', trim: { id: 'trim-90x50mm', x: 30, y: 30, width: 900, height: 500 }, safe: { id: 'safe-3mm-inside-trim', x: 60, y: 60, width: 840, height: 440 } }
const proposalBlocks = blocks([0, 700, 794, 1123], 40)

const TEMPLATES = [
  {
    id: 'business-card-front', label: 'Business card, front', title: '{name} / business-card front / 90 × 50 mm trim + 3 mm bleed', ...card,
    elements: [{ type: 'background', fill: 'ash' }, { type: 'logo', x: 300, y: 200, width: 360, colour: 'black' }, cardGuides]
  },
  {
    id: 'business-card-back', label: 'Business card, back', title: '{name} / business-card back / replace placeholders', ...card,
    elements: [
      { type: 'background', fill: 'black' },
      { type: 'symbol', x: 96, y: 92, height: 120, colour: 'white' },
      t('contact-name', '[Full Name]', 96, 380, 44, 'white', { font: 'bold' }),
      label('contact-role', '[TITLE] · FIRSTFORM.ORG', 96, 430, 20, 'mist'),
      cardGuides
    ]
  },
  {
    id: 'part-tag', label: 'Part tag', group: 'Labels', title: '{name} / part tag / 70 × 35 mm label', width: 700, height: 350, physical: ['70mm', '35mm'], raster: 1400,
    elements: [
      { type: 'background', fill: 'white' },
      strokeShape('tag-edge', rounded(4, 4, 692, 342, 28), 'mist', 2),
      { type: 'symbol', x: 48, y: 70, height: 210, colour: 'black' },
      t('part-name', '[Part name]', 250, 112, 40, 'black', { font: 'bold' }),
      label('project-label', 'PROJECT', 250, 176, 18, 'graphite'), t('project-number', '[FF-0000]', 380, 176, 22, 'black'),
      label('revision-label', 'REV', 250, 222, 18, 'graphite'), t('revision', '[A]', 380, 222, 22, 'black'),
      label('date-label', 'DATE', 250, 268, 18, 'graphite'), t('date', '[YYYY-MM-DD]', 380, 268, 22, 'black')
    ]
  },
  {
    id: 'letterhead-a4', label: 'A4 letterhead', group: 'Stationery', title: '{name} / A4 letterhead / replace placeholders', width: 794, height: 1123, physical: ['210mm', '297mm'], raster: 1588,
    elements: [
      { type: 'background', fill: 'white' },
      { type: 'logo', x: 62, y: 58, width: 150, colour: 'black' },
      label('header-site', 'FIRSTFORM.ORG', 732, 98, 11, 'graphite', { anchor: 'end' }),
      { type: 'path', id: 'header-rule', d: 'M62 184H732', stroke: 'ash', strokeWidth: 1 },
      t('letter-date', '[Date]', 62, 238, 14, 'black'),
      t('recipient-name', '[Recipient]', 62, 287, 16, 'black', { font: 'bold' }),
      t('recipient-address', '[Address]', 62, 313, 14, 'graphite'),
      t('letter-subject', '[Subject]', 62, 404, 28, 'black', { font: 'display', tracking: -0.5 }),
      { type: 'paragraph', id: 'letter-content', text: '[Letter content]', x: 62, y: 453, width: 670, size: 14, leading: 22, colour: 'black' },
      { type: 'path', id: 'footer-rule', d: 'M62 1015H732', stroke: 'ash', strokeWidth: 1 },
      t('footer-contact', '[Contact details] · firstform.org', 62, 1056, 11, 'graphite')
    ]
  },
  {
    id: 'proposal-cover-a4', label: 'Proposal cover', group: 'Stationery', title: '{name} / A4 proposal cover / replace placeholders', width: 794, height: 1123, physical: ['210mm', '297mm'], raster: 1588,
    elements: [
      { type: 'background', fill: 'night' },
      shape('blocks-left', proposalBlocks.left, 'night'),
      shape('blocks-right', proposalBlocks.right, 'coal'),
      shape('blocks-top', proposalBlocks.top, 'hairline'),
      shape('logo-plate', rounded(70, 70, 210, 104, 24), 'ash'),
      { type: 'logo', x: 92, y: 88, width: 166, colour: 'black' },
      label('proposal-kicker', 'PROPOSAL · [MONTH YEAR]', 72, 360, 14, 'steel'),
      { type: 'paragraph', id: 'project-name', text: '[Project name]', x: 72, y: 440, width: 640, size: 64, leading: 68, maxLines: 3, colour: 'white', font: 'display' },
      t('prepared-for', 'Prepared for [Client]', 72, 620, 18, 'mist')
    ]
  },
  {
    id: 'social-statement', label: 'Social post, statement', group: 'Social', title: '{name} / square social post / statement', width: 1080, height: 1080, raster: 1080,
    elements: [
      { type: 'background', fill: 'night' },
      strokeShape('iso-grid', isoGrid([0, 0, 1080, 1080], 60), 'hairline', 1),
      shape('logo-plate', rounded(80, 80, 268, 132, 28), 'ash'),
      { type: 'logo', x: 106, y: 102, width: 216, colour: 'black' },
      { type: 'paragraph', id: 'headline', text: 'From first idea to first form.', x: 80, y: 600, width: 860, size: 104, leading: 106, maxLines: 3, colour: 'white', font: 'display' },
      shape('cta-pill', rounded(80, 880, 316, 80), 'white'),
      label('cta', 'SEE PROJECTS', 238, 930, 24, 'black', { anchor: 'middle' })
    ]
  },
  {
    id: 'social-service', label: 'Social post, service', group: 'Social', title: '{name} / square social post / service', width: 1080, height: 1080, raster: 1080,
    elements: [
      { type: 'background', fill: 'white' },
      strokeShape('service-icon', `${rounded(86, 96, 224, 56, 28)}${rounded(86, 176, 224, 56, 28)}${rounded(86, 256, 40, 40, 12)}M96 276l8 8 14-16M150 276H238`, 'black', 6),
      label('service-kicker', 'SERVICE', 86, 690, 22, 'graphite'),
      { type: 'paragraph', id: 'service-name', text: '[Forms and workflows]', x: 86, y: 790, width: 900, size: 88, leading: 94, maxLines: 2, colour: 'black', font: 'displayRegular' },
      { type: 'paragraph', id: 'service-detail', text: '[One sentence on what it covers.]', x: 86, y: 960, width: 760, size: 28, leading: 40, maxLines: 2, colour: 'graphite' },
      { type: 'symbol', x: 940, y: 916, height: 80, colour: 'black' }
    ]
  },
  {
    id: 'social-banner', label: 'Social banner', group: 'Social', title: '{name} / social banner / 1584 × 396', width: 1584, height: 396, raster: 1584,
    elements: [
      { type: 'background', fill: 'ash' },
      t('banner-headline', 'From first idea to first form.', 96, 218, 60, 'black', { font: 'display', tracking: -1.2 }),
      label('banner-descriptor', 'CONSULTING · DESIGN · DEVELOPMENT', 1488, 214, 18, 'graphite', { anchor: 'end' })
    ]
  },
  {
    id: 'share-image', label: 'Link preview image', group: 'Web', title: '{name} / link preview / 1200 × 630', width: 1200, height: 630, raster: 1200,
    elements: [
      { type: 'background', fill: 'night' },
      strokeShape('iso-grid', isoGrid([700, 0, 1200, 630], 50), 'hairline', 1),
      { type: 'logo', x: 72, y: 66, width: 190, colour: 'white' },
      { type: 'paragraph', id: 'page-title', text: '[Page title goes here]', x: 72, y: 360, width: 600, size: 64, leading: 68, maxLines: 2, colour: 'white', font: 'display' },
      label('site', 'FIRSTFORM.ORG', 72, 564, 18, 'steel')
    ]
  },
  {
    id: 'slide-title', label: 'Slide, title', group: 'Presentations', title: '{name} / 16:9 slide / title', width: 1920, height: 1080, raster: 1920,
    elements: [
      { type: 'background', fill: 'night' },
      strokeShape('iso-grid', isoGrid([0, 0, 1920, 1080], 80), 'hairline', 1),
      shape('logo-plate', rounded(96, 96, 300, 148, 32), 'ash'),
      { type: 'logo', x: 126, y: 120, width: 240, colour: 'black' },
      t('deck-title', '[Deck title]', 96, 840, 120, 'white', { font: 'display', tracking: -2.4 }),
      label('deck-details', '[CLIENT] · [MONTH YEAR]', 100, 920, 28, 'mist')
    ]
  },
  {
    id: 'slide-case-study', label: 'Slide, case study', group: 'Presentations', title: '{name} / 16:9 slide / case study', width: 1920, height: 1080, raster: 1920,
    elements: [
      { type: 'background', fill: 'white' },
      { type: 'symbol', x: 96, y: 96, height: 84, colour: 'black' },
      label('case-kicker', 'CASE STUDY', 96, 560, 26, 'graphite'),
      { type: 'paragraph', id: 'case-title', text: '[Project name]', x: 96, y: 660, width: 800, size: 84, leading: 92, maxLines: 2, colour: 'black', font: 'display' },
      { type: 'paragraph', id: 'case-summary', text: '[Two lines on the need and what was made.]', x: 96, y: 880, width: 760, size: 36, leading: 52, maxLines: 3, colour: 'graphite' },
      shape('photo-well', rounded(1000, 96, 824, 888, 40), 'coal'),
      strokeShape('photo-brackets', brackets(1056, 152, 712, 776, 80, 32), 'graphite', 4)
    ]
  },
  {
    id: 'slide-close', label: 'Slide, close', group: 'Presentations', title: '{name} / 16:9 slide / close', width: 1920, height: 1080, raster: 1920,
    elements: [
      { type: 'background', fill: 'ash' },
      { type: 'logo', x: 720, y: 400, width: 480, colour: 'black' },
      label('close-site', 'FIRSTFORM.ORG', 960, 760, 28, 'graphite', { anchor: 'middle' })
    ]
  }
]

// --- Guide ---------------------------------------------------------------------------------------

const g = {
  label: (text, x, y, colour) => ({ type: 'label', text, x, y, ...(colour ? { colour } : {}) }),
  para: (text, x, y, width, size, extra = {}) => ({ type: 'para', text, x, y, width, size, ...extra }),
  rect: (x, y, width, height, fill, stroke) => ({ type: 'rect', x, y, width, height, fill, ...(stroke ? { stroke } : {}) }),
  logo: (x, y, width, extra = {}) => ({ type: 'logo', x, y, width, ...extra }),
  nested: (src, x, y, width, height) => ({ type: 'nested', src, x, y, width, height })
}
// The construction drawing: the mark at 1.6× on its isometric grid.
const CONSTRUCTION = { x: 64, y: 256, width: 500, height: 400, scale: 1.6 }
const markX = CONSTRUCTION.x + (CONSTRUCTION.width - WIDTH * CONSTRUCTION.scale) / 2
const markY = CONSTRUCTION.y + (CONSTRUCTION.height - HEIGHT * CONSTRUCTION.scale) / 2
const constructionGrid = isoGrid([CONSTRUCTION.x + 1, CONSTRUCTION.y + 1, CONSTRUCTION.x + CONSTRUCTION.width - 1, CONSTRUCTION.y + CONSTRUCTION.height - 1], 35 * CONSTRUCTION.scale, [markX + 70 * CONSTRUCTION.scale, markY])


// The Turn study as four still frames: the second block on the first, a third, two thirds, home.
const TURN_FRAMES = [-180, -120, -60, 0].map((angle, index) => {
  const x = 64 + index * 228
  const y = 266
  const at = `translate(${x + 38} ${y + 30}) scale(0.84)`
  return [
    g.rect(x, y, 208, 240, index === 3 ? 'ash' : 'reverse', index === 3 ? undefined : 'line'),
    { type: 'path', d: block(OUTLINE).d, fill: 'ink', transform: at },
    { type: 'path', d: block(OUTLINE, turn).d, fill: 'ink', transform: `${at} rotate(${angle} ${WIDTH / 2} ${HEIGHT / 2})` },
    g.label(['TURN · START', 'ONE THIRD', 'TWO THIRDS', 'END · THE STILL MARK'][index], x, y + 272)
  ]
}).flat()
const MOTION_PAGE = { title: 'Motion that assembles.', subtitle: 'Parts slide along the mark’s own axes and lock together. Every logo animation ends on the still logo.', name: 'Motion', elements: [...TURN_FRAMES, { type: 'specTable', x: 990, right: 1376, y: 290, step: 46, rows: Object.entries(TOKENS.durations).map(([key, value]) => [key[0].toUpperCase() + key.slice(1), `${value} ms`]).concat([['Stagger', `${TOKENS.stagger} ms`], ['Settle', 'ease out, (.2, .7, .2, 1)']]) }, ...RULES.map((rule, index) => g.para(`${rule.title} ${rule.text}`, 64 + (index % 2) * 664, 624 + Math.floor(index / 2) * 112, 620, 19, { colour: index % 2 ? 'muted' : 'ink', line: 1.5 })), g.para('All sixteen studies, with replay, are in motion/index.html in the kit and in brandkit’s Motion tab.', 64, 880, 1312, 18)] }

const GUIDE = {
  title: '{name} brand guide',
  pdfTitle: '{name} brand guide / v{displayVersion}',
  sheetsPdfTitle: '{name} logo reference sheets / v{displayVersion}',
  pageTitle: '{name} brand guide / {page}',
  width: 1440,
  height: 1020,
  frame: { background: 'paper', logo: { x: 62, y: 30, width: 120 }, header: '{upperName} / BRAND GUIDE / V{displayVersion}', footer: '{upperName} / CONSULTING · DESIGN · DEVELOPMENT' },
  pages: [
    { title: 'From first idea to first form.', subtitle: 'Two blocks that fit into one whole, beside a two-line wordmark. Used the same way everywhere.', name: 'Primary logo', elements: [g.label('PRIMARY · ON ASH', 64, 278), g.rect(64, 300, 836, 300, 'ash'), g.logo(120, 330, 600, { height: 240, align: 'start' }), g.rect(924, 300, 452, 300, 'black'), g.label('REVERSED · ON BLACK', 948, 334, 'mist'), g.logo(970, 370, 360, { height: 190, colour: 'white' }), g.label('WHAT FIRST FORM DOES', 64, 664), g.para('Consulting, design and development. We take an idea, a website, a form, a product or a process, and build its first working version.', 64, 706, 836, 26, { colour: 'ink', line: 1.5 }), g.label('DESCRIPTOR', 952, 664), g.para('Consulting · Design · Development', 952, 706, 424, 26, { colour: 'ink', line: 1.5 }), g.para('The logo is drawn from brand.json as vectors. The kit’s original PNGs are kept in reference/ for comparison.', 64, 900, 1312, 18)] },
    { title: 'How the mark is built.', subtitle: 'Two identical isometric blocks. The second is the first turned 180° about the centre.', name: 'Construction and clearspace', elements: [g.rect(CONSTRUCTION.x, CONSTRUCTION.y, CONSTRUCTION.width, CONSTRUCTION.height, 'reverse', 'line'), { type: 'path', d: constructionGrid, stroke: 'line' }, { type: 'symbol', x: markX, y: markY, height: HEIGHT * CONSTRUCTION.scale }, g.label('GEOMETRY', 620, 277), { type: 'specTable', x: 620, right: 1376, y: 320, step: 52, rows: [['Canvas', '{symbol.viewBox.2} × {symbol.viewBox.3} units'], ['Edge slope', '3 : 5, about 31°'], ['Blocks', 'Two, identical, turned 180°'], ['Front face outline', '{symbol.construction.outline} units'], ['Small-size outline', '{symbol.construction.microOutline} units'], ['Gap between blocks', '10 units']] }, g.label('LOCKUP & CLEARSPACE', 64, 715), g.rect(76, 740, 640, 200, 'none', 'muted'), g.logo(130, 770, 532, { height: 140 }), g.para('Clear space on every side is the cap height of the F. In the lockup the mark is {lockup.iconHeight} units tall and the gap to the wordmark is {lockup.iconGap} units.', 760, 760, 616, 20)] },
    { title: 'One logo, four formats.', subtitle: 'Choose the arrangement that fits the space. Keep the logo in one colour.', name: 'Lockup family', elements: [g.rect(64, 255, 828, 214, 'reverse', 'line'), g.label('HORIZONTAL', 86, 284), g.logo(86, 300, 780, { height: 150 }), g.rect(924, 255, 452, 214, 'black'), g.label('REVERSED', 946, 284, 'mist'), g.logo(946, 300, 408, { height: 150, colour: 'white' }), g.rect(64, 496, 550, 364, 'ash'), g.label('STACKED', 88, 530), g.logo(88, 550, 502, { height: 286, layout: 'stacked' }), g.rect(642, 496, 378, 364, 'reverse', 'line'), g.label('MARK ONLY', 666, 530), { type: 'symbol', x: 772, y: 572, height: 230 }, g.rect(1048, 496, 328, 364, 'black'), g.label('WORDMARK', 1072, 530, 'mist'), g.logo(1072, 580, 280, { height: 200, layout: 'wordmark', colour: 'white' })] },
    { title: 'Strictly monochrome.', subtitle: 'Black, white and grey. Contrast does the work colour usually does; photos of real work bring the colour.', name: 'Colour', elements: [{ type: 'swatches', x: 64, y: 267, step: 330, width: 300, height: 275, colours: ['black', 'graphite', 'ash', 'white'] }, g.label('SUPPORT GREYS', 64, 735), { type: 'swatchStrip', x: 64, y: 760, step: 262, width: 250, height: 70, colours: ['night', 'coal', 'hairline', 'steel', 'mist'] }, g.para('Ink #060606 page ground · Coal #141414 panels · Rule #2A2A2A lines · Steel #A6A6A6 labels on dark · Mist #C8C8C8 body text on dark. Never set Black on Graphite (2.3 : 1).', 64, 870, 1312, 18)] },
    { title: 'One family: Sora.', subtitle: 'A geometric sans with a technical edge. Free under the SIL Open Font License.', name: 'Typography', elements: [g.label('HEADLINES / {fonts.display.label}', 64, 278), { type: 'text', text: 'From first idea to first form.', x: 62, y: 366, size: 70, font: 'display', tracking: -0.025 }, { type: 'rule', y: 415 }, g.label('BODY / {fonts.body.label}', 64, 464), g.para('Plain verbs and short sentences. Name the real thing: the probe holder, the intake form, the booking page.', 64, 516, 1230, 29, { colour: 'ink', line: 1.6 }), { type: 'rule', y: 618 }, g.label('LABELS / {fonts.label.label}, CAPS', 64, 664), { type: 'text', text: 'PROJECTS · SERVICES · CONTACT', x: 64, y: 722, size: 28, font: 'label', tracking: 0.06 }, { type: 'rule', y: 767 }, g.label('WORDMARK / SORA BOLD, OUTLINED', 64, 812), g.logo(58, 830, 400, { height: 110, align: 'start', layout: 'wordmark' }), g.para('The wordmark is outlined artwork, so it looks the same everywhere and needs no font installed.', 752, 817, 606, 22)] },
    { title: 'Supporting graphics.', subtitle: 'Repeat or crop the mark for grounds. Keep the logo itself whole.', name: 'Patterns', elements: [g.nested('patterns/repeat', 64, 266, 416, 260), g.label('REPEAT', 64, 561), g.nested('patterns/crop', 512, 266, 416, 260), g.label('CROP', 512, 561), g.nested('patterns/field', 960, 266, 416, 260), g.label('FIELD', 960, 561), { type: 'rule', y: 610 }, g.para('The templates add the isometric grid and stacked blocks, both drawn on the mark’s 3 : 5 slope. Use them as quiet grounds, never behind the logo.', 64, 680, 1312, 24, { colour: 'ink' })] },
    { title: 'Ready for everyday use.', subtitle: 'Cards, tags, stationery, social graphics and slides, with editable text.', name: 'Applications', elements: [g.nested('templates/business-card-front', 64, 263, 403, 235), g.nested('templates/business-card-back', 64, 520, 403, 235), g.label('90 x 50 MM CARDS / 3 MM BLEED', 64, 791), g.nested('templates/social-statement', 499, 263, 315, 315), g.label('1080 x 1080 POST', 499, 611), g.nested('templates/slide-title', 499, 649, 315, 177.2), g.label('1920 x 1080 SLIDE', 499, 861), g.rect(846, 263, 247, 350, 'reverse', 'line'), g.nested('templates/proposal-cover-a4', 846, 263, 247, 350), g.label('A4 PROPOSAL', 846, 647), g.nested('templates/part-tag', 1125, 263, 251, 125.5), g.label('70 x 35 MM PART TAG', 1125, 420), g.nested('templates/social-banner', 846, 696, 530, 132.5), g.label('1584 x 396 BANNER', 846, 865), g.para('Replace bracketed fields in the SVG files, or fill them in brandkit and download the result.', 64, 920, 1312, 18)] },
    MOTION_PAGE,
    { title: 'Use the right file for the job.', subtitle: 'The same geometry drives the vectors, images, templates and website components.', name: 'Files', elements: [g.label('SCREEN & PRINT', 64, 278), { type: 'list', x: 64, detailX: 267, right: 818, y: 322, step: 63, rows: [['SVG', 'Scale-independent logos and marks.'], ['PNG', 'Transparent artwork for slides and documents.'], ['PDF', 'Vector handoff and print proofs.'], ['REACT / CSS', 'Inline colour inheritance and local fonts.'], ['BRAND.JSON', 'One source for the whole identity.']] }, g.rect(883, 263, 493, 342, 'black'), g.label('MINIMUM SIZES', 913, 307, 'mist'), { type: 'text', text: '{lockup.minimumHorizontalWidthPx} px / {lockup.minimumHorizontalWidthMm} mm', x: 913, y: 366, size: 33, font: 'display', colour: 'reverse', tracking: -0.03 }, g.para('Full logo width (40 px / 12 mm tall).', 913, 407, 429, 19, { colour: 'mist' }), { type: 'text', text: '{lockup.minimumSymbolHeightPx} px / {lockup.minimumSymbolHeightMm} mm', x: 913, y: 494, size: 33, font: 'display', colour: 'reverse', tracking: -0.03 }, g.para('Mark height, below which use the small-size mark.', 913, 535, 429, 19, { colour: 'mist' }), g.label('SMALL SCREEN ICONS', 64, 670), { type: 'symbol', x: 66, y: 704, height: 136 }, { type: 'symbol', x: 262, y: 704, height: 136, micro: true }, g.label('STANDARD', 64, 882), g.label('SMALL SIZE', 264, 882), g.para('Open index.html in the kit to browse every file. Edit brand.json, or this brand’s script, and rebuild to change any of them.', 493, 706, 800, 23, { colour: 'ink' })] }
  ],
  sheets: [{ id: 'logo-sheet-01', group: 'logo-sheets', width: 1440, height: 1020, title: '{name} logo reference sheet 1', elements: [g.rect(0, 0, 1440, 1020, 'paper'), { type: 'text', text: 'Logo reference sheet', x: 64, y: 88, size: 42, font: 'display', tracking: -0.03 }, g.label('FIRSTFORM / SHEET 1 OF 1', 64, 128), g.label('HORIZONTAL', 64, 221), g.logo(56, 240, 1000, { height: 230, align: 'start' }), g.label('WORDMARK', 64, 518), g.logo(56, 540, 760, { height: 150, align: 'start', layout: 'wordmark' }), g.label('STACKED', 980, 518), g.logo(972, 540, 404, { height: 380, align: 'start', layout: 'stacked' }), g.label('OUTLINED ARTWORK / V{displayVersion}', 64, 980)] }]
}

// --- Icons: one 2 px stroke on a 64 grid; the three originals, then five for the wider work. ----

const ICONS = {
  size: 64,
  attrs: { stroke: 'currentColor', 'stroke-width': '2', fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
  title: '{name} / {icon} icon',
  items: [
    { id: 'consultation', content: '<circle cx="24" cy="32" r="20"/><circle cx="40" cy="32" r="20"/>' },
    { id: 'design', content: [9, 27, 45].flatMap((y, row) => [3, 19, 35, 51].map((x, col) => (row === 0 && col === 3 ? `<circle cx="57" cy="14" r="5" fill="currentColor" stroke="none"/>` : `<rect x="${x}" y="${y}" width="12" height="10" rx="3.5"/>`))).join('') },
    { id: 'prototyping', content: '<path d="M4 18V14A10 10 0 0 1 14 4h4M46 4h4a10 10 0 0 1 10 10v4M60 46v4a10 10 0 0 1-10 10h-4M18 60h-4A10 10 0 0 1 4 50v-4M32 20v24M20 32h24"/>' },
    { id: 'website', content: '<rect x="4" y="10" width="56" height="44" rx="10"/><path d="M4 22h56"/><circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none"/><circle cx="18" cy="16" r="1.5" fill="currentColor" stroke="none"/>' },
    { id: 'forms', content: '<rect x="4" y="8" width="56" height="14" rx="7"/><rect x="4" y="28" width="56" height="14" rx="7"/><rect x="4" y="48" width="10" height="10" rx="3"/><path d="M6.5 53l2 2 3.5-4M20 53h22"/>' },
    { id: 'build', content: '<path d="M32 6L56 19V45L32 58L8 45V19Z"/><path d="M8 19L32 32L56 19M32 32V58"/>' },
    { id: 'systems', content: '<circle cx="14" cy="14" r="8"/><circle cx="50" cy="14" r="8"/><circle cx="32" cy="50" r="8"/><path d="M22 14h20M18 21l10 22M46 21L36 43"/>' },
    { id: 'research', content: '<circle cx="32" cy="32" r="26"/><circle cx="32" cy="32" r="14"/><circle cx="32" cy="32" r="3" fill="currentColor" stroke="none"/>' }
  ]
}

// --- The brand -----------------------------------------------------------------------------------

const starter = createStarterBrand({ id: 'firstform', name: 'First Form', tagline: 'From first idea to first form.', wordmark: { text: 'FIRST FORM', font: 'extra' } }, fonts)

const brand = {
  ...starter,
  version: '1.0',
  displayVersion: '1.0',
  source: 'First Form Brand Kit V1.0 (Sora, monochrome palette, two-block mark), rebuilt as vectors by scripts/brands/firstform.mjs.',
  status: 'Rebuilt as vectors from the kit PNGs: the mark redrawn on its isometric geometry, the wordmark set in Sora Bold as the nearest open face. Replace both with original vector masters when they exist.',
  colours: { black: '#000000', graphite: '#484848', ash: '#DFDFDF', white: '#FFFFFF', night: '#060606', coal: '#141414', hairline: '#2A2A2A', steel: '#A6A6A6', mist: '#C8C8C8' },
  colourNames: { night: 'Ink', hairline: 'Rule' },
  roles: { ink: 'black', paper: 'white', muted: 'graphite', primary: 'black', light: 'ash', reverse: 'white', line: 'mist', rule: 'ash' },
  logoColours: ['black', 'white', 'currentColor'],
  rasterColours: ['black', 'white'],
  fonts: FONTS,
  typography: { headlines: { family: 'Sora', weight: 600, trackingEm: -0.025 }, body: { family: 'Sora', weight: 400 }, labels: { family: 'Sora', weight: 400, trackingEm: 0.06 } },
  symbol,
  wordmark,
  families: [{ id: 'firstform', wordmark: 'firstform', typeHeight: 122, stackedTypeHeight: 92, label: 'First Form' }],
  lockup: { iconHeight: 214, iconGap: 22, stackedIconHeight: 160, stackedTypeHeight: 92, stackedGap: 28, canvasPadding: 16, wordmarkHeight: 122, clearspaceRecommendation: 'The cap height of the F, clear on every side.', minimumSymbolHeightPx: 24, minimumHorizontalWidthPx: 70, minimumSymbolHeightMm: 7, minimumHorizontalWidthMm: 20 },
  copy: { svgDescription: 'First Form identity artwork: the two-block mark and the FIRST / FORM wordmark. Self-contained vector artwork generated by brandkit.', templateDescription: 'First Form application. Logo outlined; text live and editable.', logoLabel: 'First Form logo', motifLabel: 'First Form mark', tagline: 'From first idea to first form.', descriptor: 'Consulting · Design · Development' },
  patterns: [
    { id: 'repeat', title: '{name} / repeating mark', width: 960, height: 600, background: 'night', repeat: { x: [-40, 1000, 200], y: [-60, 700, 260], scale: 0.9, colour: 'hairline' } },
    { id: 'crop', title: '{name} / large crop', width: 960, height: 600, background: 'black', place: [{ x: 420, y: -180, scale: 4.2, colour: 'hairline' }] },
    { id: 'field', title: '{name} / mark on ash', width: 960, height: 600, background: 'ash', place: [{ x: 375, y: 125, scale: 1.65, colour: 'black' }] }
  ],
  icons: ICONS,
  motion: { page: 'motion/index.html', css: 'motion/motion.css', tokens: TOKENS, rules: RULES, studies: STUDIES },
  templates: TEMPLATES,
  guide: GUIDE,
  web: {
    ...starter.web,
    componentName: 'FirstFormLogo',
    symbolComponentName: 'FirstFormMark',
    cssPrefix: 'ff',
    appIcon: { background: 'black', colour: 'white', size: 640 },
    favicon: { light: '#000000', dark: '#FFFFFF', size: 56, micro: true, title: '{name} favicon / small-size mark' },
    intro: { eyebrow: 'Consulting · Design · Development', headline: 'First Form\nBrand assets.', body: 'The two-block mark, the FIRST / FORM wordmark, Sora and a strictly monochrome palette: logos, templates and web files from one brand.json.', edition: 'v{displayVersion}', typeSample: 'From first idea\nto first form.', footer: 'First Form · From first idea to first form.' },
    landing: { eyebrow: 'Consulting · Design · Development', headline: 'From first idea\nto first form.', body: 'An independent practice that turns an idea into something people can use: a website, a form, a product or a process.', cta: 'Start a conversation', contactEyebrow: 'Have something that needs a first form?', contactBody: '[Add a contact address or form here.]', footer: 'First Form' }
  },
  files: [
    { to: 'README.md', from: 'docs/README.md' },
    { to: 'CHANGELOG.md', from: 'docs/CHANGELOG.md' },
    { to: 'guidelines/brand-details.html', from: 'docs/brand-details.html' },
    ...['logo-black', 'logo-white', 'mark-black', 'mark-white', 'wordmark-white'].map((name) => ({ to: `guidelines/brand-details-assets/${name}.png`, from: `docs/brand-details-assets/${name}.png` })),
    'motion/index.html', 'motion/motion.css', 'motion/motion-tokens.json', 'motion/README.md',
    'fonts/README.md', 'fonts/Sora-OFL.txt', 'fonts/Sora-Light.ttf', 'fonts/Sora-Regular.ttf', 'fonts/Sora-SemiBold.ttf', 'fonts/Sora-Bold.ttf'
  ]
}

// The motion library and its CSS, drawn from the same geometry and palette.
mkdirSync(`${folder}motion`, { recursive: true })
const motionGeometry = { viewBox: symbol.viewBox, silhouette: SILHOUETTE, face: FACE, inner: inset(FACE, OUTLINE), top: TOP, side: SIDE, turn, wordmark, lockup: { iconHeight: brand.lockup.iconHeight, iconGap: brand.lockup.iconGap, typeHeight: brand.families[0].typeHeight } }
writeFileSync(`${folder}motion/index.html`, motionPage(motionGeometry, brand.colours))
writeFileSync(`${folder}motion/motion.css`, motionCss(brand.colours))
writeFileSync(`${folder}motion/motion-tokens.json`, `${JSON.stringify({ ...TOKENS, rules: RULES.map((rule) => rule.title) }, null, 2)}\n`)
writeFileSync(`${folder}motion/README.md`, motionReadme())

// The site uses the same CSS, and draws its header logo and loader from the same geometry: each sits
// between <!-- ff:name --> markers in site/index.html, replaced on every run.
writeFileSync(`${folder}site/assets/motion.css`, motionCss(brand.colours))
const sitePath = `${folder}site/index.html`
let site = readFileSync(sitePath, 'utf8')
for (const [name, markup] of [['logo', lockupMarkup(motionGeometry, 'site-logo')], ['loader', markMarkup(motionGeometry, 'Loading')]]) {
  const pattern = new RegExp(`(<!-- ff:${name} -->)[\\s\\S]*?(<!-- /ff:${name} -->)`)
  if (!pattern.test(site)) throw new Error(`site/index.html has no ff:${name} markers`)
  site = site.replace(pattern, (_, open, close) => open + markup + close)
}
writeFileSync(sitePath, site)

writeFileSync(`${folder}brand.json`, `${JSON.stringify(brand, null, 2)}\n`)
updateManifest(brand)
console.log(`brands/firstform/brand.json: ${brand.templates.length} templates, ${brand.guide.pages.length} guide pages, ${brand.icons.items.length} icons, ${brand.motion.studies.length} motion studies`)
