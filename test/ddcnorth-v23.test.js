// ddcnorth v2.3, proposed (scripts/brands/ddcnorth-v23.mjs): the revision, what it adds, and the
// rules it keeps. See docs/PLANS.md, M1.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { icon, mergePatch, pattern, planKit, renderTemplate, templateFields, validateBrand, withRevision, approvedOnly, wrapLines } from '../src/engine/index.js'
import { guidePages, guideSheets } from '../src/engine/guide.js'
import { loadBrandFontsFromDisk } from '../src/fonts/node.js'
import { motionUrl, viewOrOverview } from '../src/app/motion.js'
import { GROUPS, STUDIES, TOKENS, RULES, GUARDRAILS } from '../scripts/brands/ddcnorth-motion.mjs'
import { colourProblems, grow, markBox, pathCircles, templateIntrusions, templateMarks, textBox } from './brand-rules.js'

const folder = new URL('../brands/ddcnorth/', import.meta.url).pathname
// The proposal as it was made, in the v2.1 definition kept as history (test/ddcnorth-accepted.test.js
// covers the approved v2.3 in brand.json).
const brand = JSON.parse(readFileSync(`${folder}history/2.1/brand.json`, 'utf8'))
const ID = 'data-design-connection'
const revised = withRevision(brand, ID)
const entry = brand.revisions.find((revision) => revision.id === ID)
const newTemplates = revised.templates.slice(-8)
const newPatterns = revised.patterns.slice(-4)
const newIcons = revised.icons.items.slice(-5)
const DESCRIPTOR = 'Data · Design · Connection'
const fontsPromise = loadBrandFontsFromDisk(revised, folder)

// --- BK-002: the append operator.

test('$append adds to an array, or makes one, and every other patch behaves as before', () => {
  assert.deepEqual(mergePatch({ a: [1, 2] }, { a: { $append: [3] } }), { a: [1, 2, 3] })
  assert.deepEqual(mergePatch({}, { a: { $append: [1] } }), { a: [1] })
  assert.deepEqual(mergePatch({ o: { x: 1, y: 2 } }, { o: { y: 3 } }), { o: { x: 1, y: 3 } })
  assert.deepEqual(mergePatch({ a: [1, 2] }, { a: [9] }), { a: [9] })
  assert.deepEqual(mergePatch({ s: 1 }, { s: 2 }), { s: 2 })
  assert.deepEqual(mergePatch({ s: 1, t: 2 }, { s: null }), { t: 2 })
  assert.deepEqual(mergePatch({ o: { list: [1] } }, { o: { list: { $append: [2] } } }), { o: { list: [1, 2] } })
  assert.deepEqual(mergePatch({ a: [] }, { a: { $append: [{ $append: ['kept'] }] } }), { a: [{ $append: ['kept'] }] })
  // A new object key is merged into an empty object, so a null inside it removes nothing and is dropped.
  assert.deepEqual(mergePatch({}, { o: { x: 1, gone: null } }), { o: { x: 1 } })
  assert.throws(() => mergePatch({ a: 1 }, { a: { $append: [2] } }), /only add to an array/)
  assert.throws(() => mergePatch({ a: [] }, { a: { $append: [2], other: 1 } }), /beside other keys/)
  assert.throws(() => mergePatch({ a: [] }, { a: { $append: 2 } }), /needs an array/)
})

