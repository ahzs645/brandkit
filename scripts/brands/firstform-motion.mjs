// First Form's motion: tokens, rules and studies as data, and the files the kit carries for them.
//
// Every study is CSS keyframes over the brand's own geometry (the mark's faces, the wordmark's
// glyphs). Each element's resting style is its final frame and the keyframes run from the first
// frame, so with reduced motion, or before anything plays, every study shows where it ends. Used
// by scripts/brands/firstform.mjs, which writes the files into brands/firstform/motion/.

import { n } from '../../src/engine/format.js'

export const TOKENS = {
  durations: { quick: 160, base: 320, slow: 640, draw: 1200, loop: 1200 },
  easings: { settle: 'cubic-bezier(.2, .7, .2, 1)', move: 'cubic-bezier(.6, 0, .2, 1)', linear: 'linear' },
  stagger: 80,
  distance: 24
}

export const RULES = [
  { title: 'Assemble, don’t decorate.', text: 'Motion shows parts fitting together. Every logo animation ends on the exact still logo: no bounce, blur, glow or colour change.' },
  { title: 'One thing at a time.', text: 'Stagger related parts by 80 ms. Move along the mark’s own axes: vertical, or the 3 : 5 isometric slope.' },
  { title: 'Loops are for waiting.', text: 'Only loaders loop, and only the mark loops, never the full logo. Stop the loop as soon as the wait is over.' },
  { title: 'Still is a valid frame.', text: 'With reduced motion, show the final frame. Nothing should depend on the animation to be understood.' }
]

/** [id, name, kind, group, timing, use, description]: the order they appear in the library. */
const LIST = [
  ['assemble', 'Assemble', 'logo', 'Logo', 'slow + base · settle', 'Site intro, video opener, app launch', 'The two blocks slide in along the isometric axis and lock together; then FIRST and FORM rise into place.'],
  ['build', 'Build', 'logo', 'Logo', 'base, 80 ms stagger · settle', 'Title slides, case study openers', 'Each block is built face by face: top, side, then the outline of the open front.'],
  ['draw', 'Draw', 'logo', 'Logo', 'draw + base · move', 'Longer moments: video, keynote, reveal', 'The line drawing of both blocks traces in, then the solid faces fill.'],
  ['turn', 'Turn', 'logo', 'Logo', '900 ms · move', 'Explaining the mark; loading handing over to ready', 'The second block starts on top of the first and turns 180° into place. The mark’s construction, shown.'],
  ['blocks', 'Block loader', 'loader', 'Loading', 'loop · move', 'Page and app loading, 24 px and up', 'The blocks part along their axis and meet again. Mark only; stops when loading ends.'],
  ['stack', 'Stack', 'loader', 'Loading', '1600 ms loop · settle', 'Building, exporting, generating', 'Three isometric blocks drop onto each other, then clear for the next round.'],
  ['module', 'Module', 'loader', 'Loading', 'loop · steps', 'Panels and lists while content loads', 'The design icon’s grid, with its one moving part travelling cell to cell.'],
  ['overlap', 'Overlap', 'loader', 'Loading', 'loop · move', 'Connecting, sending, matching', 'The consultation icon’s two circles meet in the middle and part again.'],
  ['focus', 'Focus', 'loader', 'Loading', 'slow · settle', 'Image loading, uploads, capture', 'Viewfinder brackets close in, the crosshair sets, and the photo comes up behind it.'],
  ['progress', 'Progress', 'loader', 'Loading', '2400 ms · settle', 'Multi-step forms, uploads', 'A pill track fills in three steps, lighting each stage as it passes.'],
  ['skeleton', 'Skeleton', 'interface', 'Interface', '1400 ms loop · linear', 'Cards and lists before data arrives', 'Placeholder bars with a highlight passing along the 3 : 5 diagonal.'],
  ['cards', 'Cards', 'interface', 'Interface', 'base, 80 ms stagger · settle', 'Section entrances', 'White, Graphite and Black cards rise 24 px into place, one after another.'],
  ['headline', 'Headline', 'interface', 'Interface', 'slow, 80 ms stagger · settle', 'Hero headlines, title slides', 'Each line rises out of its own mask.'],
  ['field', 'Field', 'interface', 'Interface', '2400 ms · settle', 'Contact and intake forms', 'The field takes focus, the entry types in, and Send turns into a drawn check.'],
  ['press', 'Press', 'interface', 'Interface', 'quick · settle', 'Buttons and pills', 'A pill presses in to 96% and darkens to Graphite, then lets go.'],
  ['wipe', 'Wipe', 'interface', 'Interface', 'slow · move', 'Page and slide transitions', 'The next page sweeps in behind an edge cut at the mark’s slope.']
]
export const STUDIES = LIST.map(([id, name, kind, group, timing, use, description]) => ({ id, name, kind, group, timing, use, description }))

// --- Artwork --------------------------------------------------------------------------------------

const outline = (poly) => `M${poly.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}Z`

/**
 * The mark as animatable parts: for each block its top face, side face, the outline of its open
 * front (even-odd ring), and its line drawing.
 */
