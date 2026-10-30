// Checks that hold for every template a brand ships: its logos are painted in colourways the
// brand defines, and (for B.C.Hydro, whose substitute face lacks some fractions) every glyph a
// template or guide page draws is one its fonts carry. Plus the engine behaviour those templates
// rely on: shrink-to-fit lines, justified paragraphs, letterspaced lettering.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { measureTemplate, renderTemplate } from '../src/engine/templates.js'
import { guidePages, guideSheets } from '../src/engine/guide.js'
import { paintFor } from '../src/engine/signatures.js'
import { loadBrandFontsFromDisk } from '../src/fonts/node.js'

const root = new URL('../', import.meta.url)
const manifest = JSON.parse(readFileSync(new URL('brands/index.json', root), 'utf8'))
const load = (id) => JSON.parse(readFileSync(new URL(`brands/${id}/brand.json`, root), 'utf8'))
const folder = new URL('brands/bc-hydro-1983/', root)
const hydro = load('bc-hydro-1983')
const fonts = await loadBrandFontsFromDisk(hydro, folder.pathname)

test('every template paints its logo in a colourway its brand defines', () => {
  for (const { id } of manifest) {
    const brand = load(id)
    for (const template of brand.templates ?? []) {
      for (const element of template.elements ?? []) {
        if (element.type !== 'logo' || element.colourway == null) continue
        assert.ok(brand.colourways?.[element.colourway], `${id}/${template.id}: colourway ${element.colourway} is not one of ${Object.keys(brand.colourways ?? {}).join(', ')}`)
      }
    }
  }
})

test('an unknown colourway paints the brand default, not an invalid colour', () => {
  const paint = paintFor(hydro, 'positive')
  assert.equal(paint('lower'), paintFor(hydro, hydro.defaultColourway)('lower'))
  assert.equal(paintFor(hydro, 'blue')('symbol'), hydro.colours.blue, 'a palette colour still paints every role')
})

test('B.C.Hydro templates and guide pages draw only glyphs its fonts carry', () => {
  // Every run of text the engine outlines, with the face it is set in.
  const drawn = []
  const spy = { ...fonts, path: (text, key, ...rest) => { drawn.push([String(text), key]); return fonts.path(text, key, ...rest) } }
  const ctx = { brand: hydro, fonts: spy, outline: true }
  for (const template of hydro.templates) renderTemplate(template.printer ? ctx : { ...ctx, showLayoutGuides: true }, template)
  for (const page of [...guidePages(ctx), ...guideSheets(ctx)]) page.render()
  assert.ok(drawn.length > 1000)
  const missing = new Set()
  for (const [text, key] of drawn) {
    for (const char of Array.from(text)) if (!/\s/.test(char) && !fonts.covers(char, key)) missing.add(`${char} (U+${char.codePointAt(0).toString(16).toUpperCase()}) in ${key}: “${text}”`)
  }
  assert.deepEqual([...missing], [])
})

test('the masthead title shrinks to stay inside its band, and only when it must', () => {
  const band = hydro.templates.find((template) => template.id === 'masthead-band')
  const panel = band.elements.find((element) => element.type === 'rect')
  const title = (values) => measureTemplate({ brand: hydro, fonts, values }, band).elements.get('masthead-title-block')
  const standard = title({})
  const long = title({ 'masthead-title': 'Human Resources and Industrial Relations Newsletter' })
  assert.ok(long.right <= panel.x + panel.width - 5, `a long title ends at ${long.right.toFixed(1)} mm, inside the band`)
  assert.ok(long.firstBaseline - long.top < standard.firstBaseline - standard.top, 'set smaller')
  assert.equal(long.firstBaseline, standard.firstBaseline, 'on the same baseline')
  const svg = renderTemplate({ brand: hydro, fonts, values: { 'masthead-title': 'Human Resources and Industrial Relations Newsletter' } }, band).svg
  const size = (id) => Number(new RegExp(`id="${id}"[^>]*font-size="([\\d.]+)"`).exec(svg)[1])
  assert.equal(size('masthead-title'), size('masthead-title-2'), 'both lines shrink together')
})

test('justified paragraphs fill the measure except the last line, unless asked', () => {
  const template = (extra) => ({ id: 't', unit: 'mm', width: 100, height: 40, elements: [{ type: 'paragraph', id: 'p', text: 'one two three four five six seven eight nine ten eleven twelve', x: 0, y: 10, width: 60, size: '12pt', font: 'body', colour: 'ink', align: 'justify', ...extra }] })
  const spacing = (svg) => [...svg.matchAll(/<text id="p-\d"[^>]*>/g)].map(([tag]) => Number(/word-spacing="([\d.]+)"/.exec(tag)?.[1] ?? 0))
  const ragged = spacing(renderTemplate({ brand: hydro, fonts }, template()).svg)
  assert.ok(ragged.length > 1 && ragged.slice(0, -1).every((value) => value > 0) && ragged.at(-1) === 0, String(ragged))
  assert.ok(spacing(renderTemplate({ brand: hydro, fonts }, template({ alignLast: 'justify' })).svg).at(-1) > 0)
  // Outlined, the words are placed apart by the same spacing: the line ends at the measure.
  const outlined = renderTemplate({ brand: hydro, fonts, outline: true }, template()).svg
  const xs = [...(/id="p-1"[^>]* d="([^"]+)"/.exec(outlined)[1]).matchAll(/[ML](-?[\d.]+) /g)].map((match) => Number(match[1]))
  assert.ok(Math.abs(Math.max(...xs) - 60) < 1, `first line ends at ${Math.max(...xs)}`)
})

test('lettering the source letterspaces to its measure is tracked out to it', () => {
  const sign = hydro.templates.find((template) => template.id === 'illustrated-h41-danger')
  const danger = measureTemplate({ brand: hydro, fonts }, sign).lettering[0]
  const keep = measureTemplate({ brand: hydro, fonts }, sign).lettering[1]
  assert.ok(Math.abs((danger.right - danger.left) - (keep.right - keep.left)) / (keep.right - keep.left) < 0.02, '"Danger" spans the measure "Keep away" does')
})
