// Over the Edge's motion: tokens, rules and studies as data, and the files the kit carries for them.
//
// The paper moves like a press run: the logo's words print in one at a time, rules roll, pages
// turn, and the O fills with ink while you wait. Every study is CSS keyframes over the brand's own
// artwork (the logo's word glyphs, the O, the print devices). Each element's resting style is its
// final frame and the keyframes run from the first, so with reduced motion, or before anything
// plays, every study shows where it ends. Used by scripts/brands/overtheedge.mjs, which writes the
// files into brands/overtheedge/motion/ and the site's header logo and loader.

import { readFileSync } from 'node:fs'
import { n } from '../../src/engine/format.js'

export const TOKENS = {
  // quick and base are the site's own transitions (160 and 240 ms).
  durations: { quick: 160, base: 240, slow: 480, draw: 1200, loop: 1600 },
  easings: { settle: 'cubic-bezier(.2, .6, .2, 1)', move: 'cubic-bezier(.6, 0, .2, 1)', linear: 'linear' },
  stagger: 80,
  distance: 16
}

export const RULES = [
  { title: 'Print, don’t perform.', text: 'The logo arrives word by word and then holds. It never bounces, spins, blurs, glows or changes colour, and every logo study ends on the exact still logo.' },
  { title: 'One thing at a time.', text: 'Stagger related parts by 80 ms, left to right and top to bottom, the order a reader takes in a page.' },
  { title: 'Loops are for waiting.', text: 'Only loaders loop, and only the O or a print device loops, never the full logo. Stop the loop as soon as the wait is over.' },
  { title: 'Still is a valid frame.', text: 'With reduced motion, show the final frame. Nothing should depend on the animation to be understood.' }
]

/** [id, name, kind, group, timing, use, description], in library order. */
const LIST = [
  ['press', 'Press', 'logo', 'Logo', 'slow, 80 ms stagger · settle', 'Site intro, video opener, issue launch', 'OVER, THE and EDGE print in one at a time, dropping a few pixels into place; then UNBC’S STUDENT NEWSPAPER rises under them.'],
  ['stack', 'Stack', 'logo', 'Logo', 'slow, 80 ms stagger · settle', 'Covers, posters, vertical video', 'The stacked logo, each line rising out of its own mask, as on the October 2025 cover.'],
  ['ink', 'Ink', 'logo', 'Logo', 'draw · move', 'Longer moments: video, keynote, a new volume', 'The logo is uncovered left to right, the way a roller lays ink on a plate.'],
  ['rolling-rules', 'Rolling rules', 'loader', 'Loading', 'loop · linear', 'Lists and search results while they load', 'The issue index’s dashed rules roll past, one line after another.'],
  ['page-count', 'Page count', 'loader', 'Loading', 'loop · settle', 'Opening an issue, the archive', 'Anton page numbers turn over: 03, 05, 10, as in the index.'],
  ['o-fill', 'O fill', 'loader', 'Loading', 'loop · move', 'Page and app loading, 24 px and up', 'The O fills with forest from the foot up, holds, and empties. The O only; it stops when loading ends.'],
  ['airplane', 'Paper airplane', 'loader', 'Loading', 'loop · move', 'Sending a tip, submitting a story', 'A paper airplane, like the one drawn on the October 2025 cover, glides along a dashed line.'],
  ['headline', 'Headline', 'interface', 'Interface', 'slow, 80 ms stagger · settle', 'Article headers, hero headlines, title slides', 'Each line of a Source Serif headline rises out of its own mask.'],
  ['card-pick', 'Card pick', 'interface', 'Interface', 'base · settle', 'Story cards on hover', 'A story card lifts 3 px, shifts 1 px and turns 0.4°, like a clipping picked up off the desk, then settles.'],
  ['index', 'Index', 'interface', 'Interface', 'base, 80 ms stagger · settle', 'The issue index, tables of contents', 'Each dashed rule draws across, then its page number and headline come in.'],
  ['chip', 'Chip', 'interface', 'Interface', 'quick · settle', 'Section filters', 'A filter chip presses in to 96%, and its border and label turn forest.'],
  ['turn-page', 'Turn page', 'interface', 'Interface', 'slow · move', 'Page and slide transitions', 'The next page slides over from the right edge, square-cornered, like turning a broadsheet.'],
  ['skeleton', 'Skeleton', 'interface', 'Interface', '1400 ms loop · linear', 'Cards and lists before content arrives', 'Placeholder lines in Pulp with a Newsprint highlight passing along them.']
]
export const STUDIES = LIST.map(([id, name, kind, group, timing, use, description]) => ({ id, name, kind, group, timing, use, description }))

