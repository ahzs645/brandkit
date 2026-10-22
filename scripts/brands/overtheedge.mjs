// Writes brands/overtheedge/brand.json: Over the Edge, UNBC's independent student newspaper, in its
// "Forest press" identity.
//
//   npm run make:overtheedge
//
// The logo is the paper's own: the SVG its website serves, vendored once in reference/logo-site.svg
// and read here path by path (scripts/brands/overtheedge-logo.mjs). The words OVER, THE and EDGE
// and the subtext line become the wordmark's glyphs, unedited; the O alone is the symbol. Colours
// come from the site's theme and the 2025 print covers; type is Source Serif 4, Anton, Inter,
// IBM Plex Mono and Gochi Hand. Everything else is drawn from those.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createStarterBrand } from '../../src/engine/starter.js'
import { findAsset, loadBrandFontsFromDisk } from '../../src/fonts/node.js'
import { updateManifest } from './common.mjs'
import { loadLogo, pathBounds, siteIcons, union, up } from './overtheedge-logo.mjs'
import { embeddedFonts, lockupMarkup, markMarkup, motionCss, motionPage, motionReadme, RULES, STUDIES, TOKENS } from './overtheedge-motion.mjs'
import { detailsPage } from './overtheedge-details.mjs'

const folder = new URL('../../brands/overtheedge/', import.meta.url).pathname
mkdirSync(folder, { recursive: true })

const INPUTS = ['reference/logo-site.svg', 'reference/logo-site-dark.svg', 'reference/site-icons.json', 'fonts/Anton-Regular.ttf', 'fonts/SourceSerif4-Regular.ttf', 'fonts/SourceSerif4-Bold.ttf', 'fonts/SourceSerif4-It.ttf', 'fonts/IBMPlexMono-Medium.ttf', 'fonts/GochiHand-Regular.ttf', 'docs/README.md', 'docs/CHANGELOG.md', 'fonts/README.md', 'site/index.html']
for (const input of INPUTS) {
  if (!existsSync(`${folder}${input}`)) {
    console.error(`Missing input: brands/overtheedge/${input}`)
    process.exit(1)
  }
}

// --- Type ----------------------------------------------------------------------------------------

const face = (family, stack, file, weight, label, extra = {}) => ({ family, stack, weight, file, web: file, label, ...extra })
const SERIF = '"Source Serif 4", Georgia, "Times New Roman", serif'
const FONTS = {
  body: face('Inter', 'Inter, system-ui, Arial, sans-serif', 'fonts/desktop/Inter-Regular.ttf', 400, 'Inter Regular 400', { web: 'fonts/web/Inter-Regular.woff2' }),
  bold: face('Inter', 'Inter, system-ui, Arial, sans-serif', 'fonts/desktop/Inter-SemiBold.ttf', 600, 'Inter SemiBold 600', { web: 'fonts/web/Inter-SemiBold.woff2' }),
  display: face('Source Serif 4', SERIF, 'fonts/SourceSerif4-Bold.ttf', 700, 'Source Serif 4 Bold 700'),
  displayRegular: face('Source Serif 4', SERIF, 'fonts/SourceSerif4-Regular.ttf', 400, 'Source Serif 4 Regular 400'),
  deck: face('Source Serif 4', SERIF, 'fonts/SourceSerif4-It.ttf', 400, 'Source Serif 4 Italic 400', { style: 'italic' }),
  extra: face('Anton', 'Anton, "Arial Narrow", Impact, sans-serif', 'fonts/Anton-Regular.ttf', 400, 'Anton Regular 400'),
  label: face('IBM Plex Mono', '"IBM Plex Mono", ui-monospace, Menlo, monospace', 'fonts/IBMPlexMono-Medium.ttf', 500, 'IBM Plex Mono Medium 500'),
  hand: face('Gochi Hand', '"Gochi Hand", "Comic Neue", cursive', 'fonts/GochiHand-Regular.ttf', 400, 'Gochi Hand Regular 400')
}
const fonts = await loadBrandFontsFromDisk({ fonts: FONTS }, folder)
if (fonts.failures.length) throw new Error(`Fonts failed to load: ${fonts.failures.join(', ')}`)

// --- The logo ------------------------------------------------------------------------------------

const { glyphs: { o: O_PATH, ...glyphs } } = loadLogo(`${folder}reference/logo-site.svg`)
const box = (d) => pathBounds(d)
const words = { over: box(glyphs.over), the: box(glyphs.the), edge: box(glyphs.edge) }
const full = union(Object.values(glyphs).map(box))
const main = union(Object.values(words))
// OVER / THE / EDGE on three lines, left-aligned, as on the October 2025 cover.
const PITCH = 100
const stackedParts = ['over', 'the', 'edge'].map((word, line) => ({ glyph: word, x: -words[word][0], y: line * PITCH, attrs: { 'data-word': word.toUpperCase() } }))
const stackedWidth = Math.max(...['over', 'the', 'edge'].map((word) => words[word][2] - words[word][0]))
const stackedHeight = 2 * PITCH + Math.max(...['over', 'the', 'edge'].map((word) => words[word][3]))
const oBox = box(O_PATH)

const wordmark = {
  height: up(full[3]),
  left: 0,
  glyphs,
  variants: {
    full: { width: up(full[2]), parts: [{ glyph: 'over', attrs: { 'data-word': 'OVER' } }, { glyph: 'the', attrs: { 'data-word': 'THE' } }, { glyph: 'edge', attrs: { 'data-word': 'EDGE' } }, { glyph: 'subtext', attrs: { 'data-line': 'subtext' } }, { glyph: 'apostrophe', attrs: { 'data-line': 'subtext' } }] },
    words: { width: up(main[2]), height: up(main[3]), parts: [{ glyph: 'over', attrs: { 'data-word': 'OVER' } }, { glyph: 'the', attrs: { 'data-word': 'THE' } }, { glyph: 'edge', attrs: { 'data-word': 'EDGE' } }] },
    stacked: { width: up(stackedWidth), height: up(stackedHeight), parts: stackedParts }
  }
}
const symbol = {
  name: 'o',
  viewBox: [0, 0, up(oBox[2]), up(oBox[3])],
  paths: [O_PATH],
  title: 'O',
  masterTitle: 'O master',
  construction: { source: 'The first path of OVER in reference/logo-site.svg, unedited.' }
}

// --- Colour --------------------------------------------------------------------------------------
// From the site's theme (oklch values converted to hex) and the April 2025 cover. See docs/PLANS.md M2.

