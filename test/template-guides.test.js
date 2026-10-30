import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DOMParser } from '@xmldom/xmldom'
import { layoutFlow, renderTemplate, templateFields } from '../src/engine/templates.js'
import { layoutGuideElements, referencePlacement } from '../src/engine/template-guides.js'

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
  id: 'report', width: 100, height: 140, unit: 'mm', elements: [flow],
  reference: { src: 'reference/original.webp', label: 'Source scan' },
  guides: {
    title: 'Cover construction',
    elements: [
      { type: 'line', id: 'baseline', x1: 30, y1: { flow: 'title', edge: 'lastBaseline' }, x2: 90, y2: { flow: 'title', edge: 'lastBaseline' }, stroke: '#A01B45', strokeWidth: 0.2 },
      { type: 'text', id: 'gap-label', text: 'Gap after title', x: 90, y: { flow: 'subtitle', edge: 'top', offset: -5 }, requiresFlow: ['title', 'subtitle'], size: 3, anchor: 'end', colour: '#A01B45' },
      { type: 'text', id: 'size-label', text: '10 on 10 pt & guide', x: 90, y: { flow: 'subtitle', edge: 'top', offset: -2 }, size: 3, anchor: 'end', colour: '#A01B45' }
    ]
  }
}
const xml = (value) => new DOMParser().parseFromString(value, 'image/svg+xml')
const elementWithId = (document, id) => [...document.getElementsByTagName('*')].find((element) => element.getAttribute('id') === id)

test('rules are a separate hidden SVG layer and never editable template fields', () => {
  const { svg } = renderTemplate({ brand }, template)
  const document = xml(svg)
  const layer = elementWithId(document, 'layout-guides')
  assert.equal(layer.getAttribute('display'), 'none')
  assert.equal(layer.getAttribute('aria-label'), 'Cover construction')
  assert.equal(elementWithId(document, 'layout-guide-size-label').textContent, '10 on 10 pt & guide')
  assert.deepEqual(templateFields(template, brand).map((field) => field.id), ['title', 'subtitle'])
  assert.doesNotMatch(svg, /reference\/original|<image\b/, 'a source scan cannot contaminate the exported artwork')
})

test('showLayoutGuides explicitly enables the layer without changing the artwork', () => {
  const clean = xml(renderTemplate({ brand }, template).svg)
  const visible = xml(renderTemplate({ brand, showLayoutGuides: true }, template).svg)
  assert.equal(elementWithId(visible, 'layout-guides').getAttribute('display'), 'inline')
  for (const id of ['title-1', 'title-2', 'subtitle']) assert.equal(elementWithId(clean, id).toString(), elementWithId(visible, id).toString())
  assert.equal(elementWithId(xml(renderTemplate({ brand, showGuides: true }, template).svg), 'layout-guides').getAttribute('display'), 'none', 'trim guides and layout rules have independent switches')
})

test('guide anchors follow the actual title length and the resulting subtitle position', () => {
  const first = xml(renderTemplate({ brand, showLayoutGuides: true }, template).svg)
  const longer = xml(renderTemplate({ brand, values: { title: 'A report\nwith a much\nlonger title' }, showLayoutGuides: true }, template).svg)
  assert.equal(elementWithId(first, 'layout-guide-baseline').getAttribute('d'), 'M30 60L90 60')
  assert.equal(elementWithId(longer, 'layout-guide-baseline').getAttribute('d'), 'M30 70L90 70')
  const firstLabelY = Number(elementWithId(first, 'layout-guide-size-label').getAttribute('y'))
  const longerLabelY = Number(elementWithId(longer, 'layout-guide-size-label').getAttribute('y'))
  assert.equal(longerLabelY - firstLabelY, 10)
  assert.equal(Number(elementWithId(longer, 'subtitle').getAttribute('y')), 85)
})

test('empty text removes only annotations anchored to it', () => {
  const document = xml(renderTemplate({ brand, values: { title: '' }, showLayoutGuides: true }, template).svg)
  assert.equal(elementWithId(document, 'layout-guide-baseline'), undefined)
  assert.equal(elementWithId(document, 'layout-guide-gap-label'), undefined, 'a gap must not be labelled after its preceding item is removed')
  assert.ok(elementWithId(document, 'layout-guide-size-label'))
  assert.equal(Number(elementWithId(document, 'subtitle').getAttribute('y')), 50)
})

test('relationship labels require both flow items while individual size annotations remain independent', () => {
  const complete = xml(renderTemplate({ brand, showLayoutGuides: true }, template).svg)
  assert.ok(elementWithId(complete, 'layout-guide-gap-label'))
  const missingSubtitle = xml(renderTemplate({ brand, values: { subtitle: '' }, showLayoutGuides: true }, template).svg)
  assert.equal(elementWithId(missingSubtitle, 'layout-guide-gap-label'), undefined)
  assert.equal(elementWithId(missingSubtitle, 'layout-guide-size-label'), undefined)
  assert.ok(elementWithId(missingSubtitle, 'layout-guide-baseline'))
})

test('flow cap-line measurements use the same point conversion as the artwork', () => {
  const measured = layoutFlow({ brand }, { ...flow, items: [{ id: 'title', text: 'Title', size: '36pt' }] }, 'mm').bounds.get('title')
  assert.ok(Math.abs(measured.top - (50 - 36 * 25.4 / 72 * 0.66)) < 1e-10)
  assert.equal(measured.firstBaseline, 50)
})

test('malformed anchors fail with an actionable message', () => {
  assert.throws(() => layoutGuideElements({ elements: [{ type: 'line', y1: { flow: 'missing' } }] }), /unknown flow item: missing/)
  assert.throws(() => layoutGuideElements({ elements: [{ type: 'text', y: { flow: 'title', edge: 'invented' } }] }, new Map([['title', { top: 20 }]])), /Unknown layout guide edge/)
  assert.throws(() => layoutGuideElements({ elements: [{ type: 'text', requiresFlow: ['missing'] }] }), /requires unknown flow item: missing/)
  assert.throws(() => layoutGuideElements({ elements: [{ type: 'text', requiresFlow: 'title' }] }), /requiresFlow must be an array/)
})

test('source crop registration uses canvas-relative percentages and remains independent of exports', () => {
  assert.deepEqual(referencePlacement(template), { left: '0%', top: '0%', width: '100%', height: '100%' })
  assert.deepEqual(referencePlacement({ ...template, reference: { alignment: { x: 10, y: 14, width: 80, height: 112 } } }), { left: '10%', top: '10%', width: '80%', height: '80%' })
  assert.throws(() => referencePlacement({ ...template, reference: { alignment: { x: 0, y: 0, width: 0, height: 10 } } }), /registration rectangle/)
})