test('the colour check reports off-palette, alpha, named and hsl colours, and passes the palette', () => {
  assert.deepEqual(colourProblems('<circle fill="#0B2B4A"/><rect fill="#D9DCDF" stroke="none"/><p style="color:#F7F6F3">'), [])
  assert.deepEqual(colourProblems('<path fill="currentColor"/>'), [])
  const reported = (source, pattern, options) => assert.ok(colourProblems(source, options).some((problem) => pattern.test(problem)), source)
  reported('<circle fill="#123456"/>', /off-palette #123456/)
  reported('<circle fill="#C8D7E873"/>', /alpha hex/)
  reported('<circle fill="red"/>', /named colour red/)
  reported('<style>p { color:tomato }</style>', /named colour tomato/)
  reported('<style>p { color: hsl(210, 70%, 20%) }</style>', /hsl colour/)
  reported('<rect style="background:rgba(1, 2, 3, .5)"/>', /off-palette rgba/)
  reported('<path fill="currentColor"/>', /currentColor/, { currentColor: false })
})

// --- BK-001: the revision entry.

test('the v2.3 proposal sits after rising, with its fields, and both brands validate', () => {
  assert.deepEqual(brand.revisions.map((revision) => revision.id), ['rising', ID])
  assert.equal(entry.title, 'Data, design, connection')
  assert.equal(entry.version, '2.3-data-design-connection')
  assert.equal(entry.displayVersion, '2.3')
  assert.equal(entry.status, 'proposed')
  assert.equal(entry.date, '2026-10-22')
  assert.ok(entry.summary && entry.rationale.length >= 3)
  assert.ok(![entry.summary, ...entry.rationale].some((line) => line.includes('—')), 'no em dashes')
  assert.deepEqual(validateBrand(brand), [])
  assert.deepEqual(validateBrand(revised), [])
  const { revisions: _kept, ...resolved } = revised
  assert.ok(!JSON.stringify(resolved).includes('$append'), 'resolved outside the revisions list')
})

test('validateBrand names each problem with revisions, dots, lines, motion and $append', () => {
  const problems = (patch) => validateBrand(mergePatch(brand, patch)).join('\n')
  assert.match(problems({ revisions: [{ id: 'x', status: 'proposed' }] }), /Revision `x` needs an id, a status and changes/)
  assert.match(problems({ revisions: [{ id: 'x', status: 'proposed', changes: {} }, { id: 'x', status: 'proposed', changes: {} }] }), /Revision `x` is listed twice/)
  assert.match(problems({ revisions: [{ id: 'x', status: 'proposed', changes: { patterns: [{ id: 'p', dots: [{ cx: 'a', cy: 1, r: 1 }] }] } }] }), /Revision `x`: Pattern `p` has a dot/)
  assert.match(problems({ patterns: [{ id: 'p', lines: [{ points: [[0, 0]] }] }] }), /Pattern `p` has a line with fewer than two points/)
  assert.match(problems({ templates: [{ id: 't', width: 1, height: 1, elements: [{ type: 'dots', dots: [[0, 0, -1]] }] }] }), /Template `t` has a dots element/)
  assert.match(problems({ templates: [{ id: 't', width: 1, height: 1, elements: [{ type: 'polyline', points: [[0, 0]] }] }] }), /Template `t` has a polyline with fewer than two points/)
  const appended = structuredClone(brand)
  appended.copy.extra = { $append: ['x'] }
  assert.match(validateBrand(appended).join('\n'), /`copy.extra` uses \$append/)
  assert.match(problems({ motion: { studies: [{ id: 'a', name: 'A' }] } }), /Motion study `a` needs/)
  assert.match(problems({ motion: { studies: [STUDIES[0], STUDIES[0]] } }), /listed twice/)
  assert.match(problems({ motion: { studies: STUDIES, tokens: { durations: { quick: 0 } } } }), /Motion duration `quick`/)
})

// --- BK-003: patterns and the new template elements.

test('the four patterns draw dots and lines, stay on the palette, and leave the symbol room', () => {
  assert.deepEqual(newPatterns.map((spec) => spec.id), ['dot-network', 'dot-field', 'dot-ramp', 'dot-signal'])
  for (const spec of newPatterns) {
    const svg = pattern({ brand: revised }, spec)
    assert.ok(!/NaN|undefined/.test(svg), spec.id)
    assert.deepEqual(colourProblems(svg, { currentColor: false }), [], spec.id)
  }
  for (const spec of newPatterns.filter((entry) => entry.place)) {
    for (const place of spec.place) {
      const clear = grow(markBox.symbol({ x: place.x, y: place.y, scale: place.scale }))
      for (const dot of spec.dots) assert.ok(dot.cx + dot.r <= clear.l || dot.cx - dot.r >= clear.r || dot.cy + dot.r <= clear.t || dot.cy - dot.r >= clear.b, `${spec.id} dot at ${dot.cx},${dot.cy}`)
      for (const line of spec.lines ?? []) {
        for (let i = 0; i < line.points.length - 1; i++) {
          const [[x1, y1], [x2, y2]] = [line.points[i], line.points[i + 1]]
          const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1))
          for (let k = 0; k <= steps; k++) {
            const [x, y] = [x1 + (x2 - x1) * k / steps, y1 + (y2 - y1) * k / steps]
            assert.ok(!(x > clear.l && x < clear.r && y > clear.t && y < clear.b), `${spec.id} line at ${x},${y}`)
          }
        }
      }
    }
  }
  const plan = planKit(revised, { rasters: false, pdfs: false }).map((entry) => entry.path)
  for (const spec of newPatterns) assert.ok(plan.includes(`patterns/${spec.id}.svg`), spec.id)
})

