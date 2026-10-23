// Supporting graphic directions, shared by standalone patterns and real applications.
// Signal uses the source arrow's vertices. Connections and Layers refer to the lab's work:
// joining ideas and people, and building material a layer at a time. None alters the logo.
import { readFileSync } from 'node:fs'
import { pattern } from '../../src/engine/artwork.js'
import { renderTemplate, scopeIds } from '../../src/engine/templates.js'
import { escape } from '../../src/engine/format.js'
import { arrowGeometry, arrowPanel, arrowPatterns } from './sparklab-arrows.mjs'

const round = (n) => Math.round(n * 100) / 100
const themes = {
  dark: { background: 'navy', line: 'navy-light', secondary: 'slate', accent: 'orange', node: 'cream' },
  light: { background: 'cream', line: 'navy-pale', secondary: 'slate', accent: 'orange', node: 'navy' }
}

// Clip supporting line work to its panel, so it cannot wander into neighbouring text.
const segment = (a, b, width, height) => {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  let low = 0, high = 1
  for (const [p, q] of [[-dx, a[0]], [dx, width - a[0]], [-dy, a[1]], [dy, height - a[1]]]) {
    if (p === 0) { if (q < 0) return null; continue }
    const t = q / p
    if (p < 0) low = Math.max(low, t)
    else high = Math.min(high, t)
    if (low > high) return null
  }
  return [[round(a[0] + low * dx), round(a[1] + low * dy)], [round(a[0] + high * dx), round(a[1] + high * dy)]]
}
const clip = (points, width, height) => {
  const lines = []
  for (let i = 1; i < points.length; i++) {
    const part = segment(points[i - 1], points[i], width, height)
    if (!part) continue
    const prev = lines.at(-1)
    if (prev && prev.at(-1).every((v, k) => v === part[0][k])) prev.push(part[1])
    else lines.push(part)
  }
  return lines
}
const line = (points, colour, width = 2, opacity = 1) => ({ points, colour, width, ...(opacity < 1 ? { opacity } : {}) })

export const signal = (logo, width = 960, height = 600, theme = 'dark') => {
  const c = themes[theme], coords = logo.arrow.match(/-?\d+(?:\.\d+)?/g).map(Number)
  const vertices = Array.from({ length: coords.length / 2 }, (_, i) => [coords[i * 2], coords[i * 2 + 1]])
  const lines = []
  for (let i = 0; i < 12; i++) {
    const scale = Math.min(width, height) / 338.18 * (.48 + i * .42)
    const points = [...vertices, vertices[0]].map(([x, y]) => [width * .48 + (x - 85) * scale, height * .65 + (y - 245) * scale])
    for (const part of clip(points, width, height)) lines.push(line(part, i === 3 ? c.accent : c.secondary, i === 3 ? 5 : 1.5, i === 3 ? 1 : theme === 'dark' ? .9 : .35))
  }
  lines.sort((a, b) => Number(a.colour === c.accent) - Number(b.colour === c.accent))
  return { width, height, background: c.background, lines }
}

export const connections = (width = 960, height = 600, theme = 'dark') => {
  const c = themes[theme], lines = [], dots = []
  const pitch = Math.min(width / 12, height / 8)
  for (let x = pitch / 2; x < width; x += pitch) for (let y = pitch / 2; y < height; y += pitch) {
    lines.push(line([[round(x - 3), round(y)], [round(x + 3), round(y)]], c.line, 1))
    lines.push(line([[round(x), round(y - 3)], [round(x), round(y + 3)]], c.line, 1))
  }
  const routes = [
    [[-.05, .8], [.2, .8], [.38, .51], [.65, .51], [.84, .2], [1.05, .2]],
    [[-.05, .27], [.19, .27], [.38, .58], [.66, .58], [.84, .87], [1.05, .87]],
    [[.3, -.08], [.3, .13], [.48, .42], [.79, .42], [.98, .11]],
    [[.15, 1.08], [.15, .94], [.33, .65], [.58, .65], [.76, .94], [.76, 1.08]]
  ]
  routes.forEach((route, i) => {
    const points = route.map(([x, y]) => [round(x * width), round(y * height)])
    for (const part of clip(points, width, height)) lines.push(line(part, i === 0 ? c.accent : c.secondary, i === 0 ? 4 : 1.5, i === 0 ? 1 : .55))
    for (const [j, [cx, cy]] of points.entries()) if (cx > 12 && cx < width - 12 && cy > 12 && cy < height - 12) dots.push({ cx, cy, r: i === 0 ? j === 4 ? 11 : 6 : 3, colour: i === 0 ? c.accent : c.secondary })
  })
  // Art is drawn as lines then dots in templates; the engine's patterns draw dots first. The
  // nodes are intentionally solid, so either order preserves the junctions and their colour.
  return { width, height, background: c.background, lines, dots }
}

