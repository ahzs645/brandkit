import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { patternLibrary } from '../src/engine/pattern-catalog.js'

const root = new URL('../brands/', import.meta.url).pathname
const counts = { firstform: 11, ddcnorth: 15, overtheedge: 14, sparklab: 21, northwind: 11, 'bc-province-1977': 8, 'bc-hydro-1983': 6 }
const brands = Object.fromEntries(Object.keys(counts).map((id) => [id, JSON.parse(readFileSync(join(root, id, 'brand.json'), 'utf8'))]))

test('all seven pattern libraries preserve every source pattern once and leave definitions untouched', () => {
  let total = 0
  for (const [id, brand] of Object.entries(brands)) {
    const before = JSON.stringify(brand)
    const library = patternLibrary(brand)
    assert.equal(library.patterns.length, counts[id], id)
    assert.deepEqual(library.patterns.map((entry) => entry.id), brand.patterns.map((spec) => spec.id), id)
    assert.equal(new Set(library.patterns.map((entry) => entry.key)).size, counts[id])
    assert.equal(library.groups.reduce((sum, group) => sum + group.count, 0), counts[id])
    for (const entry of library.patterns) assert.equal(entry.spec, brand.patterns.find((spec) => spec.id === entry.id))
    assert.equal(JSON.stringify(brand), before, `${id}: read-only indexing`)
    total += library.patterns.length
  }
  assert.equal(total, 86)
})

test('every explicit pattern use has a real bidirectional application link', () => {
  let directApplications = 0
  for (const brand of Object.values(brands)) {
    const library = patternLibrary(brand)
    for (const template of brand.templates) {
      const patternIds = [...new Set((template.elements ?? []).filter((element) => element.type === 'pattern').map((element) => element.pattern))]
      if (patternIds.length) directApplications++
      for (const id of patternIds) {
        const entry = library.patterns.find((pattern) => pattern.id === id)
        const relation = entry.applications.find((application) => application.id === template.id)
        assert.equal(relation.template, template)
        assert.equal(relation.relationship, 'pattern')
        assert.ok(library.applications.find((application) => application.id === template.id).directPatternIds.includes(id))
      }
    }
    for (const application of library.applications) {
      assert.equal(application.template, brand.templates.find((template) => template.id === application.id))
      assert.equal(new Set(application.patternIds).size, application.patternIds.length)
      for (const id of application.patternIds) assert.ok(library.patterns.find((pattern) => pattern.id === id).templateIds.includes(application.id))
    }
  }
  assert.equal(directApplications, 14)
})

test('SPARK expanded artwork is related by graphic direction without claiming an exact pattern reference', () => {
  const library = patternLibrary(brands.sparklab)
  assert.equal(library.applications.length, 12)
  assert.deepEqual(library.groups.map((group) => [group.label, group.count]), [['Kit patterns', 3], ['Arrows', 12], ['Signal', 2], ['Connections', 2], ['Layers', 2]])
  const arrows = library.patterns.find((entry) => entry.id === 'arrows-directions')
  assert.deepEqual(arrows.templateIds, ['open-lab-directions', 'project-currents', 'workshop-arrows', 'presentation-arrows'])
  assert.ok(arrows.applications.every((application) => application.relationship === 'family'))
  assert.deepEqual(arrows.motifs.map((motif) => [motif.kind, motif.symbolId]), [['symbol', 'arrow']], 'the source arrow is not the service icon with the same id')
  assert.ok(library.patterns.find((entry) => entry.id === 'layers').templateIds.includes('business-card-layers'))
  assert.ok(library.applications.every((application) => application.directPatternIds.length === 0))
})

test('motifs follow the renderer and retain source provenance; geometric fields do not invent icon links', () => {
  const spark = patternLibrary(brands.sparklab)
  assert.deepEqual(spark.patterns.find((entry) => entry.id === 'repeat').motifs.map((motif) => [motif.id, motif.symbolId]), [['primary', undefined]])
  const mix = spark.patterns.find((entry) => entry.id === 'arrows-spark-mix')
  assert.deepEqual(mix.motifs.map((motif) => motif.symbolId).sort(), ['arrow', 'spark'])
  assert.ok(mix.motifs.every((motif) => motif.sources.some((source) => source.path === 'reference/logo-site.svg')))
  assert.equal(spark.patterns.find((entry) => entry.id === 'signal').motifs.length, 0)
  const hydro = patternLibrary(brands['bc-hydro-1983'])
  assert.ok(hydro.notes.some((note) => /historical/i.test(note)))
  assert.ok(hydro.patterns.flatMap((entry) => entry.sourceNotes).some((note) => /contemporary|historical/i.test(note)))
  for (const brand of Object.values(brands)) for (const entry of patternLibrary(brand).patterns) for (const motif of entry.motifs) {
    assert.equal(motif.kind, 'symbol')
    assert.ok(motif.symbolId ? brand.symbols[motif.symbolId] : brand.symbol)
  }
})

test('existing explorers and usage references remain discoverable, with real source paths', () => {
  let resources = 0
  for (const brand of Object.values(brands)) {
    const library = patternLibrary(brand)
    assert.equal(new Set(library.resources.map((resource) => resource.path)).size, library.resources.length)
    for (const resource of library.resources) assert.ok(existsSync(join(root, brand.id, resource.path)), `${brand.id}/${resource.path}`)
    resources += library.resources.length
  }
  assert.equal(resources, 20)
  assert.deepEqual(patternLibrary(brands.sparklab).resources.map((resource) => resource.path).sort(), ['docs/arrow-patterns.html', 'docs/patterns-and-templates.html'])
})

test('an unnamed primary mark and a named symbol called primary remain distinct', () => {
  const source = brands.firstform
  const named = { ...source.symbols['explore-plane'], title: 'Named primary supporting shape' }
  const spec = {
    id: 'primary-collision', width: 960, height: 600, background: 'white',
    place: [{ x: 0, y: 0, scale: 1 }, { x: 200, y: 0, scale: 1, symbol: 'primary' }, { x: 400, y: 0, scale: 1, symbol: 'primary' }]
  }
  const brand = { ...source, symbols: { ...source.symbols, primary: named }, patterns: [spec] }
  const before = JSON.stringify(brand)
  const entry = patternLibrary(brand).patterns[0]
  assert.deepEqual(entry.motifs.map((motif) => [motif.id, motif.symbolId]), [['primary', undefined], ['named:primary', 'primary']])
  assert.equal(entry.motifs[0].label, source.symbol.title)
  assert.equal(entry.motifs[1].label, named.title)
  assert.equal(new Set(entry.motifs.map((motif) => `${motif.kind}-${motif.id}`)).size, 2, 'UI keys are distinct')
  assert.equal(entry.spec, spec)
  assert.equal(JSON.stringify(brand), before, 'source geometry is unchanged')
})

test('duplicate pattern ids fail clearly instead of silently dropping artwork', () => {
  const brand = { ...brands.firstform, patterns: [brands.firstform.patterns[0], brands.firstform.patterns[0]] }
  assert.throws(() => patternLibrary(brand), /unique/)
})
