// Writes brands/overtheedge/brand.json: Over the Edge, UNBC's independent student newspaper, in its
// "Doodle" identity, the one the paper's own team designed for 2025–27.
//
//   npm run make:overtheedge
//
// The logo is the paper's own: the SVG its website serves, vendored once in reference/logo-site.svg
// and read here path by path (scripts/brands/overtheedge-logo.mjs). The words OVER, THE and EDGE
// and the subtext line become the horizontal wordmark's glyphs, unedited; the O alone is the symbol.
// The stacked masthead is extracted from page 1 of the September 2025 PDF.
//
// Colour, type and the applications follow the team's identity files (reference/identity/): four
// flat colours (Cream #FFFBF3, Forest #155329, Lichen #E3EFCF, Ink #262626) read from the files'
// own fills; Decalotype, Helvetica Neue and Salted, with Anton standing in for Decalotype, which is
// not openly licensed; and the doodles, stickers, tags and dashed rules drawn in
// scripts/brands/overtheedge-doodle.mjs. The earlier "Forest press" templates stay, re-set in this type.

import { extendBrandPatterns } from './pattern-collections.mjs'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createStarterBrand } from '../../src/engine/starter.js'
import { findAsset, loadBrandFontsFromDisk } from '../../src/fonts/node.js'
import { updateManifest } from './common.mjs'
import { loadCoverLogo, loadLogo, pathBounds, siteIcons, union, up } from './overtheedge-logo.mjs'
import { embeddedFonts, lockupMarkup, markMarkup, motionCss, motionPage, motionReadme, RULES, STUDIES, TOKENS } from './overtheedge-motion.mjs'
import { detailsPage } from './overtheedge-details.mjs'
import { doodleKit } from './overtheedge-doodle.mjs'
import { importPrinterPackage } from '../../src/printer/package.js'

const folder = new URL('../../brands/overtheedge/', import.meta.url).pathname
mkdirSync(folder, { recursive: true })

const INPUTS = ['reference/logo-site.svg', 'reference/logo-site-dark.svg', 'reference/logo-cover-stacked.svg', 'fonts/Salted-Regular.otf', 'fonts/LICENSE-Salted.txt', 'reference/site-icons.json', 'fonts/Anton-Regular.ttf', 'fonts/SourceSerif4-Regular.ttf', 'fonts/SourceSerif4-Bold.ttf', 'fonts/SourceSerif4-It.ttf', 'fonts/IBMPlexMono-Medium.ttf', 'fonts/GochiHand-Regular.ttf', 'docs/README.md', 'docs/CHANGELOG.md', 'fonts/README.md', 'site/index.html']
for (const input of INPUTS) {
  if (!existsSync(`${folder}${input}`)) {
    console.error(`Missing input: brands/overtheedge/${input}`)
    process.exit(1)
  }
}

// --- Type ----------------------------------------------------------------------------------------

const face = (family, stack, file, weight, label, extra = {}) => ({ family, stack, weight, file, web: file, label, ...extra })
const HELVETICA = '"Helvetica Neue", Helvetica, Arial, sans-serif'
// The identity names three faces: Decalotype for headlines, Helvetica Neue for reading and Salted
// for the handwritten accents. Decalotype is a commercial face, so Anton, the closest open face
// already in fonts/, stands in for it. Labels are Helvetica Neue Bold in capitals, as the dates
// and section names in the posts are.
const FONTS = {
  body: face('Helvetica Neue', HELVETICA, 'printer/staff-card/fonts/1-helveticaneue-medium.otf', 500, 'Helvetica Neue Medium'),
  bold: face('Helvetica Neue', HELVETICA, 'printer/staff-card/fonts/0-helveticaneue-bold.otf', 700, 'Helvetica Neue Bold'),
  display: face('Anton', 'Anton, "Arial Narrow", Impact, sans-serif', 'fonts/Anton-Regular.ttf', 400, 'Anton Regular 400, for Decalotype'),
  label: face('Helvetica Neue', HELVETICA, 'printer/staff-card/fonts/0-helveticaneue-bold.otf', 700, 'Helvetica Neue Bold, capitals'),
  hand: face('Salted', 'Salted, cursive', 'fonts/Salted-Regular.otf', 400, 'Salted Regular', { license: 'fonts/LICENSE-Salted.txt', usage: 'Personal use only', sample: 'ISSUE #2 is out!' })
}
const fonts = await loadBrandFontsFromDisk({ fonts: FONTS }, folder)
if (fonts.failures.length) throw new Error(`Fonts failed to load: ${fonts.failures.join(', ')}`)