const markParts = ({ silhouette, face, inner, top, side, turn }) => {
  const block = (place) => ({
    top: outline(top.map(place)),
    side: outline(side.map(place)),
    ring: outline(face.map(place)) + outline(inner.map(place).reverse()),
    edge: outline(silhouette.map(place)) + outline(face.map(place))
  })
  return [block((p) => p), block(turn)]
}

const blockSvg = (part, cls) => `<g class="ff-block ${cls}"><path class="ff-top" d="${part.top}"/><path class="ff-side" d="${part.side}"/><path class="ff-ring" fill-rule="evenodd" d="${part.ring}"/><path class="ff-edge" pathLength="1" d="${part.edge}"/></g>`
const markSvg = (parts, viewBox, label) => `<svg class="ff-mark" viewBox="${viewBox.join(' ')}" role="img" aria-label="${label}">${blockSvg(parts[0], 'ff-block--a')}${blockSvg(parts[1], 'ff-block--b')}</svg>`

/** The horizontal lockup, with each wordmark line clipped so it can rise into place. */
const lockupSvg = (parts, geometry, prefix) => {
  const { viewBox, wordmark, lockup } = geometry
  const [, , mw, mh] = viewBox
  const s = lockup.iconHeight / mh
  const k = lockup.typeHeight / wordmark.height
  const variant = wordmark.variants.firstform
  const x0 = mw * s + lockup.iconGap - wordmark.left * k
  const y0 = (lockup.iconHeight - lockup.typeHeight) / 2
  const width = mw * s + lockup.iconGap + (variant.width - wordmark.left) * k
  const lines = variant.parts.map((part, index) => {
    const next = variant.parts[index + 1]
    const bottom = next ? next.y - 2 : wordmark.height + 2
    return `<clipPath id="${prefix}-line-${index}"><rect x="${n(x0 - 4)}" y="${n(y0 + (part.y - 2) * k)}" width="${n(width)}" height="${n((bottom - part.y + 2) * k)}"/></clipPath>`
      + `<g clip-path="url(#${prefix}-line-${index})"><g class="ff-word ff-word--${index + 1}"><path transform="translate(${n(x0)} ${n(y0)}) scale(${n(k)}) translate(${n(part.x)} ${n(part.y)})" d="${wordmark.glyphs[part.glyph]}"/></g></g>`
  }).join('')
  return `<svg class="ff-lockup" viewBox="0 0 ${n(width)} ${n(lockup.iconHeight)}" role="img" aria-label="First Form logo"><g transform="scale(${n(s)})">${blockSvg(parts[0], 'ff-block--a')}${blockSvg(parts[1], 'ff-block--b')}</g>${lines}</svg>`
}

const cube = (x, y, w, cls) => {
  const h = w * 0.6
  return `<g class="ff-cube ${cls}"><path class="ff-cube__top" d="${outline([[x, y], [x + w, y - h], [x + 2 * w, y], [x + w, y + h]])}"/><path class="ff-cube__left" d="${outline([[x, y], [x + w, y + h], [x + w, y + h + 1.2 * w], [x, y + 1.2 * w]])}"/><path class="ff-cube__right" d="${outline([[x + w, y + h], [x + 2 * w, y], [x + 2 * w, y + 1.2 * w], [x + w, y + h + 1.2 * w]])}"/></g>`
}

const studyArt = (id, parts, geometry) => {
  const mark = (label = 'First Form mark') => markSvg(parts, geometry.viewBox, label)
  switch (id) {
    case 'assemble': return lockupSvg(parts, geometry, 'assemble')
    case 'build': case 'draw': case 'turn': case 'blocks': return mark()
    case 'stack': return `<svg class="ff-stack" viewBox="0 0 120 120" role="img" aria-label="Three blocks stacking">${cube(20, 78, 20, 'ff-cube--1')}${cube(60, 78, 20, 'ff-cube--2')}${cube(40, 54, 20, 'ff-cube--3')}</svg>`
    case 'module': return `<div class="ff-module" role="img" aria-label="Module grid loader">${Array.from({ length: 12 }, (_, i) => `<span style="--i:${i}"></span>`).join('')}</div>`
    case 'overlap': return `<svg class="ff-overlap" viewBox="0 0 96 64" role="img" aria-label="Two circles overlapping"><circle class="ff-overlap__a" cx="35" cy="32" r="28"/><circle class="ff-overlap__b" cx="61" cy="32" r="28"/></svg>`
    case 'focus': return `<div class="ff-focus" role="img" aria-label="Viewfinder focusing on a photo"><div class="ff-focus__photo"></div><i class="ff-focus__c ff-focus__c--tl"></i><i class="ff-focus__c ff-focus__c--tr"></i><i class="ff-focus__c ff-focus__c--bl"></i><i class="ff-focus__c ff-focus__c--br"></i><i class="ff-focus__x"></i><i class="ff-focus__y"></i></div>`
    case 'progress': return `<div class="ff-progress"><div class="ff-progress__track"><div class="ff-progress__fill"></div></div><ol class="ff-progress__steps"><li>Consultation</li><li>Design</li><li>Prototyping</li></ol></div>`
    case 'skeleton': return `<div class="ff-skeleton" aria-label="Loading placeholder"><span class="ff-skeleton__img"></span><span class="ff-skeleton__line" style="width:70%"></span><span class="ff-skeleton__line" style="width:90%"></span><span class="ff-skeleton__line" style="width:55%"></span></div>`
    case 'cards': return `<div class="ff-cards"><span class="ff-card ff-card--white"><b>Consultation</b></span><span class="ff-card ff-card--graphite"><b>Design</b></span><span class="ff-card ff-card--black"><b>Prototyping</b></span></div>`
    case 'headline': return `<p class="ff-headline"><span><span>From first idea</span></span><span><span>to first form.</span></span></p>`
    case 'field': return `<div class="ff-field"><span class="ff-field__label">Email</span><span class="ff-field__input"><span class="ff-field__text">sam@studio.co</span></span><span class="ff-field__send"><span class="ff-field__word">SEND</span><svg viewBox="0 0 24 24" aria-hidden="true"><path pathLength="1" d="M5 12.5l4.5 4.5L19 7.5"/></svg></span></div>`
    case 'press': return `<span class="ff-press">START A PROJECT</span>`
    case 'wipe': return `<div class="ff-wipe"><div class="ff-wipe__page ff-wipe__page--a"><small>PROJECTS</small><b>Selected work</b></div><div class="ff-wipe__page ff-wipe__page--b"><small>SERVICES</small><b>What we take on</b></div></div>`
    default: throw new Error(`No artwork for study ${id}`)
  }
}

