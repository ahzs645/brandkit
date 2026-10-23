import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pattern } from '../src/engine/artwork.js'
import { STUDIES, PALETTES, supportingSymbols, buildPattern } from '../scripts/brands/patterns/firstform.mjs'

const source = JSON.parse(readFileSync(new URL('../brands/firstform/brand.json', import.meta.url), 'utf8'))
const brand = { ...source, symbols: { ...source.symbols, ...supportingSymbols(source) } }

test('First Form pattern studies preserve the source block and render at all explorer settings', () => {
  assert.deepEqual(brand.symbols['explore-block'].paths, [source.symbol.paths[0]])
  assert.equal(STUDIES.length, 8)
  assert.equal(new Set(STUDIES.map(s => s.id)).size, STUDIES.length)
  for (const study of STUDIES) for (const palette of PALETTES) for (const scale of [50, 100, 150]) for (const density of [50, 100, 150]) {
    const spec = buildPattern(brand, study.id, { scale, density, palette })
    const svg = pattern({ brand }, { ...spec, title: study.name })
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/, `${study.id}: ${palette.id}/${scale}/${density}`)
    assert.equal(spec.width, 960)
    assert.equal(spec.height, 600)
    for (const line of spec.lines ?? []) for (const [x, y] of line.points) assert.ok(x >= 0 && x <= 960 && y >= 0 && y <= 600, study.id)
    for (const item of spec.place ?? []) {
      assert.ok(Number.isFinite(item.x) && Number.isFinite(item.y) && item.scale > 0)
      assert.ok(brand.colours[item.colour])
      if (item.symbol) assert.ok(brand.symbols[item.symbol])
    }
  }
})

test('First Form mixed assemblies combine three sizes and four orientations without runtime module captures', () => {
  const spec = buildPattern(brand, 'explore-mixed-assemblies')
  assert.equal(new Set(spec.place.map(p => p.scale)).size, 3)
  assert.equal(new Set(spec.place.map(p => p.rotation ?? 0)).size, 4)
  const serialized = new Function(`return (${buildPattern.toString()})`)()
  for (const study of STUDIES) assert.deepEqual(serialized(brand, study.id), buildPattern(brand, study.id))
  const normal = buildPattern(brand, 'explore-block-weave')
  const dense = buildPattern(brand, 'explore-block-weave', { density: 150 })
  assert.ok(dense.place.length > normal.place.length)
})