// --- The logo ------------------------------------------------------------------------------------

const { glyphs: { o: O_PATH, ...glyphs } } = loadLogo(`${folder}reference/logo-site.svg`)
const cover = loadCoverLogo(`${folder}reference/logo-cover-stacked.svg`)
const box = (d) => pathBounds(d)
const words = { over: box(glyphs.over), the: box(glyphs.the), edge: box(glyphs.edge) }
const full = union(Object.values(glyphs).map(box))
const main = union(Object.values(words))
const stackedParts = ['over', 'the', 'edge'].map((word) => ({ glyph: `cover-${word}`, attrs: { 'data-word': word.toUpperCase() } }))
const stackedBox = union(['over', 'the', 'edge'].map((word) => box(cover.glyphs[`cover-${word}`])))
const coverBox = union(Object.values(cover.glyphs).map(box))
const oBox = box(O_PATH)

const wordmark = {
  optionalSubtext: { withFamily: 'overtheedge', withoutFamily: 'words', colour: 'ink' },
  height: up(full[3]),
  left: 0,
  glyphs: { ...glyphs, ...cover.glyphs },
  variants: {
    full: { width: up(full[2]), parts: [{ glyph: 'over', attrs: { 'data-word': 'OVER' } }, { glyph: 'the', attrs: { 'data-word': 'THE' } }, { glyph: 'edge', attrs: { 'data-word': 'EDGE' } }, { glyph: 'subtext', attrs: { 'data-line': 'subtext' } }, { glyph: 'apostrophe', attrs: { 'data-line': 'subtext' } }] },
    words: { width: up(main[2]), height: up(main[3]), parts: [{ glyph: 'over', attrs: { 'data-word': 'OVER' } }, { glyph: 'the', attrs: { 'data-word': 'THE' } }, { glyph: 'edge', attrs: { 'data-word': 'EDGE' } }] },
    stacked: { width: up(stackedBox[2]), height: up(stackedBox[3]), parts: stackedParts },
    'cover-stacked': { width: up(coverBox[2]), height: up(coverBox[3]), parts: [...stackedParts, { glyph: 'cover-subtext', attrs: { 'data-line': 'subtext' } }] }
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

// The logo's OVER THE EDGE lettering, for the identity's faint repeated ground.
const WORDS = { d: glyphs.over + glyphs.the + glyphs.edge, width: up(main[2]), height: up(main[3]) }

// --- Colour --------------------------------------------------------------------------------------
// The identity's palette slide names four colours, and its SVGs fill with exactly those: Cream
// #FFFBF3, Lichen #E3EFCF, Forest #155329 and Ink #262626. Cream keeps the key `newsprint`, the
// paper's role, so the supporting pattern studies and the motion library keep working. Four tints are
// sampled from the posts: the faint OVER THE EDGE ground on cream (Haze), the flame behind a deadline
// (Flame), the crumpled paper sheet (Crumple) and the issue number on the cream deadline (Ember).
// Pine to Proof are the earlier Forest press colours, kept for the supporting studies and the site.

const COLOURS = {
  forest: '#155329', newsprint: '#FFFBF3', lichen: '#E3EFCF', ink: '#262626',
  haze: '#F5F1EA', flame: '#FFF2D8', crumple: '#F4F4F4', ember: '#6D4900', white: '#FFFFFF',
  pine: '#0C3B1C', sage: '#6AA380', moss: '#466855', kraft: '#D4C8AA', pulp: '#DBD0BA', bark: '#7D6B56', proof: '#B54A35'
}
const COLOUR_NAMES = { newsprint: 'Cream' }

/** WCAG 2 contrast between two palette colours, to one decimal place. */
const contrastOf = (a, b) => {
  const lum = (hex) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi, lo] = [lum(COLOURS[a]), lum(COLOURS[b])].sort((x, y) => y - x)
  return ((hi + 0.05) / (lo + 0.05)).toFixed(1)
}
// Every text pair the templates use, and its contrast as measured.
const CONTRAST = [['ink', 'newsprint'], ['forest', 'newsprint'], ['ember', 'newsprint'], ['newsprint', 'forest'], ['lichen', 'forest'], ['white', 'forest'], ['newsprint', 'ink'], ['lichen', 'ink'], ['ink', 'lichen'], ['forest', 'lichen'], ['ink', 'crumple'], ['forest', 'crumple'], ['bark', 'newsprint'], ['white', 'moss'], ['bark', 'white'], ['ink', 'white']].map(([fg, bg]) => [fg, bg, contrastOf(fg, bg)])
// Allowed only for text 24 px and larger.
const LARGE_ONLY = [['sage', 'forest']].map(([fg, bg]) => [fg, bg, contrastOf(fg, bg)])

// --- Copy ----------------------------------------------------------------------------------------
// Only lines the paper already uses: on its site, its covers or its own identity files (the
// Doodle templates quote those). Templates use these or bracketed placeholders;
// test/overtheedge.test.js holds them to it.

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
const anton = (id, text, x, y, size, colour, extra = {}) => t(id, text, x, y, size, colour, { font: 'display', ...extra })
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
// The Doodle identity's own applications come first (scripts/brands/overtheedge-doodle.mjs); the
// cards, letterhead and earlier Forest press posts and slides follow, re-set in the identity's type.

const DOODLE = doodleKit({ hex: (key) => COLOURS[key], fonts, words: WORDS })

const TEMPLATES = [
  ...DOODLE.templates,
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
        { id: 'story-deck', text: '[One-sentence deck]', size: 32, leading: 44, gap: 76, wrap: 900, maxLines: 2, font: 'body', colour: 'ink' }
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
        g.label('PRIMARY · FOREST ON CREAM', 64, 278), g.rect(64, 300, 836, 300, 'paper', 'line'), g.logo(120, 330, 724, { height: 240, colour: 'primary' }),
        g.rect(924, 300, 452, 300, 'primary'), g.label('REVERSED · CREAM ON FOREST', 948, 334, 'light'), g.logo(966, 370, 368, { height: 190, colour: 'reverse' }),
        g.label('WHAT OVER THE EDGE IS', 64, 664), g.para('A student-run newspaper and creative platform that gives students space to share their voices, perspectives, and ideas. In print and at overtheedge.unbc.ca.', 64, 706, 836, 26, { colour: 'ink', line: 1.5 }),
        g.label('DESCRIPTOR', 952, 664), g.para('{copy.descriptor}', 952, 706, 424, 26, { colour: 'ink', line: 1.5 }),
        g.para('The site’s header sets the subtext in ink (#262626) under forest words. That two-colour original is in logos/source/. Every other logo in this kit is one colour.', 64, 900, 1312, 18)
      ]
    },
    {
      name: 'Logo family', title: 'Four grounds, one colour each.', subtitle: 'The stacked masthead leads the identity, in the four pairings its files use. Keep it in one colour, and keep the O whole.',
      elements: [
        ...[['paper', 'primary', 'FOREST ON CREAM'], ['ink', 'light', 'LICHEN ON INK'], ['light', 'primary', 'FOREST ON LICHEN'], ['primary', 'reverse', 'CREAM ON FOREST']].flatMap(([ground, colour, text], i) => [
          g.rect(64 + i * 334, 255, 310, 300, ground, ground === 'paper' ? 'line' : undefined), g.logo(88 + i * 334, 280, 262, { height: 250, layout: 'stacked', colour }), g.label(text, 64 + i * 334, 585)
        ]),
        g.rect(64, 630, 828, 214, 'paper', 'line'), g.label('FULL', 86, 659), g.logo(86, 685, 780, { height: 140, align: 'start', colour: 'primary' }),
        g.rect(924, 630, 220, 214, 'light'), g.label('THE O', 946, 659), { type: 'symbol', x: 1000, y: 690, height: 120, colour: 'primary' },
        g.rect(1156, 630, 220, 214, 'ink'), g.label('SMALL SPACES', 1176, 659, 'light'), g.logo(1176, 690, 180, { height: 136, family: 'words', layout: 'stacked', colour: 'light' }),
        g.para('The O is the logo’s own first letter. Use it alone only where the name cannot be read: favicons, app icons, avatars, patterns.', 64, 920, 1312, 18)
      ]
    },
    {
      name: 'Clear space and sizes', title: 'Room to breathe.', subtitle: 'Half the height of the O, clear on every side. Below 288 px wide, drop the subtext.',
      elements: [
        g.rect(64, 260, 840, 330, 'paper', 'line'),
        { type: 'rect', x: 124, y: 330, width: 720, height: 190, fill: 'none', stroke: 'line', dash: '6 5' },
        g.logo(124 + 720 * 42.8 / (690.72 + 85.6), 330 + 190 * 42.8 / (118.59 + 85.6), 720 * 690.72 / (690.72 + 85.6), { colour: 'primary' }),
        g.label('CLEAR SPACE · HALF THE O', 64, 630),
        { type: 'specTable', x: 960, right: 1376, y: 300, step: 54, rows: [['Clear space', '42.8 logo units'], ['Full logo, screen', '288 px wide'], ['Full logo, print', '58 mm wide'], ['Without subtext', '96 px / 20 mm wide'], ['The O', '16 px / 5 mm tall']] },
        g.para('The subtext’s capitals are 6 px tall at 288 px wide on screen, and 1.2 mm tall at 58 mm in print. Below either, use the logo without subtext; below that, the O.', 64, 690, 840, 22, { colour: 'ink', line: 1.5 })
      ]
    },
    {
      name: 'Colour', title: 'Cream, Forest, Lichen, Ink.', subtitle: 'Four flat colours, read straight from the identity’s own files. Tints are grounds and doodles, never text.',
      elements: [
        { type: 'swatches', x: 64, y: 252, step: 330, width: 300, height: 245, colours: ['newsprint', 'forest', 'lichen', 'ink'] },
        g.label('TINTS FROM THE POSTS', 64, 690),
        { type: 'swatchStrip', x: 64, y: 708, step: 164, width: 150, height: 52, colours: ['haze', 'flame', 'crumple', 'ember', 'white'] },
        g.para('Haze #F5F1EA, the OVER THE EDGE ground on cream · Flame #FFF2D8, the flame behind a deadline · Crumple #F4F4F4, the crumpled sheet · Ember #6D4900, a deadline’s issue number · White.', 64, 790, 1312, 15),
        g.label('EARLIER, FOR THE SUPPORTING STUDIES', 900, 690),
        { type: 'swatchStrip', x: 900, y: 708, step: 68, width: 56, height: 52, colours: ['pine', 'sage', 'moss', 'kraft', 'pulp', 'bark', 'proof'] },
        // Every text pair the templates use, as measured (WCAG 2). test/overtheedge.test.js holds the page to the palette.
        g.para(`Text pairs, measured: ${CONTRAST.map(([fg, bg, ratio]) => `${fg} on ${bg} ${ratio} : 1`).join(' · ')}. At 24 px and up only: ${LARGE_ONLY.map(([fg, bg, ratio]) => `${fg} on ${bg} ${ratio} : 1`).join(' · ')}. Newsprint is the key Cream is stored under.`, 64, 850, 1312, 15)
      ]
    },
    {
      name: 'Typography', title: 'Three voices.', subtitle: 'Decalotype shouts, Helvetica Neue explains, and Salted scribbles in the margin.',
      elements: [
        g.label('HEADLINES / {fonts.display.label}', 64, 278),
        { type: 'text', text: 'Submission Schedule', x: 62, y: 380, size: 96, font: 'display', colour: 'primary' },
        { type: 'rule', y: 420 },
        g.label('READING / {fonts.body.label}', 64, 464),
        g.para('Over the Edge is a student-run newspaper and creative platform that gives students space to share their voices, perspectives, and ideas.', 64, 506, 860, 26, { colour: 'ink', line: 1.5 }),
        g.label('LABELS / {fonts.label.label}', 964, 464),
        { type: 'text', text: 'CAMPUS CORNERS', x: 964, y: 516, size: 34, font: 'label' },
        { type: 'rule', y: 620 },
        g.label('ACCENTS / {fonts.hand.label}', 64, 664),
        { type: 'text', text: 'WEEK SCHEDULE', x: 62, y: 742, size: 64, font: 'hand', colour: 'ink' },
        { type: 'text', text: 'DEADLINE', x: 620, y: 742, size: 64, font: 'hand', colour: 'primary' },
        g.para('Salted takes a word or two at a time: ISSUE, SCHEDULE, DEADLINE, a month. Never a paragraph.', 964, 700, 412, 20, { colour: 'ink', line: 1.4 }),
        g.para('Decalotype is the identity’s headline face. It is a commercial font, so Anton, the closest open face, stands in for it here; replace it if the team has the licence. Helvetica Neue and Salted are the supplied originals. Keep each font’s notice with its files.', 64, 880, 1312, 18)
      ]
    },
    {
      name: 'Doodles and elements', title: 'Drawn in the margins.', subtitle: 'Six line doodles at one weight, and the stickers, tags, dashed rules and crumpled paper that carry the schedules.',
      elements: [
        g.nested('patterns/doodle-set', 64, 255, 560, 350), g.label('THE DOODLES', 64, 635),
        g.nested('patterns/doodle-wall', 660, 255, 340, 212), g.label('DOODLE WALL', 660, 497),
        g.rect(1036, 255, 340, 212, 'paper', 'line'), g.nested('patterns/edge-ghost', 1036, 255, 340, 212), g.label('OVER THE EDGE GROUND', 1036, 497),
        g.nested('templates/month-sticker', 660, 540, 340, 102), g.label('MONTH STICKER', 660, 672),
        g.nested('patterns/zigzag-frame', 1036, 540, 120, 150), g.label('ZIGZAG FRAME', 1036, 720),
        g.nested('templates/post-week-schedule', 1196, 540, 180, 225), g.label('WEEK SCHEDULE', 1196, 795),
        { type: 'list', x: 64, detailX: 250, right: 980, y: 720, step: 46, rows: [['DOODLES', 'One round stroke, no fill but pupils and dots.'], ['DASHED RULES', 'Thin ink dashes between rows and around headings.'], ['TAGS', 'Tilted forest blocks for days of the week.'], ['STICKERS', 'Blobs with a softer copy behind, for months and titles.'], ['PAPER', 'A crumpled sheet behind a schedule.']] }
      ]
    },
    {
      name: 'Social', title: 'Made for the feed.', subtitle: 'Posts at 1080 × 1350, stories and reels at 1080 × 1920, all with editable text.',
      elements: [
        ...shelf([['post-submission-schedule', 224, 'SUBMISSIONS'], ['post-schedule', 224, 'SCHEDULE', true], ['post-deadline', 224, 'DEADLINE', true], ['post-meet-the-board', 224, 'MEET THE BOARD', true], ['post-week-schedule-forest', 224, 'WEEK']], 250, 280),
        ...shelf([['post-front-page', 224, 'FRONT PAGE', true], ['post-schedule-paper', 224, 'ON PAPER'], ['post-season-schedule', 224, 'SEASON'], ['story-week-schedule', 158, 'STORY', true], ['reel-cover', 158, 'REEL', true], ['story-issue-out', 158, 'ISSUE OUT']], 610, 280)
      ]
    },
    {
      name: 'Applications', title: 'Slides, calendars and print.', subtitle: 'The deck, the month at a glance, a poster and the stationery. The Staff Card, under Printer designs, is the press pass.',
      elements: [
        ...shelf([['slide-cover-doodle', 416, '1920 × 1080 SLIDE', true], ['slide-doodle', 416, 'DOODLE WALL'], ['slide-colourways', 416, 'COLOURWAYS']], 255, 234),
        ...shelf([['calendar-month', 240, 'MONTHLY CALENDAR', true], ['poster-write-for-us', 212, 'A4 POSTER', true], ['business-card-front', 514, '90 × 50 MM CARD'], ['story-write-for-us', 169, 'WRITE FOR US']], 570, 300)
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

const starter = createStarterBrand({ id: 'overtheedge', name: 'Over the Edge', tagline: SOURCED_LINES.tagline, wordmark: { text: 'OVER THE EDGE', font: 'display' } }, fonts)

const brand = {
  ...starter,
  version: '1.0',
  displayVersion: '1.0',
  source: 'Horizontal logo from the site SVG (reference/logo-site.svg); stacked masthead from page 1 of the September 2025 PDF (reference/logo-cover-stacked.svg); colour, type, doodles and applications from the team\'s Doodle identity files (reference/identity/); written by scripts/brands/overtheedge.mjs.',
  status: '"Doodle": the team\'s own identity, Cream, Forest, Lichen and Ink with line doodles, on the paper\'s own horizontal and stacked artwork. Salted and Helvetica Neue come from the supplied issue toolkit and staff-card package. Anton stands in for Decalotype.',
  colours: COLOURS,
  colourNames: COLOUR_NAMES,
  roles: { ink: 'ink', paper: 'newsprint', muted: 'ink', primary: 'forest', light: 'lichen', reverse: 'newsprint', line: 'lichen', rule: 'ink' },
  logoColours: ['forest', 'ink', 'newsprint', 'lichen', 'white', 'currentColor'],
  rasterColours: ['forest', 'ink', 'newsprint', 'lichen'],
  fonts: FONTS,
  typography: { headlines: { family: 'Anton', weight: 400 }, body: { family: 'Helvetica Neue', weight: 500 }, labels: { family: 'Helvetica Neue', weight: 700, trackingEm: 0.04 } },
  symbol,
  wordmark,
  families: [
    { id: 'overtheedge', wordmark: 'full', typeHeight: 118.59, stackedTypeHeight: 280, lockupSymbol: false, stackedWordmark: 'cover-stacked', label: 'Over the Edge' },
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
    { id: 'o-field', title: '{name} / the O on lichen', width: 960, height: 600, background: 'lichen', place: [{ x: 391, y: 172, scale: 3, colour: 'forest' }] },
    ...DOODLE.patterns
  ],
  symbols: DOODLE.symbols,
  illustrations: DOODLE.illustrations,
  icons: ICONS,
  motion: { page: 'motion/index.html', css: 'motion/motion.css', tokens: TOKENS, rules: RULES, studies: STUDIES },
  templates: TEMPLATES,
  guide: GUIDE,
  web: {
    ...starter.web,
    componentName: 'OverTheEdgeLogo',
    symbolComponentName: 'OverTheEdgeO',
    cssPrefix: 'ote',
    appIcon: { background: 'forest', colour: 'newsprint', size: 640 },
    favicon: { light: COLOURS.forest, dark: COLOURS.lichen, size: 56, title: '{name} favicon / the O' },
    intro: { eyebrow: SOURCED_LINES.descriptor, headline: 'Over the Edge\nBrand assets.', body: 'The paper’s own lettering in Cream, Forest, Lichen and Ink, with a margin full of doodles: logos, templates and web files from one brand.json.', edition: 'v{displayVersion}', typeSample: 'Submission\nSchedule', footer: "Over the Edge · UNBC's Independent Student Newspaper" },
    landing: { eyebrow: SOURCED_LINES.descriptor, headline: "UNBC's Independent\nStudent Newspaper", body: SOURCED_LINES.hero, cta: 'Read News', contactEyebrow: 'Get Involved', contactBody: '[Add a contact address or form here.]', footer: 'Over the Edge' }
  },
  files: [
    { to: 'README.md', from: 'docs/README.md' },
    { to: 'CHANGELOG.md', from: 'docs/CHANGELOG.md' },
    { to: 'guidelines/brand-details.html', from: 'docs/brand-details.html' },
    'motion/index.html', 'motion/motion.css', 'motion/motion-tokens.json', 'motion/README.md',
    { to: 'logos/source/overtheedge-site-light.svg', from: 'reference/logo-site.svg' },
    { to: 'logos/source/overtheedge-site-dark.svg', from: 'reference/logo-site-dark.svg' },
    'fonts/README.md', 'fonts/Salted-Regular.otf', 'fonts/LICENSE-Salted.txt', 'reference/logo-cover-stacked.svg', 'fonts/Inter-OFL.txt', 'fonts/desktop/Inter-Regular.ttf', 'fonts/desktop/Inter-SemiBold.ttf', 'fonts/web/Inter-Regular.woff2', 'fonts/web/Inter-SemiBold.woff2', 'fonts/Anton-OFL.txt', 'fonts/IBMPlexMono-OFL.txt', 'fonts/GochiHand-OFL.txt', 'fonts/SourceSerif-OFL.md',
    'fonts/Anton-Regular.ttf', 'fonts/SourceSerif4-Regular.ttf', 'fonts/SourceSerif4-Bold.ttf', 'fonts/SourceSerif4-It.ttf', 'fonts/IBMPlexMono-Medium.ttf', 'fonts/GochiHand-Regular.ttf'
  ]
}
delete brand.fields

// The supplied staff card keeps its own original design, and is the paper's press pass.
// Import through the public adapter so the example exercises the same path as other hosts.
const staffCard = importPrinterPackage(brand, readFileSync(`${folder}templates/staff-card.zip`), {
  id: 'staff-card', file: 'templates/staff-card.zip', embedAssets: false,
  sourceUrl: 'https://projects.ahmadjalil.com/builds/configs/staff_card.zip'
})
Object.assign(brand, staffCard.brand)
for (const [path, bytes] of staffCard.assets) {
  mkdirSync(`${folder}${path.slice(0, path.lastIndexOf('/'))}`, { recursive: true })
  writeFileSync(`${folder}${path}`, bytes)
}
// The Doodle identity's colourways: the same week schedule on three grounds, and the deadline on two.
brand.sets = [...(brand.sets ?? []), ...DOODLE.sets]

// --- Motion, brand details and site --------------------------------------------------------------
// The pages embed the brand's own font files, so they need no network (docs/PLANS.md M3).

const asset = (file) => findAsset(folder, file)
// Each face's file, once: label and bold share Helvetica Neue Bold.
const faces = (...keys) => [...new Map(keys.map((key) => FONTS[key]).map((f) => [`${f.family} ${f.weight}`, { family: f.family, weight: f.weight, style: f.style ?? 'normal', file: f.web }])).values()]
// The site keeps the website's own headline and dateline faces, Source Serif 4 and IBM Plex Mono.
const SITE_FACES = [{ family: 'Source Serif 4', weight: 700, style: 'normal', file: 'fonts/SourceSerif4-Bold.ttf' }, { family: 'IBM Plex Mono', weight: 500, style: 'normal', file: 'fonts/IBMPlexMono-Medium.ttf' }]
const geometry = { wordmark, o: O_PATH, oBox: symbol.viewBox.slice(2) }

mkdirSync(`${folder}motion`, { recursive: true })
writeFileSync(`${folder}motion/index.html`, motionPage(geometry, COLOURS, embeddedFonts(asset, faces('display', 'body', 'bold'))))
writeFileSync(`${folder}motion/motion.css`, motionCss(COLOURS))
writeFileSync(`${folder}motion/motion-tokens.json`, `${JSON.stringify({ ...TOKENS, rules: RULES.map((rule) => rule.title) }, null, 2)}\n`)
writeFileSync(`${folder}motion/README.md`, motionReadme())

writeFileSync(`${folder}docs/brand-details.html`, detailsPage({ brand, fonts }, { fontFaces: embeddedFonts(asset, faces('display', 'body', 'bold', 'hand')), contrastPairs: CONTRAST, largeOnly: LARGE_ONLY, studies: STUDIES }))

// The site uses the same CSS, and draws its fonts, header logo, issue logo and loader from the brand:
// each sits between <!-- ote:name --> markers in site/index.html, replaced on every run.
mkdirSync(`${folder}site/assets`, { recursive: true })
mkdirSync(`${folder}site/licenses`, { recursive: true })
writeFileSync(`${folder}site/assets/motion.css`, motionCss(COLOURS))
for (const file of ['Anton-OFL.txt', 'IBMPlexMono-OFL.txt', 'GochiHand-OFL.txt', 'LICENSE-Salted.txt', 'SourceSerif-OFL.md', 'Inter-OFL.txt']) writeFileSync(`${folder}site/licenses/${file}`, readFileSync(asset(`fonts/${file}`)))
const sitePath = `${folder}site/index.html`
let site = readFileSync(sitePath, 'utf8')
for (const [name, markup] of [
  ['fonts', embeddedFonts(asset, [...SITE_FACES, ...faces('display', 'body', 'bold', 'hand')])],
  ['logo', lockupMarkup(geometry, 'site-logo', 'Over the Edge')],
  // The issue panel is narrower than the full logo's 288 px minimum, so it carries the logo without its subtext.
  ['issue-logo', lockupMarkup(geometry, 'issue-logo', 'Over the Edge', { subtext: false })],
  ['loader', markMarkup(geometry, 'Loading')]
]) {
  const pattern = new RegExp(`(<!-- ote:${name} -->)[\\s\\S]*?(<!-- /ote:${name} -->)`)
  if (!pattern.test(site)) throw new Error(`site/index.html has no ote:${name} markers`)
  site = site.replace(pattern, (_, open, close) => open + markup + close)
}
site = site.replaceAll('font-family: Inter,', 'font-family: "Helvetica Neue",').replaceAll("'Gochi Hand'", "'Salted'")
writeFileSync(sitePath, site)

await extendBrandPatterns(brand, folder)
writeFileSync(`${folder}brand.json`, `${JSON.stringify(brand, null, 2)}\n`)
updateManifest(brand)
console.log(`brands/overtheedge/brand.json: ${brand.templates.length} templates, ${brand.guide.pages.length} guide pages, ${brand.icons.items.length} icons, ${brand.motion.studies.length} motion studies`)