export const layers = (width = 960, height = 600, theme = 'dark') => {
  const c = themes[theme], lines = []
  const angle = -.35, ca = Math.cos(angle), sa = Math.sin(angle)
  for (let ring = 0; ring < 18; ring++) {
    const radius = Math.min(width, height) * (.12 + ring * .035)
    const points = Array.from({ length: 97 }, (_, i) => {
      const t = i / 96 * Math.PI * 2
      const shape = 1 + .18 * Math.cos(3 * t + .4) + .07 * Math.sin(5 * t)
      const x = radius * shape * Math.cos(t) * 1.28
      const y = radius * shape * Math.sin(t) * .76
      return [round(width * .62 + x * ca - y * sa), round(height * .55 + x * sa + y * ca)]
    })
    for (const part of clip(points, width, height)) lines.push(line(part, ring === 6 ? c.accent : c.secondary, ring === 6 ? 5 : 1.25, ring === 6 ? 1 : theme === 'dark' ? .95 : .38))
  }
  return { width, height, background: c.background, lines }
}

// Place the very same geometry on a template, preserving proportions by constructing each panel
// at its intended size rather than stretching a finished pattern or rasterising it.
const panel = (spec, x, y, prefix) => [
  { type: 'rect', id: `${prefix}-ground`, x, y, width: spec.width, height: spec.height, fill: spec.background },
  ...spec.lines.map((l, i) => ({ type: 'polyline', id: `${prefix}-line-${i}`, points: l.points.map(([px, py]) => [round(x + px), round(y + py)]), stroke: l.colour, strokeWidth: l.width, ...(l.opacity ? { opacity: l.opacity } : {}) })),
  ...(spec.dots?.length ? [{ type: 'dots', id: `${prefix}-nodes`, fill: 'orange', dots: spec.dots.filter(d => d.colour === 'orange').map(d => [round(x + d.cx), round(y + d.cy), d.r]) }, { type: 'dots', id: `${prefix}-secondary-nodes`, fill: 'slate', dots: spec.dots.filter(d => d.colour !== 'orange').map(d => [round(x + d.cx), round(y + d.cy), d.r]) }] : [])
]
const bg = (fill = 'cream') => ({ type: 'background', fill })
const rect = (id, x, y, width, height, fill) => ({ type: 'rect', id, x, y, width, height, fill })
const logoAt = (x, y, width, colourway = 'positive') => ({ type: 'logo', x, y, width, signature: 'horizontal', colourway })
const text = (id, value, x, y, size, colour = 'navy', extra = {}) => ({ type: 'text', id, text: value, x, y, size, colour, font: 'displayRegular', ...extra })
const label = (value, x, y, colour = 'slate', size = 16, extra = {}) => ({ type: 'text', text: value, x, y, size, colour, font: 'label', tracking: size * .1, locked: true, ...extra })
const title = (id, value, x, y, width, size, colour = 'navy', maxLines = 3) => ({ type: 'paragraph', id, text: value, x, y, width, size, leading: size * 1.04, font: 'display', colour, maxLines })
const para = (id, value, x, y, width, size = 24, colour = 'slate', maxLines = 3) => ({ type: 'paragraph', id, text: value, x, y, width, size, leading: size * 1.4, font: 'body', colour, maxLines })
const rule = (x1, x2, y, stroke = 'navy-pale') => ({ type: 'line', x1, x2, y1: y, y2: y, stroke, strokeWidth: 1.5 })
const footer = (width, y, colour = 'slate') => [label('SPARKLAB.UNBC.CA', 64, y, colour, 14), label('UNBC / PRINCE GEORGE', width - 64, y, colour, 14, { anchor: 'end' })]

