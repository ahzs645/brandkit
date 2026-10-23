import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pattern } from '../src/engine/artwork.js'
import { APPLICATIONS, PALETTES, STUDIES, buildPattern, supportingSymbols } from '../scripts/brands/patterns/bc-province-1977.mjs'

const source = JSON.parse(readFileSync(new URL('../brands/bc-province-1977/brand.json', import.meta.url)))
const brand = { ...source, symbols: { ...source.symbols, ...supportingSymbols(source) } }

test('Province supporting patterns keep heraldry untouched and render all controls as finite palette artwork', () => {
  const standalone = Function(`return (${buildPattern.toString()})`)()
  assert.equal(STUDIES.length, 8)
  assert.equal(new Set(STUDIES.map(s => s.id)).size, STUDIES.length)
  for (const study of STUDIES) for (const palette of PALETTES) for (const scale of [50, 100, 150]) for (const density of [50, 100, 150]) {
    const spec = buildPattern(brand, study.id, { palette, scale, density })
    assert.deepEqual(spec, standalone(brand, study.id, { palette, scale, density }), 'offline builder needs no module closure')
    assert.deepEqual(spec, buildPattern(brand, study.id, { palette, scale, density }), 'repeatable generation')
    const svg = pattern({ brand }, spec)
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/)
    assert.ok(!svg.includes('data-brand-symbol="provincial-symbol"'), 'the official arms are never repeated, rotated or cropped')
    for (const p of spec.place ?? []) {
      assert.ok(p.symbol?.startsWith('explore-'))
      assert.ok(brand.colours[p.colour] && Number.isFinite(p.scale) && p.scale > 0)
    }
    for (const l of spec.lines ?? []) for (const [x, y] of l.points) assert.ok(Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 960 && y >= 0 && y <= 600)
    for (const [, hex] of svg.matchAll(/(?:fill|stroke)="(#[0-9a-f]{6})"/gi)) assert.ok(Object.values(brand.colours).includes(hex))
  }
  for (const application of APPLICATIONS) assert.ok(STUDIES.some(s => s.id === application.pattern))
  assert.deepEqual(brand.symbol, source.symbol)
})