test('dots and polylines draw in templates', () => {
  const tiny = { id: 't', width: 10, height: 10, elements: [{ type: 'dots', dots: [[5, 5, 2]], fill: 'midnight', opacity: 0.5 }, { type: 'polyline', points: [[0, 0], [10, 10]], stroke: 'ice' }] }
  const { svg } = renderTemplate({ brand }, tiny)
  assert.match(svg, /<path d="M3 5a2 2 0 1 0 4 0a2 2 0 1 0 -4 0Z" fill="#0B2B4A" opacity="0.5"\/>/)
  assert.match(svg, /<polyline points="0,0 10,10" fill="none" stroke="#C8D7E8"\/>/)
})

// --- BK-004: templates.

test('the eight templates render outlined, on the palette, with fields and a large enough logo', async () => {
  const fonts = await fontsPromise
  assert.deepEqual(newTemplates.map((template) => template.id), ['slide-title', 'slide-finding', 'social-insight', 'social-divider', 'brief-cover', 'workshop-canvas', 'share-image', 'linkedin-banner'])
  for (const template of newTemplates) {
    assert.equal(template.extension, 'v2.3')
    for (const outline of [false, true]) {
      const { svg } = renderTemplate({ brand: revised, fonts, outline }, template)
      assert.ok(!/NaN|undefined/.test(svg), template.id)
      if (outline) assert.ok(!svg.includes('<text'), `${template.id} outlined`)
      assert.deepEqual(colourProblems(svg, { currentColor: false }), [], template.id)
    }
    assert.ok(templateFields(template, revised).length > 0, `${template.id} has a field`)
    for (const logo of template.elements.filter((element) => element.type === 'logo')) assert.ok(logo.width >= 220, `${template.id} logo ${logo.width}`)
  }
  const set = revised.sets.find((entry) => entry.id === 'insight-slides')
  assert.deepEqual(set.variants.map((variant) => variant.template), ['slide-title', 'slide-finding'])
  assert.ok(planKit(revised, { rasters: false, pdfs: true }).some((entry) => entry.path === 'templates/pdf/sets/insight-slides.pdf'))
})

test('every logo and symbol in the templates keeps one dot diameter clear, text measured', async () => {
  const fonts = await fontsPromise
  for (const template of newTemplates) {
    for (const mark of templateMarks(template)) {
      assert.deepEqual(templateIntrusions({ brand: revised, fonts }, template, mark.element, grow(mark)), [], `${template.id} ${mark.element.type}`)
    }
  }
})

