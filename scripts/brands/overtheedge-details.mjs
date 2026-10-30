// Over the Edge's brand details page: one self-contained HTML reference (guidelines/brand-details.html
// in the kit), in the brand's own look. Its logos, icons and template previews are drawn by the
// engine from brand.json, and its fonts are the brand's own files, embedded, so it needs no network.
// Used by scripts/brands/overtheedge.mjs.

import { logoDocument, symbolDocument, icon as iconDocument, renderTemplate } from '../../src/engine/index.js'

const escape = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
/** An engine SVG document, inline: no XML declaration, and ids scoped so several can share a page. */
const inline = (svg, prefix, cls) => svg.replace(/^<\?xml[^>]*>\s*/, '').replace(/\bid="([^"]+)"/g, `id="${prefix}-$1"`).replace(/url\(#([^)]+)\)/g, `url(#${prefix}-$1)`).replace(/href="#([^"]+)"/g, `href="#${prefix}-$1"`).replace('<svg ', `<svg class="${cls}" `)

/** WCAG 2 contrast between two hex colours. */
const contrast = (a, b) => {
  const lum = (hex) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const NAMES = { forest: 'Forest', newsprint: 'Cream', lichen: 'Lichen', ink: 'Ink', haze: 'Haze', flame: 'Flame', crumple: 'Crumple', ember: 'Ember', white: 'White', pine: 'Pine', sage: 'Sage', moss: 'Moss', kraft: 'Kraft', pulp: 'Pulp', bark: 'Bark', proof: 'Proof' }
const ROLE = {
  forest: 'The brand. The logo, headlines, photo blocks, day tags and stickers.',
  newsprint: 'The page. Most posts, stories and slides start here.',
  lichen: 'The second ground; the logo and text on Forest or Ink; the doodle wall.',
  ink: 'Body text, Salted accents and doodles on light grounds; a dark ground for season posts.',
  haze: 'OVER THE EDGE repeated faintly behind a schedule on Cream. Never text.',
  flame: 'The big flame behind a deadline on Cream. Never text.',
  crumple: 'The crumpled sheet a schedule is printed on.',
  ember: 'The issue number on the Cream deadline post.',
  white: 'Highlights in crumpled paper; text on Forest where Cream is not to hand.',
  pine: 'Earlier Forest press colour, kept for the supporting studies.',
  sage: 'Earlier Forest press colour: large figures on Forest, 24 px and up.',
  moss: 'Earlier Forest press colour: the photo well of the issue cover.',
  kraft: 'Earlier Forest press colour: rules and placeholders only.',
  pulp: 'Earlier Forest press colour: hairlines and quiet patterns only.',
  bark: 'Earlier Forest press colour: labels on the cards and letterhead.',
  proof: 'Earlier Forest press colour: Breaking and Correction, and nothing else.'
}

export const detailsPage = ({ brand, fonts }, { fontFaces, contrastPairs, largeOnly, studies }) => {
  const ctx = { brand, fonts }
  const logo = (family, layout, colourKey, cls = 'logo') => inline(logoDocument(ctx, { family, layout, colourKey }), `${family}-${layout}-${colourKey}`, cls)
  const symbol = (colourKey) => inline(symbolDocument(ctx, { colourKey }), `o-${colourKey}`, 'o')
  const template = (id) => inline(renderTemplate({ ...ctx, outline: true }, brand.templates.find((t) => t.id === id)).svg, `t-${id}`, 'template')
  const c = brand.colours
  const swatches = Object.entries(c).map(([key, hex]) => `<li><span class="chip" style="background:${hex}"></span><b>${NAMES[key]}</b><code>${hex}</code><small>${escape(ROLE[key])}</small></li>`).join('')
  const pairs = [...contrastPairs.map((pair) => [...pair, '']), ...largeOnly.map((pair) => [...pair, '24 px and up'])].map(([fg, bg, , note]) => `<tr><td><span class="pair" style="background:${c[bg]};color:${c[fg]}">Aa</span></td><td>${NAMES[fg]} on ${NAMES[bg]}</td><td>${contrast(c[fg], c[bg]).toFixed(2)} : 1</td><td>${note || 'Any size'}</td></tr>`).join('')
  const icons = brand.icons.items.map((item) => `<li>${inline(iconDocument(ctx, item), `i-${item.id}`, 'icon')}<span>${item.id}</span></li>`).join('')
  const studyList = studies.map((study) => `<li><b>${escape(study.name)}</b><span>${escape(study.group)}</span><p>${escape(study.description)}</p></li>`).join('')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Over the Edge Brand Details</title>
<style>
/* Fonts: supplied originals and open-source faces; see each notice in fonts/. */
${fontFaces}
/* Layout: one 1180 px column on cream, sections divided by the identity's dashed ink rule, artwork on its true grounds. */
:root { ${Object.entries(c).map(([key, hex]) => `--${key}: ${hex};`).join(' ')} }
* { box-sizing: border-box; }
body { margin: 0; background: var(--newsprint); color: var(--ink); font-family: "Helvetica Neue", system-ui, Arial, sans-serif; font-size: 16px; line-height: 1.6; -webkit-font-smoothing: antialiased; font-variant-numeric: tabular-nums; }
:focus-visible { outline: 2px solid var(--forest); outline-offset: 3px; }
h1, h2, h3 { font-family: Anton, 'Arial Narrow', Impact, sans-serif; font-weight: 400; margin: 0; text-wrap: balance; }
p { margin: 0; }
code, .label, th, .mono { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-weight: 700; }
.label { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink); }
.page { max-width: 1180px; margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 20px 72px; }
.bar { background: var(--forest); color: var(--white); padding: 18px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.bar .logo { width: min(280px, 70vw); height: auto; display: block; }
.bar span { color: var(--lichen); }
.cover { padding-block: clamp(48px, 8vw, 104px) clamp(32px, 5vw, 56px); display: grid; gap: 22px; }
.cover h1 { font-size: clamp(44px, 7vw, 92px); line-height: 1.02; letter-spacing: -.02em; max-width: 13ch; }
.cover p { max-width: 62ch; font-size: 18px; }
.meta { display: flex; flex-wrap: wrap; gap: 6px 28px; }
section { border-top: 1.5px dashed var(--ink); padding-block: clamp(48px, 6vw, 80px); display: grid; gap: 32px; }
.sh { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr); gap: 12px 48px; align-items: end; }
.sh h2 { font-size: clamp(30px, 3.8vw, 46px); line-height: 1.06; margin-top: 8px; }
.grid { display: grid; gap: 20px; }
.g2 { grid-template-columns: repeat(2, minmax(0, 1fr)); } .g3 { grid-template-columns: repeat(3, minmax(0, 1fr)); } .g4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.panel { padding: clamp(20px, 4vw, 40px); display: grid; place-items: center; min-height: 200px; }
.panel svg { width: 100%; height: auto; max-height: 220px; }
.on-white { background: var(--newsprint); border: 1px solid var(--lichen); } .on-forest { background: var(--forest); } .on-ink { background: var(--ink); } .on-lichen { background: var(--lichen); }
figure { margin: 0; display: grid; gap: 10px; } figcaption { font-size: 14px; }
.voice { background: var(--white); border: 1px solid var(--lichen); padding: clamp(24px, 4vw, 40px); display: grid; gap: 18px; }
.voice blockquote { margin: 0; font-family: Anton, 'Arial Narrow', Impact, sans-serif; font-weight: 400; font-size: clamp(24px, 3vw, 34px); line-height: 1.2; color: var(--forest); }
.rules { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--lichen); }
.rules li { display: grid; grid-template-columns: minmax(0, 220px) minmax(0, 1fr); gap: 20px; padding: 14px 0; border-bottom: 1px solid var(--lichen); }
.rules li b { font-weight: 600; }
.swatches { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr)); gap: 20px; }
.swatches li { display: grid; gap: 4px; align-content: start; }
.swatches .chip { height: 96px; border: 1px solid var(--lichen); margin-bottom: 6px; }
.swatches code { font-size: 13px; color: var(--ink); } .swatches small { font-size: 13px; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 15px; }
th { text-align: left; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink); font-weight: 500; padding: 8px; border-bottom: 1.5px dashed var(--ink); }
td { padding: 10px 8px; border-bottom: 1px solid var(--lichen); white-space: nowrap; }
.pair { display: inline-grid; place-items: center; width: 44px; height: 32px; font-family: Anton, 'Arial Narrow', Impact, sans-serif; font-weight: 400; }
.type { display: grid; gap: 0; border-top: 1px solid var(--lichen); }
.type > div { display: grid; grid-template-columns: minmax(0, 240px) minmax(0, 1fr); gap: 20px; padding: 22px 0; border-bottom: 1px solid var(--lichen); align-items: baseline; }
.s-display { font-family: Anton, 'Arial Narrow', Impact, sans-serif; font-weight: 400; font-size: clamp(28px, 4vw, 48px); line-height: 1.1; }
.s-anton { font-family: Anton, 'Arial Narrow', Impact, sans-serif; font-size: clamp(36px, 5vw, 64px); line-height: 1; text-transform: uppercase; }
.s-body { font-size: 18px; } .s-mono { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; font-size: 16px; }
.s-hand { font-family: 'Salted', cursive; font-size: 34px; color: var(--forest); }
.icons { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 12px; }
.icons li { background: var(--white); border: 1px solid var(--lichen); padding: 18px 8px 10px; display: grid; justify-items: center; gap: 8px; color: var(--forest); font-size: 12px; }
.icons .icon { width: 32px; height: 32px; }
.templates { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); gap: 20px; }
.templates figure .template { width: 100%; height: auto; border: 1px solid var(--lichen); background: var(--white); }
.o-row { display: flex; gap: 20px; flex-wrap: wrap; align-items: end; }
.o-row .o { width: 64px; height: auto; }
.studies { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); gap: 0 24px; }
.studies li { padding: 14px 0; border-bottom: 1.5px dashed var(--ink); display: grid; gap: 2px; }
.studies li span { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-weight: 700; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink); }
.studies li p { font-size: 14px; }
.next { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: 16px; }
.next li { background: var(--lichen); padding: 24px; display: grid; gap: 8px; align-content: start; }
.next li:nth-child(2) { background: var(--forest); color: var(--white); } .next li:nth-child(3) { background: var(--white); border: 1px solid var(--lichen); }
.next b { font-family: Anton, 'Arial Narrow', Impact, sans-serif; font-weight: 400; font-size: 20px; }
footer { border-top: 1.5px dashed var(--ink); padding-top: 24px; display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
@media (max-width: 860px) { .sh, .g2, .g3, .g4 { grid-template-columns: minmax(0, 1fr); } .rules li, .type > div { grid-template-columns: minmax(0, 1fr); gap: 6px; } }
</style>
</head>
<body>
<div class="page">
<header class="bar">${logo('overtheedge', 'horizontal', 'white')}<span class="label" style="color:var(--lichen)">Brand details · v${brand.displayVersion}</span></header>

<div class="cover">
  <span class="label">UNBC's Independent Student Newspaper</span>
  <h1>Drawn in the margins.</h1>
  <p>The full reference for Over the Edge's "Doodle" identity: the paper's own lettering in Cream, Forest, Lichen and Ink, Decalotype headlines, Helvetica Neue for reading, Salted for the handwritten accents, and the line doodles students leave in their notebooks. Everything here is drawn from one brand.json.</p>
  <div class="meta label"><span>v${brand.displayVersion}</span><span>overtheedge.unbc.ca</span><span>Generated by brandkit</span></div>
</div>

<section aria-labelledby="h-voice">
  <div class="sh"><div><span class="label">Positioning and voice</span><h2 id="h-voice">Students talking to students.</h2></div><p>Curious, warm and a little wry. Plain in the news; playful in features, when the story earns it.</p></div>
  <div class="voice"><blockquote>Breaking news, vibrant clubs, can’t-miss events, and a shared university calendar.</blockquote><span class="label">The paper's own line, from its homepage</span></div>
  <ul class="rules">
    <li><b>Headlines</b><span>Title Case, as the site and the covers set them: “Bears Don’t Really Hibernate… Or Do They?”, “Green So Far”.</span></li>
    <li><b>First person</b><span>Welcome in features and columns. Never in news.</span></li>
    <li><b>Exclamation marks</b><span>Features and event promotion only.</span></li>
    <li><b>Dates</b><span>Month spelled out: “[Mon] [D], [YYYY]” on screen, “[MONTH] [D]TH” on covers. Never all numbers, which readers split on.</span></li>
    <li><b>Emoji</b><span>None in headlines, navigation or interface.</span></li>
  </ul>
</section>

<section aria-labelledby="h-logo">
  <div class="sh"><div><span class="label">Logo</span><h2 id="h-logo">The paper’s own lettering.</h2></div><p>Drawn path for path from the SVG the site serves. One colour at a time: Forest on Cream or Lichen, Lichen on Ink, Cream on Forest.</p></div>
  <div class="grid g2">
    <figure><div class="panel on-white">${logo('overtheedge', 'horizontal', 'forest')}</div><figcaption>Primary. Forest on Cream. 288 px / 58 mm wide or more.</figcaption></figure>
    <figure><div class="panel on-forest">${logo('overtheedge', 'horizontal', 'newsprint')}</div><figcaption>Reversed. Cream on Forest.</figcaption></figure>
  </div>
  <div class="grid g3">
    <figure><div class="panel on-white">${logo('words', 'horizontal', 'forest')}</div><figcaption>Without subtext, for small spaces. 96 px / 20 mm or more.</figcaption></figure>
    <figure><div class="panel on-lichen">${logo('overtheedge', 'stacked', 'forest')}</div><figcaption>Stacked, extracted from the first page of the September issue.</figcaption></figure>
    <figure><div class="panel on-ink"><div class="o-row">${symbol('lichen')}</div></div><figcaption>The O, alone only where the name can’t be read. 16 px / 5 mm or more.</figcaption></figure>
  </div>
  <ul class="rules">
    <li><b>Clear space</b><span>Half the height of the O on every side.</span></li>
    <li><b>Never</b><span>Redraw it, reset it in a font, outline it, stretch it, add effects, or set it in two colours other than the site's original (kept in logos/source/).</span></li>
  </ul>
</section>

<section aria-labelledby="h-colour">
  <div class="sh"><div><span class="label">Colour</span><h2 id="h-colour">Cream, Forest, Lichen, Ink.</h2></div><p>The identity's four colours, read from its own files' fills, then four tints sampled from its posts. The earlier Forest press colours follow, kept for the supporting studies and the site.</p></div>
  <ul class="swatches">${swatches}</ul>
  <div class="table-wrap"><table><thead><tr><th></th><th>Text pair</th><th>Contrast</th><th>Use</th></tr></thead><tbody>${pairs}</tbody></table></div>
</section>

<section aria-labelledby="h-type">
  <div class="sh"><div><span class="label">Typography</span><h2 id="h-type">Three voices.</h2></div><p>The identity names Decalotype, Helvetica Neue and Salted. Decalotype is a commercial face, so Anton stands in for it. Helvetica Neue and Salted are supplied originals; keep their notices.</p></div>
  <div class="type">
    <div><span class="label">Headlines · Decalotype (Anton)</span><span class="s-display">Submission Schedule</span></div>
    <div><span class="label">Reading · Helvetica Neue</span><span class="s-body">Over the Edge is a student-run newspaper and creative platform that gives students space to share their voices, perspectives, and ideas.</span></div>
    <div><span class="label">Labels · Helvetica Neue Bold</span><span class="s-mono">Campus Corners · Weather</span></div>
    <div><span class="label">Accents · Salted</span><span class="s-hand">Week schedule · Deadline</span></div>
  </div>
</section>

<section aria-labelledby="h-icons">
  <div class="sh"><div><span class="label">Icons</span><h2 id="h-icons">The site’s line, carried on.</h2></div><p>24 px grid, 2 px stroke, round caps and joins, no fill. The first five are the site's own; the rest are drawn to match.</p></div>
  <ul class="icons">${icons}</ul>
</section>

<section aria-labelledby="h-print">
  <div class="sh"><div><span class="label">Doodles and templates</span><h2 id="h-print">Drawn in the margins.</h2></div><p>Googly eyes, a calendar with a clock, a flame, a pencil, a paper plane and a spark, at one round stroke. Around them: dashed rules, tilted day tags, blob stickers, crumpled paper and a faint OVER THE EDGE ground. The Staff Card is the press pass.</p></div>
  <div class="templates">
    <figure>${template('post-submission-schedule')}<figcaption>Submission schedule, 1080 × 1350</figcaption></figure>
    <figure>${template('post-week-schedule')}<figcaption>Week schedule, 1080 × 1350</figcaption></figure>
    <figure>${template('post-deadline')}<figcaption>Deadline, 1080 × 1350</figcaption></figure>
    <figure>${template('post-schedule-paper')}<figcaption>Schedule on paper, 1080 × 1350</figcaption></figure>
  </div>
</section>

<section aria-labelledby="h-motion">
  <div class="sh"><div><span class="label">Motion</span><h2 id="h-motion">Off the press, one word at a time.</h2></div><p>The full library, with replay, is motion/index.html in the kit and brandkit's Motion tab.</p></div>
  <ul class="studies">${studyList}</ul>
</section>

<section aria-labelledby="h-next">
  <div class="sh"><div><span class="label">Where it can go next</span><h2 id="h-next">Proposals, not rules.</h2></div><p>Ideas the system makes easy. None of them is decided.</p></div>
  <ul class="next">
    <li><b>A page grid for print</b><span>Set the inside pages on the same dashed rules and Anton folios as the cover.</span></li>
    <li><b>The site, refreshed</b><span>The homepage in site/ shows the identity on the web: masthead, latest issue, top stories, calendar.</span></li>
    <li><b>Section fronts</b><span>Anton section names over a forest band, one per section of the paper.</span></li>
  </ul>
</section>

<footer class="label"><span>Over the Edge brand details · generated by brandkit from brand.json</span><span>v${brand.displayVersion}</span></footer>
</div>
</body>
</html>
`
}
