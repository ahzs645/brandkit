import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pattern } from '../src/engine/artwork.js'
import { APPLICATIONS, PALETTES, STUDIES, supportingSymbols, buildPattern } from '../scripts/brands/patterns/ddcnorth.mjs'

const original = JSON.parse(readFileSync(new URL('../brands/ddcnorth/brand.json', import.meta.url)))
const brand = { ...original, symbols: { ...original.symbols, ...supportingSymbols(original) } }

test('ddcnorth supporting studies remain serializable, finite and inside the existing palette', () => {
  const detached = Function(`return (${buildPattern.toString()})`)()
  const before = JSON.stringify(original)
  const colours = new Set(Object.keys(original.colours))
  assert.equal(STUDIES.length, 8)
  assert.equal(new Set(STUDIES.map(s => s.id)).size, STUDIES.length)
  for (const study of STUDIES) for (const palette of PALETTES) for (const scale of [50, 100, 150]) for (const density of [50, 100, 150]) {
    const options = { palette, scale, density }
    const spec = buildPattern(brand, study.id, options)
    assert.deepEqual(detached(brand, study.id, options), spec, 'the offline generator has no captured dependencies')
    assert.equal(spec.width, 960)
    assert.equal(spec.height, 600)
    assert.doesNotMatch(JSON.stringify(spec), /null|NaN|Infinity|undefined/)
    for (const item of [...spec.place ?? [], ...spec.dots ?? [], ...spec.lines ?? []]) assert.ok(colours.has(item.colour))
    for (const line of spec.lines ?? []) {
      for (const [x, y] of line.points) assert.ok(x >= 0 && x <= spec.width && y >= 0 && y <= spec.height)
      if (study.kind === 'tile' && line.points[0][0] === 0 && line.points.at(-1)[0] === spec.width) assert.equal(line.points[0][1], line.points.at(-1)[1], 'edge-crossing routes join when tiled')
    }
    const svg = pattern({ brand }, spec)
    assert.doesNotMatch(svg, /NaN|Infinity|undefined/)
  }
  assert.equal(JSON.stringify(original), before, 'the approved definition is untouched')
  for (const application of APPLICATIONS) assert.ok(STUDIES.some(s => s.id === application.pattern))
})

test('ddcnorth turning groups retain the original six-dot artwork at three scales and four directions', () => {
  const spec = buildPattern(brand, 'explore-turning-groups')
  assert.equal(new Set(spec.place.map(p => p.scale)).size, 3)
  assert.equal(new Set(spec.place.map(p => p.rotation ?? 0)).size, 4)
  assert.ok(spec.place.every(p => !p.symbol))
  assert.deepEqual(brand.symbol.centres, [[40, 40], [128, 40], [216, 40], [128, 128], [216, 128], [216, 216]])
  const svg = pattern({ brand }, spec)
  assert.equal([...svg.matchAll(/data-brand-symbol="six-dot"/g)].length, spec.place.length)
})