test('the clear-zone check reports intrusions on every placement path, text included', async () => {
  const fonts = await fontsPromise
  const ctx = { brand: revised, fonts }
  // Template logo: a dot just below the visible artwork.
  const logo = { type: 'logo', x: 100, y: 100, width: 300 }
  const below = markBox.templateLogo(logo).box.b + 2
  const t1 = { id: 'n1', width: 600, height: 400, elements: [logo, { type: 'dots', dots: [[200, below, 1]], fill: 'ink' }] }
  assert.ok(templateIntrusions(ctx, t1, logo, grow(markBox.templateLogo(logo))).length > 0)
  // Symbol: a polyline passing just outside the artwork, between two far endpoints.
  const symbol = { type: 'symbol', x: 100, y: 100, height: 100 }
  const t2 = { id: 'n2', width: 600, height: 400, elements: [symbol, { type: 'polyline', points: [[0, 205], [600, 205]], stroke: 'ink' }] }
  assert.ok(templateIntrusions(ctx, t2, symbol, grow(markBox.symbol(symbol))).length > 0)
  // A Space Mono label whose measured width reaches the box, where 0.62 em per character would not.
  const label = { type: 'text', text: 'MMMMMMMMMM', x: 0, y: 160, size: 20, font: 'label', tracking: 2.4 }
  const measured = textBox(fonts, { text: label.text, x: 0, y: 160, size: 20, font: 'label', tracking: 2.4 })
  const estimate = 10 * 0.62 * 20
  assert.ok(measured.r > estimate + 2, `measured ${measured.r} vs estimate ${estimate}`)
  const symbol2 = { type: 'symbol', x: estimate + 1 + 80 * 50 / 256 + 0.5, y: 120, height: 50 }
  const clear = grow(markBox.symbol(symbol2))
  assert.ok(clear.l > estimate && clear.l < measured.r, 'the fixture sits between the estimate and the measured edge')
  assert.ok(templateIntrusions(ctx, { id: 'n3', width: 600, height: 400, elements: [symbol2, label] }, symbol2, clear).length > 0)
  // Guide logo: the padded lockup's artwork ends lower than the template formula's box.
  const guide = markBox.guideLogo({ x: 0, y: 0, width: 1000 })
  assert.ok(guide.box.b > markBox.templateLogo({ x: 0, y: 0, width: 1000 }).box.b - 1000 * 16 / 799.14231709)
  assert.ok(Math.abs(guide.box.b - 136 * 1000 / 799.14231709) < 1e-9)
})

test('the templates invent nothing: no percentages, digits only in placeholders, brand lines only', () => {
  const ALLOWED_DIGITS = new Set(['01 / PEOPLE', '02 / INFORMATION', '03 / DECISIONS'])
  const BRAND_LINES = new Set(['Built for what’s next.', 'From insight to impact.', 'Let’s connect the dots.', DESCRIPTOR, 'Connection map'])
  for (const template of newTemplates) {
    for (const element of template.elements.filter((item) => item.type === 'text' || item.type === 'paragraph')) {
      const value = element.text
      const bracketed = /^\[.*\]$/.test(value)
      assert.ok(!value.includes('%'), value)
      if (/\d/.test(value)) assert.ok(bracketed || ALLOWED_DIGITS.has(value), `${template.id}: ${value}`)
      if (element.id) assert.ok(bracketed || BRAND_LINES.has(value), `${template.id} field ${element.id}: ${value}`)
    }
  }
  const finding = newTemplates.find((template) => template.id === 'slide-finding')
  assert.ok(finding.elements.some((element) => element.text === 'THREE DISCIPLINES'))
})

// --- BK-005: icons.

