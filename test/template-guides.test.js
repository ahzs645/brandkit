import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DOMParser } from '@xmldom/xmldom'
import { layoutFlow, measureTemplate, renderTemplate, templateFields } from '../src/engine/templates.js'
import { layoutGuides, referencePlacement } from '../src/engine/template-guides.js'

const brand = {
  id: 'inspection-example', name: 'Inspection example',
  fonts: { body: { family: 'Test serif', capHeight: 0.66 } },
  colours: { black: '#000000' }, roles: { ink: 'black' }
}
const flow = {
  type: 'flow', x: 30, y: 50, font: 'body',
  items: [
    { id: 'title', text: 'A report\nTitle', size: 10, leading: 10 },
    { id: 'subtitle', text: 'Subtitle', size: 5, leading: 5, gap: 15 }
  ]
}
const template = {
  id: 'report', width: 100, height: 140, unit: 'mm', physical: ['100mm', '140mm'],
  elements: [{ type: 'rect', id: 'panel', x: 20, y: 10, width: 40, height: 20, fill: 'ink' }, flow],
  reference: { src: 'reference/original.webp', label: 'Source scan' },
  guides: {
    title: 'Cover construction',
    elements: [
      { type: 'dimension', id: 'panel-inset', axis: 'x', from: 'trim.left', to: { element: 'panel', edge: 'left' }, label: '20 mm' },
      { type: 'dimension', id: 'title-depth', axis: 'y', from: 'trim.top', to: { flow: 'title', edge: 'firstBaseline' }, label: '1/2 cover' },
      { type: 'dimension', id: 'gap', axis: 'y', from: { flow: 'title', edge: 'lastBaseline' }, to: { flow: 'subtitle', edge: 'top' }, label: 'Gap after title', ends: 'none', requiresFlow: ['title', 'subtitle'] },
      { type: 'callout', id: 'size', target: { flow: 'subtitle' }, label: '5 on 5 pt & guide', side: 'right' },
      { type: 'align', id: 'flush', axis: 'x', refs: [{ flow: 'title', edge: 'left' }, { flow: 'subtitle', edge: 'left' }] }
    ]
  }
}
const xml = (value) => new DOMParser().parseFromString(value, 'image/svg+xml')
const elementWithId = (document, id) => [...document.getElementsByTagName('*')].find((element) => element.getAttribute('id') === id)
const lines = (group) => [...group.getElementsByTagName('path')].map((path) => path.getAttribute('d').match(/^M(\S+) (\S+)L(\S+) (\S+)$/)?.slice(1).map(Number)).filter(Boolean)
const render = (extra = {}) => xml(renderTemplate({ brand, showLayoutGuides: true, ...extra }, template).svg)

test('rules are a separate hidden SVG layer and never editable template fields', () => {
  const { svg } = renderTemplate({ brand }, template)
  const document = xml(svg)
  const layer = elementWithId(document, 'layout-guides')
  assert.equal(layer.getAttribute('display'), 'none')
  assert.equal(layer.getAttribute('aria-label'), 'Cover construction')
  assert.equal(elementWithId(document, 'layout-guide-size').getAttribute('aria-label'), '5 on 5 pt & guide')
  assert.deepEqual(templateFields(template, brand).map((field) => field.id), ['title', 'subtitle'])
  assert.doesNotMatch(svg, /reference\/original|<image\b/, 'a source scan cannot contaminate the exported artwork')
})

test('a standard render keeps the trim as its canvas; shown rules add a margin around it', () => {
  const clean = renderTemplate({ brand }, template)
  const root = xml(clean.svg).documentElement
  assert.equal(root.getAttribute('viewBox'), '0 0 100 140')
  assert.deepEqual([root.getAttribute('width'), root.getAttribute('height')], ['100mm', '140mm'])
  assert.equal(clean.frame, undefined)
  const shown = renderTemplate({ brand, showLayoutGuides: true }, template)
  const { left, top, right, bottom } = shown.frame
  for (const side of [left, top, right, bottom]) assert.ok(side > 0)
  const framed = xml(shown.svg).documentElement
  assert.deepEqual(framed.getAttribute('viewBox').split(' ').map(Number).map((value) => Math.round(value * 1e4) / 1e4), [-left, -top, 100 + left + right, 140 + top + bottom].map((value) => Math.round(value * 1e4) / 1e4))
  assert.equal(parseFloat(framed.getAttribute('width')).toFixed(3), (100 + left + right).toFixed(3), 'the physical size grows with the margin, so the scale is unchanged')
  // Everything drawn for the rules is inside the framed canvas.
  for (const [x1, y1, x2, y2] of lines(elementWithId(xml(shown.svg), 'layout-guides'))) {
    for (const x of [x1, x2]) assert.ok(x >= -left - 1e-6 && x <= 100 + right + 1e-6)
    for (const y of [y1, y2]) assert.ok(y >= -top - 1e-6 && y <= 140 + bottom + 1e-6)
  }
})