// --- Artwork --------------------------------------------------------------------------------------

/**
 * The full logo as four animatable parts (OVER, THE, EDGE, and the subtext line with its
 * apostrophe), each in its own mask so a word can drop or rise into place.
 */
const lockupSvg = ({ wordmark }, prefix, label = 'Over the Edge', { subtext = true } = {}) => {
  // Without the subtext line (below the full logo's minimum size), the canvas ends under the words.
  const [w, h] = [wordmark.variants.full.width, subtext ? wordmark.height : wordmark.variants.words.height]
  const parts = [['over', 'ote-word--1'], ['the', 'ote-word--2'], ['edge', 'ote-word--3']]
  const mainHeight = wordmark.variants.words.height
  const words = parts.map(([glyph, cls]) => `<g class="ote-word ${cls}"><path d="${wordmark.glyphs[glyph]}"/></g>`).join('')
  return `<svg class="ote-lockup" viewBox="0 0 ${n(w)} ${n(h)}" role="img" aria-label="${label}"><clipPath id="${prefix}-main"><rect x="-2" y="-2" width="${n(w + 4)}" height="${n(mainHeight + 6)}"/></clipPath>${subtext ? `<clipPath id="${prefix}-sub"><rect x="-2" y="${n(mainHeight + 6)}" width="${n(w + 4)}" height="${n(h - mainHeight - 4)}"/></clipPath>` : ''}<g clip-path="url(#${prefix}-main)">${words}</g>${subtext ? `<g clip-path="url(#${prefix}-sub)"><g class="ote-word ote-word--4"><path d="${wordmark.glyphs.subtext}"/><path d="${wordmark.glyphs.apostrophe}"/></g></g>` : ''}</svg>`
}

/** The stacked logo, OVER / THE / EDGE, each line in its own mask. */
const stackedSvg = ({ wordmark }, prefix) => {
  const variant = wordmark.variants.stacked
  const lines = variant.parts.map((part, index) => `<clipPath id="${prefix}-l${index}"><rect x="-2" y="${n(part.y - 4)}" width="${n(variant.width + 4)}" height="${n(96)}"/></clipPath><g clip-path="url(#${prefix}-l${index})"><g class="ote-line ote-line--${index + 1}"><path transform="translate(${n(part.x)} ${n(part.y)})" d="${wordmark.glyphs[part.glyph]}"/></g></g>`).join('')
  return `<svg class="ote-stacked" viewBox="0 0 ${n(variant.width)} ${n(variant.height)}" role="img" aria-label="Over the Edge, stacked">${lines}</svg>`
}

/** The O, drawn twice: an outline and a fill that rises inside it. */
const oSvg = ({ o, oBox }, prefix, label = 'Loading') => `<svg class="ote-o" viewBox="0 0 ${n(oBox[0])} ${n(oBox[1])}" role="img" aria-label="${label}"><clipPath id="${prefix}-o"><path d="${o}"/></clipPath><path class="ote-o__ghost" d="${o}"/><g clip-path="url(#${prefix}-o)"><rect class="ote-o__ink" x="0" y="0" width="${n(oBox[0])}" height="${n(oBox[1])}"/></g></svg>`

// A paper airplane drawn nose-right about its own centre, so it can follow a path's direction.
const PLANE = 'M-22 -12L22 0L-22 12L-12 0ZM-12 0L22 0'

