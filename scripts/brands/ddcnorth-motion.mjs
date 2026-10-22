// ddcnorth's motion, proposed in v2.3: tokens, rules, guardrails and studies as data, and the files
// the kit carries for them (brands/ddcnorth/motion/).
//
// Unlike First Form, whose logo studies assemble its mark, ddcnorth's motion never touches the
// logo or the complete six-dot symbol: motion lives in fields, paths and loaders, and the logo is
// on screen, still, from the first frame. The library page is the one reviewed on the company's
// website project (scripts/brands/ddcnorth-v23/motion-library.template.html); this module gives it
// its data, fonts and logo. Used by scripts/brands/ddcnorth-v23.mjs.

import { readFileSync } from 'node:fs'

export const TOKENS = {
  durations: { quick: 200, base: 600, slow: 1200, draw: 1800 },
  easings: { settle: 'cubic-bezier(.2,.7,.2,1)', move: 'cubic-bezier(.6,0,.2,1)', linear: 'linear' },
  stagger: { field: [20, 30], loaderStep: 200 }
}

/** The token table, in the order the library shows it: [name, value, use]. */
export const TOKEN_ROWS = [
  ['Quick', '200 ms', 'Feedback, a dot lighting up'],
  ['Base', '600 ms', 'Reveals and single moves'],
  ['Slow', '1200 ms', 'Dots travelling, loader cycles'],
  ['Draw', '1800 ms', 'Paths and lines'],
  ['Stagger', '20–30 ms', 'Between dots in a field'],
  ['Loader step', '200 ms', 'Between loader dots']
]

export const RULES = [
  { title: 'Fields, paths and loaders move', text: 'Motion belongs to the supporting dots: grids, data paths, progress and loading states.' },
  { title: 'The logo never moves', text: 'The logo and the complete six-dot symbol never fade, scale, pulse or travel. They are on screen from the first frame.' },
  { title: 'Reduced motion shows the end', text: 'When a device asks for less motion, every study shows its final frame and nothing loops.' }
]

export const GUARDRAILS = {
  do: ['Use one move per screen or slide', 'Let loops run only where nothing needs reading', 'Offer a pause for anything that loops longer than five seconds', 'Finish transitions in under two seconds'],
  dont: ['Fade, scale, spin or bounce the logo or the full symbol', 'Animate dots behind body text', 'Mix easings within one move', 'Use colours outside the kit for states']
}

export const GROUPS = [
  { id: 'fields', label: 'Fields', kinds: ['Field'] },
  { id: 'paths', label: 'Paths', kinds: ['Path'] },
  { id: 'states', label: 'Loaders and states', kinds: ['Loader', 'Progress', 'State'] },
  { id: 'data', label: 'Data', kinds: ['Chart', 'Numerals'] },
  { id: 'scenes', label: 'Transitions and end cards', kinds: ['Transition', 'End card'] }
]