const COLOURS = {
  forest: '#155329', pine: '#0C3B1C', newsprint: '#F5F1E6', ink: '#262626', lichen: '#E3EFCF', sage: '#6AA380',
  moss: '#466855', kraft: '#D4C8AA', pulp: '#DBD0BA', bark: '#7D6B56', proof: '#B54A35', white: '#FFFFFF'
}

// Every text pair the templates use, and its contrast as measured (docs/PLANS.md M2, Contrast).
const CONTRAST = [['ink', 'newsprint', '13.4'], ['forest', 'newsprint', '8.1'], ['white', 'forest', '9.1'], ['lichen', 'forest', '7.6'], ['white', 'pine', '12.7'], ['lichen', 'pine', '10.6'], ['white', 'moss', '6.2'], ['ink', 'sage', '5.2'], ['bark', 'newsprint', '4.53'], ['proof', 'newsprint', '4.7'], ['white', 'proof', '5.3']]
// Allowed only for text 24 px and larger.
const LARGE_ONLY = [['sage', 'pine', '4.3'], ['sage', 'forest', '3.1']]

// --- Copy ----------------------------------------------------------------------------------------
// Only lines the paper already uses, on its site or its covers. Templates use these or bracketed
// placeholders; test/overtheedge.test.js holds them to it.

export const SOURCED_LINES = {
  tagline: "UNBC's Independent Student Newspaper",
  subtext: "UNBC's Student Newspaper",
  isHere: 'Over the Edge is here!',
  // An excerpt of the site's hero line, which continues "…calendar, beautifully in one place"; the full stop is ours.
  hero: 'Breaking news, vibrant clubs, can’t-miss events, and a shared university calendar.',
  descriptor: 'News · Clubs · Events · Calendar',
  domain: 'overtheedge.unbc.ca'
}

// --- Drawing helpers -----------------------------------------------------------------------------

const t = (id, text, x, y, size, colour, extra = {}) => ({ type: 'text', id, text, x, y, size, colour, ...extra })
const label = (id, text, x, y, size, colour, extra = {}) => t(id, text, x, y, size, colour, { font: 'label', tracking: size * 0.08, ...extra })
const anton = (id, text, x, y, size, colour, extra = {}) => t(id, text, x, y, size, colour, { font: 'extra', ...extra })
const hand = (id, text, x, y, size, colour, extra = {}) => t(id, text, x, y, size, colour, { font: 'hand', ...extra })
const rect = (id, x, y, width, height, fill, extra = {}) => ({ type: 'rect', id, x, y, width, height, fill, ...extra })
/** A dashed rule, as in the print issue's index. */
const dashed = (id, x1, x2, y, colour = 'bark', width = 1.5, dash = '6 5') => ({ type: 'path', id, d: `M${x1} ${y}H${x2}`, fill: 'none', stroke: colour, strokeWidth: width, dash })

const card = { width: 960, height: 560, physical: ['96mm', '56mm'], raster: 1920, group: 'Business cards', print: { trim: [90, 50], bleed: 3, unit: 'mm' } }
const cardGuides = { type: 'printGuides', colour: 'muted', trim: { id: 'trim-90x50mm', x: 30, y: 30, width: 900, height: 500 }, safe: { id: 'safe-3mm-inside-trim', x: 60, y: 60, width: 840, height: 440 } }

/** The issue index: a label, then rows of page number and headline between dashed rules. */
const issueIndex = (x, y, width, rowHeight, rows, numberSize, titleSize, ground) => [
  label('index-label', 'IN THIS ISSUE', x, y, 16, 'bark', { ground }),
  dashed('index-rule-0', x, x + width, y + 22),
  ...rows.flatMap(([page, title], index) => {
    const top = y + 22 + index * rowHeight
    return [
      anton(`index-page-${index + 1}`, page, x, top + rowHeight / 2 + numberSize * 0.36, numberSize, 'forest', { ground }),
      { type: 'paragraph', id: `index-title-${index + 1}`, text: title, x: x + numberSize * 2.4, y: top + rowHeight / 2 + titleSize * 0.34, width: width - numberSize * 2.4, size: titleSize, leading: titleSize * 1.2, maxLines: 1, colour: 'ink', font: 'display', ground },
      dashed(`index-rule-${index + 1}`, x, x + width, top + rowHeight)
    ]
  })
]

// --- Templates -----------------------------------------------------------------------------------

