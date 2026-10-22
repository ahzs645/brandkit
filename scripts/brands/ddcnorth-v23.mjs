// ddcnorth v2.3, proposed: data, design, connection.
//
// Writes one revision into the v2.1 definition (brands/ddcnorth/history/2.1/brand.json), after the 2.2
// rising proposal, and the files
// it ships: the motion library (brands/ddcnorth/motion/) and the brand-details page
// (brands/ddcnorth/docs/brand-details.html). Everything else in brand.json stays as it was.
//
// The revision adds what the company's website work set out in October 2026: the descriptor
// "Data · Design · Connection", four pattern families on the symbol's grid, a data language, eight
// templates for the work itself (findings, briefs, workshops), five supporting icons, guide pages
// for the name, data, motion and voice, and a motion library for the Motion tab. The logo and
// symbol do not change. A complete symbol always keeps one dot diameter clear; only repeated or
// cropped dots touch other shapes. Inputs are read from this repository only.
//
//   npm run make:ddcnorth-v23

import { mkdirSync, writeFileSync } from 'node:fs'
import { lockup } from '../../src/engine/artwork.js'
import { n } from '../../src/engine/format.js'
import { fillTemplate, motionCss, motionEntry, motionPage, motionReadme, motionTokens, readInput } from './ddcnorth-motion.mjs'

const root = new URL('../../brands/ddcnorth/', import.meta.url)
const here = new URL('./ddcnorth-v23/', import.meta.url)
// The revision is recorded in the v2.1 definition, as it was proposed; scripts/brands/ddcnorth-accept-v23.mjs
// merges it into brand.json now that it is approved.
const file = new URL('history/2.1/brand.json', root)
const brand = JSON.parse(readInput(file).toString('utf8'))
const ID = 'data-design-connection'
const EXTENSION = 'v2.3'
const DESCRIPTOR = 'Data · Design · Connection'

// --- Geometry shared with the symbol: six circles of radius 40 on an 88-unit pitch in a 256 box.

const R = 40
const BOX = 256
const round = (value, places = 2) => Math.round(value * 10 ** places) / 10 ** places
/** A complete symbol's clear box: its artwork box plus one dot diameter on every side. */
const clearBox = (x, y, scale) => ({ l: x - 2 * R * scale, t: y - 2 * R * scale, r: x + (BOX + 2 * R) * scale, b: y + (BOX + 2 * R) * scale })
const outside = (cx, cy, r, box) => cx + r <= box.l || cx - r >= box.r || cy + r <= box.t || cy - r >= box.b
const grid = (cols, rows, x0, y0, step) => Array.from({ length: rows }, (_, j) => Array.from({ length: cols }, (_, i) => [x0 + i * step, y0 + j * step])).flat()
/** Circles as one path, for guide pages (which have no circle element). */
const dotsPath = (dots) => dots.map(([cx, cy, r]) => `M${round(cx - r)} ${round(cy)}a${round(r)} ${round(r)} 0 1 0 ${round(2 * r)} 0a${round(r)} ${round(r)} 0 1 0 ${round(-2 * r)} 0Z`).join('')

// --- Patterns.

const pattern = (id, title, background, extra) => ({ id, title: `{name} / ${title}`, width: 960, height: 600, background, extension: EXTENSION, ...extra })
const NETWORK_PATH = [[60, 540], [180, 480], [300, 360], [420, 420], [540, 300], [600, 300]]

