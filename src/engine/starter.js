// A new brand from a few decisions: a name, a palette, a symbol drawn on a grid, a wordmark typed
// in one of the available faces. The result is a complete brand.json (templates and guide
// included) that can then be refined by hand like any other.
//
// The wordmark is typed, then baked: its outline is stored in the definition, the way ddcnorth's
// production wordmark is, so the logo no longer depends on the font being available.

import { n } from './format.js'

/** The faces every starter uses unless told otherwise: the open-licence Inter and Space Mono. */
export const STARTER_FONTS = {
  body: { family: 'Inter', stack: 'Inter, Arial, sans-serif', weight: 400, file: 'fonts/desktop/Inter-Regular.ttf', web: 'fonts/web/Inter-Regular.woff2', label: 'Inter Regular 400' },
  bold: { family: 'Inter', stack: 'Inter, Arial, sans-serif', weight: 600, file: 'fonts/desktop/Inter-SemiBold.ttf', web: 'fonts/web/Inter-SemiBold.woff2', label: 'Inter SemiBold 600' },
  display: { family: 'Inter Display', stack: 'Inter Display, Inter, sans-serif', weight: 500, file: 'fonts/desktop/InterDisplay-Medium.ttf', web: 'fonts/web/InterDisplay-Medium.woff2', label: 'Inter Display Medium 500' },
  displayRegular: { family: 'Inter Display', stack: 'Inter Display, Inter, sans-serif', weight: 400, file: 'fonts/desktop/InterDisplay-Regular.ttf', web: 'fonts/web/InterDisplay-Regular.woff2', label: 'Inter Display Regular 400' },
  extra: { family: 'Inter Display', stack: 'Inter Display, Inter, sans-serif', weight: 800, file: 'fonts/desktop/InterDisplay-ExtraBold.ttf', web: 'fonts/web/InterDisplay-ExtraBold.woff2', label: 'Inter Display ExtraBold 800' },
  label: { family: 'Space Mono', stack: 'Space Mono, monospace', weight: 400, file: 'fonts/SpaceMono-Regular.ttf', web: 'fonts/SpaceMono-Regular.ttf', label: 'Space Mono Regular 400' }
}

const STARTER_FONT_FILES = ['fonts/Inter-OFL.txt', 'fonts/SpaceMono-OFL.txt', 'fonts/SpaceMono-Regular.ttf',
  ...['Inter-Regular', 'Inter-SemiBold', 'InterDisplay-ExtraBold', 'InterDisplay-Medium', 'InterDisplay-Regular'].flatMap((face) => [`fonts/desktop/${face}.ttf`, `fonts/web/${face}.woff2`])]

export const STARTER_DEFAULTS = {
  id: 'northwind',
  name: 'northwind',
  tagline: 'Steady progress, clearly made.',
  colours: { ink: '#14171A', paper: '#F5F3EE', muted: '#565B61', primary: '#1F4E46', light: '#CFE4DC', white: '#FFFFFF' },
  symbol: { grid: 3, cells: [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [2, 2]], shape: 'circle' },
  wordmark: { text: 'northwind', font: 'display' },
  parent: null
}

/** Centres on a square grid of `size` cells, `pitch` apart, each `radius` from its cell's edge. */
const gridGeometry = ({ grid = 3, cells, radius = 40, gap = 8 }) => {
  const pitch = 2 * radius + gap
  const side = 2 * radius + (grid - 1) * pitch
  const sorted = [...cells].sort(([ax, ay], [bx, by]) => ay - by || ax - bx)
  const centres = sorted.map(([col, row]) => [radius + col * pitch, radius + row * pitch])
  const rows = Array.from({ length: grid }, (_, row) => sorted.filter(([, r]) => r === row).length).filter(Boolean)
  const columns = Array.from({ length: grid }, (_, col) => sorted.filter(([c]) => c === col).length).filter(Boolean)
  return { pitch, side, centres, rows, columns }
}