test('showLayoutGuides explicitly enables the layer without changing the artwork', () => {
  const clean = xml(renderTemplate({ brand }, template).svg)
  const visible = render()
  assert.equal(elementWithId(visible, 'layout-guides').getAttribute('display'), 'inline')
  for (const id of ['title-1', 'title-2', 'subtitle', 'panel']) assert.equal(elementWithId(clean, id).toString(), elementWithId(visible, id).toString())
  assert.equal(elementWithId(xml(renderTemplate({ brand, showGuides: true }, template).svg), 'layout-guides').getAttribute('display'), 'none', 'trim guides and layout rules have independent switches')
})

test('dimensions resolve to the measured edges of elements and flow items, outside the trim', () => {
  const document = render()
  // The x dimension's extension lines stand on the trim's left edge and the panel's left edge,
  // and its line runs between them above the trim.
  const inset = lines(elementWithId(document, 'layout-guide-panel-inset'))
  const verticals = inset.filter(([x1, , x2]) => x1 === x2).map(([x]) => x)
  assert.deepEqual([...new Set(verticals)].sort((a, b) => a - b), [0, 20])
  const panelExtension = inset.find(([x1, , x2]) => x1 === 20 && x2 === 20)
  assert.ok(Math.max(panelExtension[1], panelExtension[3]) < 10, 'the extension line stops short of the panel')
  assert.ok(inset.filter(([, y1, , y2]) => y1 === y2).every(([, y]) => y < 0), 'the dimension line is in the margin above the trim')
  // The y dimension reaches the title's first baseline, 50 mm down.
  const depth = lines(elementWithId(document, 'layout-guide-title-depth'))
  assert.deepEqual([...new Set(depth.filter(([, y1, , y2]) => y1 === y2).map(([, y]) => y))].sort((a, b) => a - b), [0, 50])
  assert.ok(depth.filter(([x1, , x2]) => x1 === x2).every(([x]) => x > 100), 'drawn in the right margin')
})

test('annotations follow the actual title length and the resulting subtitle position', () => {
  const baselineOf = (document) => Math.max(...lines(elementWithId(document, 'layout-guide-gap')).map(([, y]) => y))
  const first = render()
  const longer = render({ values: { title: 'A report\nwith a much\nlonger title' } })
  assert.equal(Math.round((baselineOf(longer) - baselineOf(first)) * 1e6) / 1e6, 10)
  assert.equal(Number(elementWithId(longer, 'subtitle').getAttribute('y')), 85)
  const measured = measureTemplate({ brand, values: {} }, template)
  assert.equal(measured.flows.get('subtitle').firstBaseline, 75)
  assert.deepEqual(measured.elements.get('panel'), { left: 20, top: 10, right: 60, bottom: 30 })
})

test('empty text removes only annotations anchored to it, and callouts bound to it', () => {
  const document = render({ values: { title: '' } })
  assert.equal(elementWithId(document, 'layout-guide-title-depth'), undefined)
  assert.equal(elementWithId(document, 'layout-guide-gap'), undefined, 'a gap must not be labelled after its preceding item is removed')
  assert.equal(elementWithId(document, 'layout-guide-flush'), undefined)
  assert.ok(elementWithId(document, 'layout-guide-size'))
  assert.ok(elementWithId(document, 'layout-guide-panel-inset'))
  assert.equal(Number(elementWithId(document, 'subtitle').getAttribute('y')), 50)
  const noSubtitle = render({ values: { subtitle: '' } })
  assert.equal(elementWithId(noSubtitle, 'layout-guide-size'), undefined, 'a callout to emptied text goes with it')
  assert.equal(elementWithId(noSubtitle, 'layout-guide-gap'), undefined)
  assert.ok(elementWithId(noSubtitle, 'layout-guide-title-depth'))
})

test('requiresEmptyFlow draws the closed-up gap only while the item between is empty', () => {
  const guides = { elements: [{ type: 'dimension', id: 'closed', axis: 'y', from: { flow: 'a', edge: 'lastBaseline' }, to: { flow: 'c', edge: 'top' }, label: 'gap', ends: 'none', requiresEmptyFlow: ['b'] }] }
  const box = { left: 0, right: 10, top: 0, bottom: 5, firstBaseline: 5, lastBaseline: 5 }
  const run = (b) => layoutGuides(guides, { width: 50, height: 50, flows: new Map([['a', box], ['b', b], ['c', { ...box, top: 20, bottom: 25, firstBaseline: 25, lastBaseline: 25 }]]) }).annotations.filter((entry) => entry.type === 'dimension')
  assert.equal(run(box).length, 0)
  assert.equal(run(null).length, 1)
})