const patterns = () => {
  const scale = 0.62
  const nx = round(960 - BOX * scale - 72)
  const network = clearBox(nx, 64, scale)
  const step = 60
  const fieldScale = round(step / 88, 5)
  const [fx, fy] = [round(540 - R * fieldScale), round(180 - R * fieldScale)]
  const field = clearBox(fx, fy, fieldScale)
  const ramp = grid(16, 10, 45, 39, 58).map(([cx, cy], index) => {
    const t = Math.max(0, Math.min(1, ((index % 16) / 15) * 1.25 - (Math.floor(index / 16) / 9) * 0.35))
    return { cx, cy, r: round(Math.max(1.6, t * 58 * 0.4545)), colour: 'midnight' }
  })
  const signal = grid(24, 15, 20, 20, 40).map(([cx, cy], index) => {
    const u = (index % 24) / 24
    const v = Math.floor(index / 24) / 15
    const wave = (Math.sin(u * 7.2 + 1.3) + Math.cos(v * 5.1 + 0.4) + Math.sin((u + v) * 4 + 2.1)) / 3
    return { cx, cy, r: round(Math.max(1.2, ((wave + 1) / 2) ** 1.6 * 40 * 0.4545)), colour: 'ice' }
  })
  return [
    pattern('dot-network', 'a data path through the field', 'midnight', {
      dots: [
        ...grid(15, 9, 60, 60, step).filter(([cx, cy]) => outside(cx, cy, 3, network)).map(([cx, cy]) => ({ cx, cy, r: 3, colour: 'ice', opacity: 0.45 })),
        ...NETWORK_PATH.map(([cx, cy]) => ({ cx, cy, r: 7, colour: 'white' }))
      ],
      lines: [{ points: NETWORK_PATH, colour: 'white', width: 2 }],
      place: [{ x: nx, y: 64, scale, colour: 'white' }]
    }),
    pattern('dot-field', 'six-dot symbol given room in a field', 'off-white', {
      dots: grid(15, 9, 60, 60, step).filter(([cx, cy]) => outside(cx, cy, 3.5, field)).map(([cx, cy]) => ({ cx, cy, r: 3.5, colour: 'midnight', opacity: 0.45 })),
      place: [{ x: fx, y: fy, scale: fieldScale, colour: 'midnight' }]
    }),
    pattern('dot-ramp', 'dot size as a gradient', 'ice', { dots: ramp }),
    pattern('dot-signal', 'halftone data surface', 'midnight', { dots: signal })
  ]
}

// --- Templates, in the applications' terms: Inter Display headlines at -0.04 em, Space Mono labels
// at +0.12 em, the logo never smaller than 220 px wide.

const template = (id, label, group, width, height, elements, { description, ...extra }) => ({
  id, label, group, width, height, ...extra,
  title: `{name} / ${label.toLowerCase()}`,
  description: `${description} Part of the proposed v2.3. Text is live and editable.`,
  extension: EXTENSION,
  elements
})
const text = (id, value, x, y, size, extra = {}) => ({ type: 'text', ...(id ? { id } : { locked: true }), text: value, x, y, size, colour: 'ink', ...extra })
const display = (id, value, x, y, size, extra = {}) => text(id, value, x, y, size, { font: 'display', tracking: round(-0.04 * size), ...extra })
const label = (id, value, x, y, size, extra = {}) => text(id, value, x, y, size, { font: 'label', tracking: round(0.12 * size, 1), ...extra })
const headline = (id, value, x, y, width, size, extra = {}) => ({ type: 'paragraph', id, text: value, x, y, width, size, leading: round(size * 1.04), colour: 'ink', font: 'display', tracking: round(-0.04 * size), ...extra })
const logo = (x, y, width, colour = 'ink') => ({ type: 'logo', x, y, width, colour })
const rule = (x1, y, x2) => ({ type: 'path', d: `M${x1} ${y}H${x2}`, stroke: 'rule', strokeWidth: 1 })
const dots = (list, fill, extra = {}) => ({ type: 'dots', dots: list, fill, ...extra })

// The dot-matrix numerals: a 3 x 5 grid per digit, unlit dots kept visible.
const GLYPHS = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001001001', 8: '111101111101111', 9: '111101111001111' }
const numerals = (digits, x, y, cell) => {
  const lit = []
  const unlit = []
  ;[...digits].forEach((digit, k) => [...GLYPHS[digit]].forEach((bit, i) => (bit === '1' ? lit : unlit).push([round(x + (k * 4 + (i % 3)) * cell + cell / 2), round(y + Math.floor(i / 3) * cell + cell / 2), round(cell * 0.4545)])))
  return { lit, unlit }
}