/** The horizontal lockup and the mark as animatable inline SVG, for pages outside the library (the site). */
export const lockupMarkup = (geometry, prefix) => lockupSvg(markParts(geometry), geometry, prefix)
export const markMarkup = (geometry, label = 'First Form mark') => markSvg(markParts(geometry), geometry.viewBox, label)

// --- CSS ------------------------------------------------------------------------------------------

const ms = (value) => `${value}ms`

export const motionCss = (colours) => `/* First Form motion. Tokens, keyframes and the classes the motion library uses.
   Resting styles are final frames: an element plays only inside a .play container, and nothing
   plays with prefers-reduced-motion. Generated by scripts/brands/firstform-motion.mjs. */
:root {
${Object.entries(TOKENS.durations).map(([key, value]) => `  --ff-${key}: ${ms(value)};`).join('\n')}
${Object.entries(TOKENS.easings).map(([key, value]) => `  --ff-${key}: ${value};`).join('\n')}
  --ff-stagger: ${ms(TOKENS.stagger)};
  --ff-distance: ${TOKENS.distance}px;
  --ff-black: ${colours.black}; --ff-graphite: ${colours.graphite}; --ff-ash: ${colours.ash}; --ff-white: ${colours.white};
  --ff-night: ${colours.night}; --ff-coal: ${colours.coal}; --ff-rule: ${colours.hairline}; --ff-steel: ${colours.steel}; --ff-mist: ${colours.mist};
}

/* The mark and lockup draw in currentColor. The line drawing is hidden at rest. */
.ff-mark, .ff-lockup { display: block; fill: currentColor; overflow: visible; }
.ff-edge { fill: none; stroke: currentColor; stroke-width: 1.4; stroke-dasharray: 1; stroke-dashoffset: 0; opacity: 0; }
.ff-block, .ff-word, .ff-top, .ff-side, .ff-ring { transform-box: view-box; }

/* Assemble: blocks slide in along the 3:5 axis and lock; the wordmark lines rise. */
@keyframes ff-in-a { from { transform: translate(-24px, -14.4px); opacity: 0; } }
@keyframes ff-in-b { from { transform: translate(24px, 14.4px); opacity: 0; } }
@keyframes ff-rise { from { transform: translateY(110%); } }
@keyframes ff-rise-word { from { transform: translateY(70px); } }
.play .ff-lockup .ff-block--a { animation: ff-in-a var(--ff-slow) var(--ff-settle) both; }
.play .ff-lockup .ff-block--b { animation: ff-in-b var(--ff-slow) var(--ff-settle) var(--ff-stagger) both; }
.play .ff-lockup .ff-word--1 { animation: ff-rise-word var(--ff-slow) var(--ff-settle) 480ms both; }
.play .ff-lockup .ff-word--2 { animation: ff-rise-word var(--ff-slow) var(--ff-settle) 560ms both; }

/* Build: face by face. */
@keyframes ff-face-top { from { transform: translateY(-12px); opacity: 0; } }
@keyframes ff-face-side { from { transform: translate(-12px, -7.2px); opacity: 0; } }
@keyframes ff-face-ring { from { transform: translate(12px, -7.2px); opacity: 0; } }
.play[data-study="build"] .ff-top { animation: ff-face-top var(--ff-base) var(--ff-settle) both; }
.play[data-study="build"] .ff-side { animation: ff-face-side var(--ff-base) var(--ff-settle) var(--ff-stagger) both; }
.play[data-study="build"] .ff-ring { animation: ff-face-ring var(--ff-base) var(--ff-settle) calc(var(--ff-stagger) * 2) both; }
.play[data-study="build"] .ff-block--b > * { animation-delay: calc(var(--ff-stagger) * 4); }
.play[data-study="build"] .ff-block--b .ff-side { animation-delay: calc(var(--ff-stagger) * 5); }
.play[data-study="build"] .ff-block--b .ff-ring { animation-delay: calc(var(--ff-stagger) * 6); }

/* Draw: the line drawing traces in, then the faces fill and the line steps back. */
@keyframes ff-trace { 0% { stroke-dashoffset: 1; opacity: 1; } 75% { stroke-dashoffset: 0; opacity: 1; } 100% { stroke-dashoffset: 0; opacity: 0; } }
@keyframes ff-fill { from { opacity: 0; } }
.play[data-study="draw"] .ff-edge { animation: ff-trace calc(var(--ff-draw) + var(--ff-base)) var(--ff-move) both; }
.play[data-study="draw"] .ff-top, .play[data-study="draw"] .ff-side, .play[data-study="draw"] .ff-ring { animation: ff-fill var(--ff-base) var(--ff-settle) var(--ff-draw) both; }

/* Turn: the second block starts on the first and turns 180 degrees about the centre. */
@keyframes ff-turn { from { transform: rotate(-180deg); } }
[data-study="turn"] .ff-block--b { transform-origin: 75px 107.5px; }
.play[data-study="turn"] .ff-block--b { animation: ff-turn 900ms var(--ff-move) 200ms both; }

/* Block loader: the blocks part and meet. Mark only. */
@keyframes ff-part-a { 50% { transform: translate(-10px, -6px); } }
@keyframes ff-part-b { 50% { transform: translate(10px, 6px); } }
.play[data-study="blocks"] .ff-block--a { animation: ff-part-a var(--ff-loop) var(--ff-move) infinite; }
.play[data-study="blocks"] .ff-block--b { animation: ff-part-b var(--ff-loop) var(--ff-move) infinite; }

/* Stack: three blocks drop and clear. */
.ff-stack { display: block; }
.ff-cube__top { fill: var(--ff-ash); } .ff-cube__left { fill: var(--ff-graphite); } .ff-cube__right { fill: var(--ff-steel); }
@keyframes ff-drop { 0% { transform: translateY(-28px); opacity: 0; } 18%, 78% { transform: none; opacity: 1; } 100% { transform: none; opacity: 0; } }
.play .ff-cube { animation: ff-drop 1600ms var(--ff-settle) infinite both; }
.play .ff-cube--2 { animation-delay: 160ms; } .play .ff-cube--3 { animation-delay: 320ms; }

/* Module: the grid's one moving part travels. At rest it sits top right, as in the icon. */
.ff-module { display: grid; grid-template-columns: repeat(4, 22px); gap: 8px; }
.ff-module span { height: 18px; border: 2px solid currentColor; border-radius: 7px; }
.ff-module span:nth-child(4) { background: currentColor; border-radius: 50%; border-color: transparent; }
@keyframes ff-cell { 0%, 8% { background: currentColor; border-radius: 50%; border-color: transparent; } 8.5%, 100% { background: transparent; border-radius: 7px; border-color: currentColor; } }
.play .ff-module span { animation: ff-cell var(--ff-loop) steps(1) infinite; animation-delay: calc(var(--i) * 100ms); }

/* Overlap: the two circles meet and part. */
.ff-overlap { display: block; fill: none; stroke: currentColor; stroke-width: 2; }
@keyframes ff-meet-a { 50% { transform: translateX(13px); } }
@keyframes ff-meet-b { 50% { transform: translateX(-13px); } }
.play .ff-overlap__a { animation: ff-meet-a var(--ff-loop) var(--ff-move) infinite; }
.play .ff-overlap__b { animation: ff-meet-b var(--ff-loop) var(--ff-move) infinite; }

/* Focus: brackets close, crosshair sets, the photo comes up. */
.ff-focus { position: relative; width: 168px; height: 126px; }
.ff-focus__photo { position: absolute; inset: 14px; border-radius: 10px; background: linear-gradient(150deg, var(--ff-mist), var(--ff-graphite) 70%); }
.ff-focus__c { position: absolute; width: 26px; height: 26px; border: 2px solid currentColor; }
.ff-focus__c--tl { left: 0; top: 0; border-right: 0; border-bottom: 0; border-top-left-radius: 14px; }
.ff-focus__c--tr { right: 0; top: 0; border-left: 0; border-bottom: 0; border-top-right-radius: 14px; }
.ff-focus__c--bl { left: 0; bottom: 0; border-right: 0; border-top: 0; border-bottom-left-radius: 14px; }
.ff-focus__c--br { right: 0; bottom: 0; border-left: 0; border-top: 0; border-bottom-right-radius: 14px; }
.ff-focus__x, .ff-focus__y { position: absolute; left: 50%; top: 50%; background: currentColor; opacity: 0; }
.ff-focus__x { width: 28px; height: 2px; margin: -1px 0 0 -14px; } .ff-focus__y { width: 2px; height: 28px; margin: -14px 0 0 -1px; }
@keyframes ff-corner-tl { from { transform: translate(-18px, -18px); opacity: 0; } }
@keyframes ff-corner-tr { from { transform: translate(18px, -18px); opacity: 0; } }
@keyframes ff-corner-bl { from { transform: translate(-18px, 18px); opacity: 0; } }
@keyframes ff-corner-br { from { transform: translate(18px, 18px); opacity: 0; } }
@keyframes ff-cross { 0% { opacity: 0; transform: scale(.4); } 30%, 70% { opacity: 1; transform: none; } 100% { opacity: 0; } }
@keyframes ff-photo { from { opacity: 0; transform: scale(.96); } }
.play .ff-focus__c--tl { animation: ff-corner-tl var(--ff-slow) var(--ff-settle) both; }
.play .ff-focus__c--tr { animation: ff-corner-tr var(--ff-slow) var(--ff-settle) both; }
.play .ff-focus__c--bl { animation: ff-corner-bl var(--ff-slow) var(--ff-settle) both; }
.play .ff-focus__c--br { animation: ff-corner-br var(--ff-slow) var(--ff-settle) both; }
.play .ff-focus__x, .play .ff-focus__y { animation: ff-cross 1100ms var(--ff-settle) 400ms both; }
.play .ff-focus__photo { animation: ff-photo var(--ff-slow) var(--ff-settle) 1200ms both; }

/* Progress: three steps. */
.ff-progress { width: min(260px, 100%); display: grid; gap: 14px; }
.ff-progress__track { height: 12px; border-radius: 999px; background: var(--ff-rule); overflow: hidden; }
.ff-progress__fill { height: 100%; width: 100%; border-radius: 999px; background: currentColor; transform-origin: left; }
.ff-progress__steps { list-style: none; margin: 0; padding: 0; display: flex; justify-content: space-between; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; }
@keyframes ff-fill-steps { 0% { transform: scaleX(.02); } 25%, 35% { transform: scaleX(.33); } 60%, 70% { transform: scaleX(.66); } 95%, 100% { transform: scaleX(1); } }
@keyframes ff-step { from { opacity: .35; } }
.play .ff-progress__fill { animation: ff-fill-steps 2400ms var(--ff-settle) both; }
.play .ff-progress__steps li { animation: ff-step var(--ff-base) var(--ff-settle) both; }
.play .ff-progress__steps li:nth-child(1) { animation-delay: 500ms; } .play .ff-progress__steps li:nth-child(2) { animation-delay: 1350ms; } .play .ff-progress__steps li:nth-child(3) { animation-delay: 2200ms; }

/* Skeleton: a highlight along the 3:5 diagonal. */
.ff-skeleton { width: min(240px, 100%); display: grid; gap: 10px; }
.ff-skeleton span { display: block; border-radius: 8px; background: linear-gradient(121deg, var(--ff-coal) 40%, var(--ff-rule) 50%, var(--ff-coal) 60%) 0 0 / 300% 100%; }
.ff-skeleton__img { height: 84px; border-radius: 14px !important; } .ff-skeleton__line { height: 12px; }
@keyframes ff-shimmer { from { background-position: 100% 0; } to { background-position: 0 0; } }
.play .ff-skeleton span { animation: ff-shimmer 1400ms linear infinite; }

/* Cards: rise in order. */
.ff-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; width: min(280px, 100%); }
.ff-card { aspect-ratio: 3 / 4; border-radius: 12px; padding: 10px; display: flex; align-items: flex-end; font-size: 10px; }
.ff-card b { font-weight: 400; }
.ff-card--white { background: var(--ff-white); color: var(--ff-black); } .ff-card--graphite { background: var(--ff-graphite); color: var(--ff-white); } .ff-card--black { background: var(--ff-black); color: var(--ff-white); box-shadow: inset 0 0 0 1px var(--ff-rule); }
@keyframes ff-card { from { transform: translateY(var(--ff-distance)); opacity: 0; } }
.play .ff-card { animation: ff-card var(--ff-base) var(--ff-settle) both; }
.play .ff-card--graphite { animation-delay: var(--ff-stagger); } .play .ff-card--black { animation-delay: calc(var(--ff-stagger) * 2); }

/* Headline: each line out of its own mask. */
.ff-headline { margin: 0; font-weight: 600; font-size: 30px; line-height: 1.05; letter-spacing: -.025em; }
.ff-headline > span { display: block; overflow: hidden; padding-bottom: .08em; }
.ff-headline > span > span { display: block; }
.play .ff-headline > span > span { animation: ff-rise var(--ff-slow) var(--ff-settle) both; }
.play .ff-headline > span:nth-child(2) > span { animation-delay: var(--ff-stagger); }

/* Field: focus, entry, send, check. */
.ff-field { width: min(260px, 100%); display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 10px; align-items: center; color: var(--ff-black); }
.ff-field__label { grid-column: 1 / -1; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--ff-graphite); }
.ff-field__input { background: var(--ff-white); border: 1.5px solid var(--ff-black); border-radius: 12px; padding: 10px 12px; font-size: 14px; overflow: hidden; white-space: nowrap; }
.ff-field__text { display: inline-block; overflow: hidden; vertical-align: bottom; width: 13ch; }
.ff-field__send { position: relative; width: 64px; height: 40px; border-radius: 999px; background: var(--ff-black); color: var(--ff-white); display: grid; place-items: center; font-size: 11px; letter-spacing: .06em; }
.ff-field__word { opacity: 0; }
.ff-field__send svg { position: absolute; width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; }
@keyframes ff-focus-border { from { border-color: transparent; } }
@keyframes ff-type { from { width: 0; } }
@keyframes ff-word-out { 0%, 85% { opacity: 1; } 100% { opacity: 0; } }
@keyframes ff-check { from { stroke-dashoffset: 1; } }
.play .ff-field__input { animation: ff-focus-border var(--ff-quick) var(--ff-settle) 200ms both; }
.play .ff-field__text { animation: ff-type 900ms steps(13) 400ms both; }
.play .ff-field__word { animation: ff-word-out 1700ms linear both; }
.play .ff-field__send svg { animation: ff-check var(--ff-base) var(--ff-settle) 1800ms both; }

/* Press: in to 96%, Graphite, and back. */
.ff-press { display: inline-block; background: var(--ff-black); color: var(--ff-white); border-radius: 999px; padding: 14px 26px; font-size: 13px; letter-spacing: .04em; }
@keyframes ff-press { 0%, 40% { transform: none; background: var(--ff-black); } 46%, 56% { transform: scale(.96); background: var(--ff-graphite); } 66%, 100% { transform: none; background: var(--ff-black); } }
.play .ff-press { animation: ff-press 2000ms var(--ff-settle) infinite; }

/* Wipe: the next page in behind a 3:5 edge. */
.ff-wipe { position: relative; width: min(260px, 100%); aspect-ratio: 16 / 10; border-radius: 12px; overflow: hidden; }
.ff-wipe__page { position: absolute; inset: 0; padding: 14px; display: flex; flex-direction: column; justify-content: flex-end; gap: 4px; }
.ff-wipe__page small { font-size: 9px; letter-spacing: .08em; opacity: .7; } .ff-wipe__page b { font-size: 18px; font-weight: 600; letter-spacing: -.02em; }
.ff-wipe__page--a { background: var(--ff-black); color: var(--ff-white); }
.ff-wipe__page--b { background: var(--ff-ash); color: var(--ff-black); clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
@keyframes ff-wipe { from { clip-path: polygon(-60% 0, -60% 0, -120% 100%, -120% 100%); } to { clip-path: polygon(0 0, 160% 0, 100% 100%, 0 100%); } }
.play .ff-wipe__page--b { animation: ff-wipe var(--ff-slow) var(--ff-move) 300ms both; }

/* Pause everything; and never move for people who ask not to. */
.ff-paused *, .ff-paused *::before, .ff-paused *::after { animation-play-state: paused !important; }
@media (prefers-reduced-motion: reduce) {
  .play *, .play *::before, .play *::after { animation: none !important; }
}
`