const squarePath = ([cx, cy], r) => `M${n(cx - r)} ${n(cy - r)}H${n(cx + r)}V${n(cy + r)}H${n(cx - r)}Z`

/**
 * Bakes typed text into a wordmark: outline, height and extent.
 * @returns {{ glyph: string, height: number, left: number, width: number, baseline: number }}
 */
export const bakeWordmark = (fonts, text, font = 'display', size = 100, tracking = -0.02) => {
  if (!fonts?.has(font)) throw new Error(`The ${font} face is not loaded, so the wordmark cannot be outlined.`)
  const box = fonts.bounds(text, font, size, tracking)
  if (!box) throw new Error('The wordmark has no visible letters.')
  const baseline = -box.y1
  return { glyph: fonts.path(text, font, size, 0, baseline, tracking), height: box.y2 - box.y1, left: box.x1, width: box.x2, baseline, size, tracking }
}

const textTemplates = (tagline) => {
  const guides = { type: 'printGuides', colour: 'muted', trim: { id: 'trim-90x50mm', x: 30, y: 30, width: 900, height: 500 }, safe: { id: 'safe-3mm-inside-trim', x: 60, y: 60, width: 840, height: 440 } }
  const t = (id, text, x, y, size, colour, extra = {}) => ({ type: 'text', id, text, x, y, size, colour, ...extra })
  const card = { width: 960, height: 560, physical: ['96mm', '56mm'], raster: 1920, group: 'Business cards', print: { trim: [90, 50], bleed: 3, unit: 'mm' } }
  return [
    { id: 'business-card-front', label: 'Business card, front', title: '{name} / business-card front / 90 × 50 mm trim + 3 mm bleed', ...card, elements: [{ type: 'background', fill: 'primary' }, { type: 'logo', x: 140, y: 215, width: 600, colour: 'reverse' }, t('brand-tagline', tagline.toUpperCase(), 150, 430, 22, 'reverse', { font: 'label', tracking: 3 }), guides] },
    { id: 'business-card-back', label: 'Business card, back', title: '{name} / business-card back / replace placeholders', ...card, elements: [{ type: 'background', fill: 'paper' }, t('contact-name', '[Name]', 90, 140, 44, 'ink', { font: 'bold' }), t('contact-role', '[Role]', 90, 187, 25, 'muted'), t('contact-email', '[Email]', 90, 350, 25, 'ink'), t('contact-phone', '[Phone]', 90, 391, 25, 'ink'), t('contact-website', '[Website]', 90, 432, 25, 'ink'), { type: 'motif', id: 'card-symbol', x: 725, y: 327, width: 150, height: 128, colour: 'primary', align: 'right' }, guides] },
    { id: 'letterhead-a4', label: 'A4 letterhead', group: 'Stationery', title: '{name} / A4 letterhead / replace placeholders', width: 794, height: 1123, physical: ['210mm', '297mm'], raster: 1588, elements: [{ type: 'background', fill: 'reverse' }, { type: 'logo', x: 62, y: 58, width: 240, colour: 'ink' }, { type: 'path', id: 'header-rule', d: 'M62 184H732', stroke: 'rule', strokeWidth: 1 }, t('letter-date', '[Date]', 62, 238, 14, 'ink'), t('recipient-name', '[Recipient]', 62, 287, 16, 'ink', { font: 'bold' }), t('recipient-address', '[Address]', 62, 313, 14, 'muted'), t('letter-subject', '[Subject]', 62, 404, 30, 'ink', { font: 'display' }), t('letter-content', '[Letter content]', 62, 453, 16, 'ink'), { type: 'path', id: 'footer-rule', d: 'M62 1015H732', stroke: 'rule', strokeWidth: 1 }, t('footer-contact', '[Contact details]', 62, 1056, 12, 'muted')] },
    { id: 'social-post', label: 'Social post', group: 'Social', title: '{name} / square social post', width: 1080, height: 1080, raster: 1080, elements: [{ type: 'background', fill: 'primary' }, { type: 'motif', id: 'post-corner-motif', x: 625, y: 684, width: 565, height: 480, colour: 'light', align: 'right' }, { type: 'logo', x: 80, y: 76, width: 360, colour: 'reverse' }, t('headline-line-1', 'Say it', 80, 455, 108, 'reverse', { font: 'display', tracking: -5 }), t('headline-line-2', 'simply.', 80, 570, 108, 'reverse', { font: 'display', tracking: -5 }), t('post-message', '[Your message here]', 80, 958, 29, 'reverse')] },
    { id: 'social-banner', label: 'Social banner', group: 'Social', title: '{name} / social banner', width: 1584, height: 396, raster: 1584, elements: [{ type: 'background', fill: 'light' }, { type: 'motif', id: 'banner-corner-motif', x: 1118, y: 30, width: 470, height: 400, colour: 'primary', align: 'right' }, { type: 'logo', x: 88, y: 76, width: 460, colour: 'primary' }, t('banner-headline', tagline, 88, 288, 56, 'primary', { font: 'display', tracking: -2 })] },
    { id: 'presentation-cover', label: 'Presentation cover', group: 'Presentations', title: '{name} / 16:9 presentation cover', width: 1920, height: 1080, raster: 1920, elements: [{ type: 'background', fill: 'paper' }, { type: 'motif', id: 'presentation-motif', x: 1200, y: 325, width: 650, height: 560, colour: 'primary' }, { type: 'logo', x: 136, y: 95, width: 420, colour: 'ink' }, t('headline-line-1', 'Say it', 136, 506, 132, 'ink', { font: 'display', tracking: -5 }), t('headline-line-2', 'simply.', 136, 644, 132, 'ink', { font: 'display', tracking: -5 }), t('presentation-details', '[Presentation title] · [Date]', 140, 944, 30, 'muted')] }
  ]
}