const templates = () => {
  const figure = numerals('03', 120, 300, 70)
  const ramp = grid(13, 5, 120, 660, 70).map(([cx, cy], index) => [cx, cy, round(Math.max(2, ((index % 13) / 12) * 30))])
  const signal = patterns()[3].dots.filter(({ cx }) => cx < 900).map(({ cx, cy, r }) => [cx, round(cy * 0.66), round(r * 0.66)])
  const share = (x, y) => [round(x * 0.62 + 600), round(y * 0.62 + 120)]
  const workshop = [0, 1, 2].flatMap((column) => grid(7, 11, 150 + column * 450, 330, 60).map(([cx, cy]) => [cx, cy, 4]))
  return [
    template('slide-title', 'Title slide', 'Presentations', 1920, 1080, [
      { type: 'background', fill: 'paper' },
      { type: 'motif', id: 'slide-motif', x: 1180, y: -260, width: 980, height: 980, colour: 'primary', align: 'right' },
      logo(120, 110, 320),
      label('slide-meta', '[WORKSHOP · DATE]', 120, 740, 30, { colour: 'muted' }),
      headline('slide-title', 'From insight to impact.', 120, 840, 980, 104)
    ], { physical: ['1920', '1080'], raster: 1920, description: 'A title slide: the logo, an event line and a headline, with the six-dot motif cropped at the edge.' }),
    template('slide-finding', 'Finding slide', 'Presentations', 1920, 1080, [
      { type: 'background', fill: 'primary' },
      label('finding-number', '[FINDING 02 / 05]', 120, 140, 22, { colour: 'light' }),
      dots(figure.unlit, 'light', { opacity: 0.16 }),
      dots(figure.lit, 'paper'),
      label(null, 'THREE DISCIPLINES', 120, 720, 22, { colour: 'light' }),
      headline('finding-statement', '[One sentence that states the finding.]', 1000, 420, 800, 64, { colour: 'reverse' }),
      logo(120, 930, 220, 'reverse'),
      text('contact-website', '[Website]', 1800, 958, 22, { colour: 'light', anchor: 'end' })
    ], { physical: ['1920', '1080'], raster: 1920, description: 'One finding per slide: a dot-matrix figure and the sentence that explains it.' }),
    template('social-insight', 'Insight card', 'Social', 1080, 1080, [
      { type: 'background', fill: 'primary' },
      dots(ramp, 'light', { opacity: 0.12 }),
      logo(80, 90, 300, 'reverse'),
      label(null, DESCRIPTOR.toUpperCase(), 80, 370, 24, { colour: 'light' }),
      headline('social-headline', 'Let’s connect the dots.', 80, 470, 900, 96, { colour: 'reverse' })
    ], { physical: ['1080', '1080'], raster: 1080, description: 'A square post for one line, with a ramp of dots below it.' }),
    template('social-divider', 'Section divider', 'Social', 1080, 1080, [
      { type: 'background', fill: 'light' },
      label('section-label', '[SECTION 02]', 80, 130, 26, { colour: 'primary' }),
      { type: 'symbol', id: 'divider-symbol', x: 660, y: 330, height: 300, colour: 'primary' },
      display('section-title', '[Design]', 80, 960, 132, { colour: 'primary' })
    ], { physical: ['1080', '1080'], raster: 1080, description: 'A section divider for a carousel or a talk: a label, the complete symbol with room around it, and one word.' }),
    template('brief-cover', 'Project brief', 'Documents', 794, 1123, [
      { type: 'background', fill: 'reverse' },
      logo(62, 62, 220),
      label(null, 'PROJECT BRIEF', 62, 250, 13, { colour: 'muted' }),
      headline('brief-title', '[The question we are answering]', 62, 310, 640, 44),
      ...[['brief-client', 'CLIENT'], ['brief-question', 'QUESTION'], ['brief-people', 'PEOPLE INVOLVED'], ['brief-information', 'INFORMATION WE HAVE'], ['brief-decision', 'DECISION IT INFORMS'], ['brief-date', 'DATE']].flatMap(([id, name], index) => {
        const y = 520 + index * 64
        return [rule(62, y, 732), label(null, name, 62, y + 34, 12, { colour: 'muted' }), text(id, '[ ]', 732, y + 34, 15, { anchor: 'end' })]
      }),
      rule(62, 904, 732),
      { type: 'symbol', id: 'brief-symbol', x: 668, y: 1000, height: 64, colour: 'primary' }
    ], { physical: ['210mm', '297mm'], raster: 1588, description: 'The cover of a project brief: the question, and who and what it involves.' }),
    template('workshop-canvas', 'Workshop canvas', 'Documents', 1587, 1123, [
      { type: 'background', fill: 'reverse' },
      display('workshop-title', 'Connection map', 110, 150, 64),
      text(null, 'Place a sticky note on a dot. Draw a line wherever one thing depends on another.', 110, 200, 22, { colour: 'muted' }),
      { type: 'symbol', id: 'workshop-symbol', x: 1380, y: 80, height: 100, colour: 'primary' },
      ...['01 / PEOPLE', '02 / INFORMATION', '03 / DECISIONS'].map((name, column) => label(null, name, 140 + column * 450, 290, 18, { colour: 'muted' })),
      ...[1, 2].map((column) => ({ type: 'path', d: `M${110 + column * 450} 270V1000`, stroke: 'light', strokeWidth: 2, dash: '2 10' })),
      dots(workshop, 'light'),
      label('workshop-team', '[TEAM]', 110, 1070, 16, { colour: 'muted' }),
      label('workshop-date', '[DATE]', 1477, 1070, 16, { colour: 'muted', anchor: 'end' })
    ], { physical: ['420mm', '297mm'], raster: 2400, description: 'A printable A3 sheet for mapping how people, information and decisions connect.' }),
    template('share-image', 'Share image', 'Web', 1200, 630, [
      { type: 'background', fill: 'paper' },
      dots(grid(15, 9, 60, 60, 60).filter(([x, y]) => x <= 600 || y >= 300).map(([x, y]) => [...share(x, y), 2]), 'muted', { opacity: 0.45 }),
      { type: 'polyline', points: NETWORK_PATH.map(([x, y]) => share(x, y)), stroke: 'primary', strokeWidth: 2 },
      dots(NETWORK_PATH.map(([x, y]) => [...share(x, y), 5]), 'primary'),
      logo(80, 380, 300),
      display('share-line', 'Built for what’s next.', 80, 520, 52)
    ], { physical: ['1200', '630'], raster: 1200, description: 'The image a link shows when the website is shared.' }),
    template('linkedin-banner', 'LinkedIn banner', 'Social', 1584, 396, [
      { type: 'background', fill: 'primary' },
      dots(signal, 'light', { opacity: 0.16 }),
      display('banner-line', DESCRIPTOR, 80, 220, 56, { colour: 'reverse' }),
      logo(1224, 172, 280, 'reverse')
    ], { physical: ['1584', '396'], raster: 1584, description: 'A profile banner: the descriptor over a data surface, the logo clear of it.' })
  ]
}