test('the five icons draw in currentColor only', () => {
  assert.deepEqual(newIcons.map((item) => item.id), ['dataset', 'layers', 'link', 'compass', 'lens'])
  for (const item of newIcons) {
    const svg = icon({ brand: revised }, item)
    assert.deepEqual(colourProblems(item.content), [], item.id)
    assert.ok(!/#[0-9a-f]{3,8}\b/i.test(item.content), item.id)
    assert.ok(!/NaN|undefined/.test(svg))
  }
})

// --- BK-006: copy and guide.

test('the descriptor and footer show where stated, four guide pages are added, and v2.1 is untouched', async () => {
  const fonts = await fontsPromise
  assert.equal(revised.copy.descriptor, DESCRIPTOR)
  assert.equal(revised.guide.frame.footer, 'SIX-DOT IDENTITY / DATA, DESIGN, CONNECTION / PROPOSED 22 OCTOBER 2026')
  const pages = guidePages({ brand: revised })
  assert.equal(pages.length, 18)
  assert.deepEqual(pages.slice(-4).map((page) => page.name), ['Reading the name', 'A data language', 'Motion', 'Voice'])
  const rendered = pages.slice(-4).map((page) => page.render())
  for (const svg of rendered) {
    assert.ok(!/NaN|undefined/.test(svg))
    assert.ok(svg.includes('SIX-DOT IDENTITY / DATA, DESIGN, CONNECTION / PROPOSED 22 OCTOBER 2026'))
    assert.deepEqual(colourProblems(svg, { currentColor: false }), [])
  }
  for (const index of [0, 3]) assert.ok(rendered[index].includes(DESCRIPTOR), `descriptor on ${pages.at(-4 + index).name}`)
  for (const id of ['social-insight', 'linkedin-banner']) {
    const { svg } = renderTemplate({ brand: revised }, newTemplates.find((template) => template.id === id))
    assert.ok(svg.includes(DESCRIPTOR) || svg.includes(DESCRIPTOR.toUpperCase()), id)
  }
  const text = JSON.stringify(revised.guide.pages.slice(-4))
  assert.ok(!text.includes('—'), 'no em dashes in the new pages')
  // Outlined pages still render.
  for (const page of guidePages({ brand: revised, fonts }).slice(-4)) assert.ok(!/NaN|undefined/.test(page.render()))
  // Nothing approved carries the descriptor.
  const approved = [...guidePages({ brand }).map((page) => page.render()), ...guideSheets({ brand }).map((sheet) => sheet.render()), ...brand.templates.map((template) => renderTemplate({ brand }, template).svg)]
  assert.ok(approved.every((svg) => !svg.includes(DESCRIPTOR)))
})

test('the reading-the-name symbol keeps its clear box, and the data series contrast with paper', async () => {
  const fonts = await fontsPromise
  const reading = revised.guide.pages.at(-4)
  const symbol = reading.elements.find((element) => element.type === 'symbol')
  const clear = grow(markBox.symbol({ x: symbol.x, y: symbol.y, height: symbol.height }))
  const overlaps = (a) => a.l < clear.r && a.r > clear.l && a.t < clear.b && a.b > clear.t
  for (const element of reading.elements.filter((item) => item !== symbol)) {
    if (element.type === 'rule') assert.ok(element.y < clear.t || element.y > clear.b, 'rule')
    if (element.type === 'path') for (const [cx, cy, r] of pathCircles(element.d)) assert.ok(!overlaps({ l: cx - r, t: cy - r, r: cx + r, b: cy + r }))
    if (element.type === 'text') assert.ok(!overlaps(textBox(fonts, { text: element.text.replace('{copy.descriptor}', DESCRIPTOR), x: element.x, y: element.y, size: element.size, font: element.font ?? 'body', tracking: (element.tracking ?? 0) * element.size })), element.text)
    if (element.type === 'para') {
      const lines = wrapLines(element.text.replace('{copy.descriptor}', DESCRIPTOR), element.width, (line) => fonts.width(line, 'body', element.size))
      lines.forEach((line, index) => assert.ok(!overlaps(textBox(fonts, { text: line, x: element.x, y: element.y + index * element.size * 1.4, size: element.size })), `para line ${line}`))
    }
  }
  const luminance = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0)
  const paper = luminance(revised.colours['off-white'])
  for (const key of ['midnight', 'graphite', 'black']) {
    const l = luminance(revised.colours[key])
    assert.ok((Math.max(l, paper) + 0.05) / (Math.min(l, paper) + 0.05) >= 3, key)
  }
})

// --- BK-007 and BK-007a: motion, and the revision folder in the approved kit.

test('the motion library: exact tokens, rules, guardrails, groups and eighteen studies', () => {
  const { motion } = revised
  assert.deepEqual(motion.tokens, { durations: { quick: 200, base: 600, slow: 1200, draw: 1800 }, easings: { settle: 'cubic-bezier(.2,.7,.2,1)', move: 'cubic-bezier(.6,0,.2,1)', linear: 'linear' }, stagger: { field: [20, 30], loaderStep: 200 } })
  assert.deepEqual(motion.tokens, TOKENS)
  assert.equal(motion.rules.length, 3)
  assert.deepEqual(motion.rules, RULES)
  assert.equal(GUARDRAILS.do.length, 4)
  assert.equal(GUARDRAILS.dont.length, 4)
  assert.deepEqual(motion.guardrails, GUARDRAILS)
  const ids = motion.studies.map((study) => study.id)
  assert.deepEqual(ids, ['reveal', 'connect', 'think', 'progress', 'sort', 'count', 'signal', 'focus', 'cover', 'settle', 'scan', 'gather', 'branch', 'stack', 'relay', 'ripple', 'confirm', 'timeline'])
  for (const study of motion.studies) assert.ok(study.name && study.kind && study.timing && study.use && study.description && !study.description.includes('—'), study.id)
  const counts = Object.fromEntries(GROUPS.map((group) => [group.id, motion.studies.filter((study) => group.kinds.includes(study.kind)).length]))
  assert.deepEqual(counts, { fields: 7, paths: 3, states: 4, data: 2, scenes: 2 })
  assert.equal(motion.page, 'motion/index.html')
  assert.equal(motion.css, 'motion/motion.css')
})