// --- The library page ----------------------------------------------------------------------------

const escape = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const GROUND = { logo: 'ash', loader: 'night', interface: 'mixed' }
const STAGE = { field: 'ash', press: 'white', cards: 'night', headline: 'night', skeleton: 'night', wipe: 'coal', progress: 'night' }

export const motionPage = (geometry, colours) => {
  const parts = markParts(geometry)
  const studies = STUDIES.map((study) => {
    const ground = STAGE[study.id] ?? GROUND[study.kind]
    return `<article class="study" data-kind="${study.kind}" id="${study.id}">
  <div class="stage stage--${ground} play" data-study="${study.id}">${studyArt(study.id, parts, geometry)}</div>
  <div class="meta"><div class="meta__head"><h3>${escape(study.name)}</h3><span class="kind">${escape(study.group)}</span></div>
  <p>${escape(study.description)}</p>
  <dl><dt>Timing</dt><dd>${escape(study.timing)}</dd><dt>Use</dt><dd>${escape(study.use)}</dd></dl>
  <button type="button" class="replay" data-replay="${study.id}">Replay</button></div>
</article>`
  }).join('\n')
  const durations = Object.entries(TOKENS.durations).map(([key, value]) => `<tr><td>--ff-${key}</td><td>${value} ms</td><td><span class="len" style="--w:${Math.round(value / 12)}%"></span></td></tr>`).join('')
  const curve = (value) => {
    const m = /cubic-bezier\(([^)]+)\)/.exec(value)
    const [x1, y1, x2, y2] = m ? m[1].split(',').map(Number) : [0, 0, 1, 1]
    return `<svg viewBox="-4 -4 108 108" class="curve" aria-hidden="true"><path class="curve__axis" d="M0 100H100M0 100V0"/><path class="curve__line" d="M0 100C${x1 * 100} ${100 - y1 * 100} ${x2 * 100} ${100 - y2 * 100} 100 0"/></svg>`
  }
  const easings = Object.entries(TOKENS.easings).map(([key, value]) => `<div class="ease"><div class="ease__head">${curve(value)}<div><b>--ff-${key}</b><code>${escape(value)}</code></div></div><div class="ease__track"><span style="animation-timing-function:${value}"></span></div></div>`).join('')
  const rules = RULES.map((rule) => `<li><b>${escape(rule.title)}</b><span>${escape(rule.text)}</span></li>`).join('')
  const chips = [['all', 'All'], ['logo', 'Logo'], ['loader', 'Loading'], ['interface', 'Interface']].map(([id, label], index) => `<button type="button" class="chip" data-filter="${id}" aria-pressed="${index === 0}">${label}</button>`).join('')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>First Form Motion Library</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600&amp;display=swap" rel="stylesheet">