const studyArt = (id, geometry) => {
  switch (id) {
    case 'press': return lockupSvg(geometry, 'press')
    case 'stack': return stackedSvg(geometry, 'stack')
    case 'ink': return `<div class="ote-ink">${lockupSvg(geometry, 'ink')}</div>`
    case 'rolling-rules': return `<svg class="ote-rules" viewBox="0 0 240 90" role="img" aria-label="Dashed rules rolling"><path class="ote-rule ote-rule--1" d="M0 15H240"/><path class="ote-rule ote-rule--2" d="M0 45H240"/><path class="ote-rule ote-rule--3" d="M0 75H240"/></svg>`
    case 'page-count': return `<div class="ote-count" role="img" aria-label="Page numbers turning over"><span class="ote-count__reel"><b>03</b><b>05</b><b>10</b><b>03</b></span></div>`
    case 'o-fill': return oSvg(geometry, 'ofill')
    case 'airplane': return `<svg class="ote-plane" viewBox="0 0 240 120" role="img" aria-label="A paper airplane gliding"><path class="ote-plane__trail" d="M10 100C70 100 120 70 200 30"/><path class="ote-plane__craft" d="${PLANE}"/></svg>`
    case 'headline': return `<p class="ote-headline"><span><span>Bears Don’t Really</span></span><span><span>Hibernate… Or Do They?</span></span></p>`
    case 'card-pick': return `<div class="ote-card"><span class="ote-card__img"></span><span class="ote-card__tag">[Section]</span><b>The Forgotten Crest</b></div>`
    case 'index': return `<ol class="ote-index">${[['03', 'Bests of Home Echo at the Prince George Garba Night 2025'], ['05', 'Green So Far'], ['10', 'So I Accidentally Became Someone’s Boss (And It Was Weird)']].map(([page, title], i) => `<li style="--i:${i}"><span class="ote-index__rule"></span><b>${page}</b><span>${title}</span></li>`).join('')}</ol>`
    case 'chip': return `<span class="ote-chip">Student Life</span>`
    case 'turn-page': return `<div class="ote-turn"><div class="ote-turn__page ote-turn__page--a"><small>NEWS</small><b>Top Stories</b></div><div class="ote-turn__page ote-turn__page--b"><small>CALENDAR</small><b>This week</b></div></div>`
    case 'skeleton': return `<div class="ote-skeleton" aria-label="Loading placeholder"><span class="ote-skeleton__img"></span><span class="ote-skeleton__line" style="width:70%"></span><span class="ote-skeleton__line" style="width:90%"></span><span class="ote-skeleton__line" style="width:55%"></span></div>`
    default: throw new Error(`No artwork for study ${id}`)
  }
}

/** The full logo and the O as animatable inline SVG, for pages outside the library (the site). */
export const lockupMarkup = (geometry, prefix, label, options) => lockupSvg(geometry, prefix, label, options)
export const markMarkup = (geometry, label = 'Loading') => oSvg(geometry, 'loader', label)

// --- CSS ------------------------------------------------------------------------------------------

const ms = (value) => `${value}ms`