/** [id, name, kind, background, loop, timing, use, description]: the order they appear in the library. */
const LIST = [
  ['reveal', 'Reveal', 'Field', 'paper', false, '600 ms · settle · 30 ms stagger', 'Section intros, pattern backgrounds, slide openers', 'A field of dots arrives on a diagonal, smallest first.'],
  ['connect', 'Connect', 'Path', 'paper', false, '1800 ms · settle · nodes on arrival', 'Hero moments, “how it fits together” slides', 'A line draws through the field, lighting each point it reaches.'],
  ['think', 'Think', 'Loader', 'paper', true, '1200 ms loop · 200 ms between dots', 'Loading and processing states', 'Three dots take turns. The loader is never the symbol.'],
  ['progress', 'Fill', 'Progress', 'paper', true, '300 ms per step · 1000 ms hold · loop', 'Uploads, multi-step forms, video chapters', 'A row of ten dots fills one at a time, then holds before resetting.'],
  ['sort', 'Sort', 'Field', 'midnight', false, '1200 ms · move · 20 ms stagger', 'Data sections, explainer videos, “before and after” slides', 'Scattered dots travel into ordered rows: messy data becoming structure.'],
  ['count', 'Count', 'Numerals', 'paper', false, '350 ms per step · lit dots 200 ms settle', 'Stat callouts, slide numbers, chapter markers', 'Dot-matrix numerals step up to their value. Unlit dots stay visible.'],
  ['signal', 'Signal', 'Field', 'midnight', true, '4 s wave · linear · loop', 'Ambient video backgrounds, event screens, hero areas without text', 'A slow wave of dot sizes travels across the grid, like a live data surface.'],
  ['focus', 'Focus', 'Field', 'paper', false, '1200 ms · settle · marks 600 ms', 'Highlighting a finding in a chart or slide', 'Everything else steps back so one cluster stands out, then corner marks frame it.'],
  ['cover', 'Cover', 'Transition', 'paper', false, '600 ms · move · 25 ms diagonal stagger', 'Slide and video scene changes', 'Dots grow until they cover the frame, carrying you to the next scene. Replay to go back.'],
  ['settle', 'Settle', 'End card', 'midnight', false, '600 ms · settle · edge-first stagger', 'Video end cards, event screens, closing slides', 'The logo is there from the first frame. Only the field arrives, from the edges inward, and stops one dot diameter short.'],
  ['scan', 'Scan', 'Field', 'paper', true, '2400 ms sweep · linear · loop', 'Search, “analysing” and import screens', 'A line sweeps across the grid and each dot swells as it passes, like data being read.'],
  ['gather', 'Gather', 'Field', 'midnight', false, '1200 ms · move · 25 ms stagger', 'Partnerships, merged data sources, “bringing it together” slides', 'Two separate clusters drift together and interleave into one grid: two sources becoming one picture.'],
  ['branch', 'Branch', 'Path', 'paper', false, '600 ms stem · 900 ms branches · settle', 'Decision support, roadmap options, scenario slides', 'One line splits into three options; the recommended one fills in last.'],
  ['stack', 'Stack', 'Chart', 'paper', false, '600 ms per dot · move · 60 ms stagger', 'Chart intros, survey results, “how many” slides', 'Dots drop into columns one at a time, building a unit chart where one dot is one item.'],
  ['relay', 'Relay', 'Loader', 'paper', true, '1050 ms loop · 150 ms hand-off', 'Syncing, exports, background work', 'A light passes along a row of dots, for waits longer than a moment.'],
  ['ripple', 'Ripple', 'Field', 'midnight', true, '1800 ms loop · 200 ms between rings', 'New-insight moments, live updates, map pings', 'Rings of dots light up outward from one point, like news spreading.'],
  ['confirm', 'Confirm', 'State', 'paper', false, '1200 ms · move · 40 ms stagger', 'Sent, saved and completed states', 'A loose row of dots gathers into a tick.'],
  ['timeline', 'Timeline', 'Path', 'paper', false, '1800 ms draw · settle · stages on arrival', 'Process sections like “How we work”, project timelines', 'A line runs through three stages, filling each one as it arrives.']
]
const groupOf = (kind) => GROUPS.find((group) => group.kinds.includes(kind)).label
export const STUDIES = LIST.map(([id, name, kind, background, loop, timing, use, description]) => ({ id, name, kind, group: groupOf(kind), background, ...(loop ? { loop } : {}), timing, use, description }))

/** The motion entry the revision adds to brand.json. */
export const motionEntry = () => ({ page: 'motion/index.html', css: 'motion/motion.css', tokens: TOKENS, rules: RULES, guardrails: GUARDRAILS, groups: GROUPS, studies: STUDIES })

/** The library page: the template with its data, fonts and logo filled in. */
export const motionPage = (template, { fonts, logo, logoInner }) => fillTemplate(template, {
  FONTS: fonts, LOGO: logo, LOGO_INNER: logoInner,
  MOTION_JSON: JSON.stringify({ tokenRows: TOKEN_ROWS, rules: RULES, guardrails: GUARDRAILS, groups: GROUPS, studies: STUDIES })
})

/** Fills `{{NAME}}` placeholders; a name it was not given, or any `{{` left over, is an error. */
export const fillTemplate = (template, values) => {
  const out = template.replace(/\{\{([A-Z_]+)\}\}/g, (match, key) => {
    if (!(key in values)) throw new Error(`No value for ${match}`)
    return values[key]
  })
  if (out.includes('{{')) throw new Error('A placeholder was left unfilled')
  return out
}

/** Reads a generator input, or stops with the path that is missing. */
export const readInput = (url) => {
  try {
    return readFileSync(url)
  } catch {
    console.error(`Missing input: ${new URL(url).pathname}`)
    process.exit(1)
  }
}