export const DIRECTIONS = [
  { id: 'arrows', name: 'Arrows', subtitle: 'One arrow. Many possibilities.', description: 'The source arrow repeats at small, medium and oversized scales. Mix eight directions in a modular grid, scatter arrows freely, follow crossing streams or combine the arrow with the original spark. Try the interactive explorer for scale, density and colour controls.', patterns: ['arrows-micro', 'arrows-rows', 'arrows-directions', 'arrows-scatter', 'arrows-currents', 'arrows-spark-mix', 'arrows-orbit', 'arrows-constellation', 'arrows-crops', 'arrows-mixed', 'arrows-inward', 'arrows-pinwheel'], templates: ['open-lab-directions', 'project-currents', 'workshop-arrows', 'presentation-arrows'] },
  { id: 'signal', name: 'Signal', subtitle: 'Make an announcement.', description: 'The original arrow becomes a set of expanding outlines. A single orange contour gives the field a point of focus. Best for workshops, open sessions and short headlines.', patterns: ['signal', 'signal-light'], templates: ['workshop-signal', 'open-lab-signal'] },
  { id: 'connections', name: 'Connections', subtitle: 'Show how an idea develops.', description: 'Routes cross a quiet registration grid and meet at visible junctions. Use it for research, collaboration, project stories and working documents.', patterns: ['connections', 'connections-light'], templates: ['project-connections', 'presentation-connections', 'lab-notes'] },
  { id: 'layers', name: 'Layers', subtitle: 'Let the material lead.', description: 'Nested contours suggest toolpaths, sections and additive manufacturing. The irregular shape gives covers and small printed pieces a softer, more tactile character.', patterns: ['layers', 'layers-light'], templates: ['project-cover-layers', 'presentation-layers', 'business-card-layers'] }
]

