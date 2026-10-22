// Example motion libraries for the two BC identities, B.C.Hydro 1983 and the Province of British
// Columbia 1977. Neither manual says anything about motion (they predate screens), so these are
// brandkit's examples of how each identity could move while keeping its manual's rules for the
// symbol and signature: every logo study ends on the exact still signature, colour stays where the
// manual puts it, and nothing bounces, spins or glows.
//
// Each study is CSS keyframes over the engine's own artwork (logoDocument and symbolDocument, with
// type outlined), in the shape the app's Motion tab reads: a `.stage[data-study]` that plays while
// it has the `play` class, whose resting styles are the final frame. Used by
// scripts/brands/bc-hydro-1983.mjs and scripts/brands/bc-province-1977.mjs, which write the files
// into each brand's motion/ folder and add `motion` to its brand.json.

import { mkdirSync, writeFileSync } from 'node:fs'
import { logoDocument, symbolDocument } from '../../src/engine/artwork.js'

const escape = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const ms = (value) => `${value}ms`

/** An SVG document's viewBox and contents, without its title and description. */
const inner = (doc) => {
  const match = /<svg[^>]*viewBox="([^"]+)"[^>]*>([\s\S]*)<\/svg>\s*$/.exec(doc)
  return { viewBox: match[1], body: match[2].replace(/<title>[\s\S]*?<\/title>|<desc>[\s\S]*?<\/desc>/g, '') }
}
const svg = (cls, { viewBox, body }, label) => `<svg class="${cls}" viewBox="${viewBox}" role="img" aria-label="${escape(label)}">${body}</svg>`
/** The index just past the `</g>` that closes the group opening at `open`. */
const closeOf = (body, open) => {
  const tags = /<g\b[^>]*?(\/?)>|<\/g>/g
  tags.lastIndex = open
  let depth = 0
  for (let match = tags.exec(body); match; match = tags.exec(body)) {
    if (match[0] === '</g>') depth -= 1
    else if (!match[1]) depth += 1
    if (depth === 0) return match.index + match[0].length
  }
  throw new Error('An unclosed group')
}
/** Wraps the text from `start` to `end` in a group with `attributes`. */
const wrap = (body, start, end, attributes) => `${body.slice(0, start)}<g ${attributes}>${body.slice(start, end)}</g>${body.slice(end)}`

/** Every fill and stroke colour in some artwork, set to one colour: a single-colour reverse. */
const oneColour = (art, hex) => ({ ...art, body: art.body.replace(/(fill|stroke)="#[0-9A-Fa-f]{6}"/g, `$1="${hex}"`) })

const tokenCss = (prefix, tokens) => [
  ...Object.entries(tokens.durations).map(([key, value]) => `  --${prefix}-${key}: ${ms(value)};`),
  ...Object.entries(tokens.easings).map(([key, value]) => `  --${prefix}-${key}: ${value};`),
  `  --${prefix}-stagger: ${ms(tokens.stagger)};`
].join('\n')

/** The motion entry for brand.json: the page, its CSS, tokens, rules and studies (without artwork). */
const entryOf = (library) => ({
  page: 'motion/index.html',
  css: 'motion/motion.css',
  note: library.note,
  tokens: library.tokens,
  rules: library.rules,
  studies: library.studies.map(({ id, name, kind, group, timing, use, description, loop }) => ({ id, name, kind, group, timing, use, description, ...(loop ? { loop } : {}) }))
})

// --- The library page ------------------------------------------------------------------------------

const page = (library) => {
  const { name, prefix, colours, tokens, rules, studies } = library
  const longest = Math.max(...Object.values(tokens.durations))
  const tiles = studies.map((study) => `<article class="study" data-kind="${study.kind}" id="${study.id}">
  <div class="stage stage--${study.ground} play" data-study="${study.id}">${study.art}</div>
  <div class="meta"><div class="meta__head"><h3>${escape(study.name)}</h3><span class="kind">${escape(study.group)}${study.loop ? ' · loop' : ''}</span></div>
  <p>${escape(study.description)}</p>
  <dl><dt>Timing</dt><dd>${escape(study.timing)}</dd><dt>Use</dt><dd>${escape(study.use)}</dd></dl>
  <button type="button" class="replay" data-replay="${study.id}">Replay</button></div>
</article>`).join('\n')
  const rows = Object.entries(tokens.durations).map(([key, value]) => `<tr><td>--${prefix}-${key}</td><td>${value} ms</td><td><span class="len" style="width:${Math.round((value / longest) * 100)}%"></span></td></tr>`).join('')
  const chips = [['all', 'All'], ['logo', 'Logo'], ['loader', 'Loading'], ['interface', 'Interface']].map(([id, label], index) => `<button type="button" class="chip" data-filter="${id}" aria-pressed="${index === 0}">${label}</button>`).join('')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escape(name)} motion library</title>