export const motionCss = () => `/* ddcnorth motion, from v2.3. Tokens, keyframes and classes for the moves that CSS can play.
   The logo and the complete six-dot symbol are never animated. Resting styles are final frames:
   an element plays only inside a .play container, and nothing plays with prefers-reduced-motion.
   Generated by scripts/brands/ddcnorth-motion.mjs. */
:root {
  --ddc-quick: ${TOKENS.durations.quick}ms;
  --ddc-base: ${TOKENS.durations.base}ms;
  --ddc-slow: ${TOKENS.durations.slow}ms;
  --ddc-draw: ${TOKENS.durations.draw}ms;
  --ddc-settle: ${TOKENS.easings.settle};
  --ddc-move: ${TOKENS.easings.move};
  --ddc-linear: ${TOKENS.easings.linear};
  --ddc-stagger-field: ${TOKENS.stagger.field[0]}ms;
  --ddc-loader-step: ${TOKENS.stagger.loaderStep}ms;
  --ddc-black: #000000; --ddc-paper: #F7F6F3; --ddc-graphite: #4B4F56;
  --ddc-midnight: #0B2B4A; --ddc-ice: #C8D7E8; --ddc-white: #FFFFFF;
}

/* Reveal: dots arrive, smallest first. Set --i on each dot for its place in the stagger. */
@keyframes ddc-reveal { from { opacity: 0; transform: scale(0); } }
.play .ddc-dot { transform-box: fill-box; transform-origin: center; animation: ddc-reveal var(--ddc-base) var(--ddc-settle) calc(var(--i, 0) * var(--ddc-stagger-field)) both; }

/* Connect and Timeline: a path draws on. Set pathLength="1" on the path. */
@keyframes ddc-draw { from { stroke-dashoffset: 1; } }
.play .ddc-path { stroke-dasharray: 1; animation: ddc-draw var(--ddc-draw) var(--ddc-settle) both; }

/* Think: three dots take turns. The loader is never the symbol. */
@keyframes ddc-think { 0%, 100% { opacity: .25; } 50% { opacity: 1; } }
.ddc-think > * { animation: ddc-think var(--ddc-slow) ease-in-out infinite; }
.ddc-think > :nth-child(2) { animation-delay: var(--ddc-loader-step); }
.ddc-think > :nth-child(3) { animation-delay: calc(var(--ddc-loader-step) * 2); }

@media (prefers-reduced-motion: reduce) {
  .play .ddc-dot, .play .ddc-path, .ddc-think > * { animation: none; }
}
`

export const motionTokens = () => `${JSON.stringify({ ...TOKENS, rules: RULES.map((rule) => rule.title), guardrails: GUARDRAILS }, null, 2)}\n`

export const motionReadme = () => `# ddcnorth motion (v2.3)

The motion library for the v2.3 identity. Open \`index.html\` in a browser to play every study;
\`motion.css\` carries the tokens and the moves CSS can play on its own, and \`motion-tokens.json\`
the same tokens as data.

## Rules

${RULES.map((rule, index) => `${index + 1}. **${rule.title}.** ${rule.text}`).join('\n')}

## Tokens

| Token | Value | Use |
| --- | --- | --- |
${TOKEN_ROWS.map(([name, value, use]) => `| ${name} | ${value} | ${use} |`).join('\n')}

Easings: settle \`${TOKENS.easings.settle}\`, move \`${TOKENS.easings.move}\`, linear for loops only.

## Studies

${STUDIES.map((study) => `- **${study.name}** (${study.kind}${study.loop ? ', loop' : ''}): ${study.description} *${study.timing}.* Use: ${study.use}.`).join('\n')}

## Guardrails

Do:
${GUARDRAILS.do.map((item) => `- ${item}`).join('\n')}

Don’t:
${GUARDRAILS.dont.map((item) => `- ${item}`).join('\n')}

Fonts are embedded in \`index.html\`: Inter and Inter Display (SIL Open Font License 1.1,
\`fonts/Inter-OFL.txt\`) and Space Mono (SIL Open Font License 1.1, \`fonts/SpaceMono-OFL.txt\`).
Generated by \`scripts/brands/ddcnorth-motion.mjs\`.
`