test('flow cap-line measurements use the same point conversion as the artwork', () => {
  const measured = layoutFlow({ brand }, { ...flow, items: [{ id: 'title', text: 'Title', size: '36pt' }] }, 'mm').bounds.get('title')
  assert.ok(Math.abs(measured.top - (50 - 36 * 25.4 / 72 * 0.66)) < 1e-10)
  assert.equal(measured.firstBaseline, 50)
})

test('malformed annotations fail with an actionable message', () => {
  const sources = { width: 100, height: 100, flows: new Map([['title', { left: 0, right: 10, top: 20, bottom: 30 }]]) }
  assert.throws(() => layoutGuides({ elements: [{ type: 'dimension', axis: 'y', from: 'trim.top', to: { flow: 'missing', edge: 'top' } }] }, sources), /unknown flow item: missing/)
  assert.throws(() => layoutGuides({ elements: [{ type: 'dimension', axis: 'y', from: 'trim.top', to: { flow: 'title', edge: 'invented' } }] }, sources), /Unknown layout guide edge/)
  assert.throws(() => layoutGuides({ elements: [{ type: 'dimension', axis: 'x', from: 'trim.top', to: 'trim.right' }] }, sources), /does not measure the x axis/)
  assert.throws(() => layoutGuides({ elements: [{ type: 'callout', target: { element: 'logo' } }] }, sources), /unknown element: logo/)
  assert.throws(() => layoutGuides({ elements: [{ type: 'note', requiresFlow: ['missing'] }] }, sources), /requires unknown flow item: missing/)
  assert.throws(() => layoutGuides({ elements: [{ type: 'note', requiresFlow: 'title' }] }, sources), /requiresFlow must be an array/)
  assert.throws(() => layoutGuides({ elements: [{ type: 'text', text: 'free-floating' }] }, sources), /Unknown layout guide type: text/)
})

test('source crop registration uses canvas-relative percentages, inside any rules margin', () => {
  assert.deepEqual(referencePlacement(template), { left: '0%', top: '0%', width: '100%', height: '100%' })
  assert.deepEqual(referencePlacement({ ...template, reference: { alignment: { x: 10, y: 14, width: 80, height: 112 } } }), { left: '10%', top: '10%', width: '80%', height: '80%' })
  assert.deepEqual(referencePlacement(template, { left: 50, top: 30, right: 50, bottom: 30 }), { left: '25%', top: '15%', width: '50%', height: '70%' })
  assert.throws(() => referencePlacement({ ...template, reference: { alignment: { x: 0, y: 0, width: 0, height: 10 } } }), /registration rectangle/)
})

test('BC Hydro card rules measure the printed distances from the rendered card', async () => {
  const { readFileSync } = await import('node:fs')
  const hydro = JSON.parse(readFileSync(new URL('../brands/bc-hydro-1983/brand.json', import.meta.url), 'utf8'))
  const card = hydro.templates.find((entry) => entry.id === 'card-gas')
  const groups = (values = {}) => {
    const document = xml(renderTemplate({ brand: hydro, values, showLayoutGuides: true }, card).svg)
    return new Map([...document.getElementsByTagName('g')].filter((group) => group.getAttribute('data-layout-guide')).map((group) => [group.getAttribute('aria-label'), group]))
  }
  const levels = (group) => [...new Set(lines(group).filter(([, y1, , y2]) => Math.abs(y1 - y2) < 1e-9).map(([, y]) => Math.round(y * 1000) / 1000))].sort((a, b) => a - b)
  const shown = groups()
  // H16–H17: ⅝ in from the top to the signature's baseline, 1⅛ in to the name's, ¼ in from the
  // last baseline to the bottom.
  assert.deepEqual(levels(shown.get('5/8"')), [0, 15.875])
  assert.deepEqual(levels(shown.get('1 1/8"')), [0, 28.575])
  assert.deepEqual(levels(shown.get('1/4"')), [44.45, 50.8])
  const across = (group) => [...new Set(lines(group).filter(([x1, , x2]) => Math.abs(x1 - x2) < 1e-9).map(([x]) => Math.round(x * 1000) / 1000))].sort((a, b) => a - b)
  assert.deepEqual(across(shown.get('2 1/2"')), [25.4, 88.9], '2½ in from the symbol to the right trim')
  for (const label of ['12 point', '8 on 9 point', 'blind embossed signature']) assert.ok(shown.get(label), label)
  const nameless = groups({ name: '' })
  assert.equal(nameless.get('1 1/8"'), undefined)
  assert.equal(nameless.get('12 point'), undefined)
  assert.ok(nameless.get('5/8"'))
})