export const createApplications = (logo) => {
  const arrow = arrowGeometry(logo)
  const patterns = [
    ...arrowPatterns(logo),
    { ...signal(logo), id: 'signal', name: 'Signal / navy', title: '{name} / Signal / arrow echoes on navy' },
    { ...signal(logo, 960, 600, 'light'), id: 'signal-light', name: 'Signal / cream', title: '{name} / Signal / arrow echoes on cream' },
    { ...connections(), id: 'connections', name: 'Connections / navy', title: '{name} / Connections / routes and junctions on navy' },
    { ...connections(960, 600, 'light'), id: 'connections-light', name: 'Connections / cream', title: '{name} / Connections / routes and junctions on cream' },
    { ...layers(), id: 'layers', name: 'Layers / navy', title: '{name} / Layers / fabrication contours on navy' },
    { ...layers(960, 600, 'light'), id: 'layers-light', name: 'Layers / cream', title: '{name} / Layers / fabrication contours on cream' }
  ]
  const templates = [
    { id: 'open-lab-directions', label: 'Arrows / all directions post', group: 'Arrows', description: 'Square announcement with arrows in eight directions and three sizes. The complete logo and editable session details sit on clear cream panels.', title: '{name} / All directions / 1080 × 1080', width: 1080, height: 1080, raster: 1080, elements: [
      bg(), logoAt(64, 52, 340), ...arrowPanel(arrow, 'directions', 1080, 430, 0, 160, 'directions'),
      label('OPEN LAB / BRING YOUR CURIOSITY', 64, 650, 'slate', 18), title('session-title', '[Session title]', 64, 762, 950, 88, 'navy', 2),
      rule(64, 1016, 934, 'orange'), text('session-details', '[Date] · [Time] · [Location]', 64, 984, 28), ...footer(1080, 1040)
    ] },
    { id: 'project-currents', label: 'Arrows / cross currents story', group: 'Arrows', description: 'Portrait project story with alternating arrow streams. Use the clear information area for a project title and a short summary.', title: '{name} / Cross currents / 1080 × 1350', width: 1080, height: 1350, raster: 1080, elements: [
      bg('navy'), logoAt(64, 52, 340, 'reverse'), ...arrowPanel(arrow, 'currents', 1080, 460, 0, 190, 'currents', { palette: 'navy' }),
      label('MADE AT SPARK LAB / IDEAS IN MOTION', 64, 726, 'cream', 18), title('project-title', '[Project title]', 64, 842, 950, 82, 'cream', 2),
      para('project-summary', '[A question, an experiment, a new direction.]', 64, 1080, 930, 29, 'cream', 3), rule(64, 1016, 1240, 'orange'), ...footer(1080, 1292, 'cream')
    ] },
    { id: 'workshop-arrows', label: 'Arrows / workshop poster', group: 'Arrows', description: 'A3 poster with a repeat of three arrow sizes. Keep the workshop title and details on the clear lower panel.', title: '{name} / Arrows workshop / A3', width: 1123, height: 1587, physical: ['297mm', '420mm'], raster: 2246, elements: [
      bg(), logoAt(64, 48, 370), ...arrowPanel(arrow, 'mixed', 1123, 520, 0, 180, 'arrows'),
      label('WORKSHOP / SPARK LAB', 64, 780, 'slate', 23), title('event-title', '[Workshop title]', 64, 910, 980, 106, 'navy', 2),
      rule(64, 1059, 1190, 'orange'), text('event-date', '[Date] · [Time]', 64, 1278, 38), text('event-place', '[Location]', 64, 1344, 30),
      para('event-detail', '[What participants will make or learn.]', 64, 1410, 950, 27, 'slate', 2), ...footer(1123, 1515)
    ] },
    { id: 'presentation-arrows', label: 'Arrows / presentation', group: 'Arrows', description: 'A 16:9 cover with inward-pointing arrow clusters in two sizes. The complete logo and editable title occupy a clear navy panel. Included in PowerPoint.', title: '{name} / Arrows presentation / 16:9', width: 1920, height: 1080, raster: 1920, elements: [
      bg('navy'), ...arrowPanel(arrow, 'pinwheel', 720, 1080, 1200, 0, 'arrows', { palette: 'navy', density: 90 }),
      logoAt(96, 72, 480, 'reverse'), label('IDEAS / PEOPLE / POSSIBILITIES', 96, 380, 'cream', 23),
      title('deck-title', '[Presentation title]', 96, 526, 1000, 106, 'cream', 3), text('deck-subtitle', '[Presenter] · [Date]', 96, 926, 34, 'cream'),
      label('SPARKLAB.UNBC.CA', 96, 1004, 'cream', 18), rect('base-rule', 0, 1068, 1200, 12, 'orange')
    ] },
    { id: 'workshop-signal', label: 'Signal / workshop poster', group: 'Signal', description: 'A3 poster: arrow contours lead into a large, editable workshop title. Keep the headline to three short lines.', title: '{name} / Signal workshop / A3', width: 1123, height: 1587, physical: ['297mm', '420mm'], raster: 2246, elements: [
      bg('navy'), ...panel(signal(logo, 1123, 500), 0, 120, 'signal'), logoAt(64, 48, 370, 'reverse'),
      label('WORKSHOP / SPARK LAB', 64, 686, 'cream', 23), title('event-title', '[Workshop title]', 64, 824, 980, 112, 'cream', 3),
      rule(64, 1059, 1134, 'orange'), text('event-date', '[Date] · [Time]', 64, 1220, 40, 'cream'), text('event-place', '[Location]', 64, 1288, 32, 'cream'),
      para('event-detail', '[What participants will make or learn.]', 64, 1380, 950, 29, 'cream', 2), ...footer(1123, 1515, 'cream')
    ] },
    { id: 'open-lab-signal', label: 'Signal / open lab post', group: 'Signal', description: 'Square announcement with a large arrow field above the message. Use navy for the text and verify the session details before publishing.', title: '{name} / Signal open lab / 1080 × 1080', width: 1080, height: 1080, raster: 1080, elements: [
      bg(), ...panel(signal(logo, 1080, 432, 'light'), 0, 132, 'signal'), logoAt(64, 52, 340),
      label('OPEN LAB / EVERY IDEA STARTS SOMEWHERE', 64, 610, 'slate', 18), title('session-title', '[Session title]', 64, 730, 950, 94, 'navy', 2),
      rule(64, 1016, 908, 'orange'), text('session-details', '[Date] · [Time] · [Location]', 64, 960, 28), ...footer(1080, 1030)
    ] },
    { id: 'project-connections', label: 'Connections / project story', group: 'Connections', description: 'Portrait project story: the route diagram occupies its own panel, with the headline and summary kept on clear paper.', title: '{name} / Connections project / 1080 × 1350', width: 1080, height: 1350, raster: 1080, elements: [
      bg(), logoAt(64, 52, 340), ...panel(connections(1080, 470), 0, 188, 'connections'),
      label('MADE AT SPARK LAB / PROJECT NOTES', 64, 728, 'slate', 18), title('project-title', '[Project title]', 64, 846, 950, 82, 'navy', 3),
      para('project-summary', '[An idea, a prototype, a real-world solution.]', 64, 1130, 930, 29, 'slate', 2), rule(64, 1016, 1240), ...footer(1080, 1292)
    ] },
    { id: 'presentation-connections', label: 'Connections / presentation', group: 'Connections', description: 'A 16:9 presentation cover with a separate diagram panel, so large titles stay readable. Included in the editable PowerPoint layouts.', title: '{name} / Connections presentation / 16:9', width: 1920, height: 1080, raster: 1920, elements: [
      bg('navy'), ...panel(connections(660, 1080), 1260, 0, 'connections'), rect('divider', 1218, 0, 2, 1080, 'slate'), logoAt(96, 72, 480, 'reverse'),
      label('IDEA / PROTOTYPE / BUILD', 96, 386, 'cream', 24), title('deck-title', '[Presentation title]', 96, 526, 1040, 106, 'cream', 3),
      text('deck-subtitle', '[Presenter] · [Date]', 96, 926, 34, 'cream'), label('SPARKLAB.UNBC.CA', 96, 1004, 'cream', 18)
    ] },
    { id: 'lab-notes', label: 'Connections / lab notes', group: 'Connections', description: 'A printable A4 experiment sheet. A quiet dot grid supports notes without competing with the question, method or findings. Also available as a Word document.', title: '{name} / lab notes / A4', width: 794, height: 1123, physical: ['210mm', '297mm'], raster: 1588, elements: [
      bg(), { type: 'dots', fill: 'navy-pale', dots: Array.from({ length: 26 }, (_, row) => Array.from({ length: 27 }, (_, col) => [64 + col * 25, 330 + row * 25, 1])).flat() },
      logoAt(62, 44, 300), label('LAB NOTES', 62, 160, 'slate', 14), title('notes-title', '[Experiment / idea]', 62, 228, 670, 38, 'navy', 2),
      text('notes-date', '[Date]', 62, 298, 14), text('notes-maker', '[Name / team]', 732, 298, 14, 'navy', { anchor: 'end' }),
      label('01 / QUESTION', 62, 362, 'navy', 13), para('notes-question', '[What are you trying to find out?]', 62, 404, 670, 18, 'navy', 3),
      label('02 / TRY', 62, 558, 'navy', 13), para('notes-method', '[Materials, settings and steps]', 62, 600, 670, 18, 'navy', 5),
      label('03 / LEARN', 62, 816, 'navy', 13), para('notes-findings', '[What changed? What happens next?]', 62, 858, 670, 18, 'navy', 4),
      rule(62, 732, 1020), ...footer(794, 1070)
    ] },
    { id: 'project-cover-layers', label: 'Layers / project cover', group: 'Layers', description: 'A4 project cover with a fabrication contour panel and a clear information area. The Word report pairs it with the editable project brief.', title: '{name} / Layers project cover / A4', width: 794, height: 1123, physical: ['210mm', '297mm'], raster: 1588, elements: [
      bg(), logoAt(62, 44, 300), ...panel(layers(794, 430), 0, 186, 'layers'), label('PROJECT / SPARK LAB', 62, 680, 'slate', 15),
      title('project-title', '[Project title]', 62, 772, 670, 57, 'navy', 2), para('project-deck', '[What this project sets out to make possible.]', 62, 926, 670, 21, 'slate', 2),
      text('project-lead', '[Project lead] · [Date]', 62, 1036, 15), label('SPARKLAB.UNBC.CA', 62, 1082, 'slate', 12)
    ] },
    { id: 'presentation-layers', label: 'Layers / presentation', group: 'Layers', description: 'A 16:9 cover with a material contour panel. Suits research, prototyping and design presentations; available in PowerPoint.', title: '{name} / Layers presentation / 16:9', width: 1920, height: 1080, raster: 1920, elements: [
      bg(), ...panel(layers(720, 1080), 1200, 0, 'layers'), logoAt(96, 72, 480), label('RESEARCH / DESIGN / MAKING', 96, 380, 'slate', 23),
      title('deck-title', '[Presentation title]', 96, 526, 1000, 106, 'navy', 3), text('deck-subtitle', '[Presenter] · [Date]', 96, 926, 34),
      label('SPARKLAB.UNBC.CA', 96, 1004, 'slate', 18), rect('base-rule', 0, 1068, 1200, 12, 'orange')
    ] },
    { id: 'business-card-layers', label: 'Business card, Layers front', group: 'Business cards', description: 'A patterned front for the existing card set. Pair it with the contact back; includes the same 90 × 50 mm trim and 3 mm bleed.', title: '{name} / Layers business card / 90 × 50 mm + 3 mm bleed', width: 960, height: 560, physical: ['96mm', '56mm'], raster: 1920, print: { trim: [90, 50], bleed: 3, unit: 'mm' }, elements: [
      bg('navy'), ...panel(layers(960, 560), 0, 0, 'layers'), rect('logo-quiet-zone', 60, 186, 500, 166, 'navy'), logoAt(82, 212, 444, 'reverse'),
      text('card-line', 'WHERE IDEAS TAKE SHAPE', 90, 458, 17, 'cream', { font: 'label', tracking: 1.3 }),
      { type: 'printGuides', colour: 'muted', trim: { id: 'trim', x: 30, y: 30, width: 900, height: 500 }, safe: { id: 'safe', x: 60, y: 60, width: 840, height: 440 } }
    ] }
  ]
  const guidePages = DIRECTIONS.map((d) => ({
    name: `${d.name} applications`, title: d.subtitle, subtitle: `${d.name} / Supporting graphics and editable applications.`,
    elements: [
      { type: 'nested', src: `patterns/${d.patterns[0]}`, x: 64, y: 292, width: 620, height: 387.5 },
      { type: 'nested', src: `patterns/${d.patterns[1]}`, x: 64, y: 710, width: 340, height: 212.5 },
      { type: 'nested', src: `templates/${d.templates[0]}`, x: 760, y: 292, width: 350, height: 500 },
      { type: 'para', text: d.id === 'arrows' ? 'Repeat the source arrow at small, medium or oversized scales. Use inward arrows for focal compositions. Keep the complete logo and text on a clear ground.' : d.id === 'signal' ? 'Use the arrow field as an announcement panel. Keep dates and long text on a clear ground.' : d.id === 'connections' ? 'The diagram is supporting artwork, not real project data. Keep routes separate from titles and information.' : 'The contours suggest a fabrication process, not measured topography. Keep the identifying logo complete and clear.', x: 760, y: 842, width: 590, size: 21, colour: 'slate', line: 1.4 }
    ]
  }))
  guidePages.push({ name: 'Directions and sparks', title: 'Every idea takes a direction.', subtitle: 'Mixed directions, varied scales and the original spark.', elements: [
    ...['directions', 'scatter', 'currents', 'spark-mix', 'orbit', 'constellation'].flatMap((id, i) => [
      { type: 'nested', src: `patterns/arrows-${id}`, x: 64 + i % 3 * 450, y: 264 + Math.floor(i / 3) * 300, width: 410, height: 256.25 },
      { type: 'text', text: ['ALL DIRECTIONS', 'LOOSE SCATTER', 'CROSS CURRENTS', 'ARROWS & SPARKS', 'ORBIT', 'SPARK CONSTELLATION'][i], x: 64 + i % 3 * 450, y: 552 + Math.floor(i / 3) * 300, size: 17, font: 'label', colour: 'slate' }
    ]),
    { type: 'para', text: 'Use one pattern family per surface. Choose a quiet repeat for small items and a larger field for covers. Keep the complete logo and small text on a clear ground.', x: 64, y: 902, width: 1260, size: 20, colour: 'slate', line: 1.3 }
  ] })
  return { patterns, templates, guidePages }
}