<style>
${library.fontFaces}
${library.css}
/* The library page's stages. */${library.pageCss}
/* The library page. */
* { box-sizing: border-box; }
body { margin: 0; background: ${colours.page}; color: ${colours.ink}; font-family: ${library.fontStack}; font-size: 16px; line-height: 1.55; -webkit-font-smoothing: antialiased; }
:focus-visible { outline: 2px solid ${colours.accent}; outline-offset: 3px; }
.page { max-width: 1240px; margin: 0 auto; padding: 24px max(16px, env(safe-area-inset-right, 0px)) 72px max(16px, env(safe-area-inset-left, 0px)); display: grid; gap: 48px; }
.bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding-bottom: 16px; border-bottom: 2px solid ${colours.ink}; }
.bar .${prefix}-logo { height: 44px; width: auto; }
.label { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: ${colours.muted}; }
h1, h2, h3 { margin: 0; font-weight: 700; }
h1 { font-size: clamp(34px, 5vw, 60px); line-height: 1.05; max-width: 16ch; }
h2 { font-size: clamp(24px, 2.6vw, 32px); line-height: 1.15; }
.intro { display: grid; gap: 16px; }
.intro p { margin: 0; max-width: 64ch; font-size: 17px; }
.intro .note { font-size: 14px; color: ${colours.muted}; }
.sec { display: grid; gap: 20px; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
td { padding: 10px 8px; border-bottom: 1px solid ${colours.line}; white-space: nowrap; } td:first-child { font-family: ui-monospace, Menlo, monospace; font-size: 13px; } td:last-child { width: 55%; }
.len { display: block; height: 6px; background: ${colours.accent}; }
.rules { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr)); gap: 16px; }
.rules li { border-top: 4px solid ${colours.accent}; padding-top: 12px; display: grid; gap: 6px; }
.rules b { font-size: 17px; } .rules span { font-size: 14px; color: ${colours.muted}; }
.controls { display: flex; flex-wrap: wrap; gap: 8px; justify-content: space-between; }
.chips, .actions { display: flex; flex-wrap: wrap; gap: 8px; }
button { font: inherit; cursor: pointer; }
.chip, .action { border: 1px solid ${colours.ink}; background: transparent; color: ${colours.ink}; padding: 7px 14px; font-size: 13px; letter-spacing: .04em; text-transform: uppercase; }
.chip[aria-pressed="true"], .action[aria-pressed="true"] { background: ${colours.ink}; color: ${colours.page}; }
button:disabled { opacity: .4; cursor: not-allowed; }
.studies { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
.study { display: grid; gap: 12px; align-content: start; }
.stage { aspect-ratio: 4 / 3; display: grid; place-items: center; padding: 24px; overflow: hidden; box-shadow: inset 0 0 0 1px ${colours.line}; }
.meta { display: grid; gap: 6px; }
.meta__head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.meta h3 { font-size: 19px; } .kind { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: ${colours.muted}; }
.meta p { margin: 0; font-size: 14px; }
dl { margin: 0; display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 2px 12px; font-size: 13px; } dt { color: ${colours.muted}; } dd { margin: 0; }
.replay { justify-self: start; border: 0; background: ${colours.ink}; color: ${colours.page}; padding: 7px 14px; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; }
.notice { font-size: 13px; color: ${colours.muted}; margin: 0; }
footer { border-top: 1px solid ${colours.line}; padding-top: 20px; font-size: 13px; color: ${colours.muted}; }
.bk-paused *, .bk-paused *::before, .bk-paused *::after { animation-play-state: paused !important; }
@media (max-width: 960px) { .studies { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { .studies { grid-template-columns: minmax(0, 1fr); } }
</style>
</head>
<body>
<div class="page">
<header class="bar">${library.headerArt}<span class="label">Motion library</span></header>
<section class="intro">
  <span class="label">${escape(library.eyebrow)}</span>
  <h1>${escape(library.headline)}</h1>
  <p>${escape(library.intro)}</p>
  <p class="note">${escape(library.note)}</p>
</section>
<section class="sec" aria-labelledby="h-tokens">
  <div><span class="label">Tokens</span><h2 id="h-tokens">Timing and easing</h2></div>
  <table><tbody>${rows}<tr><td>--${prefix}-stagger</td><td>${tokens.stagger} ms</td><td></td></tr>${Object.entries(tokens.easings).map(([key, value]) => `<tr><td>--${prefix}-${key}</td><td colspan="2">${escape(value)}</td></tr>`).join('')}</tbody></table>
</section>
<section class="sec" aria-labelledby="h-rules">
  <div><span class="label">Rules</span><h2 id="h-rules">How ${escape(name)} moves</h2></div>
  <ol class="rules">${rules.map((rule) => `<li><b>${escape(rule.title)}</b><span>${escape(rule.text)}</span></li>`).join('')}</ol>
</section>
<section class="sec" aria-labelledby="h-studies">
  <div><span class="label">Studies</span><h2 id="h-studies">Logo, loading, interface</h2></div>
  <div class="controls"><div class="chips" role="group" aria-label="Show">${chips}</div><div class="actions"><button type="button" class="action" id="replay-all">Replay all</button><button type="button" class="action" id="pause" aria-pressed="false">Pause</button></div></div>
  <p class="notice" id="reduced-note" hidden>Your device asks for reduced motion, so every study shows its final frame.</p>
  <div class="studies">
${tiles}
  </div>
</section>
<footer>${escape(name)} motion library · an example made by brandkit from brand.json · motion.css · motion-tokens.json</footer>
</div>
<script>
(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  function play(stage) { stage.classList.remove('play'); void stage.offsetWidth; stage.classList.add('play'); }
  function setReduced() {
    document.querySelectorAll('.replay, #replay-all, #pause').forEach(function (b) { b.disabled = reduced.matches; });
    document.getElementById('reduced-note').hidden = !reduced.matches;
  }
  document.addEventListener('click', function (event) {
    var replay = event.target.closest('[data-replay]');
    if (replay) play(document.querySelector('.stage[data-study="' + replay.getAttribute('data-replay') + '"]'));
    if (event.target.closest('#replay-all')) document.querySelectorAll('.stage').forEach(play);
    var pause = event.target.closest('#pause');
    if (pause) {
      var paused = document.body.classList.toggle('bk-paused');
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

const readme = (library) => `# ${library.name} motion (example)

${library.note}

${library.studies.length} studies on one set of timings, all drawn from the brand's own artwork with
the type outlined. Open \`index.html\` to play them; \`motion.css\` holds the tokens and keyframes,
and \`motion-tokens.json\` the same values for code. brandkit's Motion tab plays them too, and
exports the logo and loader studies as video and GIF.

## Rules

${library.rules.map((rule) => `- **${rule.title}** ${rule.text}`).join('\n')}

## Studies

| Study | Kind | Timing | Use |
| --- | --- | --- | --- |
${library.studies.map((study) => `| ${study.name}: ${study.description} | ${study.group} | ${study.timing} | ${study.use} |`).join('\n')}

## Using the CSS

Every element's resting style is its final frame. An element plays only inside a container with
the \`play\` class, and with \`prefers-reduced-motion: reduce\` nothing plays. To replay, remove
\`play\`, force a reflow, and add it again.
`

/** Writes a library's four files into `folder`'s motion/ and returns its brand.json entry and file list. */
const write = (folder, library) => {
  mkdirSync(new URL('motion/', folder), { recursive: true })
  writeFileSync(new URL('motion/index.html', folder), page(library))
  writeFileSync(new URL('motion/motion.css', folder), `${library.css.trim()}\n`)
  writeFileSync(new URL('motion/motion-tokens.json', folder), `${JSON.stringify({ ...library.tokens, rules: library.rules.map((rule) => rule.title) }, null, 2)}\n`)
  writeFileSync(new URL('motion/README.md', folder), readme(library))
  return { entry: entryOf(library), files: ['motion/index.html', 'motion/motion.css', 'motion/motion-tokens.json', 'motion/README.md'] }
}

const reducedMotion = '@media (prefers-reduced-motion: reduce) {\n  .play *, .play *::before, .play *::after { animation: none !important; }\n}'

// --- B.C.Hydro, 1983 ---------------------------------------------------------------------------

const HYDRO_TOKENS = {
  durations: { quick: 200, base: 400, slow: 800, draw: 1000, loop: 1200 },
  easings: { settle: 'cubic-bezier(.2, .7, .2, 1)', move: 'cubic-bezier(.6, 0, .2, 1)', linear: 'linear' },
  stagger: 40
}

const HYDRO_RULES = [
  { title: 'The signature arrives whole.', text: 'Symbol and logotype are inseparable in the manual, so every logo study ends on the complete signature, its positions and proportions unchanged.' },
  { title: 'Colour stays in the symbol.', text: 'Green and blue move only inside the ring; the logotype stays black. No other colours, no glows, no gradients.' },
  { title: 'Loops are for waiting.', text: 'Only the symbol loops, never the full signature, and only while something loads.' },
  { title: 'Still is a valid frame.', text: 'With reduced motion, every study shows its final frame. Nothing depends on the animation to be understood.' }
]

/** The Hydro signature or symbol with its parts named: the ring, the two stars, each letter, the name. */
const hydroParts = (doc) => {
  const art = inner(doc)
  let body = art.body
  // The group holding the ring and the stars, wrapped so its parts can be named and moved.
  const ring = body.indexOf('<circle ')
  const open = body.lastIndexOf('<g ', ring)
  body = wrap(body, open, closeOf(body, open), 'class="hy-symbol"')
  body = body.replace('<circle ', '<circle class="hy-ring" pathLength="1" ')
  let star = 0
  body = body.replace(/<path (?=fill=)/g, (match) => (star < 2 ? `<path class="hy-star hy-star--${'ab'[star++]}" ` : match))
  let letter = 0
  body = body.replace(/<g data-text=/g, () => `<g class="hy-letter" style="--i:${letter++}" data-text=`)
  if (letter) {
    const first = body.indexOf('<g class="hy-letter"')
    body = wrap(body, first, closeOf(body, body.lastIndexOf('<g class="hy-letter"')), 'class="hy-name"')
  }
  return { ...art, body }
}

const hydroCss = (colours) => `/* B.C.Hydro motion: an example by brandkit. Tokens, keyframes and the classes the library uses.
   Resting styles are final frames: an element plays only inside a .play container, and nothing
   plays with prefers-reduced-motion. Generated by scripts/brands/bc-motion.mjs. */
:root {
${tokenCss('hy', HYDRO_TOKENS)}
  --hy-green: ${colours.green}; --hy-blue: ${colours.blue}; --hy-black: ${colours.black}; --hy-white: ${colours.white}; --hy-tint: ${colours.tint}; --hy-grey: ${colours.grey};
}

.hy-logo, .hy-mark, .hy-meter, .hy-card { display: block; overflow: visible; }
.hy-ring { stroke-dasharray: 1; stroke-dashoffset: 0; }
.hy-star, .hy-letter > path, .hy-meter__fill { transform-box: fill-box; transform-origin: center; }

/* Ring: the ring draws round, the stars set inside it, then the logotype rises letter by letter. */
@keyframes hy-draw { from { stroke-dashoffset: 1; } }
@keyframes hy-set { from { transform: scale(.4); opacity: 0; } }
@keyframes hy-rise { from { transform: translateY(45%); opacity: 0; } }
.play[data-study="ring"] .hy-ring { animation: hy-draw var(--hy-draw) var(--hy-move) both; }
.play[data-study="ring"] .hy-star { animation: hy-set var(--hy-slow) var(--hy-settle) calc(var(--hy-draw) * .6) both; }
.play[data-study="ring"] .hy-star--b { animation-delay: calc(var(--hy-draw) * .6 + var(--hy-stagger) * 2); }
.play[data-study="ring"] .hy-letter > path { animation: hy-rise var(--hy-base) var(--hy-settle) calc(var(--hy-draw) + var(--i) * var(--hy-stagger)) both; }

/* Current: blue rises and green falls into the ring, then the logotype is uncovered left to right. */
@keyframes hy-from-below { from { transform: translateY(70%); opacity: 0; } }
@keyframes hy-from-above { from { transform: translateY(-70%); opacity: 0; } }
@keyframes hy-wipe { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
.play[data-study="current"] .hy-star--a { animation: hy-from-below var(--hy-slow) var(--hy-move) both; }
.play[data-study="current"] .hy-star--b { animation: hy-from-above var(--hy-slow) var(--hy-move) both; }
.play[data-study="current"] .hy-name { animation: hy-wipe var(--hy-draw) var(--hy-move) var(--hy-slow) both; }

/* Typeset: the symbol is there from the first frame; the logotype sets one letter at a time. */
@keyframes hy-type { from { opacity: 0; } }
.play[data-study="typeset"] .hy-letter > path { animation: hy-type var(--hy-quick) steps(1, end) calc(300ms + var(--i) * 110ms) both; }

/* Alternating: the two stars take turns, green and blue. Symbol only. */
@keyframes hy-dim { 0%, 100% { opacity: 1; } 50% { opacity: .2; } }
.play[data-study="alternating"] .hy-star--a { animation: hy-dim var(--hy-loop) var(--hy-move) infinite; }
.play[data-study="alternating"] .hy-star--b { animation: hy-dim var(--hy-loop) var(--hy-move) calc(var(--hy-loop) / -2) infinite; }

/* Charge: a quarter of the ring runs round it. Symbol only. */
@keyframes hy-chase { from { stroke-dasharray: .28 .72; stroke-dashoffset: 1; } to { stroke-dasharray: .28 .72; stroke-dashoffset: 0; } }
.play[data-study="charge"] .hy-ring { animation: hy-chase var(--hy-loop) linear infinite; }

/* Meter: a bar fills in three steps, green on the tint. */
.hy-meter__track { fill: var(--hy-tint); }
.hy-meter__fill { fill: var(--hy-green); transform-origin: 0 50%; }
.hy-meter__tick { stroke: var(--hy-blue); stroke-width: 2; }
@keyframes hy-meter { 0% { transform: scaleX(0); } 25% { transform: scaleX(.34); } 50% { transform: scaleX(.67); } 75%, 100% { transform: scaleX(1); } }
.play[data-study="meter"] .hy-meter__fill { animation: hy-meter 2400ms var(--hy-settle) infinite; }

/* End card: corporate blue sweeps across, then the white symbol sets in the middle. */
.hy-card__panel { fill: var(--hy-blue); }
.hy-card__set { transform-box: fill-box; transform-origin: center; }
@keyframes hy-sweep { from { transform: translateX(-100%); } }
.play[data-study="end-card"] .hy-card__panel { animation: hy-sweep var(--hy-slow) var(--hy-move) both; }
.play[data-study="end-card"] .hy-card__set { animation: hy-set var(--hy-slow) var(--hy-settle) var(--hy-slow) both; }

${reducedMotion}
`

const HYDRO_STAGES = `
.stage--paper { background: #FFFFFF; color: #000000; } .stage--tint { background: var(--hy-tint); color: #000000; } .stage--blue { background: var(--hy-blue); color: #FFFFFF; }
.stage .hy-logo { width: 82%; height: auto; } .stage .hy-mark { width: 30%; height: auto; } .stage .hy-meter { width: 72%; height: auto; }
.stage[data-study="end-card"] { padding: 0; } .stage .hy-card { width: 100%; height: 100%; }
`

/** B.C.Hydro's library, from its brand and loaded fonts. */
export const hydroLibrary = (brand, fonts) => {
  const ctx = { brand, fonts }
  const logo = (label) => svg('hy-logo', hydroParts(logoDocument(ctx, { signature: 'standard', colourway: 'corporate' })), label)
  // The symbol alone, in corporate colours, as the signature draws it (its group's own scale gives its size).
  const signatureArt = hydroParts(logoDocument(ctx, { signature: 'standard', colourway: 'corporate' }))
  const symbolStart = signatureArt.body.indexOf('<g class="hy-symbol">')
  const symbolBody = signatureArt.body.slice(symbolStart, closeOf(signatureArt.body, symbolStart))
  const size = brand.symbol.viewBox[2] * Number(/scale\(([\d.]+)\)/.exec(symbolBody)[1])
  const markArt = { viewBox: `0 0 ${size} ${size}`, body: symbolBody }
  const mark = (label) => svg('hy-mark', markArt, label)
  const white = oneColour(markArt, brand.colours.white)
  const card = `<svg class="hy-card" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="End card: the symbol in white on corporate blue"><rect class="hy-card__panel" x="-200" y="-150" width="800" height="600"/><svg x="150" y="100" width="100" height="100" viewBox="${white.viewBox}"><g class="hy-card__set">${white.body}</g></svg></svg>`
  const meter = `<svg class="hy-meter" viewBox="0 0 240 40" role="img" aria-label="A meter filling in three steps"><rect class="hy-meter__track" x="0" y="12" width="240" height="16"/><rect class="hy-meter__fill" x="0" y="12" width="240" height="16"/>${[80, 160].map((x) => `<line class="hy-meter__tick" x1="${x}" y1="6" x2="${x}" y2="34"/>`).join('')}</svg>`
  const studies = [
    { id: 'ring', name: 'Ring', kind: 'logo', group: 'Logo', ground: 'paper', timing: 'draw + slow, 40 ms stagger · move, settle', use: 'Video openers, presentation title slides', description: 'The ring draws round, the two stars set inside it, then B.C.Hydro rises letter by letter.', art: logo('B.C.Hydro signature') },
    { id: 'current', name: 'Current', kind: 'logo', group: 'Logo', ground: 'paper', timing: 'slow + draw · move', use: 'Site intro, annual report video', description: 'Blue rises and green falls into the ring and meet; then the logotype is uncovered left to right.', art: logo('B.C.Hydro signature') },
    { id: 'typeset', name: 'Typeset', kind: 'logo', group: 'Logo', ground: 'tint', timing: '110 ms a letter · steps', use: 'Short openers, social posts', description: 'The symbol is there from the first frame; the logotype sets one letter at a time, as on a 1983 phototypesetter.', art: logo('B.C.Hydro signature') },
    { id: 'alternating', name: 'Alternating', kind: 'loader', group: 'Loading', ground: 'paper', loop: true, timing: '1200 ms loop · move', use: 'Page and app loading, 32 px and up', description: 'The two stars take turns, green and blue, like alternating current. Symbol only; stops when loading ends.', art: mark('Loading') },
    { id: 'charge', name: 'Charge', kind: 'loader', group: 'Loading', ground: 'paper', loop: true, timing: '1200 ms loop · linear', use: 'Uploads, syncing, longer waits', description: 'A quarter of the ring runs round it while the stars hold still. At rest the ring is whole.', art: mark('Loading') },
    { id: 'meter', name: 'Meter', kind: 'interface', group: 'Interface', ground: 'paper', loop: true, timing: '2400 ms loop · settle', use: 'Multi-step forms, account set-up', description: 'A bar fills in three steps, corporate green on the light tint, with blue marks at each step.', art: meter },
    { id: 'end-card', name: 'End card', kind: 'interface', group: 'Interface', ground: 'blue', timing: 'slow + slow · move, settle', use: 'Video end cards, slide transitions', description: 'Corporate blue sweeps across the frame, then the symbol sets in white in the middle.', art: card }
  ]
  return {
    name: 'B.C.Hydro', prefix: 'hy', tokens: HYDRO_TOKENS, rules: HYDRO_RULES, studies,
    css: hydroCss(brand.colours), pageCss: HYDRO_STAGES,
    eyebrow: 'Motion · an example for the 1983 identity',
    headline: 'Power that arrives on time.',
    intro: 'Seven studies for the 1983 signature: three for the logo, two loaders made of the symbol alone, and two for interfaces. They share four timings and two eases, and each ends on the signature exactly as the manual draws it.',
    note: 'The 1983 Graphic Standards Manual predates screen motion and says nothing about it. These studies are brandkit’s example of how the identity could move under the manual’s rules; they are not BC Hydro guidance.',
    colours: { page: '#FFFFFF', ink: brand.colours.black, muted: brand.colours.grey, accent: brand.colours.blue, line: '#D3D3D3' },
    fontStack: '"TeX Gyre Termes", "Times New Roman", Times, serif',
    fontFaces: "@font-face { font-family: 'TeX Gyre Termes'; font-weight: 400; src: url('../fonts/texgyretermes-regular.otf') format('opentype'); }\n@font-face { font-family: 'TeX Gyre Termes'; font-weight: 700; src: url('../fonts/texgyretermes-bold.otf') format('opentype'); }",
    headerArt: svg('hy-logo', hydroParts(logoDocument(ctx, { signature: 'standard', colourway: 'corporate' })), 'B.C.Hydro')
  }
}

// --- Province of British Columbia, 1977 --------------------------------------------------------

const PROVINCE_TOKENS = {
  durations: { quick: 200, base: 480, slow: 900, draw: 1400, loop: 1800 },
  easings: { settle: 'cubic-bezier(.2, .6, .2, 1)', move: 'cubic-bezier(.55, 0, .2, 1)', linear: 'linear' },
  stagger: 30
}

const PROVINCE_RULES = [
  { title: 'The symbol is never altered.', text: 'It may arrive, but its proportions, its colour and the arms within the band never change. Every logo study ends on the official signature.' },
  { title: 'Ceremony, not effects.', text: 'Measured timings and plain eases, as befits the Province’s seal: no bounces, spins, blurs or glows.' },
  { title: 'Loops are for waiting.', text: 'Only the band loops, never the full signature, and only while something loads.' },
  { title: 'Still is a valid frame.', text: 'With reduced motion, every study shows its final frame. Nothing depends on the animation to be understood.' }
]

/** The provincial signature or symbol with its parts named: the band, each part of the arms, the name. */
const provinceParts = (doc) => {
  const art = inner(doc)
  let body = art.body
  // Inside the symbol's own group (which carries its placement), a wrapper the keyframes can move.
  const open = body.indexOf('<g data-brand-symbol=')
  const start = body.indexOf('>', open) + 1
  body = wrap(body, start, closeOf(body, open) - '</g>'.length, 'class="pv-symbol"')
  let part = -1
  body = body.replace(/<(path|ellipse|polygon)\b(?![^>]*aria-label)/g, (match, tag) => {
    part += 1
    return part === 0 ? `<${tag} class="pv-band"` : `<${tag} class="pv-arm" style="--i:${part - 1}"`
  })
  body = body.replace(/<path (?=[^>]*aria-label)/, '<path class="pv-name" ')
  return { ...art, body }
}

const provinceCss = (colours) => `/* Province of British Columbia motion: an example by brandkit. Tokens, keyframes and the classes the
   library uses. Resting styles are final frames: an element plays only inside a .play container,
   and nothing plays with prefers-reduced-motion. Generated by scripts/brands/bc-motion.mjs. */
:root {
${tokenCss('pv', PROVINCE_TOKENS)}
  --pv-brown: ${colours.brown}; --pv-gold: ${colours.gold}; --pv-cream: ${colours.cream}; --pv-black: ${colours.black}; --pv-white: ${colours.white};
}

.pv-logo, .pv-mark, .pv-sign { display: block; overflow: visible; }
.pv-symbol, .pv-band, .pv-arm, .pv-name { transform-box: fill-box; transform-origin: center; }

/* Seal: the band is pressed into place, the arms come up inside it, then the name rises. */
@keyframes pv-press { from { transform: scale(1.12); opacity: 0; } }
@keyframes pv-appear { from { opacity: 0; } }
@keyframes pv-rise { from { transform: translateY(40%); opacity: 0; } }
.play[data-study="seal"] .pv-band { animation: pv-press var(--pv-slow) var(--pv-settle) both; }
.play[data-study="seal"] .pv-arm { animation: pv-appear var(--pv-base) var(--pv-settle) calc(var(--pv-slow) * .6) both; }
.play[data-study="seal"] .pv-name { animation: pv-rise var(--pv-slow) var(--pv-settle) var(--pv-slow) both; }

/* Arms: the band is there; the arms are assembled part by part, top to bottom, then the name. */
@keyframes pv-place { from { transform: translateY(12%); opacity: 0; } }
.play[data-study="arms"] .pv-arm { animation: pv-place var(--pv-base) var(--pv-settle) calc(var(--i) * var(--pv-stagger)) both; }
.play[data-study="arms"] .pv-name { animation: pv-rise var(--pv-slow) var(--pv-settle) calc(var(--pv-stagger) * 24 + var(--pv-base)) both; }

/* Unveil: the signature is uncovered from the top, as a sign's cover comes away. */
@keyframes pv-unveil { from { clip-path: inset(0 0 100% 0); } to { clip-path: inset(0 0 0 0); } }
.pv-unveil { width: 70%; }
.pv-unveil .pv-logo { width: 100%; height: auto; }
.play .pv-unveil { animation: pv-unveil var(--pv-draw) var(--pv-move) both; }

/* Band: the band pulses while the arms hold still. Symbol only. */
@keyframes pv-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
.play[data-study="band"] .pv-band { animation: pv-pulse var(--pv-loop) var(--pv-move) infinite; }

/* Sign: a brown panel rises into the frame and the signature appears on it in white. */
.pv-sign__panel { fill: var(--pv-brown); }
@keyframes pv-panel { from { transform: translateY(100%); } }
.play[data-study="sign"] .pv-sign__panel { animation: pv-panel var(--pv-slow) var(--pv-move) both; }
.play[data-study="sign"] .pv-sign__art { animation: pv-appear var(--pv-slow) var(--pv-settle) var(--pv-slow) both; }

${reducedMotion}
`

const PROVINCE_STAGES = `
.stage--paper { background: #FFFFFF; color: var(--pv-black); } .stage--cream { background: var(--pv-cream); color: var(--pv-black); } .stage--brown { background: var(--pv-brown); color: #FFFFFF; }
.stage .pv-logo { width: 70%; height: auto; } .stage .pv-mark { width: 34%; height: auto; }
.stage .pv-unveil .pv-logo { width: 100%; }
.stage[data-study="sign"] { padding: 0; } .stage .pv-sign { width: 100%; height: 100%; }
`

/** The Province's library, from its brand and loaded fonts. */
export const provinceLibrary = (brand, fonts) => {
  const ctx = { brand, fonts }
  const signature = (colourway) => provinceParts(logoDocument(ctx, { signature: 'provincial', colourway }))
  const logo = (label) => svg('pv-logo', signature('positive'), label)
  const mark = (label) => svg('pv-mark', provinceParts(symbolDocument(ctx, { colourKey: 'brown' })), label)
  const reverse = oneColour(signature('positive'), brand.colours.white)
  const [, , w, h] = reverse.viewBox.split(/\s+/).map(Number)
  const sign = `<svg class="pv-sign" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="The signature in white on a brown sign panel"><rect class="pv-sign__panel" x="-200" y="0" width="800" height="450"/><g class="pv-sign__art"><svg x="${(400 - 240) / 2}" y="${(300 - (240 * h) / w) / 2}" width="240" height="${(240 * h) / w}" viewBox="${reverse.viewBox}">${reverse.body}</svg></g></svg>`
  const studies = [
    { id: 'seal', name: 'Seal', kind: 'logo', group: 'Logo', ground: 'paper', timing: 'slow, then base and slow · settle', use: 'Video openers, ceremonies, official announcements', description: 'The band is pressed into place like a seal, the arms come up inside it, then the Province’s name rises beneath.', art: logo('Province of British Columbia signature') },
    { id: 'arms', name: 'Arms', kind: 'logo', group: 'Logo', ground: 'cream', timing: 'base, 30 ms stagger · settle', use: 'Explaining the symbol, longer title sequences', description: 'With the band in place, the arms are assembled part by part, top to bottom: crown, lion, shield, supporters.', art: logo('Province of British Columbia signature') },
    { id: 'unveil', name: 'Unveil', kind: 'logo', group: 'Logo', ground: 'paper', timing: 'draw · move', use: 'Openings, new programmes, sign launches', description: 'The signature is uncovered from the top down, the way a sign’s cover comes away.', art: `<div class="pv-unveil">${logo('Province of British Columbia signature')}</div>` },
    { id: 'band', name: 'Band', kind: 'loader', group: 'Loading', ground: 'paper', loop: true, timing: '1800 ms loop · move', use: 'Page and app loading, 32 px and up', description: 'The band pulses slowly while the arms hold still. Symbol only; stops when loading ends.', art: mark('Loading') },
    { id: 'sign', name: 'Sign', kind: 'interface', group: 'Interface', ground: 'brown', timing: 'slow + slow · move, settle', use: 'Video end cards, slide transitions, kiosk screens', description: 'A brown panel rises into the frame like a highway sign, and the signature appears on it in white.', art: sign }
  ]
  return {
    name: 'Province of British Columbia', prefix: 'pv', tokens: PROVINCE_TOKENS, rules: PROVINCE_RULES, studies,
    css: provinceCss(brand.colours), pageCss: PROVINCE_STAGES,
    eyebrow: 'Motion · an example for the 1977 identity',
    headline: 'The seal, set in motion.',
    intro: 'Five studies for the 1977 provincial signature: three for the logo, a loader made of the symbol alone, and a sign panel for screens. They share one set of timings, and each ends on the signature exactly as the program draws it.',
    note: 'The 1977 Visual Identity Program predates screen motion and says nothing about it. These studies are brandkit’s example of how the identity could move under the program’s rules; they are not the Province’s guidance.',
    colours: { page: brand.colours.white, ink: brand.colours.black, muted: brand.colours.grey, accent: brand.colours.brown, line: '#DDD6C8' },
    fontStack: '"TeX Gyre Heros", Helvetica, Arial, sans-serif',
    fontFaces: "@font-face { font-family: 'TeX Gyre Heros'; font-weight: 400; src: url('../fonts/texgyreheros-regular.otf') format('opentype'); }\n@font-face { font-family: 'TeX Gyre Heros'; font-weight: 700; src: url('../fonts/texgyreheros-bold.otf') format('opentype'); }",
    headerArt: svg('pv-logo', signature('positive'), 'Province of British Columbia')
  }
}

/** Writes a library's files and returns `{ entry, files }` for brand.json. */
export const writeMotion = write