export const motionCss = (colours) => `/* Over the Edge motion. Tokens, keyframes and the classes the motion library uses.
   Resting styles are final frames: an element plays only inside a .play container, and nothing
   plays with prefers-reduced-motion. Generated by scripts/brands/overtheedge-motion.mjs. */
:root {
${Object.entries(TOKENS.durations).map(([key, value]) => `  --ote-${key}: ${ms(value)};`).join('\n')}
${Object.entries(TOKENS.easings).map(([key, value]) => `  --ote-${key}: ${value};`).join('\n')}
  --ote-stagger: ${ms(TOKENS.stagger)};
  --ote-distance: ${TOKENS.distance}px;
${Object.entries(colours).map(([key, value]) => `  --ote-${key}: ${value};`).join('\n')}
}

/* The logo and the O draw in currentColor. */
.ote-lockup, .ote-stacked, .ote-o { display: block; fill: currentColor; overflow: visible; }
.ote-word, .ote-line { transform-box: view-box; }

/* Press: the words print in one at a time, then the subtext rises. */
@keyframes ote-print { from { transform: translateY(-14px); opacity: 0; } }
@keyframes ote-rise-sub { from { transform: translateY(18px); } }
.play .ote-lockup .ote-word--1 { animation: ote-print var(--ote-slow) var(--ote-settle) both; }
.play .ote-lockup .ote-word--2 { animation: ote-print var(--ote-slow) var(--ote-settle) var(--ote-stagger) both; }
.play .ote-lockup .ote-word--3 { animation: ote-print var(--ote-slow) var(--ote-settle) calc(var(--ote-stagger) * 2) both; }
.play .ote-lockup .ote-word--4 { animation: ote-rise-sub var(--ote-slow) var(--ote-settle) calc(var(--ote-stagger) * 5) both; }

/* Stack: each line rises out of its mask. */
@keyframes ote-rise-line { from { transform: translateY(100px); } }
.play .ote-line { animation: ote-rise-line var(--ote-slow) var(--ote-settle) both; }
.play .ote-line--2 { animation-delay: var(--ote-stagger); } .play .ote-line--3 { animation-delay: calc(var(--ote-stagger) * 2); }

/* Ink: uncovered left to right. */
.ote-ink { width: 100%; }
@keyframes ote-ink { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
.play .ote-ink { animation: ote-ink var(--ote-draw) var(--ote-move) both; }

/* Rolling rules: the index's dashes roll past. */
.ote-rules { display: block; overflow: visible; }
.ote-rule { fill: none; stroke: currentColor; stroke-width: 2; stroke-dasharray: 10 8; }
@keyframes ote-roll { to { stroke-dashoffset: -36; } }
.play .ote-rule { animation: ote-roll var(--ote-loop) linear infinite; }
.play .ote-rule--2 { animation-delay: calc(var(--ote-stagger) * -2); } .play .ote-rule--3 { animation-delay: calc(var(--ote-stagger) * -4); }

/* Page count: the numbers turn over. */
.ote-count { height: 1em; overflow: hidden; font-family: Anton, 'Arial Narrow', Impact, sans-serif; font-size: 72px; line-height: 1; color: currentColor; }
.ote-count__reel { display: flex; flex-direction: column; }
.ote-count__reel b { font-weight: 400; height: 1em; }
@keyframes ote-count { 0%, 22% { transform: translateY(0); } 33%, 55% { transform: translateY(-1em); } 66%, 88% { transform: translateY(-2em); } 100% { transform: translateY(-3em); } }
.play .ote-count__reel { animation: ote-count calc(var(--ote-loop) * 2) var(--ote-settle) infinite; }

/* O fill: forest rises inside the O, holds, and drains. At rest the O is full. */
.ote-o__ghost { fill: none; stroke: currentColor; stroke-width: 2; }
.ote-o__ink { fill: currentColor; transform-box: fill-box; transform-origin: 50% 100%; }
@keyframes ote-fill { 0% { transform: scaleY(0); } 45%, 70% { transform: scaleY(1); } 100% { transform: scaleY(0); } }
.play .ote-o__ink { animation: ote-fill var(--ote-loop) var(--ote-move) infinite; }

/* Paper airplane: glides along a dashed line. */
.ote-plane { display: block; overflow: visible; }
.ote-plane__trail { fill: none; stroke: currentColor; stroke-width: 2; stroke-dasharray: 6 6; opacity: .5; }
.ote-plane__craft { fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linejoin: round; offset-path: path('M10 100C70 100 120 70 200 30'); offset-rotate: auto; offset-anchor: 0 0; offset-distance: 100%; }
@keyframes ote-glide { 0% { offset-distance: 0%; opacity: 0; } 12% { opacity: 1; } 85% { opacity: 1; } 100% { offset-distance: 100%; opacity: 0; } }
.play .ote-plane__craft { animation: ote-glide calc(var(--ote-loop) * 1.5) var(--ote-move) infinite; }

/* Headline: each line out of its own mask. */
.ote-headline { margin: 0; font-family: 'Source Serif 4', Georgia, serif; font-weight: 700; font-size: 28px; line-height: 1.1; letter-spacing: -.01em; }
.ote-headline > span { display: block; overflow: hidden; padding-bottom: .08em; }
.ote-headline > span > span { display: block; }
@keyframes ote-rise { from { transform: translateY(110%); } }
.play .ote-headline > span > span { animation: ote-rise var(--ote-slow) var(--ote-settle) both; }
.play .ote-headline > span:nth-child(2) > span { animation-delay: var(--ote-stagger); }

/* Card pick: lift, shift, turn, settle. */
.ote-card { width: min(200px, 100%); background: var(--ote-white); color: var(--ote-ink); border: 1px solid var(--ote-pulp); display: grid; gap: 8px; padding: 0 0 14px; font-family: 'Source Serif 4', Georgia, serif; font-size: 17px; }
.ote-card__img { display: block; aspect-ratio: 4 / 3; background: var(--ote-sage); }
.ote-card__tag, .ote-card b { margin: 0 14px; } .ote-card b { font-weight: 700; }
.ote-card__tag { justify-self: start; font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: var(--ote-forest); }
@keyframes ote-pick { 0%, 20% { transform: none; box-shadow: 0 1px 2px color-mix(in srgb, var(--ote-ink) 10%, transparent); } 45%, 75% { transform: translate(1px, -3px) rotate(-0.4deg); box-shadow: 0 8px 24px color-mix(in srgb, var(--ote-ink) 18%, transparent); } 100% { transform: none; box-shadow: 0 1px 2px color-mix(in srgb, var(--ote-ink) 10%, transparent); } }
.play .ote-card { animation: ote-pick calc(var(--ote-loop) * 1.5) var(--ote-settle) infinite; }

/* Index: rules draw, then numbers and headlines come in. */
.ote-index { list-style: none; margin: 0; padding: 0; width: min(260px, 100%); display: grid; }
.ote-index li { position: relative; display: grid; grid-template-columns: 44px minmax(0, 1fr); align-items: center; gap: 10px; padding: 10px 0; }
.ote-index__rule { position: absolute; left: 0; right: 0; bottom: 0; border-bottom: 1.5px dashed var(--ote-bark); transform-origin: left; }
.ote-index b { font-family: Anton, 'Arial Narrow', Impact, sans-serif; font-weight: 400; font-size: 28px; line-height: 1; color: var(--ote-forest); }
.ote-index li > span:last-child { font-family: 'Source Serif 4', Georgia, serif; font-weight: 700; font-size: 13px; line-height: 1.25; }
@keyframes ote-draw-rule { from { transform: scaleX(0); } }
@keyframes ote-in { from { transform: translateY(8px); opacity: 0; } }
.play .ote-index__rule { animation: ote-draw-rule var(--ote-base) var(--ote-settle) calc(var(--i) * var(--ote-stagger) * 2) both; }
.play .ote-index b, .play .ote-index li > span:last-child { animation: ote-in var(--ote-base) var(--ote-settle) calc(var(--i) * var(--ote-stagger) * 2 + var(--ote-base)) both; }

/* Chip: press in to 96%, turn forest, let go. */
.ote-chip { display: inline-block; border: 1px solid var(--ote-forest); background: var(--ote-white); color: var(--ote-forest); border-radius: 999px; padding: 10px 20px; font-family: Inter, system-ui, sans-serif; font-size: 14px; font-weight: 500; }
@keyframes ote-chip { 0%, 40% { transform: none; border-color: var(--ote-pulp); color: var(--ote-bark); } 46%, 56% { transform: scale(.96); } 66%, 100% { transform: none; border-color: var(--ote-forest); color: var(--ote-forest); } }
.play .ote-chip { animation: ote-chip calc(var(--ote-loop) * 1.25) var(--ote-settle) both; }

/* Turn page: the next page slides over from the right. */
.ote-turn { position: relative; width: min(260px, 100%); aspect-ratio: 16 / 10; overflow: hidden; }
.ote-turn__page { position: absolute; inset: 0; padding: 14px; display: flex; flex-direction: column; justify-content: flex-end; gap: 4px; }
.ote-turn__page small { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 9px; letter-spacing: .08em; }
.ote-turn__page b { font-family: 'Source Serif 4', Georgia, serif; font-size: 20px; }
.ote-turn__page--a { background: var(--ote-newsprint); color: var(--ote-ink); }
.ote-turn__page--b { background: var(--ote-forest); color: var(--ote-white); box-shadow: -8px 0 16px color-mix(in srgb, var(--ote-ink) 20%, transparent); }
@keyframes ote-turn { from { transform: translateX(105%); } }
.play .ote-turn__page--b { animation: ote-turn var(--ote-slow) var(--ote-move) 300ms both; }

/* Skeleton: Pulp lines with a Newsprint highlight passing. */
.ote-skeleton { width: min(240px, 100%); display: grid; gap: 10px; }
.ote-skeleton span { display: block; background: linear-gradient(100deg, var(--ote-pulp) 40%, var(--ote-newsprint) 50%, var(--ote-pulp) 60%) 0 0 / 300% 100%; }
.ote-skeleton__img { height: 84px; } .ote-skeleton__line { height: 12px; }
@keyframes ote-shimmer { from { background-position: 100% 0; } to { background-position: 0 0; } }
.play .ote-skeleton span { animation: ote-shimmer 1400ms linear infinite; }

/* Pause everything; and never move for people who ask not to. */
.ote-paused *, .ote-paused *::before, .ote-paused *::after { animation-play-state: paused !important; }
@media (prefers-reduced-motion: reduce) {
  .play *, .play *::before, .play *::after, .play { animation: none !important; }
}
`