const TEMPLATES = [
  {
    id: 'business-card-front', label: 'Business card, front', title: '{name} / business-card front / 90 × 50 mm trim + 3 mm bleed', ...card,
    elements: [
      { type: 'background', fill: 'forest' },
      { type: 'logo', x: 180, y: 196, width: 600, colour: 'white' },
      dashed('card-rule', 180, 780, 344, 'lichen'),
      label('card-site', 'OVERTHEEDGE.UNBC.CA', 480, 392, 20, 'lichen', { anchor: 'middle' }),
      cardGuides
    ]
  },
  {
    id: 'business-card-back', label: 'Business card, back', title: '{name} / business-card back / replace placeholders', ...card,
    elements: [
      { type: 'background', fill: 'newsprint' },
      { type: 'symbol', x: 96, y: 92, height: 120, colour: 'forest' },
      t('contact-name', '[Full Name]', 96, 318, 44, 'ink', { font: 'display' }),
      label('contact-role', '[ROLE] · OVER THE EDGE', 96, 360, 18, 'bark'),
      dashed('card-rule', 96, 864, 396),
      t('contact-email', '[Email]', 96, 444, 24, 'ink'),
      label('contact-site', 'OVERTHEEDGE.UNBC.CA', 96, 482, 18, 'forest'),
      cardGuides
    ]
  },
  {
    id: 'press-pass', label: 'Press pass', group: 'Credentials', title: '{name} / press pass / 54 × 86 mm', width: 540, height: 860, physical: ['54mm', '86mm'], raster: 1080,
    elements: [
      { type: 'background', fill: 'newsprint' },
      rect('pass-band', 0, 0, 540, 200, 'forest'),
      { type: 'logo', x: 70, y: 58, width: 400, colour: 'white', family: 'words', ground: 'forest' },
      label('pass-subtext', "UNBC'S STUDENT NEWSPAPER", 270, 150, 16, 'lichen', { anchor: 'middle', ground: 'forest' }),
      rect('photo-well', 150, 240, 240, 290, 'kraft', { stroke: 'forest', strokeWidth: 2 }),
      t('photo-note', '[Photo]', 270, 395, 20, 'ink', { anchor: 'middle', ground: 'kraft' }),
      t('pass-name', '[Full Name]', 270, 598, 34, 'ink', { font: 'display', anchor: 'middle' }),
      label('pass-role', '[ROLE]', 270, 634, 16, 'bark', { anchor: 'middle' }),
      anton('pass-press', 'PRESS', 270, 752, 96, 'forest', { anchor: 'middle' }),
      label('pass-term', 'VOLUME [00] · [YEAR]', 270, 816, 16, 'bark', { anchor: 'middle' })
    ]
  },
  {
    id: 'letterhead-a4', label: 'A4 letterhead', group: 'Stationery', title: '{name} / A4 letterhead / replace placeholders', width: 794, height: 1123, physical: ['210mm', '297mm'], raster: 1588,
    elements: [
      { type: 'background', fill: 'white' },
      { type: 'logo', x: 62, y: 56, width: 300, colour: 'forest' },
      label('header-site', 'OVERTHEEDGE.UNBC.CA', 732, 92, 11, 'bark', { anchor: 'end' }),
      dashed('header-rule', 62, 732, 150),
      t('letter-date', '[Date]', 62, 214, 14, 'ink'),
      t('recipient-name', '[Recipient]', 62, 262, 16, 'ink', { font: 'bold' }),
      t('recipient-address', '[Address]', 62, 288, 14, 'bark'),
      t('letter-subject', '[Subject]', 62, 380, 28, 'ink', { font: 'display' }),
      { type: 'paragraph', id: 'letter-content', text: '[Letter content]', x: 62, y: 430, width: 670, size: 14, leading: 22, colour: 'ink' },
      dashed('footer-rule', 62, 732, 1015),
      t('footer-contact', '[Contact details] · overtheedge.unbc.ca', 62, 1056, 11, 'bark')
    ]
  },
  {
    id: 'issue-cover', label: 'Issue cover', group: 'Print and social', title: '{name} / issue cover / 1080 × 1350', width: 1080, height: 1350, raster: 1080,
    elements: [
      { type: 'background', fill: 'newsprint' },
      rect('masthead', 40, 40, 700, 170, 'forest'),
      { type: 'logo', x: 80, y: 72, width: 620, colour: 'white', ground: 'forest' },
      rect('date-box', 760, 40, 280, 170, 'forest'),
      label('issue-volume', 'VOLUME [00] | ISSUE [0]', 900, 78, 15, 'white', { anchor: 'middle', ground: 'forest' }),
      { type: 'path', id: 'date-rule', d: 'M784 94H1016', fill: 'none', stroke: 'white', strokeWidth: 1 },
      anton('issue-day', '[DD]', 784, 184, 64, 'white', { ground: 'forest' }),
      anton('issue-month', '[MONTH]', 916, 130, 24, 'white', { ground: 'forest' }),
      anton('issue-year', '[YYYY]', 916, 158, 24, 'white', { ground: 'forest' }),
      anton('issue-weekday', '[WEEKDAY]', 916, 186, 24, 'lichen', { ground: 'forest' }),
      rect('photo-frame', 40, 240, 1000, 700, 'forest'),
      rect('photo-well', 64, 264, 952, 580, 'moss', { stroke: 'white', strokeWidth: 4 }),
      t('photo-note', '[Cover photo]', 540, 564, 28, 'white', { anchor: 'middle', ground: 'moss' }),
      hand('cover-note', SOURCED_LINES.isHere, 540, 904, 44, 'lichen', { anchor: 'middle', ground: 'forest' }),
      ...issueIndex(40, 996, 1000, 86, [['[03]', '[Headline]'], ['[05]', '[Headline]'], ['[10]', '[Headline]']], 52, 30, 'newsprint')
    ]
  },
  {
    id: 'story-post', label: 'Story post', group: 'Print and social', title: '{name} / story post / 1080 × 1350', width: 1080, height: 1350, raster: 1080,
    elements: [
      { type: 'background', fill: 'newsprint' },
      { type: 'symbol', x: 744, y: 64, height: 400, colour: 'lichen' },
      { type: 'logo', x: 64, y: 72, width: 300, colour: 'forest', family: 'words' },
      dashed('top-rule', 64, 1016, 168),
      // Section, headline and deck flow down the page, so a longer headline pushes the deck down.
      { type: 'flow', x: 64, y: 600, items: [
        { id: 'story-section', text: '[SECTION] · [DATE]', size: 22, font: 'label', tracking: 1.76, colour: 'forest' },
        { id: 'story-headline', text: '[Headline]', size: 84, leading: 92, gap: 104, wrap: 952, maxLines: 4, font: 'display', colour: 'ink' },
        { id: 'story-deck', text: '[One-sentence deck]', size: 32, leading: 44, gap: 76, wrap: 900, maxLines: 2, font: 'deck', colour: 'ink' }
      ] },
      dashed('bottom-rule', 64, 1016, 1210),
      label('story-site', 'READ AT OVERTHEEDGE.UNBC.CA', 64, 1270, 20, 'forest')
    ]
  },
  {
    id: 'issue-out', label: 'Issue out', group: 'Print and social', title: '{name} / new issue post / 1080 × 1080', width: 1080, height: 1080, raster: 1080,
    elements: [
      { type: 'background', fill: 'forest' },
      { type: 'symbol', x: 600, y: -60, height: 1200, colour: 'pine' },
      hand('issue-note', SOURCED_LINES.isHere, 80, 250, 64, 'lichen'),
      anton('issue-number', 'ISSUE [0]', 80, 520, 180, 'white'),
      anton('issue-volume', 'VOLUME [00]', 80, 690, 120, 'sage'),
      dashed('issue-rule', 80, 1000, 790, 'lichen'),
      label('issue-site', 'READ IT AT OVERTHEEDGE.UNBC.CA', 80, 850, 22, 'lichen'),
      { type: 'logo', x: 80, y: 930, width: 320, colour: 'white', family: 'words' }
    ]
  },
  {
    id: 'event-post', label: 'Event post', group: 'Print and social', title: '{name} / calendar event post / 1080 × 1080', width: 1080, height: 1080, raster: 1080,
    elements: [
      { type: 'background', fill: 'newsprint' },
      rect('date-block', 64, 64, 300, 300, 'forest'),
      anton('event-day', '[DD]', 214, 248, 140, 'white', { anchor: 'middle', ground: 'forest' }),
      anton('event-month', '[MON]', 214, 322, 48, 'lichen', { anchor: 'middle', ground: 'forest' }),
      label('event-kicker', 'CALENDAR', 420, 104, 20, 'forest'),
      { type: 'paragraph', id: 'event-name', text: '[Event name]', x: 420, y: 196, width: 600, size: 64, leading: 70, maxLines: 3, colour: 'ink', font: 'display' },
      dashed('event-rule-0', 64, 1016, 480),
      label('where-label', 'WHERE', 64, 548, 18, 'bark'), t('event-place', '[Place]', 260, 550, 32, 'ink'),
      dashed('event-rule-1', 64, 1016, 600),
      label('when-label', 'WHEN', 64, 668, 18, 'bark'), t('event-time', '[Time]', 260, 670, 32, 'ink'),
      dashed('event-rule-2', 64, 1016, 720),
      label('host-label', 'HOST', 64, 788, 18, 'bark'), t('event-host', '[Club or host]', 260, 790, 32, 'ink'),
      dashed('event-rule-3', 64, 1016, 840),
      { type: 'logo', x: 64, y: 940, width: 280, colour: 'forest', family: 'words' },
      label('event-site', 'OVERTHEEDGE.UNBC.CA/CALENDAR', 1016, 974, 18, 'forest', { anchor: 'end' })
    ]
  },
  {
    id: 'story-vertical', label: 'Story, vertical', group: 'Print and social', title: '{name} / vertical story / 1080 × 1920', width: 1080, height: 1920, raster: 1080,
    elements: [
      { type: 'background', fill: 'forest' },
      { type: 'symbol', x: 560, y: 1180, height: 900, colour: 'pine' },
      { type: 'logo', x: 96, y: 120, width: 400, colour: 'white' },
      label('vertical-section', '[SECTION]', 96, 700, 26, 'lichen'),
      { type: 'paragraph', id: 'vertical-headline', text: '[Headline]', x: 96, y: 820, width: 888, size: 96, leading: 104, maxLines: 5, colour: 'white', font: 'display' },
      dashed('vertical-rule', 96, 984, 1680, 'lichen'),
      label('vertical-site', 'READ AT OVERTHEEDGE.UNBC.CA', 96, 1760, 26, 'lichen')
    ]
  },
  {
    id: 'share-image', label: 'Link preview image', group: 'Web', title: '{name} / link preview / 1200 × 630', width: 1200, height: 630, raster: 1200,
    elements: [
      { type: 'background', fill: 'newsprint' },
      rect('o-panel', 840, 0, 360, 630, 'forest'),
      { type: 'symbol', x: 895, y: 136, height: 358, colour: 'lichen' },
      { type: 'logo', x: 72, y: 66, width: 300, colour: 'forest', family: 'words' },
      { type: 'paragraph', id: 'page-title', text: '[Page title goes here]', x: 72, y: 330, width: 700, size: 60, leading: 66, maxLines: 3, colour: 'ink', font: 'display' },
      label('site', 'OVERTHEEDGE.UNBC.CA', 72, 570, 18, 'bark')
    ]
  },
  {
    id: 'social-banner', label: 'Social banner', group: 'Web', title: '{name} / social banner / 1584 × 396', width: 1584, height: 396, raster: 1584,
    elements: [
      { type: 'background', fill: 'forest' },
      { type: 'logo', x: 96, y: 143, width: 640, colour: 'white' },
      label('banner-descriptor', SOURCED_LINES.descriptor.toUpperCase(), 1488, 210, 18, 'lichen', { anchor: 'end' })
    ]
  },
  {
    id: 'slide-title', label: 'Slide, title', group: 'Presentations', title: '{name} / 16:9 slide / title', width: 1920, height: 1080, raster: 1920,
    elements: [
      { type: 'background', fill: 'newsprint' },
      rect('masthead', 96, 96, 760, 180, 'forest'),
      { type: 'logo', x: 146, y: 129, width: 660, colour: 'white', ground: 'forest' },
      dashed('title-rule', 96, 1824, 640),
      { type: 'paragraph', id: 'deck-title', text: '[Deck title]', x: 96, y: 790, width: 1600, size: 120, leading: 124, maxLines: 2, colour: 'ink', font: 'display' },
      label('deck-details', '[EVENT OR GROUP] · [MONTH YEAR]', 100, 960, 28, 'bark')
    ]
  },
  {
    id: 'slide-section', label: 'Slide, section', group: 'Presentations', title: '{name} / 16:9 slide / section', width: 1920, height: 1080, raster: 1920,
    elements: [
      { type: 'background', fill: 'forest' },
      { type: 'logo', x: 1584, y: 96, width: 240, colour: 'lichen', family: 'words' },
      anton('section-number', '[01]', 96, 600, 360, 'lichen'),
      { type: 'paragraph', id: 'section-title', text: '[Section title]', x: 96, y: 820, width: 1600, size: 120, leading: 124, maxLines: 1, colour: 'white', font: 'display' },
      dashed('section-rule', 96, 1824, 900, 'lichen')
    ]
  },
  {
    id: 'slide-close', label: 'Slide, close', group: 'Presentations', title: '{name} / 16:9 slide / close', width: 1920, height: 1080, raster: 1920,
    elements: [
      { type: 'background', fill: 'newsprint' },
      { type: 'logo', x: 510, y: 400, width: 900, colour: 'forest' },
      dashed('close-rule', 510, 1410, 660),
      label('close-site', 'OVERTHEEDGE.UNBC.CA', 960, 730, 28, 'forest', { anchor: 'middle' })
    ]
  }
]