// --- Icons, drawn with the kit's own icon attributes on its 64-unit grid.

const dot = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="3" fill="currentColor" stroke="none"/>`
const icons = [
  { id: 'dataset', content: '<ellipse cx="32" cy="15" rx="19" ry="6.5"/><path d="M13 15V49C13 52.6 21.5 55.5 32 55.5S51 52.6 51 49V15M13 32C13 35.6 21.5 38.5 32 38.5S51 35.6 51 32"/>' },
  { id: 'layers', content: '<path d="M32 10L54 22L32 34L10 22Z"/><path d="M10 32L32 44L54 32M10 42L32 54L54 42"/>' },
  { id: 'link', content: `<circle cx="16" cy="32" r="6.5"/><circle cx="48" cy="32" r="6.5"/><path d="M22.5 32H41.5"/>${dot(32, 32)}` },
  { id: 'compass', content: `<circle cx="32" cy="34" r="22"/><path d="M40 26L35 37L24 42L29 31Z"/>${dot(32, 5)}` },
  { id: 'lens', content: `<circle cx="27" cy="27" r="17"/><path d="M39 39L54 54"/>${dot(21, 27)}${dot(27, 27)}${dot(33, 27)}` }
].map((item) => ({ ...item, extension: EXTENSION }))

// --- Guide pages: 1440 x 1020, content between y 250 and 960.

const g = {
  label: (value, x, y, colour) => ({ type: 'label', text: value, x, y, ...(colour ? { colour } : {}) }),
  text: (value, x, y, size, extra = {}) => ({ type: 'text', text: value, x, y, size, ...extra }),
  para: (value, x, y, width, size, extra = {}) => ({ type: 'para', text: value, x, y, width, size, ...extra }),
  rect: (x, y, width, height, fill, extra = {}) => ({ type: 'rect', x, y, width, height, fill, ...extra }),
  path: (d, extra) => ({ type: 'path', d, ...extra }),
  dots: (list, fill, extra = {}) => ({ type: 'path', d: dotsPath(list), fill, ...extra })
}
const page = (title, name, subtitle, elements) => ({ title, name, subtitle, extension: EXTENSION, elements })

const guidePages = () => {
  const columns = [['D', 'Data', 'Organize what exists, find the patterns, show what matters.'], ['D', 'Design', 'Turn findings into interfaces, tools and documents people use.'], ['C', 'Connection', 'Link people, information and decisions into a next step.']]
  const reading = page('Data, design, connection.', 'Reading the name', 'A proposal for v2.3: the three focus areas spell the wordmark. The logo itself does not change.', [
    ...columns.flatMap(([letter, word, line], index) => {
      const x = 64 + index * 448
      return [g.path(`M${x} 290H${x + 400}`, { stroke: 'ink' }), g.text(letter, x, 420, 120, { font: 'display', colour: 'primary', tracking: -0.04 }), g.text(word, x, 486, 34, { font: 'display', tracking: -0.04 }), g.para(line, x, 530, 380, 20)]
    }),
    { type: 'rule', y: 640 },
    g.label('DESCRIPTOR', 64, 700),
    g.text('{copy.descriptor}', 64, 770, 44, { font: 'display', tracking: -0.04 }),
    g.para('Used as a quiet secondary line, it explains the company without boxing it in. The six-dot symbol reads the same way: three dots of data, two of design, one connection.', 64, 830, 900, 20),
    { type: 'symbol', x: 1206, y: 700, height: 170, colour: 'primary' }
  ])

  const series = [['midnight', 'SERIES 1'], ['graphite', 'SERIES 2'], ['black', 'SERIES 3']]
  const unit = [['DISCOVER', 6], ['DEVELOP', 14], ['DELIVER', 8]]
  const plot = [['A', 30, 72], ['B', 44, 58], ['C', 22, 81], ['D', 61, 66]]
  const px = (value) => 900 + value * 4.4
  const numeralDots = numerals('0123456789', 64, 870, 14)
  const data = page('A data language.', 'A data language', 'Charts in the brand’s own order, with dots as the mark. The figures below are illustrative data.', [
    g.label('SERIES, IN ORDER', 64, 280),
    ...series.flatMap(([key, name], index) => [g.rect(64 + index * 150, 300, 130, 90, key), g.label(name, 64 + index * 150, 420)]),
    g.rect(514, 300, 130, 90, 'ice', { stroke: 'midnight' }), g.label('CONTEXT ONLY', 514, 420),
    g.label('SEQUENTIAL RAMP', 720, 280),
    ...[100, 85, 70, 55, 40, 25, 10].flatMap((percent, index) => [g.rect(720 + index * 93, 300, 85, 90, 'midnight', { opacity: percent / 100 }), g.label(`${percent}%`, 720 + index * 93, 420)]),
    g.label('UNIT CHART · ILLUSTRATIVE DATA', 64, 490),
    ...unit.flatMap(([name, count], row) => {
      const y = 530 + row * 52
      const all = Array.from({ length: 20 }, (_, i) => [214 + i * 22, y, 8])
      return [g.label(name, 64, y + 5), g.dots(all.slice(0, count), 'midnight'), g.path(dotsPath(all.slice(count)), { stroke: 'ice' })]
    }),
    g.label('CONNECTED DOT PLOT · ILLUSTRATIVE DATA', 760, 490),
    ...plot.flatMap(([name, before, after], row) => {
      const y = 530 + row * 40
      return [g.label(`GROUP ${name}`, 760, y + 5), g.path(`M${px(before)} ${y}H${px(after)}`, { stroke: 'midnight' }), g.path(dotsPath([[px(before), y, 6]]), { fill: 'ice', stroke: 'midnight' }), g.dots([[px(after), y, 8]], 'midnight')]
    }),
    g.label('DOT-MATRIX NUMERALS', 64, 850),
    g.dots(numeralDots.unlit, 'line'), g.dots(numeralDots.lit, 'midnight'),
    { type: 'list', x: 760, y: 750, step: 52, detailX: 920, right: 1376, rows: [['HIGHLIGHT', 'Midnight for the key point, ice for the rest.'], ['CATEGORIES', 'Midnight, graphite, black. Three at most.'], ['ICE', 'Context only, outlined in midnight.'], ['BIG NUMBERS', 'Dot numerals for one hero figure.']] }
  ])

  // Four frames of the motion library, drawn still: the field, the path, the loader and the fill.
  const frame = (x, y, art, name) => [g.rect(x, y, 296, 197, 'paper', { stroke: 'line' }), ...art, g.label(name, x, y + 230)]
  const fx = (x, ox) => round(ox + x * 0.9867)
  const fy = (y, oy) => round(oy + y * 0.985)
  const motion = page('Motion.', 'Motion', 'Motion lives in fields, paths and loaders. The logo and the complete symbol never move, fade or pulse.', [
    ...[['FIELDS, PATHS AND LOADERS MOVE', 'Motion belongs to the supporting dots.'], ['THE LOGO NEVER MOVES', 'On screen, still, from the first frame.'], ['REDUCED MOTION SHOWS THE END', 'Every study shows its final frame.']].flatMap(([name, line], index) => [g.label(name, 64 + index * 448, 290), g.para(line, 64 + index * 448, 326, 400, 20)]),
    { type: 'specTable', x: 64, y: 430, right: 640, step: 56, rows: [['Quick', '200 ms'], ['Base', '600 ms'], ['Slow', '1200 ms'], ['Draw', '1800 ms'], ['Stagger', '20–30 ms'], ['Loader step', '200 ms'], ['Settle', 'cubic-bezier(.2,.7,.2,1)'], ['Move', 'cubic-bezier(.6,0,.2,1)']] },
    ...frame(760, 400, [g.dots(grid(9, 5, 30, 40, 30).map(([x, y], index) => [fx(x, 760), fy(y, 400), round(2.5 + 5 * ((index % 9) / 8))]), 'midnight')], 'REVEAL'),
    ...frame(1080, 400, [g.dots(grid(7, 5, 30, 20, 40).map(([x, y]) => [fx(x, 1080), fy(y, 400), 2.4]), 'graphite', { opacity: 0.35 }), g.path(`M${[[30, 180], [110, 140], [150, 60], [230, 100], [270, 20]].map(([x, y]) => `${fx(x, 1080)} ${fy(y, 400)}`).join('L')}`, { stroke: 'midnight' }), g.dots([[30, 180], [110, 140], [150, 60], [230, 100], [270, 20]].map(([x, y], i) => [fx(x, 1080), fy(y, 400), i === 4 ? 9 : 5]), 'midnight')], 'CONNECT'),
    ...frame(760, 680, [g.dots([110, 150, 190].map((x) => [fx(x, 760), fy(100, 680), 14]), 'midnight')], 'THINK'),
    ...frame(1080, 680, [g.dots(Array.from({ length: 7 }, (_, i) => [fx(42 + i * 24, 1080), fy(92, 680), 8]), 'midnight'), g.path(dotsPath(Array.from({ length: 3 }, (_, i) => [fx(42 + (7 + i) * 24, 1080), fy(92, 680), 8])), { stroke: 'ice' })], 'FILL')
  ])

  const lines = [['Built for what’s next.', 'PRIMARY'], ['From insight to impact.', 'SOCIAL, PROPOSALS'], ['Let’s connect the dots.', 'CALLS TO ACTION'], ['{copy.descriptor}', 'DESCRIPTOR']]
  const voice = page('How it sounds.', 'Voice', 'Lines already in the kit and on the site, and the words that keep the positioning open.', [
    ...lines.flatMap(([line, use], index) => [g.text(line, 64, 320 + index * 66, 40, { font: 'display', tracking: -0.04 }), g.label(use, 1120, 312 + index * 66), { type: 'rule', y: 340 + index * 66 }]),
    g.label('SAY', 64, 620), g.label('AVOID', 760, 620),
    ...['We work with you on…', 'Find the connections', 'Make it clear, make it useful', 'Teams, partners, the people you serve'].map((line, index) => g.text(line, 64, 670 + index * 52, 24)),
    ...['Consultants, consultancy, agency', 'Leverage, synergy, solutions-driven', 'Invented stats or client names', 'Exclamation marks'].map((line, index) => g.text(line, 760, 670 + index * 52, 24))
  ])
  return [reading, data, motion, voice]
}

// --- The motion library and the brand-details page: templates filled with fonts, logo and data.

const fontFace = (family, weight, path, format) => `@font-face{font-family:${family};src:url('data:font/${format === 'woff2' ? 'woff2' : 'ttf'};base64,${readInput(new URL(path, root)).toString('base64')}') format('${format === 'woff2' ? 'woff2' : 'truetype'}');font-weight:${weight};font-display:swap}`
const FONTS = [fontFace('Inter', 400, 'fonts/web/Inter-Regular.woff2', 'woff2'), fontFace("'Inter Display'", 500, 'fonts/web/InterDisplay-Medium.woff2', 'woff2'), fontFace("'Space Mono'", 400, 'fonts/SpaceMono-Regular.ttf', 'ttf')].join('\n')
const art = lockup({ brand }, { family: 'ddcnorth', layout: 'horizontal', colour: 'currentColor' })
const LOGO = `<svg class="brand-logo-art" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(art.width)} ${n(art.height)}" width="220" height="${n(220 * art.height / art.width)}" role="img" aria-label="ddcnorth">${art.art}</svg>`