const starterGuide = (familyIds, colourKeys) => {
  const label = (text, x, y, colour) => ({ type: 'label', text, x, y, ...(colour ? { colour } : {}) })
  const para = (text, x, y, width, size, extra = {}) => ({ type: 'para', text, x, y, width, size, ...extra })
  const rect = (x, y, width, height, fill, stroke) => ({ type: 'rect', x, y, width, height, fill, ...(stroke ? { stroke } : {}) })
  const logo = (x, y, width, extra = {}) => ({ type: 'logo', x, y, width, ...extra })
  const nested = (src, x, y, width, height) => ({ type: 'nested', src, x, y, width, height })
  const [main, parent] = familyIds
  return {
    title: '{name} brand guide',
    pdfTitle: '{name} brand guide / v{displayVersion}',
    sheetsPdfTitle: '{name} logo reference sheets / v{displayVersion}',
    pageTitle: '{name} brand guide / {page}',
    width: 1440,
    height: 1020,
    frame: { background: 'paper', logo: { x: 62, y: 30, width: 165 }, header: '{upperName} / IDENTITY GUIDE / V{displayVersion}', footer: '{upperName} / BRAND GUIDE' },
    pages: [
      { title: '{copy.tagline}', subtitle: 'The {name} identity: a symbol, a wordmark and a palette, used the same way everywhere.', name: 'Primary lockup', elements: [label('PRIMARY HORIZONTAL LOCKUP', 64, 278), logo(56, 300, 1320, { height: 270, align: 'start' }), rect(64, 608, 836, 224, 'primary'), logo(104, 648, 756, { height: 144, align: 'start', colour: 'reverse' }), label('THE IDENTITY', 952, 644), para('One symbol.\nOne wordmark.\nOne palette.', 952, 686, 412, 25, { colour: 'ink', line: 1.7 }), para('Every file in this kit is generated from one brand.json, so the logo, templates and guide always agree.', 64, 888, 1310, 20)] },
      { title: 'How the symbol is built.', subtitle: '{derived.dotCount} equal shapes on a square grid, with matching horizontal and vertical gaps.', name: 'Construction and clearspace', elements: [{ type: 'symbolConstruction', x: 64, y: 256, width: 500, height: 368, top: 278, size: 307.2, lines: { top: 281, bottom: 595, left: 100, right: 527 } }, label('STANDARD GEOMETRY', 620, 277), { type: 'specTable', x: 620, right: 1376, y: 320, step: 52, rows: [['Canvas', '{symbol.viewBox.2} x {symbol.viewBox.3} units'], ['Element size', '{derived.diameter} units'], ['Centre spacing', '{symbol.horizontalPitch} units'], ['Edge-to-edge gap', '{derived.gap} units'], ['Element count', '{derived.dotCount}'], ['Rows', '{derived.rows}']] }, label('LOCKUP & CLEARSPACE', 64, 675), logo(100, 745, 820, { height: 152 }), { type: 'rect', x: 76, y: 721, width: 870, height: 200, fill: 'none', stroke: 'muted', dash: '7 5' }, para('The symbol is {lockup.iconHeight} units tall in the lockup; the gap to the wordmark is {lockup.iconGap} units.', 990, 738, 376, 20), para('Leave at least one element’s width clear around the visible logo.', 990, 832, 376, 18)] },
      { title: 'One identity, several formats.', subtitle: 'Choose the arrangement that fits the space. Use one colour for the complete logo.', name: 'Lockup family', elements: [rect(64, 255, 828, 214, 'reverse', 'line'), label('PRIMARY', 86, 284), logo(86, 300, 780, { height: 150 }), rect(924, 255, 452, 214, 'primary'), label(parent ? 'PARENT' : 'REVERSED', 946, 284, 'light'), logo(946, 300, 408, { height: 150, family: parent ?? main, colour: 'reverse' }), rect(64, 496, 550, 364, 'light'), label('STACKED', 88, 530, 'primary'), logo(88, 550, 502, { height: 286, layout: 'stacked', colour: 'primary' }), rect(642, 496, 378, 364, 'reverse', 'line'), label('SYMBOL ONLY', 666, 530), { type: 'symbol', x: 736, y: 582, height: 190 }, rect(1048, 496, 328, 364, 'primary'), label('WORDMARK', 1072, 530, 'light'), logo(1072, 560, 280, { height: 280, layout: 'wordmark', colour: 'reverse' })] },
      { title: 'The colour system.', subtitle: 'Flat colour, used with plenty of the paper tone around it.', name: 'Colour', elements: [{ type: 'swatches', x: 64, y: 267, step: 264, width: 246, height: 275, colours: colourKeys.slice(0, 5) }, rect(64, 712, 632, 174, 'primary'), logo(96, 732, 568, { height: 134, colour: 'reverse' }), rect(724, 712, 652, 174, 'light'), logo(756, 732, 588, { height: 134, colour: 'primary' }), para('White is the reversal colour. Use the hex values for screen work; proof print conversion with the supplier.', 64, 921, 1312, 18)] },
      { title: 'Typography.', subtitle: 'Three faces, each with one job.', name: 'Typography', elements: [label('DISPLAY / {fonts.display.label}', 64, 278), { type: 'text', text: '{copy.tagline}', x: 62, y: 366, size: 70, font: 'display', tracking: -0.04 }, { type: 'rule', y: 415 }, label('BODY / {fonts.body.label}', 64, 464), para('Clear, plain sentences. Use the body face for paragraphs, interface text and everyday communication.', 64, 516, 1230, 29, { colour: 'ink', line: 1.65 }), { type: 'rule', y: 618 }, label('LABELS / {fonts.label.label}', 64, 664), { type: 'text', text: '{upperName} / LABELS / CAPTIONS', x: 64, y: 722, size: 28, font: 'label', tracking: 0.12 }, { type: 'rule', y: 767 }, label('PRODUCTION WORDMARK', 64, 812), logo(58, 826, 640, { height: 96, align: 'start', layout: 'wordmark' }), para('The wordmark is outlined artwork, not live type: it looks the same everywhere and needs no font installed.', 752, 817, 606, 22)] },
      { title: 'Supporting graphics.', subtitle: 'Repeat or crop the symbol for backgrounds. Keep the logo itself complete.', name: 'Patterns', elements: [nested('patterns/repeat', 64, 266, 416, 260), label('REPEAT', 64, 561), nested('patterns/crop', 512, 266, 416, 260), label('CROP', 512, 561), nested('patterns/field', 960, 266, 416, 260), label('FIELD', 960, 561), { type: 'rule', y: 610 }, para('Patterns are supporting graphics. The logo remains the brand identifier; never crop or recolour it in parts.', 64, 680, 1312, 24, { colour: 'ink' })] },
      { title: 'Ready for everyday use.', subtitle: 'Business cards, letterhead, social graphics and a presentation cover, with editable text.', name: 'Applications', elements: [nested('templates/business-card-front', 64, 263, 403, 235), nested('templates/business-card-back', 64, 520, 403, 235), label('90 x 50 MM CARDS / 3 MM BLEED', 64, 791), nested('templates/social-post', 499, 263, 315, 315), label('1080 x 1080 POST', 499, 611), nested('templates/presentation-cover', 499, 649, 315, 177.2), label('1920 x 1080 COVER', 499, 861), rect(846, 263, 247, 350, 'reverse', 'line'), nested('templates/letterhead-a4', 846, 263, 247, 350), label('A4 LETTERHEAD', 846, 647), nested('templates/social-banner', 846, 696, 530, 132.5), label('1584 x 396 BANNER', 846, 865), para('Replace bracketed fields in the SVG files, or fill them in brandkit and download the result.', 64, 920, 1312, 18)] },
      { title: 'Use the right file for the job.', subtitle: 'The same geometry drives the vectors, images, templates and website components.', name: 'Files', elements: [label('SCREEN & PRINT', 64, 278), { type: 'list', x: 64, detailX: 267, right: 818, y: 322, step: 63, rows: [['SVG', 'Scale-independent logos and symbols.'], ['PNG', 'Transparent artwork for slides and documents.'], ['PDF', 'Vector handoff and layout proof files.'], ['REACT / CSS', 'Inline colour inheritance and local fonts.'], ['BRAND.JSON', 'One source for the complete identity system.']] }, rect(883, 263, 493, 342, 'primary'), label('MINIMUM SIZES', 913, 307, 'light'), { type: 'text', text: '{lockup.minimumHorizontalWidthPx} px / {lockup.minimumHorizontalWidthMm} mm', x: 913, y: 366, size: 33, font: 'display', colour: 'reverse', tracking: -0.03 }, para('Primary horizontal logo, including its canvas.', 913, 407, 429, 19, { colour: 'light' }), { type: 'text', text: '{lockup.minimumSymbolHeightPx} px / {lockup.minimumSymbolHeightMm} mm', x: 913, y: 494, size: 33, font: 'display', colour: 'reverse', tracking: -0.03 }, para('Symbol height, below which use the favicon.', 913, 535, 429, 19, { colour: 'light' }), label('SMALL SCREEN ICONS', 64, 670), { type: 'symbol', x: 66, y: 704, height: 136 }, { type: 'symbol', x: 262, y: 704, height: 136, micro: true }, label('STANDARD', 64, 882), label('MICRO', 264, 882), para('Open index.html in the kit to browse every file. Edit brand.json and rebuild to change any of them.', 493, 706, 800, 23, { colour: 'ink' })] }
    ],
    sheets: familyIds.map((familyId, index) => ({ id: `logo-sheet-0${index + 1}`, group: 'logo-sheets', width: 1440, height: 1020, title: `{name} logo reference sheet ${index + 1}`, elements: [rect(0, 0, 1440, 1020, 'paper'), { type: 'text', text: 'Logo reference sheets', x: 64, y: 88, size: 42, font: 'display', tracking: -0.04 }, label(`${familyId} / SHEET ${index + 1} OF ${familyIds.length}`, 64, 128), label('HORIZONTAL', 64, 221), logo(56, 240, 1000, { height: 230, align: 'start', family: familyId }), label('WORDMARK', 64, 518), logo(56, 540, 760, { height: 150, align: 'start', family: familyId, layout: 'wordmark' }), label('STACKED', 980, 518), logo(972, 540, 404, { height: 380, align: 'start', family: familyId, layout: 'stacked' }), label('OUTLINED ARTWORK / V{displayVersion}', 64, 980)] }))
  }
}