// A review board uses example titles, with operational details visibly left as placeholders.
// The actual templates retain their bracketed defaults and editable fields in brand.json.
const EXAMPLES = {
  'open-lab-directions': { 'session-title': 'Every idea\nhas a direction.' },
  'project-currents': { 'project-title': 'Follow a question.\nFind a new way.', 'project-summary': 'Explore what happens when different ideas, skills and materials meet.' },
  'workshop-arrows': { 'event-title': 'Small ideas.\nBig possibilities.' },
  'presentation-arrows': { 'deck-title': 'Different ideas.\nOne meeting point.' },
  'workshop-signal': { 'event-title': 'From sketch\nto prototype' },
  'open-lab-signal': { 'session-title': 'Bring an idea.\nMake it real.' },
  'project-connections': { 'project-title': 'A small idea.\nA useful tool.', 'project-summary': 'A place to share the question, the process and what you learned.' },
  'presentation-connections': { 'deck-title': 'Ideas become\nconnections.' },
  'project-cover-layers': { 'project-title': 'Made one layer\nat a time.', 'project-deck': 'A working record of an idea becoming something tangible.' },
  'presentation-layers': { 'deck-title': 'What could\nwe make next?' },
  'lab-notes': { 'notes-title': 'Make. Test. Learn.' }
}