// --- Fonts, embedded so the pages need no network ------------------------------------------------

/** `@font-face` rules with the brand's own files (TTF or WOFF2) as data: URIs. */
export const embeddedFonts = (resolve, faces) => faces.map(({ family, weight, style = 'normal', file }) => {
  const data = readFileSync(resolve(file)).toString('base64')
  const [mime, format] = file.endsWith('.woff2') ? ['font/woff2', 'woff2'] : ['font/ttf', 'truetype']
  return `@font-face { font-family: '${family}'; font-weight: ${weight}; font-style: ${style}; font-display: swap; src: url(data:${mime};base64,${data}) format('${format}'); }`
}).join('\n')

// --- The library page ----------------------------------------------------------------------------

const escape = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const GROUND = { logo: 'newsprint', loader: 'forest', interface: 'newsprint' }
const STAGE = { ink: 'pine', stack: 'lichen', 'card-pick': 'kraft', 'turn-page': 'pine', airplane: 'newsprint' }

export const motionPage = (geometry, colours, fonts) => {
  const studies = STUDIES.map((study) => {
    const ground = STAGE[study.id] ?? GROUND[study.kind]
    return `<article class="study" data-kind="${study.kind}" id="${study.id}">
  <div class="stage stage--${ground} play" data-study="${study.id}">${studyArt(study.id, geometry)}</div>
  <div class="meta"><div class="meta__head"><h3>${escape(study.name)}</h3><span class="kind">${escape(study.group)}</span></div>
  <p>${escape(study.description)}</p>
  <dl><dt>Timing</dt><dd>${escape(study.timing)}</dd><dt>Use</dt><dd>${escape(study.use)}</dd></dl>
  <button type="button" class="replay" data-replay="${study.id}">Replay</button></div>
</article>`
  }).join('\n')
  const durations = Object.entries(TOKENS.durations).map(([key, value]) => `<tr><td>--ote-${key}</td><td>${value} ms</td><td><span class="len" style="--w:${Math.round(value / 16)}%"></span></td></tr>`).join('')
  const curve = (value) => {
    const m = /cubic-bezier\(([^)]+)\)/.exec(value)
    const [x1, y1, x2, y2] = m ? m[1].split(',').map(Number) : [0, 0, 1, 1]
    return `<svg viewBox="-4 -4 108 108" class="curve" aria-hidden="true"><path class="curve__axis" d="M0 100H100M0 100V0"/><path class="curve__line" d="M0 100C${x1 * 100} ${100 - y1 * 100} ${x2 * 100} ${100 - y2 * 100} 100 0"/></svg>`
  }
  const easings = Object.entries(TOKENS.easings).map(([key, value]) => `<div class="ease"><div class="ease__head">${curve(value)}<div><b>--ote-${key}</b><code>${escape(value)}</code></div></div><div class="ease__track"><span style="animation-timing-function:${value}"></span></div></div>`).join('')
  const rules = RULES.map((rule) => `<li><b>${escape(rule.title)}</b><span>${escape(rule.text)}</span></li>`).join('')
  const chips = [['all', 'All'], ['logo', 'Logo'], ['loader', 'Loading'], ['interface', 'Interface']].map(([id, label], index) => `<button type="button" class="chip" data-filter="${id}" aria-pressed="${index === 0}">${label}</button>`).join('')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Over the Edge Motion Library</title>