// --- Icons ---------------------------------------------------------------------------------------
// Five are the site's own stroke icons (24 grid, 2 stroke, round caps and joins), read from
// reference/site-icons.json, which holds each one exactly as the site serves it. Only their geometry
// is kept; the kit's icon attributes paint them. Five more are drawn the same way.

const SITE_ICONS = siteIcons(`${folder}reference/site-icons.json`)
const ICONS = {
  size: 24,
  attrs: { stroke: 'currentColor', 'stroke-width': '2', fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
  title: '{name} / {icon} icon',
  items: [
    ...SITE_ICONS,
    { id: 'newspaper', content: '<path d="M4 4h13v16H6a2 2 0 0 1-2-2z"/><path d="M17 8h3v10a2 2 0 0 1-2 2"/><path d="M8 8h5M8 12h5M8 16h3"/>' },
    { id: 'calendar', content: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>' },
    { id: 'clubs', content: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2a5 5 0 0 1 5.5 4.8"/>' },
    { id: 'pen', content: '<path d="M16.5 3.5l4 4L8 20H4v-4z"/><path d="M14 6l4 4"/>' },
    { id: 'archive', content: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/>' }
  ]
}

// --- Guide ---------------------------------------------------------------------------------------

const g = {
  label: (text, x, y, colour) => ({ type: 'label', text, x, y, ...(colour ? { colour } : {}) }),
  para: (text, x, y, width, size, extra = {}) => ({ type: 'para', text, x, y, width, size, ...extra }),
  rect: (x, y, width, height, fill, stroke) => ({ type: 'rect', x, y, width, height, fill, ...(stroke ? { stroke } : {}) }),
  logo: (x, y, width, extra = {}) => ({ type: 'logo', x, y, width, ...extra }),
  nested: (src, x, y, width, height) => ({ type: 'nested', src, x, y, width, height }),
  dashed: (x1, x2, y) => ({ type: 'path', d: `M${x1} ${y}H${x2}`, stroke: 'muted', dash: '6 5' })
}
/** A row of nested templates on a guide page, each `[id, width, label, framed?]`, `gap` apart, labelled beneath. */
const shelf = (items, y, height, gap = 24) => {
  let x = 64
  return items.flatMap(([id, width, text, framed]) => {
    const out = [...(framed ? [g.rect(x, y, width, height, 'reverse', 'line')] : []), g.nested(`templates/${id}`, x, y, width, height), g.label(text, x, y + height + 30)]
    x += width + gap
    return out
  })
}

// The Press study as four still frames: the first word dropping in, the second, the third, the still logo.
const PRESS_FRAMES = [[0.35, 0, 0, 0], [1, 0.35, 0, 0], [1, 1, 1, 0.35], [1, 1, 1, 1]].flatMap((progress, index) => {
  const x = 64 + index * 334
  const y = 266
  const scale = 270 / wordmark.variants.full.width
  const glyphFor = ['over', 'the', 'edge', 'subtext']
  return [
    g.rect(x, y, 310, 200, index === 3 ? 'light' : 'reverse', index === 3 ? undefined : 'line'),
    ...progress.flatMap((p, word) => (p === 0 ? [] : [
      { type: 'path', d: wordmark.glyphs[glyphFor[word]], fill: 'primary', transform: `translate(${x + 20} ${y + 77 + (word === 3 ? 18 : -14) * (1 - p)}) scale(${scale})`, opacity: p },
      ...(word === 3 ? [{ type: 'path', d: wordmark.glyphs.apostrophe, fill: 'primary', transform: `translate(${x + 20} ${y + 77 + 18 * (1 - p)}) scale(${scale})`, opacity: p }] : [])
    ])),
    g.label(['OVER · FIRST', 'THE · SECOND', 'EDGE · THIRD, THEN THE LINE', 'END · THE STILL LOGO'][index], x, y + 230)
  ]
})
const MOTION_PAGE = {
  name: 'Motion', title: 'Off the press, one word at a time.', subtitle: 'The logo prints in word by word, then holds. Rules roll, pages turn, and the O fills while you wait.',
  elements: [
    ...PRESS_FRAMES,
    { type: 'specTable', x: 64, right: 640, y: 590, step: 44, rows: Object.entries(TOKENS.durations).map(([key, value]) => [key[0].toUpperCase() + key.slice(1), `${value} ms`]).concat([['Stagger', `${TOKENS.stagger} ms`], ['Settle', 'Ease out, the site’s own curve']]) },
    ...RULES.map((rule, index) => g.para(`${rule.title} ${rule.text}`, 720, 590 + index * 84, 656, 17, { colour: index % 2 ? 'muted' : 'ink', line: 1.45 })),
    g.para('All the studies, with replay, are in motion/index.html in the kit and in brandkit’s Motion tab.', 64, 920, 1312, 18)
  ]
}

const GUIDE = {
  title: '{name} brand guide',
  pdfTitle: '{name} brand guide / v{displayVersion}',
  sheetsPdfTitle: '{name} logo reference sheets / v{displayVersion}',
  pageTitle: '{name} brand guide / {page}',
  width: 1440,
  height: 1020,
  frame: { background: 'paper', logo: { x: 62, y: 34, width: 150, family: 'words', colour: 'primary' }, header: '{upperName} / BRAND GUIDE / V{displayVersion}', footer: "{upperName} / UNBC'S INDEPENDENT STUDENT NEWSPAPER" },
  pages: [
    {
      name: 'Primary logo', title: 'The paper’s own lettering.', subtitle: 'OVER THE EDGE over the line UNBC’S STUDENT NEWSPAPER, exactly as the website draws it. It is never redrawn or reset in a font.',
      elements: [
        g.label('PRIMARY · FOREST ON NEWSPRINT', 64, 278), g.rect(64, 300, 836, 300, 'reverse', 'line'), g.logo(120, 330, 724, { height: 240, colour: 'primary' }),
        g.rect(924, 300, 452, 300, 'primary'), g.label('REVERSED · WHITE ON FOREST', 948, 334, 'light'), g.logo(966, 370, 368, { height: 190, colour: 'reverse' }),
        g.label('WHAT OVER THE EDGE IS', 64, 664), g.para('UNBC’s independent student newspaper, in print and at overtheedge.unbc.ca. Breaking news, vibrant clubs, can’t-miss events, and a shared university calendar.', 64, 706, 836, 26, { colour: 'ink', line: 1.5 }),
        g.label('DESCRIPTOR', 952, 664), g.para('{copy.descriptor}', 952, 706, 424, 26, { colour: 'ink', line: 1.5 }),
        g.para('The site’s header sets the subtext in ink (#262626) under forest words. That two-colour original is in logos/source/. Every other logo in this kit is one colour.', 64, 900, 1312, 18)
      ]
    },
    {
      name: 'Logo family', title: 'Four ways to sign.', subtitle: 'Choose the one that fits the space. Keep it in one colour, and keep the O whole.',
      elements: [
        g.rect(64, 255, 828, 214, 'reverse', 'line'), g.label('FULL', 86, 284), g.logo(86, 310, 780, { height: 140, align: 'start', colour: 'primary' }),
        g.rect(924, 255, 452, 214, 'primary'), g.label('WITHOUT SUBTEXT', 946, 284, 'light'), g.logo(946, 320, 408, { height: 120, family: 'words', colour: 'reverse' }),
        g.rect(64, 496, 550, 364, 'light'), g.label('STACKED', 88, 530), g.logo(88, 556, 502, { height: 280, layout: 'stacked', align: 'start', colour: 'primary' }),
        g.rect(642, 496, 378, 364, 'reverse', 'line'), g.label('THE O', 666, 530), { type: 'symbol', x: 760, y: 570, height: 240, colour: 'primary' },
        g.rect(1048, 496, 328, 364, 'ink'), g.label('SMALL SPACES', 1072, 530, 'light'), g.logo(1072, 600, 280, { height: 200, family: 'words', layout: 'wordmark', colour: 'reverse' }),
        g.para('The O is the logo’s own first letter. Use it alone only where the name cannot be read: favicons, app icons, avatars, patterns.', 64, 920, 1312, 18)
      ]
    },
    {
      name: 'Clear space and sizes', title: 'Room to breathe.', subtitle: 'Half the height of the O, clear on every side. Below 288 px wide, drop the subtext.',
      elements: [
        g.rect(64, 260, 840, 330, 'reverse', 'line'),
        { type: 'rect', x: 124, y: 330, width: 720, height: 190, fill: 'none', stroke: 'line', dash: '6 5' },
        g.logo(124 + 720 * 42.8 / (690.72 + 85.6), 330 + 190 * 42.8 / (118.59 + 85.6), 720 * 690.72 / (690.72 + 85.6), { colour: 'primary' }),
        g.label('CLEAR SPACE · HALF THE O', 64, 630),
        { type: 'specTable', x: 960, right: 1376, y: 300, step: 54, rows: [['Clear space', '42.8 logo units'], ['Full logo, screen', '288 px wide'], ['Full logo, print', '58 mm wide'], ['Without subtext', '96 px / 20 mm wide'], ['The O', '16 px / 5 mm tall']] },
        g.para('The subtext’s capitals are 6 px tall at 288 px wide on screen, and 1.2 mm tall at 58 mm in print. Below either, use the logo without subtext; below that, the O.', 64, 690, 840, 22, { colour: 'ink', line: 1.5 })
      ]
    },
    {
      name: 'Colour', title: 'Forest on newsprint.', subtitle: 'One green, one paper, one ink. The rest supports them, and red is only ever an editor’s mark.',
      elements: [
        { type: 'swatches', x: 64, y: 267, step: 330, width: 300, height: 275, colours: ['forest', 'pine', 'newsprint', 'ink'] },
        g.label('SUPPORT', 64, 728),
        { type: 'swatchStrip', x: 64, y: 748, step: 164, width: 150, height: 64, colours: ['lichen', 'sage', 'moss', 'kraft', 'pulp', 'bark', 'proof', 'white'] },
        g.para('Lichen #E3EFCF · Sage #6AA380 · Moss #466855 · Kraft #D4C8AA · Pulp #DBD0BA · Bark #7D6B56 · Proof #B54A35 · White #FFFFFF.', 64, 840, 1312, 15),
        // Every text pair the templates use, as measured (WCAG 2). test/overtheedge.test.js holds the page to the plan's list.
        g.para(`Text pairs, measured: ${CONTRAST.map(([fg, bg, ratio]) => `${fg} on ${bg} ${ratio} : 1`).join(' · ')}. At 24 px and up only: ${LARGE_ONLY.map(([fg, bg, ratio]) => `${fg} on ${bg} ${ratio} : 1`).join(' · ')}. Proof is for Breaking and Correction only.`, 64, 868, 1312, 15)
      ]
    },
    {
      name: 'Typography', title: 'Five voices, five jobs.', subtitle: 'Serif for the news, Anton for the front page, Inter for the interface, Plex Mono for the dateline, one hand-written note.',
      elements: [
        g.label('HEADLINES / {fonts.display.label}', 64, 278),
        { type: 'text', text: 'Bears Don’t Really Hibernate… Or Do They?', x: 62, y: 352, size: 56, font: 'display', tracking: -0.01 },
        { type: 'rule', y: 392 },
        g.label('FRONT PAGE / {fonts.extra.label}, CAPITALS', 64, 436),
        { type: 'text', text: 'OCTOBER 16TH · IN THIS ISSUE', x: 62, y: 510, size: 64, font: 'extra' },
        { type: 'rule', y: 550 },
        g.label('INTERFACE / {fonts.body.label}', 64, 594),
        g.para('Breaking news, vibrant clubs, can’t-miss events, and a shared university calendar.', 64, 640, 860, 26, { colour: 'ink', line: 1.5 }),
        g.label('DECK / {fonts.deck.label}', 964, 594),
        g.para('One sentence under the headline.', 964, 640, 412, 26, { colour: 'ink', line: 1.5, font: 'deck' }),
        { type: 'rule', y: 724 },
        g.label('DATELINE / {fonts.label.label}', 64, 768),
        { type: 'text', text: 'VOLUME 32 · ISSUE 2 · OCTOBER 16, 2025', x: 64, y: 818, size: 26, font: 'label', tracking: 0.08 },
        g.label('ONE NOTE / {fonts.hand.label}', 964, 768),
        { type: 'text', text: 'Over the Edge is here!', x: 962, y: 822, size: 40, font: 'hand', colour: 'primary' },
        g.para('Anton and Gochi Hand stand in for the print covers’ faces, which are not known. Replace them if the print team has the originals.', 64, 900, 1312, 18)
      ]
    },
    {
      name: 'Print devices', title: 'Borrowed from the front page.', subtitle: 'The dashed index, page numbers, the masthead block and the keyline frame come from the printed issue.',
      elements: [
        g.nested('templates/issue-cover', 64, 262, 488, 610), g.label('ISSUE COVER · 1080 × 1350', 64, 900),
        g.nested('patterns/o-repeat', 600, 262, 360, 225), g.label('O REPEAT', 600, 515),
        g.nested('patterns/o-crop', 1000, 262, 376, 235), g.label('O CROP', 1000, 525),
        g.nested('patterns/o-field', 600, 560, 360, 225), g.label('O FIELD', 600, 813),
        { type: 'list', x: 1000, detailX: 1130, right: 1376, y: 590, step: 52, rows: [['INDEX', 'Dashed rules, bark.'], ['PAGES', 'Two digits, Anton.'], ['MASTHEAD', 'Forest block.'], ['FRAME', 'White keyline.'], ['NOTE', 'One, by hand.']] }
      ]
    },
    {
      name: 'Applications', title: 'Ready for the newsroom.', subtitle: 'Cards, a press pass, social posts and slides, with editable text. Letterhead, banner and link preview are in the kit.',
      elements: [
        ...shelf([['business-card-front', 403, '90 × 50 MM CARD, FRONT'], ['business-card-back', 403, 'BACK', true], ['slide-title', 418, '1920 × 1080 SLIDE', true]], 263, 235),
        ...shelf([['press-pass', 188, 'PRESS PASS', true], ['story-post', 240, 'STORY POST', true], ['event-post', 300, 'EVENT POST', true], ['story-vertical', 169, 'VERTICAL'], ['issue-out', 300, 'NEW ISSUE']], 568, 300)
      ]
    },
    MOTION_PAGE,
    {
      name: 'Files', title: 'Use the right file for the job.', subtitle: 'The same artwork drives the vectors, images, templates and web components.',
      elements: [
        g.label('SCREEN & PRINT', 64, 278),
        { type: 'list', x: 64, detailX: 267, right: 818, y: 322, step: 63, rows: [['SVG', 'Scale-independent logos and the O.'], ['PNG', 'Transparent artwork for slides and documents.'], ['PDF', 'Vector handoff and print proofs.'], ['REACT / CSS', 'Inline colour inheritance and local fonts.'], ['BRAND.JSON', 'One source for the whole identity.']] },
        g.rect(883, 263, 493, 342, 'primary'), g.label('MINIMUM SIZES', 913, 307, 'light'),
        { type: 'text', text: '{lockup.minimumHorizontalWidthPx} px / {lockup.minimumHorizontalWidthMm} mm', x: 913, y: 366, size: 33, font: 'display', colour: 'reverse' },
        g.para('Full logo width, screen and print. Without subtext: 96 px / 20 mm.', 913, 407, 429, 19, { colour: 'light' }),
        { type: 'text', text: '{lockup.minimumSymbolHeightPx} px / {lockup.minimumSymbolHeightMm} mm', x: 913, y: 494, size: 33, font: 'display', colour: 'reverse' },
        g.para('Height of the O on its own.', 913, 535, 429, 19, { colour: 'light' }),
        g.label('SMALL SCREEN ICONS', 64, 670), { type: 'symbol', x: 66, y: 704, height: 136, colour: 'primary' }, g.label('THE O', 64, 882),
        g.para('Open index.html in the kit to browse every file. Edit brand.json, or this brand’s script, and rebuild to change any of them.', 493, 706, 800, 23, { colour: 'ink' })
      ]
    }
  ],
  sheets: [{ id: 'logo-sheet-01', group: 'logo-sheets', width: 1440, height: 1020, title: '{name} logo reference sheet', elements: [
    g.rect(0, 0, 1440, 1020, 'paper'), { type: 'text', text: 'Logo reference sheet', x: 64, y: 88, size: 42, font: 'display' }, g.label('OVER THE EDGE / LOGO REFERENCE', 64, 128),
    g.label('FULL', 64, 221), g.logo(64, 240, 1000, { height: 200, align: 'start', colour: 'primary' }),
    g.label('WITHOUT SUBTEXT', 64, 518), g.logo(64, 540, 760, { height: 120, align: 'start', family: 'words', colour: 'primary' }),
    g.label('STACKED', 980, 518), g.logo(980, 540, 396, { height: 380, align: 'start', layout: 'stacked', colour: 'primary' }),
    g.label('THE O', 64, 718), { type: 'symbol', x: 64, y: 740, height: 180, colour: 'primary' },
    g.label('OUTLINED ARTWORK / V{displayVersion}', 64, 980)
  ] }]
}

// --- The brand -----------------------------------------------------------------------------------

const starter = createStarterBrand({ id: 'overtheedge', name: 'Over the Edge', tagline: SOURCED_LINES.tagline, wordmark: { text: 'OVER THE EDGE', font: 'extra' } }, fonts)

const brand = {
  ...starter,
  version: '1.0',
  displayVersion: '1.0',
  source: 'The logo from the SVG overtheedge.unbc.ca serves (reference/logo-site.svg); colours from the site\'s theme and the 2025 print covers; written by scripts/brands/overtheedge.mjs.',
  status: '"Forest press": an evolution of the paper\'s look. The logo is the site\'s own artwork, unedited. Anton and Gochi Hand stand in for the print covers\' faces.',
  colours: COLOURS,
  roles: { ink: 'ink', paper: 'newsprint', muted: 'bark', primary: 'forest', light: 'lichen', reverse: 'white', line: 'pulp', rule: 'kraft' },
  logoColours: ['forest', 'ink', 'white', 'lichen', 'currentColor'],
  rasterColours: ['forest', 'ink', 'white', 'lichen'],
  fonts: FONTS,
  typography: { headlines: { family: 'Source Serif 4', weight: 700, trackingEm: -0.01 }, body: { family: 'Inter', weight: 400 }, labels: { family: 'IBM Plex Mono', weight: 500, trackingEm: 0.08 } },
  symbol,
  wordmark,
  families: [
    { id: 'overtheedge', wordmark: 'full', typeHeight: 118.59, stackedTypeHeight: 280, lockupSymbol: false, stackedWordmark: 'stacked', label: 'Over the Edge' },
    { id: 'words', wordmark: 'words', typeHeight: 85.57, stackedTypeHeight: 280, lockupSymbol: false, stackedWordmark: 'stacked', label: 'Over the Edge, without subtext' }
  ],
  lockup: {
    iconHeight: 85.57, iconGap: 0, stackedIconHeight: 85.57, stackedTypeHeight: 280, stackedGap: 0, canvasPadding: 16, wordmarkHeight: 118.59,
    clearspaceRecommendation: 'Half the height of the O, clear on every side.',
    minimumHorizontalWidthPx: 288, minimumSymbolHeightPx: 16,
    minimumHorizontalWidthMm: 58, minimumSymbolHeightMm: 5
  },
  copy: {
    svgDescription: 'Over the Edge identity artwork: the paper\'s own lettering. Self-contained vector artwork generated by brandkit.',
    templateDescription: 'Over the Edge application. Logo outlined; text live and editable.',
    logoLabel: 'Over the Edge logo', motifLabel: 'Over the Edge O', tagline: SOURCED_LINES.tagline, descriptor: SOURCED_LINES.descriptor
  },
  patterns: [
    { id: 'o-repeat', title: '{name} / repeating O', width: 960, height: 600, background: 'newsprint', repeat: { x: [-20, 1000, 120], y: [-40, 680, 150], scale: 1.2, colour: 'pulp' } },
    { id: 'o-crop', title: '{name} / large O crop', width: 960, height: 600, background: 'forest', place: [{ x: 380, y: -160, scale: 9, colour: 'pine' }] },
    { id: 'o-field', title: '{name} / the O on lichen', width: 960, height: 600, background: 'lichen', place: [{ x: 391, y: 172, scale: 3, colour: 'forest' }] }
  ],
  icons: ICONS,
  motion: { page: 'motion/index.html', css: 'motion/motion.css', tokens: TOKENS, rules: RULES, studies: STUDIES },
  templates: TEMPLATES,
  guide: GUIDE,
  web: {
    ...starter.web,
    componentName: 'OverTheEdgeLogo',
    symbolComponentName: 'OverTheEdgeO',
    cssPrefix: 'ote',
    appIcon: { background: 'forest', colour: 'white', size: 640 },
    favicon: { light: COLOURS.forest, dark: COLOURS.lichen, size: 56, title: '{name} favicon / the O' },
    intro: { eyebrow: SOURCED_LINES.descriptor, headline: 'Over the Edge\nBrand assets.', body: 'The paper’s own lettering, forest on newsprint, Source Serif and Anton: logos, templates and web files from one brand.json.', edition: 'v{displayVersion}', typeSample: 'Over the Edge\nis here!', footer: "Over the Edge · UNBC's Independent Student Newspaper" },
    landing: { eyebrow: SOURCED_LINES.descriptor, headline: "UNBC's Independent\nStudent Newspaper", body: SOURCED_LINES.hero, cta: 'Read News', contactEyebrow: 'Get Involved', contactBody: '[Add a contact address or form here.]', footer: 'Over the Edge' }
  },
  files: [
    { to: 'README.md', from: 'docs/README.md' },
    { to: 'CHANGELOG.md', from: 'docs/CHANGELOG.md' },
    { to: 'guidelines/brand-details.html', from: 'docs/brand-details.html' },
    'motion/index.html', 'motion/motion.css', 'motion/motion-tokens.json', 'motion/README.md',
    { to: 'logos/source/overtheedge-site-light.svg', from: 'reference/logo-site.svg' },
    { to: 'logos/source/overtheedge-site-dark.svg', from: 'reference/logo-site-dark.svg' },
    'fonts/README.md', 'fonts/Inter-OFL.txt', 'fonts/desktop/Inter-Regular.ttf', 'fonts/desktop/Inter-SemiBold.ttf', 'fonts/web/Inter-Regular.woff2', 'fonts/web/Inter-SemiBold.woff2', 'fonts/Anton-OFL.txt', 'fonts/IBMPlexMono-OFL.txt', 'fonts/GochiHand-OFL.txt', 'fonts/SourceSerif-OFL.md',
    'fonts/Anton-Regular.ttf', 'fonts/SourceSerif4-Regular.ttf', 'fonts/SourceSerif4-Bold.ttf', 'fonts/SourceSerif4-It.ttf', 'fonts/IBMPlexMono-Medium.ttf', 'fonts/GochiHand-Regular.ttf'
  ]
}
delete brand.fields

// --- Motion, brand details and site --------------------------------------------------------------
// The pages embed the brand's own font files, so they need no network (docs/PLANS.md M3).

const asset = (file) => findAsset(folder, file)
// Each face's web file: the shared Inter woff2, and the brand's own TTFs.
const faces = (...keys) => keys.map((key) => ({ family: FONTS[key].family, weight: FONTS[key].weight, style: FONTS[key].style ?? 'normal', file: FONTS[key].web }))
const geometry = { wordmark, o: O_PATH, oBox: symbol.viewBox.slice(2) }

mkdirSync(`${folder}motion`, { recursive: true })
writeFileSync(`${folder}motion/index.html`, motionPage(geometry, COLOURS, embeddedFonts(asset, faces('display', 'body', 'label', 'extra'))))
writeFileSync(`${folder}motion/motion.css`, motionCss(COLOURS))
writeFileSync(`${folder}motion/motion-tokens.json`, `${JSON.stringify({ ...TOKENS, rules: RULES.map((rule) => rule.title) }, null, 2)}\n`)
writeFileSync(`${folder}motion/README.md`, motionReadme())

writeFileSync(`${folder}docs/brand-details.html`, detailsPage({ brand, fonts }, { fontFaces: embeddedFonts(asset, faces('display', 'body', 'label', 'extra', 'hand')), contrastPairs: CONTRAST, largeOnly: LARGE_ONLY, studies: STUDIES }))

// The site uses the same CSS, and draws its fonts, header logo, issue logo and loader from the brand:
// each sits between <!-- ote:name --> markers in site/index.html, replaced on every run.
mkdirSync(`${folder}site/assets`, { recursive: true })
mkdirSync(`${folder}site/licenses`, { recursive: true })
writeFileSync(`${folder}site/assets/motion.css`, motionCss(COLOURS))
for (const file of ['Anton-OFL.txt', 'IBMPlexMono-OFL.txt', 'GochiHand-OFL.txt', 'SourceSerif-OFL.md', 'Inter-OFL.txt']) writeFileSync(`${folder}site/licenses/${file}`, readFileSync(asset(`fonts/${file}`)))
const sitePath = `${folder}site/index.html`
let site = readFileSync(sitePath, 'utf8')
for (const [name, markup] of [
  ['fonts', embeddedFonts(asset, faces('display', 'body', 'bold', 'label', 'extra', 'hand'))],
  ['logo', lockupMarkup(geometry, 'site-logo', 'Over the Edge')],
  // The issue panel is narrower than the full logo's 288 px minimum, so it carries the logo without its subtext.
  ['issue-logo', lockupMarkup(geometry, 'issue-logo', 'Over the Edge', { subtext: false })],
  ['loader', markMarkup(geometry, 'Loading')]
]) {
  const pattern = new RegExp(`(<!-- ote:${name} -->)[\\s\\S]*?(<!-- /ote:${name} -->)`)
  if (!pattern.test(site)) throw new Error(`site/index.html has no ote:${name} markers`)
  site = site.replace(pattern, (_, open, close) => open + markup + close)
}
writeFileSync(sitePath, site)

writeFileSync(`${folder}brand.json`, `${JSON.stringify(brand, null, 2)}\n`)
updateManifest(brand)
console.log(`brands/overtheedge/brand.json: ${brand.templates.length} templates, ${brand.guide.pages.length} guide pages, ${brand.icons.items.length} icons, ${brand.motion.studies.length} motion studies`)
