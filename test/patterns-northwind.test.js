import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { pattern } from '../src/engine/artwork.js'
import { STUDIES, PALETTES, APPLICATIONS, supportingSymbols, buildPattern } from '../scripts/brands/patterns/northwind.mjs'

const source = JSON.parse(readFileSync(new URL('../brands/northwind/brand.json', import.meta.url), 'utf8'))
const brand = { ...source, symbols: { ...source.symbols, ...supportingSymbols(source) } }

test('northwind pattern studies preserve source geometry and work as a standalone explorer function', () => {
  assert.equal(STUDIES.length, 8)
  assert.equal(new Set(STUDIES.map(s => s.id)).size, STUDIES.length)
  assert.deepEqual(brand.symbol, source.symbol)
  const embedded = runInNewContext(`(${buildPattern.toString()})`)
  for (const study of STUDIES) for (const palette of PALETTES) for (const scale of [50, 100, 150]) {
    const options = { palette, scale, density: scale }
    const spec = buildPattern(brand, study.id, options)
    assert.equal(JSON.stringify(embedded(brand, study.id, options)), JSON.stringify(spec), study.id)
    assert.equal(spec.width, 960)
    assert.equal(spec.height, 600)
    const svg = pattern({ brand }, spec)
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/, study.id)
    for (const p of spec.place ?? []) {
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && p.scale > 0)
      if (p.symbol) assert.ok(brand.symbols[p.symbol])
    }
    for (const dot of spec.dots ?? []) assert.ok(dot.cx >= 0 && dot.cx <= spec.width && dot.cy >= 0 && dot.cy <= spec.height && dot.r > 0)
  }
  for (const application of APPLICATIONS) assert.ok(STUDIES.some(s => s.id === application.pattern))
})

test('northwind mixed turns use three scales and the ring motif retains the original seven centres', () => {
  const spec = buildPattern(brand, 'explore-turning-field')
  assert.equal(new Set(spec.place.map(p => p.scale)).size, 3)
  assert.equal(new Set(spec.place.map(p => p.rotation ?? 0)).size, 4)
  const rings = brand.symbols['explore-seven-rings']
  assert.deepEqual(rings.viewBox, source.symbol.viewBox)
  assert.equal(rings.paths[0].fillRule, 'evenodd')
  const path = rings.paths[0].d
  assert.equal((path.match(/M/g) ?? []).length, source.symbol.centres.length * 2)
})