test('the motion files: page data, CSS variables, local fonts only, README, and on the palette', () => {
  const page = readFileSync(`${folder}motion/index.html`, 'utf8')
  const css = readFileSync(`${folder}motion/motion.css`, 'utf8')
  const readme = readFileSync(`${folder}motion/README.md`, 'utf8')
  const tokens = JSON.parse(readFileSync(`${folder}motion/motion-tokens.json`, 'utf8'))
  for (const study of STUDIES) assert.ok(page.includes(`"id":"${study.id}"`), study.id)
  assert.ok(page.includes('data-study="${m.id}"'), 'tiles carry data-study')
  for (const name of ['quick', 'base', 'slow', 'draw', 'settle', 'move', 'linear', 'stagger-field', 'loader-step']) assert.match(css, new RegExp(`--ddc-${name}:`), name)
  assert.match(css, /prefers-reduced-motion: reduce/)
  assert.ok(!/NaN|undefined/.test(page.replace(/base64,[A-Za-z0-9+/=]+/g, '') + css))
  assert.ok(!page.includes('{{'), 'placeholders filled')
  assert.deepEqual(colourProblems(page), [])
  assert.deepEqual(colourProblems(css), [])
  const urls = [...page.matchAll(/(?:src|href)="([^"]+)"|url\(['"]?([^'")]+)/g)].map((m) => m[1] ?? m[2])
  for (const url of urls) assert.ok(url.startsWith('data:') || url.startsWith('#'), url)
  assert.equal((page.match(/@font-face/g) ?? []).length, 3)
  for (const rule of RULES) assert.ok(readme.includes(rule.title), rule.title)
  for (const item of [...GUARDRAILS.do, ...GUARDRAILS.dont]) assert.ok(readme.includes(item), item)
  for (const study of STUDIES) assert.ok(readme.includes(`**${study.name}**`), study.id)
  assert.equal(tokens.durations.quick, 200)
})

test('the kit: Motion files only with the revision, and the approved kit’s revision folder holds what it adds', () => {
  const revisedPlan = planKit(revised, { rasters: false, pdfs: false })
  for (const path of ['motion/index.html', 'motion/motion.css', 'motion/motion-tokens.json', 'motion/README.md']) {
    const found = revisedPlan.find((entry) => entry.path === path)
    assert.ok(found, path)
    assert.equal(found.group, 'Motion')
  }
  const approvedPlan = planKit(brand, { rasters: false, pdfs: false }).map((entry) => entry.path)
  assert.ok(!approvedPlan.some((path) => path.startsWith('motion/')), 'no motion files in the approved kit')
  const folderPaths = approvedPlan.filter((path) => path.startsWith(`revisions/${ID}/`)).map((path) => path.slice(`revisions/${ID}/`.length)).sort()
  assert.deepEqual(folderPaths, [
    'README.md', 'brand.json', 'guidelines/brand-details.html',
    ...newIcons.map((item) => `icons/${item.id}.svg`),
    'motion/README.md', 'motion/index.html', 'motion/motion-tokens.json', 'motion/motion.css',
    ...newPatterns.map((spec) => `patterns/${spec.id}.svg`),
    ...newTemplates.map((template) => `templates/${template.id}.svg`)
  ].sort())
  const readme = planKit(brand, { rasters: false, pdfs: false }).find((entry) => entry.path === `revisions/${ID}/README.md`).make({ brand })
  for (const phrase of ['4 patterns', '8 templates', '5 icons', '4 guide pages', '18 studies', 'guidelines/brand-details.html', '`patterns`', '`templates`', '`sets`', '`icons.items`', '`guide.pages`', '`files`', 'add `motion`', '`copy.descriptor`', '`guide.frame.footer`']) assert.ok(readme.includes(phrase), phrase)
  for (const phrase of ['comparison.svg', 'logos/', '$append']) assert.ok(!readme.includes(phrase), phrase)
  const json = planKit(brand, { rasters: false, pdfs: false }).find((entry) => entry.path === `revisions/${ID}/brand.json`).make({ brand })
  const { revisions: _list, ...body } = JSON.parse(json)
  assert.ok(!JSON.stringify(body).includes('$append'), 'resolved outside the revisions list')
})

// --- BK-008: the Motion tab's rules (plain module, so they run here and in CI).

test('Motion shows only for a brand or revision with a library, and falls back to the overview', () => {
  const source = { url: (path) => (existsSync(`${folder}${path}`) ? `/brands/ddcnorth/${path}` : null) }
  assert.equal(motionUrl(brand, source), null)
  assert.equal(motionUrl(revised, source), '/brands/ddcnorth/motion/index.html')
  assert.equal(motionUrl(withRevision(brand, 'rising'), source), null)
  assert.equal(motionUrl(approvedOnly(brand), source), null)
  assert.equal(viewOrOverview('motion', '/x.html'), 'motion')
  assert.equal(viewOrOverview('motion', null), 'overview')
  assert.equal(viewOrOverview('logos', null), 'logos')
})

// --- BK-009: the brand-details page and the site.

test('the brand-details page is self-contained and on the palette, and the site matches its recorded hashes', () => {
  for (const file of revised.files) assert.ok(existsSync(`${folder}${typeof file === 'string' ? file : file.from}`), JSON.stringify(file))
  const details = readFileSync(`${folder}docs/brand-details.html`, 'utf8')
  assert.ok(!details.includes('{{'))
  assert.deepEqual(colourProblems(details), [])
  const urls = [...details.matchAll(/(?:src|href)="([^"]+)"|url\(['"]?([^'")]+)/g)].map((m) => m[1] ?? m[2])
  for (const url of urls) assert.ok(url.startsWith('data:') || url.startsWith('#'), url)
  assert.match(details, /Inter-OFL\.txt/)
  assert.match(details, /SpaceMono-OFL\.txt/)
  const readme = readFileSync(`${folder}site/README.md`, 'utf8')
  const recorded = [...readme.matchAll(/^([0-9a-f]{64}) {2}(.+)$/gm)]
  assert.ok(recorded.length >= 9)
  for (const [, hash, path] of recorded) assert.equal(createHash('sha256').update(readFileSync(`${folder}site/${path}`)).digest('hex'), hash, path)
  for (const path of ['index.html', '404.html', 'assets/header.css', 'assets/footer.css', 'assets/header.js', 'licenses/Inter-OFL.txt', 'licenses/SpaceMono-OFL.txt', 'screenshots/desktop.jpg', 'screenshots/mobile.jpg']) assert.ok(recorded.some(([, , recordedPath]) => recordedPath === path), path)
  assert.ok(recorded.some(([, hash, path]) => path === 'index.html' && hash === '1696effcce603c74f38cd8d9613f05243d1a0e9da7a031fbcfe1d77be1813e45'), 'the website index.html at 4249136')
  const site = readFileSync(`${folder}site/index.html`, 'utf8')
  for (const asset of [...site.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)].map((m) => m[1])) assert.ok(existsSync(`${folder}site/${asset}`), asset)
})

// --- BK-011: documentation.

test('the schema, changelog and README document v2.3', () => {
  const schema = readFileSync(new URL('../docs/brand-schema.md', import.meta.url), 'utf8')
  for (const phrase of ['$append', '`dots`', '`lines`', '`polyline`', 'motion.guardrails', 'motion.groups']) assert.ok(schema.includes(phrase), phrase)
  const changelog = readFileSync(`${folder}docs/CHANGELOG.md`, 'utf8')
  // Proposed and approved the same day: the change log now records it as approved, and 2.2 as archived.
  assert.match(changelog, /^# Change log\n\n## 2\.3 - data, design, connection \(approved 22 October 2026\)/)
  assert.match(changelog, /## Archived: 2\.2 - rising symbol/)
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8')
  for (const phrase of ['v2.3', 'npm run make:ddcnorth-v23', 'npm run test:browser', 'Motion tab']) assert.ok(readme.includes(phrase), phrase)
})
