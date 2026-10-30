import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanSvgPreview } from '../scripts/lib/svg-clean-preview.mjs'

const wrap = (content, attributes = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" ${attributes}>${content}</svg>`
const artwork = '<g transform="translate(2 3)"><path d="M0 0L10 10" stroke="#123456" stroke-width="2" fill="none"/><text x="5" y="20">Original text</text></g>'

test('clean preview removes an entire nested rule layer and preserves neighboring artwork', () => {
  const withRules = wrap(`
    <rect id="before" width="100" height="100" fill="#fff"/>
    ${artwork}
    <g id="layout-guides" display="none">
      <g transform="translate(40 40)"><g><path d="M1 2L3 4"/></g></g>
      <line x1="0" y1="5" x2="99" y2="5" stroke="#f00"/>
      <g><path d="M5 6L7 8"/><g><path d="M9 10L11 12"/></g></g>
    </g>
    <circle id="after" cx="80" cy="80" r="5"/>
  `)
  const expected = wrap(`<rect id="before" width="100" height="100" fill="#fff"/>${artwork}<circle id="after" cx="80" cy="80" r="5"/>`)
  assert.equal(cleanSvgPreview(withRules), cleanSvgPreview(expected))
  assert.doesNotMatch(cleanSvgPreview(withRules), /layout-guides|M1 2L3 4|M9 10L11 12|<line/)
  assert.match(cleanSvgPreview(withRules), /id="before"/)
  assert.match(cleanSvgPreview(withRules), /id="after"/)
  assert.equal(cleanSvgPreview(withRules.replace('display="none"', 'display="inline"')), cleanSvgPreview(expected), 'clean comparison ignores the rule layer visibility')
})

test('title, description, metadata and version updates do not count as painted changes', () => {
  const before = wrap(`<title>Old title</title><desc>Old description</desc>${artwork}`, 'data-brand-version="1"')
  const after = wrap(`
    <title>New title</title>
    <desc>New source attribution and fidelity limitations</desc>
    <metadata><audit xmlns="urn:brandkit:audit"><source>Manual p. 25</source></audit></metadata>
    <!-- Updated documentation -->
    ${artwork}
  `, 'data-brand-version="2"')
  assert.equal(cleanSvgPreview(before), cleanSvgPreview(after))
})

test('clean comparison retains real paint, geometry, text, clipping, styles and image changes', () => {
  const before = wrap(`<defs><clipPath id="clip"><rect width="60" height="60"/></clipPath></defs><style>text{font-size:12px}</style><g clip-path="url(#clip)">${artwork}<image href="data:image/png;base64,AAAA" width="5" height="5"/></g>`)
  for (const [label, from, to] of [
    ['viewBox', '0 0 100 100', '0 0 100 101'],
    ['transform', 'translate(2 3)', 'translate(2 4)'],
    ['path', 'M0 0L10 10', 'M0 0L11 10'],
    ['stroke', '#123456', '#654321'],
    ['stroke width', 'stroke-width="2"', 'stroke-width="3"'],
    ['fill', 'fill="none"', 'fill="#fff"'],
    ['visible text', 'Original text', 'Revised text'],
    ['text spacing', 'Original text', 'Original  text'],
    ['clipping geometry', 'width="60"', 'width="40"'],
    ['style', 'font-size:12px', 'font-size:14px'],
    ['image', 'base64,AAAA', 'base64,BBBB']
  ]) assert.notEqual(cleanSvgPreview(before), cleanSvgPreview(before.replace(from, to)), `${label}: actual preview difference retained`)
  assert.notEqual(cleanSvgPreview(wrap('<text>A<tspan> </tspan>B</text>')), cleanSvgPreview(wrap('<text>A<tspan></tspan>B</text>')), 'a whitespace-only text span is still painted spacing')
})

test('invalid markup is rejected instead of silently accepted as unchanged artwork', () => {
  assert.throws(() => cleanSvgPreview('<svg xmlns="http://www.w3.org/2000/svg"><g></svg>'), /Invalid SVG|closed|mismatch/i)
  assert.throws(() => cleanSvgPreview('<html/>'), /complete SVG/)
})
