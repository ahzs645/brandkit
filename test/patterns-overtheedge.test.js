import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pattern } from '../src/engine/artwork.js'
import { validateBrand } from '../src/engine/brand.js'
import { APPLICATIONS, PALETTES, STUDIES, supportingSymbols, buildPattern } from '../scripts/brands/patterns/overtheedge.mjs'

const source = JSON.parse(readFileSync(new URL('../brands/overtheedge/brand.json', import.meta.url), 'utf8'))
const symbols = supportingSymbols(source)
const brand = { ...source, symbols: { ...source.symbols, ...symbols } }

test('Over the Edge patterns preserve the original O and serialize without hidden runtime dependencies', () => {
  assert.deepEqual(symbols['explore-o'].paths, source.symbol.paths)
  assert.deepEqual(symbols['explore-o'].viewBox, source.symbol.viewBox)
  assert.equal(STUDIES.length, 7)
  assert.equal(new Set(STUDIES.map(s => s.id)).size, STUDIES.length)
  assert.ok(APPLICATIONS.every(a => STUDIES.some(s => s.id === a.pattern)))
  const standalone = Function(`return (${buildPattern.toString()})`)()
  for (const study of STUDIES) {
    const options = { palette: PALETTES.find(p => p.id === study.palette), scale: 115, density: 85 }
    assert.deepEqual(standalone(brand, study.id, options), buildPattern(brand, study.id, options), study.id)
  }
  assert.throws(() => standalone(brand, 'missing'), /Unknown Over the Edge study/)
})

test('Over the Edge patterns remain finite, clipped and palette-based across explorer settings', () => {
  const colours = new Set(Object.keys(brand.colours))
  for (const study of STUDIES) for (const palette of PALETTES) for (const scale of [50, 100, 150]) for (const density of [50, 100, 150]) {
    const spec = buildPattern(brand, study.id, { palette, scale, density })
    assert.equal(spec.width, 960); assert.equal(spec.height, 600)
    assert.ok(colours.has(spec.background))
    for (const p of spec.place ?? []) {
      assert.ok([p.x, p.y, p.scale, p.rotation ?? 0].every(Number.isFinite) && p.scale > 0, study.id)
      assert.ok(brand.symbols[p.symbol], p.symbol)
      assert.ok(colours.has(p.colour), p.colour)
    }
    for (const d of spec.dots ?? []) assert.ok([d.cx, d.cy, d.r].every(Number.isFinite) && d.r >= 0 && colours.has(d.colour))
    for (const line of spec.lines ?? []) {
      assert.ok(line.points.length >= 2 && colours.has(line.colour))
      for (const [x, y] of line.points) assert.ok(Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 960 && y >= 0 && y <= 600, `${study.id}: ${x},${y}`)
    }
    const svg = pattern({ brand }, spec)
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/, study.id)
  }
  const patterns = STUDIES.map(s => buildPattern(brand, s.id, { palette: PALETTES.find(p => p.id === s.palette) }))
  assert.deepEqual(validateBrand({ ...brand, patterns }), [])
  const compass = buildPattern(brand, 'explore-o-compass')
  assert.equal(new Set(compass.place.map(p => p.scale)).size, 3)
  assert.ok(new Set(compass.place.map(p => p.rotation ?? 0)).size > 3)
})