/**
 * Makes a brand definition. `fonts` must be a loaded provider with the wordmark's face, since the
 * wordmark is outlined now rather than set from the font every time.
 */
export const createStarterBrand = (options, fonts) => {
  // The id and the wordmark follow the name unless given: a brand called "Harbour & Co" is
  // harbour-co, and says "Harbour & Co".
  const name = options?.name || STARTER_DEFAULTS.name
  const o = {
    ...STARTER_DEFAULTS,
    ...options,
    name,
    colours: { ...STARTER_DEFAULTS.colours, ...options?.colours },
    symbol: { ...STARTER_DEFAULTS.symbol, ...options?.symbol },
    wordmark: { ...STARTER_DEFAULTS.wordmark, ...options?.wordmark, text: options?.wordmark?.text || name }
  }
  const id = String(options?.id || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'brand'
  const radius = 40
  const geometry = gridGeometry({ grid: o.symbol.grid, cells: o.symbol.cells, radius })
  const symbol = {
    name: `${id}-symbol`,
    viewBox: [0, 0, geometry.side, geometry.side],
    ...(o.symbol.shape === 'square'
      ? { paths: geometry.centres.map((centre) => squarePath(centre, radius)), microPaths: geometry.centres.map((centre) => squarePath(centre, radius * 0.9)) }
      : { radius, microRadius: radius * 0.9, centres: geometry.centres }),
    rows: geometry.rows,
    columns: geometry.columns,
    horizontalPitch: geometry.pitch,
    verticalPitch: geometry.pitch,
    horizontalGap: geometry.pitch - 2 * radius,
    verticalGap: geometry.pitch - 2 * radius,
    title: 'symbol',
    masterTitle: 'symbol master',
    microDescription: 'Optical micro variant: the same centres with slightly smaller elements, for favicons and symbols below 32 pixels.',
    ...(o.symbol.shape === 'square' ? { radius } : {})
  }
  const words = [{ id, text: o.wordmark.text || o.name }, ...(o.parent ? [{ id: String(o.parent).toLowerCase().replace(/[^a-z0-9]+/g, '-'), text: o.parent }] : [])]
  const baked = words.map((entry) => ({ ...entry, ...bakeWordmark(fonts, entry.text, o.wordmark.font) }))
  // Every wordmark in the family shares one baseline and one height, so a parent and its brand
  // line up: each is moved down by the difference between its ascent and the tallest one's.
  const baseline = Math.max(...baked.map((entry) => entry.baseline))
  for (const entry of baked) entry.offset = baseline - entry.baseline
  const height = Math.max(...baked.map((entry) => entry.offset + entry.height))
  const left = Math.min(...baked.map((entry) => entry.left))
  const face = STARTER_FONTS[o.wordmark.font] ?? STARTER_FONTS.display
  const main = baked[0]
  const colourKeys = Object.keys(o.colours)
  return {
    schema: 'brandkit/1',
    id,
    name: o.name,
    version: '1.0',
    displayVersion: '1.0',
    source: 'Created with the brandkit starter.',
    colours: o.colours,
    roles: { ink: 'ink', paper: 'paper', muted: 'muted', primary: 'primary', light: 'light', reverse: 'white', line: '#D9DCDF', rule: '#CFD2D4' },
    logoColours: ['ink', 'white', 'primary', 'currentColor'],
    rasterColours: ['ink', 'white', 'primary'],
    fonts: STARTER_FONTS,
    typography: { headlines: { family: 'Inter Display', weight: 500, trackingEm: -0.04 }, body: { family: 'Inter', weight: 400 }, labels: { family: 'Space Mono', weight: 400, trackingEm: 0.12 } },
    symbol,
    wordmark: {
      height,
      left,
      glyphs: Object.fromEntries(baked.map((entry) => [entry.id, entry.glyph])),
      variants: Object.fromEntries(baked.map((entry) => [entry.id, { width: entry.width, parts: [{ glyph: entry.id, x: 0, y: entry.offset || 0, attrs: { 'data-word': entry.text } }] }])),
      editable: {
        text: { family: id, wrap: false, title: '{name} / text / font-dependent approximation', parts: [{ element: 'text', attrs: { fill: '{colour}', x: '0', y: baseline, 'font-family': face.stack, 'font-size': main.size, 'font-weight': String(face.weight), 'letter-spacing': main.tracking * main.size }, content: main.text }] }
      }
    },
    families: baked.map((entry, index) => ({ id: entry.id, wordmark: entry.id, typeHeight: 72, label: index === 0 ? o.name : `Parent ${entry.text}` })),
    lockup: { iconHeight: 120, iconGap: 28, stackedIconHeight: 128, stackedTypeHeight: 56, stackedGap: 28, canvasPadding: 16, wordmarkHeight: 72, clearspaceRecommendation: 'At least one symbol element around the visible artwork.', minimumSymbolHeightPx: 32, minimumHorizontalWidthPx: 200, minimumSymbolHeightMm: 8, minimumHorizontalWidthMm: 50 },
    copy: { svgDescription: '{name} identity artwork. Self-contained vector artwork generated by brandkit.', templateDescription: '{name} application. Logo outlined; text live and editable.', logoLabel: '{name} logo', motifLabel: '{name} symbol', tagline: o.tagline },
    patterns: [
      { id: 'repeat', title: '{name} / repeating pattern', width: 960, height: 600, background: 'paper', repeat: { x: [-60, 1000, 280], y: [-80, 700, 240], scale: 0.6 * 256 / geometry.side, colour: 'light' } },
      { id: 'crop', title: '{name} / large crop', width: 960, height: 600, background: 'primary', place: [{ x: 265, y: -100, scale: 3.1 * 256 / geometry.side, colour: 'light' }] },
      { id: 'field', title: '{name} / colour field', width: 960, height: 600, background: 'light', place: [{ x: 400, y: 82, scale: 1.75 * 256 / geometry.side, colour: 'primary' }] }
    ],
    templates: textTemplates(o.tagline),
    guide: starterGuide(baked.map((entry) => entry.id), colourKeys.filter((key) => key !== 'white')),
    web: {
      componentName: `${id.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('')}Logo`,
      symbolComponentName: `${id.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('')}Symbol`,
      cssPrefix: id.replace(/-/g, '').slice(0, 8),
      appIcon: { background: 'primary', colour: 'reverse', size: 700 },
      favicon: { light: o.colours.ink, dark: '#FFFFFF', size: 56, micro: true, title: '{name} favicon' },
      intro: { eyebrow: 'Brand identity', headline: `${o.name}\nBrand assets.`, body: o.tagline, edition: 'v{displayVersion}', footer: `${o.name} — ${o.tagline}` },
      landing: { eyebrow: o.name, headline: o.tagline, body: '[Replace with a short statement about who you help and how.]', cta: 'Get in touch', contactEyebrow: o.tagline, contactBody: '[Add a contact address or form here.]', footer: o.name }
    },
    files: [{ to: 'fonts/README.md', from: 'fonts/README.md' }, ...STARTER_FONT_FILES]
  }
}
