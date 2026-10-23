import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pattern } from '../src/engine/artwork.js'
import { STUDIES, PALETTES, APPLICATIONS, supportingSymbols, buildPattern } from '../scripts/brands/patterns/bc-hydro-1983.mjs'

const original = JSON.parse(readFileSync(new URL('../brands/bc-hydro-1983/brand.json', import.meta.url)))
const brand = { ...original, symbols: { ...original.symbols, ...supportingSymbols(original) } }

test('Hydro supporting studies retain identifying artwork and use independent geometry', () => {
  assert.equal(STUDIES.length, 6)
  assert.equal(APPLICATIONS.length, 2)
  assert.deepEqual(brand.symbol, original.symbol)
  assert.deepEqual(brand.signatures, original.signatures)
  const ids = new Set(STUDIES.map(s => s.id))
  assert.equal(ids.size, STUDIES.length)
  assert.ok(APPLICATIONS.every(app => ids.has(app.pattern)))
  for (const study of STUDIES) {
    const spec = buildPattern(brand, study.id)
    const svg = pattern({ brand }, spec)
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/)
    assert.ok(!svg.includes('bc-hydro-ring'), 'official identifying symbol is not used as decoration')
    assert.ok((spec.place ?? []).every(p => p.symbol === 'explore-annulus'))
    assert.deepEqual(spec, buildPattern(brand, study.id))
  }
})

test('Hydro pattern functions survive serialization and all explorer palette/scale/density settings', () => {
  const offline = Function(`return (${buildPattern.toString()})`)()
  for (const study of STUDIES) for (const palette of PALETTES) for (const scale of [50, 100, 150]) for (const density of [50, 100, 150]) {
    const options = { palette, scale, density }
    const spec = offline(brand, study.id, options)
    assert.deepEqual(spec, buildPattern(brand, study.id, options))
    assert.equal(spec.width, 960)
    assert.equal(spec.height, 600)
    for (const line of spec.lines ?? []) for (const [x, y] of line.points) assert.ok(Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 960 && y >= 0 && y <= 600, `${study.id}: line clipped`)
    for (const p of spec.place ?? []) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && p.scale > 0)
    for (const dot of spec.dots ?? []) assert.ok(Number.isFinite(dot.cx) && Number.isFinite(dot.cy) && dot.r > 0)
    const colours = new Set(Object.keys(brand.colours))
    assert.ok(colours.has(spec.background))
    for (const item of [...(spec.lines ?? []), ...(spec.dots ?? []), ...(spec.place ?? [])]) assert.ok(colours.has(item.colour))
  }
})