<style>
/* Fonts: the brand's own files, embedded, under the SIL Open Font License (see fonts/). */
${fonts}
${motionCss(colours)}
/* The library page: forest on newsprint, square corners, dashed rules. */
* { box-sizing: border-box; }
body { margin: 0; background: var(--ote-newsprint); color: var(--ote-ink); font-family: Inter, system-ui, Arial, sans-serif; font-size: 16px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
:focus-visible { outline: 2px solid var(--ote-forest); outline-offset: 3px; }
.page { max-width: 1240px; margin: 0 auto; padding: 20px max(16px, env(safe-area-inset-right, 0px)) 72px max(16px, env(safe-area-inset-left, 0px)); display: flex; flex-direction: column; gap: 56px; }
.bar { background: var(--ote-forest); color: var(--ote-white); padding: 18px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.bar .ote-lockup { height: 48px; width: auto; }
.bar span, .label, .kind, td:first-child, .chip, .action, .replay { font-family: 'IBM Plex Mono', ui-monospace, Menlo, monospace; }
.bar span { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--ote-lichen); }
.label { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--ote-bark); }
h1, h2, h3 { margin: 0; font-family: 'Source Serif 4', Georgia, serif; font-weight: 700; text-wrap: balance; }
h1 { font-size: clamp(40px, 6.4vw, 80px); line-height: 1.02; letter-spacing: -.02em; max-width: 14ch; }
h2 { font-size: clamp(26px, 3vw, 36px); line-height: 1.1; }
.intro { display: grid; gap: 20px; padding-top: 24px; }
.intro p { margin: 0; max-width: 62ch; font-size: 17px; }
.sec { display: grid; gap: 24px; border-top: 1.5px dashed var(--ote-bark); padding-top: 28px; }
.cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
table { width: 100%; border-collapse: collapse; font-size: 14px; font-variant-numeric: tabular-nums; }
td { padding: 12px 8px; border-bottom: 1px solid var(--ote-pulp); white-space: nowrap; } td:first-child { font-size: 13px; color: var(--ote-bark); } td:last-child { width: 50%; }
td .len { display: block; height: 6px; width: var(--w); background: var(--ote-forest); }
.eases { display: grid; gap: 14px; }
.ease { border: 1px solid var(--ote-pulp); background: var(--ote-white); padding: 16px; display: grid; gap: 14px; }
.ease__head { display: flex; gap: 16px; align-items: center; }
.ease__head b { display: block; font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 13px; font-weight: 500; }
.ease__head code { font-size: 12px; color: var(--ote-bark); }
.curve { width: 56px; height: 56px; flex: none; } .curve__axis { fill: none; stroke: var(--ote-pulp); stroke-width: 2; } .curve__line { fill: none; stroke: var(--ote-forest); stroke-width: 3; }
.ease__track { height: 12px; background: var(--ote-newsprint); position: relative; }
.ease__track span { position: absolute; left: 0; top: 0; width: 12px; height: 12px; background: var(--ote-forest); animation: ote-track 1600ms infinite alternate; }
@keyframes ote-track { to { left: calc(100% - 12px); } }
.rules { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: 16px; }
.rules li { background: var(--ote-white); border: 1px solid var(--ote-pulp); padding: 24px; display: grid; gap: 8px; align-content: start; }
.rules li:nth-child(2) { background: var(--ote-forest); color: var(--ote-white); border-color: var(--ote-forest); } .rules li:nth-child(3) { background: var(--ote-lichen); border-color: var(--ote-lichen); } .rules li:nth-child(4) { background: var(--ote-pine); color: var(--ote-white); border-color: var(--ote-pine); }
.rules b { font-family: 'Source Serif 4', Georgia, serif; font-size: 20px; line-height: 1.25; } .rules span { font-size: 14px; }
.controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: space-between; }
.chips, .actions { display: flex; flex-wrap: wrap; gap: 8px; }
button { font: inherit; cursor: pointer; }
.chip, .action { border: 1px solid var(--ote-bark); background: transparent; color: var(--ote-ink); border-radius: 999px; padding: 8px 16px; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; }
.chip[aria-pressed="true"], .action[aria-pressed="true"] { background: var(--ote-forest); color: var(--ote-white); border-color: var(--ote-forest); }
.chip:hover, .action:hover { border-color: var(--ote-forest); }
button:disabled { opacity: .4; cursor: not-allowed; }
.studies { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
.study { display: grid; gap: 14px; align-content: start; }
.stage { aspect-ratio: 4 / 3; max-width: 100%; display: grid; place-items: center; padding: 24px; overflow: hidden; }
.stage--newsprint { background: var(--ote-white); color: var(--ote-forest); box-shadow: inset 0 0 0 1px var(--ote-pulp); } .stage--forest { background: var(--ote-forest); color: var(--ote-lichen); }
.stage--pine { background: var(--ote-pine); color: var(--ote-white); } .stage--lichen { background: var(--ote-lichen); color: var(--ote-forest); } .stage--kraft { background: var(--ote-kraft); color: var(--ote-ink); }
.stage .ote-lockup, .stage .ote-ink { width: 86%; height: auto; } .stage .ote-stacked { width: 44%; height: auto; } .stage .ote-o { width: 18%; height: auto; }
.stage .ote-rules { width: 80%; } .stage .ote-plane { width: 76%; }
.meta { display: grid; gap: 8px; }
.meta__head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.meta h3 { font-size: 21px; } .kind { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--ote-bark); }
.meta p { margin: 0; font-size: 14px; }
dl { margin: 0; display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 2px 14px; font-size: 13px; }
dt { color: var(--ote-bark); } dd { margin: 0; }
.replay { justify-self: start; border: 0; background: var(--ote-forest); color: var(--ote-white); border-radius: 999px; padding: 8px 16px; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; }
.replay:hover { background: var(--ote-pine); }
.note { font-size: 13px; color: var(--ote-bark); margin: 0; }
footer { border-top: 1.5px dashed var(--ote-bark); padding-top: 24px; font-size: 13px; color: var(--ote-bark); display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
@media (max-width: 960px) { .studies { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { .studies, .cols { grid-template-columns: minmax(0, 1fr); } }
@media (prefers-reduced-motion: reduce) { .ease__track span { animation: none; left: calc(100% - 12px); } }
</style>
</head>
<body>
<div class="page">
<header class="bar">${lockupSvg(geometry, 'header')}<span>Motion library</span></header>

<section class="intro">
  <span class="label">Motion · v1.0</span>
  <h1>Off the press, one word at a time.</h1>
  <p>Over the Edge moves like a print run: the logo’s words print in and hold, rules roll, pages turn, and the O fills with ink while you wait. These studies cover the logo, loading and the interface. They share a few timings, the site’s own 160 ms and 240 ms among them, and each ends on a still frame you could print.</p>
</section>

<section class="sec" aria-labelledby="h-tokens">
  <div><span class="label">Tokens</span><h2 id="h-tokens">Timing and easing</h2></div>
  <div class="cols">
    <table><tbody>${durations}<tr><td>--ote-stagger</td><td>${TOKENS.stagger} ms</td><td><span class="len" style="--w:${Math.round(TOKENS.stagger / 16)}%"></span></td></tr></tbody></table>
    <div class="eases">${easings}</div>
  </div>
  <p class="note">The same values are in motion.css as custom properties and in motion-tokens.json for code.</p>
</section>

<section class="sec" aria-labelledby="h-rules">
  <div><span class="label">Rules</span><h2 id="h-rules">How Over the Edge moves</h2></div>
  <ol class="rules">${rules}</ol>
</section>

<section class="sec" aria-labelledby="h-studies">
  <div><span class="label">Studies</span><h2 id="h-studies">Logo, loading, interface</h2></div>
  <div class="controls">
    <div class="chips" role="group" aria-label="Show">${chips}</div>
    <div class="actions"><button type="button" class="action" id="replay-all">Replay all</button><button type="button" class="action" id="pause" aria-pressed="false">Pause</button></div>
  </div>
  <p class="note" id="reduced-note" hidden>Your system asks for reduced motion, so every study shows its final frame.</p>
  <div class="studies">
${studies}
  </div>
</section>

<footer><span>Over the Edge motion library · generated by brandkit from brand.json</span><span>motion.css · motion-tokens.json</span></footer>
</div>
<script>
(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var stages = Array.prototype.slice.call(document.querySelectorAll('.stage'));
  var buttons = Array.prototype.slice.call(document.querySelectorAll('.replay, #replay-all, #pause'));
  function play(stage) { stage.classList.remove('play'); void stage.offsetWidth; stage.classList.add('play'); }
  function setReduced() {
    var on = reduced.matches;
    buttons.forEach(function (b) { b.disabled = on; });
    document.getElementById('reduced-note').hidden = !on;
  }
  document.addEventListener('click', function (event) {
    var replay = event.target.closest('[data-replay]');
    if (replay) play(document.querySelector('[data-study="' + replay.getAttribute('data-replay') + '"]'));
    if (event.target.closest('#replay-all')) stages.forEach(play);
    var pause = event.target.closest('#pause');
    if (pause) {
      var paused = document.body.classList.toggle('ote-paused');
      pause.setAttribute('aria-pressed', String(paused));
      pause.textContent = paused ? 'Resume' : 'Pause';
    }
    var chip = event.target.closest('[data-filter]');
    if (chip) {
      var kind = chip.getAttribute('data-filter');
      document.querySelectorAll('[data-filter]').forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      document.querySelectorAll('.study').forEach(function (s) { s.hidden = kind !== 'all' && s.getAttribute('data-kind') !== kind; });
    }
  });
  if (reduced.addEventListener) reduced.addEventListener('change', setReduced);
  setReduced();
})();
</script>
</body>
</html>
`
}

export const motionReadme = () => `# Over the Edge motion

Open \`index.html\` for the motion library: ${STUDIES.length} studies of the logo, loading states and interface, each with its timing, where to use it, and a replay button.

## Use it in a site

Link \`motion.css\`. It defines the tokens and the palette as custom properties, and every study's keyframes:

\`\`\`html
<link rel="stylesheet" href="motion.css">
<div class="play" data-study="o-fill"><!-- the O's SVG, copied from index.html --></div>
\`\`\`

The redesigned site (\`site/index.html\` in the brand's folder in brandkit) is a worked example. An element animates only inside a \`.play\` container, and its resting style is its last frame, so it reads correctly before, after, and without motion. Add \`.ote-paused\` to any ancestor to pause; with \`prefers-reduced-motion: reduce\` nothing moves.

## Tokens

| Token | Value |
|---|---|
${Object.entries(TOKENS.durations).map(([key, value]) => `| \`--ote-${key}\` | ${value} ms |`).join('\n')}
${Object.entries(TOKENS.easings).map(([key, value]) => `| \`--ote-${key}\` | \`${value}\` |`).join('\n')}
| \`--ote-stagger\` | ${TOKENS.stagger} ms |
| \`--ote-distance\` | ${TOKENS.distance} px |

\`motion-tokens.json\` holds the same values for code.

## Rules

${RULES.map((rule) => `- **${rule.title}** ${rule.text}`).join('\n')}

## Studies

| Study | Kind | Timing | Use |
|---|---|---|---|
${STUDIES.map((study) => `| ${study.name} | ${study.group} | ${study.timing} | ${study.use} |`).join('\n')}
`