<style>
@font-face { font-family: 'Sora'; font-weight: 400; src: local('Sora'), url('../fonts/Sora-Regular.ttf') format('truetype'); }
@font-face { font-family: 'Sora'; font-weight: 600; src: local('Sora SemiBold'), url('../fonts/Sora-SemiBold.ttf') format('truetype'); }
${motionCss(colours)}
/* The library page: First Form's own monochrome. */
* { box-sizing: border-box; }
body { margin: 0; background: var(--ff-night); color: var(--ff-white); font-family: 'Sora', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6; -webkit-font-smoothing: antialiased; color-scheme: dark; }
:focus-visible { outline: 2px solid var(--ff-white); outline-offset: 3px; border-radius: 6px; }
.page { max-width: 1240px; margin: 0 auto; padding: 20px max(16px, env(safe-area-inset-right, 0px)) 72px max(16px, env(safe-area-inset-left, 0px)); display: flex; flex-direction: column; gap: 56px; }
.bar { background: var(--ff-ash); color: var(--ff-black); border-radius: 24px; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.bar .ff-lockup { height: 52px; width: auto; }
.bar span { font-size: 13px; letter-spacing: .06em; text-transform: uppercase; color: var(--ff-graphite); }
.label { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--ff-steel); }
h1, h2, h3 { margin: 0; font-weight: 600; text-wrap: balance; }
h1 { font-size: clamp(40px, 6.4vw, 84px); line-height: 1; letter-spacing: -.03em; max-width: 12ch; }
h2 { font-size: clamp(26px, 3vw, 36px); line-height: 1.1; letter-spacing: -.015em; }
.intro { display: grid; gap: 20px; padding-top: 24px; }
.intro p { margin: 0; max-width: 62ch; color: var(--ff-mist); font-size: 17px; }
.sec { display: grid; gap: 24px; }
.cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
table { width: 100%; border-collapse: collapse; font-size: 14px; font-variant-numeric: tabular-nums; }
td { padding: 12px 8px; border-bottom: 1px solid var(--ff-rule); white-space: nowrap; } td:first-child { font-family: ui-monospace, Menlo, monospace; font-size: 13px; color: var(--ff-mist); } td:last-child { width: 50%; }
td .len { display: block; height: 6px; width: var(--w); border-radius: 999px; background: var(--ff-white); }
.eases { display: grid; gap: 14px; }
.ease { border: 1px solid var(--ff-rule); border-radius: 20px; padding: 16px; display: grid; gap: 14px; }
.ease__head { display: flex; gap: 16px; align-items: center; }
.ease__head b { display: block; font-family: ui-monospace, Menlo, monospace; font-size: 13px; font-weight: 400; }
.ease__head code { font-size: 12px; color: var(--ff-steel); }
.curve { width: 56px; height: 56px; flex: none; } .curve__axis { fill: none; stroke: var(--ff-rule); stroke-width: 2; } .curve__line { fill: none; stroke: var(--ff-white); stroke-width: 3; }
.ease__track { height: 12px; border-radius: 999px; background: var(--ff-coal); position: relative; }
.ease__track span { position: absolute; left: 0; top: 0; width: 12px; height: 12px; border-radius: 50%; background: var(--ff-white); animation: ff-track 1600ms infinite alternate; }
@keyframes ff-track { to { left: calc(100% - 12px); } }
.rules { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: 16px; }
.rules li { background: var(--ff-white); color: var(--ff-black); border-radius: 24px; padding: 24px; display: grid; gap: 8px; align-content: start; }
.rules li:nth-child(2) { background: var(--ff-graphite); color: var(--ff-white); } .rules li:nth-child(3) { background: var(--ff-black); color: var(--ff-white); box-shadow: inset 0 0 0 1px var(--ff-rule); } .rules li:nth-child(4) { background: var(--ff-ash); }
.rules b { font-size: 18px; line-height: 1.25; } .rules span { font-size: 14px; opacity: .8; }
.controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: space-between; }
.chips, .actions { display: flex; flex-wrap: wrap; gap: 8px; }
button { font: inherit; cursor: pointer; }
.chip, .action { border: 1px solid var(--ff-graphite); background: transparent; color: var(--ff-white); border-radius: 999px; padding: 8px 16px; font-size: 13px; letter-spacing: .04em; text-transform: uppercase; }
.chip[aria-pressed="true"], .action[aria-pressed="true"] { background: var(--ff-white); color: var(--ff-black); border-color: var(--ff-white); }
.chip:hover, .action:hover { border-color: var(--ff-white); }
button:disabled { opacity: .4; cursor: not-allowed; }
.studies { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
.study { display: grid; gap: 14px; align-content: start; }
.stage { aspect-ratio: 4 / 3; max-width: 100%; border-radius: 24px; display: grid; place-items: center; padding: 24px; overflow: hidden; }
.stage--ash { background: var(--ff-ash); color: var(--ff-black); } .stage--white { background: var(--ff-white); color: var(--ff-black); }
.stage--night { background: var(--ff-black); color: var(--ff-white); box-shadow: inset 0 0 0 1px var(--ff-rule); } .stage--coal { background: var(--ff-coal); color: var(--ff-white); }
.stage .ff-mark { width: 30%; height: auto; } .stage[data-study="blocks"] .ff-mark { width: 16%; } .stage .ff-lockup { width: 78%; height: auto; }
.stage .ff-stack { width: 46%; } .stage .ff-overlap { width: 40%; }
.meta { display: grid; gap: 8px; }
.meta__head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.meta h3 { font-size: 20px; } .kind { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--ff-steel); }
.meta p { margin: 0; font-size: 14px; color: var(--ff-mist); }
dl { margin: 0; display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 2px 14px; font-size: 13px; }
dt { color: var(--ff-steel); } dd { margin: 0; color: var(--ff-mist); }
.replay { justify-self: start; border: 0; background: var(--ff-white); color: var(--ff-black); border-radius: 999px; padding: 8px 16px; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; }
.replay:hover { background: var(--ff-ash); }
.note { font-size: 13px; color: var(--ff-steel); margin: 0; }
footer { border-top: 1px solid var(--ff-rule); padding-top: 24px; font-size: 13px; color: var(--ff-steel); display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
@media (max-width: 960px) { .studies { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { .studies, .cols { grid-template-columns: minmax(0, 1fr); } }
@media (prefers-reduced-motion: reduce) { .ease__track span { animation: none; left: calc(100% - 12px); } }
</style>
</head>
<body>
<div class="page">
<header class="bar">${lockupSvg(parts, geometry, 'header')}<span>Motion library</span></header>

<section class="intro">
  <span class="label">Motion · Version 1.0</span>
  <h1>Parts that fit into one whole.</h1>
  <p>First Form moves the way its mark is built: two blocks that slide along one axis and lock together. These sixteen studies cover the logo, loading and the interface. Each runs on the same few timings and easings, and each ends on a still frame you could print.</p>
</section>

<section class="sec" aria-labelledby="h-tokens">
  <div><span class="label">Tokens</span><h2 id="h-tokens">Timing and easing</h2></div>
  <div class="cols">
    <table><tbody>${durations}<tr><td>--ff-stagger</td><td>${TOKENS.stagger} ms</td><td><span class="len" style="--w:${Math.round(TOKENS.stagger / 12)}%"></span></td></tr></tbody></table>
    <div class="eases">${easings}</div>
  </div>
  <p class="note">The same values are in motion.css as custom properties and in motion-tokens.json for code.</p>
</section>

<section class="sec" aria-labelledby="h-rules">
  <div><span class="label">Rules</span><h2 id="h-rules">How First Form moves</h2></div>
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

<footer><span>First Form motion library · generated by brandkit from brand.json</span><span>motion.css · motion-tokens.json</span></footer>
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
      var paused = document.body.classList.toggle('ff-paused');
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

export const motionReadme = () => `# First Form motion

Open \`index.html\` for the motion library: ${STUDIES.length} studies of the logo, loading states and interface, each with its timing, where to use it, and a replay button.

## Use it in a site

Link \`motion.css\`. It defines the tokens as custom properties and every study's keyframes:

\`\`\`html
<link rel="stylesheet" href="motion.css">
<div class="play" data-study="blocks"><!-- the mark's SVG, copied from index.html --></div>
\`\`\`

The First Form site (\`site/index.html\`) is a worked example: its intro, header logo and scroll reveals use this file. An element animates only inside a \`.play\` container, and its resting style is its last frame, so it reads correctly before, after, and without motion. Add \`.ff-paused\` to any ancestor to pause; with \`prefers-reduced-motion: reduce\` nothing moves.

## Tokens

| Token | Value |
|---|---|
${Object.entries(TOKENS.durations).map(([key, value]) => `| \`--ff-${key}\` | ${value} ms |`).join('\n')}
${Object.entries(TOKENS.easings).map(([key, value]) => `| \`--ff-${key}\` | \`${value}\` |`).join('\n')}
| \`--ff-stagger\` | ${TOKENS.stagger} ms |
| \`--ff-distance\` | ${TOKENS.distance} px |

\`motion-tokens.json\` holds the same values for code.

## Rules

${RULES.map((rule) => `- **${rule.title}** ${rule.text}`).join('\n')}

## Studies

| Study | Kind | Timing | Use |
|---|---|---|---|
${STUDIES.map((study) => `| ${study.name} | ${study.group} | ${study.timing} | ${study.use} |`).join('\n')}
`