const motionFiles = {
  'motion/index.html': motionPage(readInput(new URL('motion-library.template.html', here)).toString('utf8'), { fonts: FONTS, logo: LOGO, logoInner: art.art }),
  'motion/motion.css': motionCss(),
  'motion/motion-tokens.json': motionTokens(),
  'motion/README.md': motionReadme()
}
const details = fillTemplate(readInput(new URL('brand-details.template.html', here)).toString('utf8'), { FONTS, LOGO, LAB_JSON: JSON.stringify({ label: 'Brand details · v2.3' }) })

// --- The revision.

const revision = {
  id: ID,
  title: 'Data, design, connection',
  version: '2.3-data-design-connection',
  displayVersion: '2.3',
  status: 'proposed',
  date: '2026-10-22',
  summary: 'The descriptor Data · Design · Connection, four more pattern families on the symbol’s grid, a data language, eight templates for the work itself, five supporting icons, guide pages for the name, data, motion and voice, and a motion library. The logo and symbol do not change.',
  rationale: [
    'The company works across data, design and the connections between them. The three words describe it without the narrower label of a consultancy, and they happen to spell the wordmark.',
    'The kit covers stationery, signs and vehicles; the new templates cover the work itself: findings, briefs, workshops and the images a website and profiles need.',
    'Patterns, charts and motion are all built from the symbol’s own dots and grid, so they extend the identity without changing it. A complete symbol always keeps one dot diameter clear.',
    'Motion lives in fields, paths and loaders. The logo and the complete symbol never move, fade or pulse, and reduced motion shows the final frame.'
  ],
  changes: {
    copy: { descriptor: DESCRIPTOR },
    guide: { frame: { footer: 'SIX-DOT IDENTITY / DATA, DESIGN, CONNECTION / PROPOSED 22 OCTOBER 2026' }, pages: { $append: guidePages() } },
    patterns: { $append: patterns() },
    templates: { $append: templates() },
    sets: { $append: [{ id: 'insight-slides', label: 'Insight slides', variants: [{ template: 'slide-title', label: 'Title' }, { template: 'slide-finding', label: 'Finding' }] }] },
    icons: { items: { $append: icons } },
    files: { $append: [...Object.keys(motionFiles), { to: 'guidelines/brand-details.html', from: 'docs/brand-details.html' }] },
    motion: motionEntry()
  }
}

brand.revisions = [...(brand.revisions ?? []).filter((entry) => entry.id !== ID), revision]
mkdirSync(new URL('motion/', root), { recursive: true })
for (const [path, content] of Object.entries(motionFiles)) writeFileSync(new URL(path, root), content)
writeFileSync(new URL('docs/brand-details.html', root), details)
writeFileSync(file, `${JSON.stringify(brand, null, 2)}\n`)
console.log(`ddcnorth v2.3 (proposed): ${revision.changes.templates.$append.length} templates, ${revision.changes.patterns.$append.length} patterns, ${icons.length} icons, ${revision.changes.guide.pages.$append.length} guide pages, ${revision.changes.motion.studies.length} motion studies`)