export const applicationsPage = (brand, fonts) => {
  const css = `*{box-sizing:border-box}body{margin:0;background:#FAF8F5;color:#122738;font:16px/1.55 Outfit,Arial,sans-serif}main,header,footer{width:min(1320px,calc(100% - 64px));margin:auto}header{padding:56px 0 28px;border-bottom:1px solid #E8EEF4}h1,h2{letter-spacing:-.045em;line-height:1.05}h1{font-size:clamp(48px,8vw,100px);margin:24px 0}h2{font-size:58px;margin:0 0 20px}h3{font-size:18px;margin:0 0 8px}.eyebrow{font-size:12px;letter-spacing:.13em;text-transform:uppercase}p{max-width:800px;color:#3A4F63}nav{display:flex;flex-wrap:wrap;gap:10px;margin-top:32px}button{font:inherit;cursor:pointer;border:1px solid #122738;border-radius:999px;background:transparent;color:#122738;padding:9px 18px}button[aria-pressed=true]{background:#122738;color:#FAF8F5}button:focus-visible,a:focus-visible{outline:3px solid #F85C14;outline-offset:4px}section{padding:64px 0;border-bottom:1px solid #E8EEF4}section[hidden]{display:none}.patterns{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:36px 0 44px}.templates{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px;align-items:start}.templates figure:only-child{max-width:500px}.art{border:1px solid #E8EEF4;border-radius:12px;overflow:hidden;background:#FFFFFF}.art svg{display:block;width:100%;height:auto}figure{margin:0;min-width:0}figcaption{padding:18px 0}figcaption p{font-size:14px;margin:8px 0 14px}.patterns button,figcaption button{font-size:13px;padding:7px 14px}footer{padding:32px 0 48px;font-size:13px}a{color:inherit;text-underline-offset:.25em}.note{font-size:13px} @media(max-width:760px){main,header,footer{width:calc(100% - 40px)}header{padding-top:36px}h2{font-size:44px}.patterns{grid-template-columns:1fr}.templates{grid-template-columns:1fr 1fr;gap:20px}}@media(max-width:480px){.templates{grid-template-columns:1fr}}`
  const font = readFileSync(new URL('../../brands/sparklab/fonts/Outfit-Regular.ttf', import.meta.url)).toString('base64')
  const figure = (id, name, svg, description = '') => `<figure data-file="${id}"><div class="art">${scopeIds(svg, `review-${id}`)}</div><figcaption><h3>${escape(name)}</h3>${description ? `<p>${escape(description)}</p>` : ''}<button type="button" data-download>Download preview SVG</button></figcaption></figure>`
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>SPARK Lab / Patterns and applications</title><style>@font-face{font-family:Outfit;src:url(data:font/ttf;base64,${font}) format('truetype');font-weight:400;font-display:swap}${css}</style></head><body><header><p class="eyebrow">SPARK LAB / PATTERNS & APPLICATIONS / V${escape(brand.displayVersion)}</p><h1>More ways<br>to make a spark.</h1><p>Four directions for the lab’s workshops, projects and everyday work. Compare the pattern colourways and see where each one is most useful.</p><p><a href="arrow-patterns.html">Explore repeating arrows: scale, density and colour ↗</a></p><p class="note">Titles shown below are design examples. Dates, times, names and locations remain placeholders. Editable originals are in the brand kit.</p><nav aria-label="Graphic directions"><button type="button" data-filter="all" aria-pressed="true">All directions</button>${DIRECTIONS.map(d => `<button type="button" data-filter="${d.id}" aria-pressed="false">${d.name}</button>`).join('')}</nav></header><main>${DIRECTIONS.map(d => `<section data-direction="${d.id}"><p class="eyebrow">${d.name}</p><h2>${d.subtitle}</h2><p>${d.description}</p><div class="patterns">${d.patterns.map(id => { const p = brand.patterns.find(p => p.id === id); return figure(id, p.name, pattern({ brand }, p)) }).join('')}</div><div class="templates">${d.templates.map(id => { const t = brand.templates.find(t => t.id === id); return figure(id, t.label, renderTemplate({ brand, fonts, values: EXAMPLES[id], outline: true }, t).svg, t.description) }).join('')}</div></section>`).join('')}</main><footer><p>SPARK Lab / Supporting graphics and editable applications</p><a href="brand-details.html">Brand details</a> · <a href="../site/index.html">Website preview</a></footer><script>document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));document.querySelectorAll('[data-direction]').forEach(section=>{section.hidden=button.dataset.filter!=='all'&&section.dataset.direction!==button.dataset.filter})}));document.querySelectorAll('[data-download]').forEach(button=>button.addEventListener('click',()=>{const figure=button.closest('figure');const svg=figure.querySelector('svg').outerHTML;const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));const a=document.createElement('a');a.href=url;a.download='sparklab-'+figure.dataset.file+'-preview.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}));</script></body></html>`
}
