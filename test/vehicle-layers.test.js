import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ASSET_VERSION, SCHEMA, SURFACE_VERSION, MAX_LAYERS, areasFor,
  canEditLayer, copyProject, createVehicleLayer, defaultWrap,
  mirrorPlacement, reconcileLayers, selectedLayer, validateProject
} from '../src/mockups/vehicle-layout.js'
import { defaultConfiguration } from '../src/mockups/vehicle-configuration.js'

const oldProject = (schema = 'brandkit-vehicle-mockup/2') => ({
  schema, model: 'truck-canopy', paint: '#ffffff', area: 'left-body', backdrop: 'studio',
  artwork: { kind: 'fleet', logo: 'brand/primary', tagline: 'Field services', website: 'example.org', upload: null },
  placements: {
    left: { u: 0.1, v: -0.04, width: 1.21, rotation: 7 },
    'left-body': { u: -0.2, v: 0.1, width: 1.65, rotation: -4 }
  },
  wrap: { ...defaultWrap(), coverage: 'rear' }
})
const migrated = () => validateProject(oldProject())
const config = (project, changes) => { project.configuration = { ...project.configuration, ...changes }; return reconcileLayers(project) }

test('v2 migration preserves every artwork and transform and creates deterministic independent layer IDs', () => {
  const old = oldProject()
  const first = validateProject(old)
  const second = validateProject(old)
  assert.equal(first.schema, SCHEMA)
  assert.equal(first.assetVersion, ASSET_VERSION)
  assert.equal(first.surfaceVersion, SURFACE_VERSION)
  assert.deepEqual(first, second)
  assert.deepEqual(first.configuration, defaultConfiguration('truck-canopy'))
  assert.deepEqual(first.layers.map(({ id, area }) => [id, area]), [['legacy-left', 'left'], ['legacy-left-body', 'left-body']])
  assert.deepEqual(first.placements, old.placements)
  assert.equal(first.selectedLayerId, 'legacy-left-body')
  assert.equal(first.wrap.coverage, 'rear')
  first.layers[0].artwork.tagline = 'Changed door only'
  first.layers[0].placement.width = 0.9
  assert.equal(first.layers[1].artwork.tagline, 'Field services')
  assert.equal(old.artwork.tagline, 'Field services')
  assert.equal(old.placements.left.width, 1.21)
})

test('v1 migration opens independently layered artwork without inventing a wrap', () => {
  const project = validateProject(oldProject('brandkit-vehicle-mockup/1'))
  assert.equal(project.layers.length, 2)
  assert.equal(project.wrap.coverage, 'none')
  assert.equal(project.layers.every((layer) => !layer.unplaced), true)
})

test('removing and restoring the canopy retains its exact artwork and physical placement', () => {
  const project = migrated()
  const saved = structuredClone(project.layers[1])
  config(project, { cover: 'open' })
  assert.equal(project.layers[0].unplaced, false)
  assert.equal(project.layers[1].unplaced, true)
  assert.equal(project.layers[1].component, 'canopy')
  assert.match(project.layers[1].unplacedReason, /removed/)
  assert.deepEqual(project.layers[1].placement, saved.placement)
  assert.deepEqual(project.layers[1].artwork, saved.artwork)
  assert.equal(Object.hasOwn(project.placements, 'left-body'), false)
  assert.equal(canEditLayer(project), false)
  config(project, { cover: 'raised' })
  assert.equal(project.layers[1].unplaced, false)
  assert.deepEqual(project.layers[1].placement, saved.placement)
  assert.equal(canEditLayer(project), true)
})

test('a windowed or shorter canopy retains oversized artwork without silently shrinking it', () => {
  const project = migrated()
  const saved = structuredClone(selectedLayer(project).placement)
  config(project, { sides: 'windows' })
  assert.equal(selectedLayer(project).unplaced, true)
  assert.match(selectedLayer(project).unplacedReason, /surface changed/)
  assert.deepEqual(selectedLayer(project).placement, saved)
  config(project, { sides: 'solid', cover: 'cab-high' })
  assert.equal(selectedLayer(project).unplaced, true)
  config(project, { cover: 'raised' })
  assert.equal(selectedLayer(project).unplaced, false)
  assert.deepEqual(selectedLayer(project).placement, saved)
})

test('paint and a side-independent rack change do not detach door or canopy side artwork', () => {
  const project = migrated()
  config(project, { canopyPaint: '#162a49', rack: true })
  assert.equal(project.layers.some((layer) => layer.unplaced), false)
  assert.equal(project.layers[1].targetConfiguration.canopyPaint, null)
})

test('roof artwork is retained when its roof mount is occupied by a rack', () => {
  const project = migrated()
  const layer = createVehicleLayer(project, 'canopy-roof', project.artwork)
  project.layers.push(layer)
  project.selectedLayerId = layer.id
  config(project, { rack: true })
  assert.equal(selectedLayer(project).unplaced, true)
  config(project, { rack: false })
  assert.equal(selectedLayer(project).unplaced, false)
})

test('switching vehicles retains every original layer and switching back restores it', () => {
  const project = migrated()
  const before = project.layers.map((layer) => structuredClone(layer.placement))
  project.model = 'suv'
  project.configuration = null
  reconcileLayers(project)
  assert.equal(project.layers.every((layer) => layer.unplaced), true)
  assert.deepEqual(project.placements, {})
  const newLayer = createVehicleLayer(project, 'left', project.artwork, { name: 'SUV door' })
  project.layers.push(newLayer)
  project.selectedLayerId = newLayer.id
  reconcileLayers(project)
  assert.equal(project.layers.filter((layer) => !layer.unplaced).length, 1)
  project.model = 'truck-canopy'
  project.configuration = defaultConfiguration(project.model)
  reconcileLayers(project)
  assert.deepEqual(project.layers.slice(0, 2).map((layer) => layer.placement), before)
  assert.equal(project.layers.slice(0, 2).every((layer) => !layer.unplaced), true)
  assert.equal(project.layers[2].unplaced, true)
})

test('two layers can occupy the same surface with different artwork and selected aliases', () => {
  const project = migrated()
  const a = createVehicleLayer(project, 'left', { ...project.artwork, tagline: 'Operations', website: '' })
  const b = createVehicleLayer({ ...project, layers: [...project.layers, a] }, 'left', { ...project.artwork, tagline: 'Fleet 07', website: '' }, { placement: { u: 0.2, v: 0.1, width: 0.45, rotation: 0 } })
  project.layers.push(a, b)
  project.selectedLayerId = b.id
  reconcileLayers(project)
  assert.notEqual(a.id, b.id)
  assert.equal(project.artwork.tagline, 'Fleet 07')
  assert.equal(project.placements.left.width, 0.45)
  project.selectedLayerId = a.id
  reconcileLayers(project)
  assert.equal(project.artwork.tagline, 'Operations')
  assert.equal(project.layers.length, 4)
})

test('locking and hiding a selected layer make it non-editable without changing artwork', () => {
  const project = migrated()
  assert.equal(canEditLayer(project), true)
  selectedLayer(project).locked = true
  assert.equal(canEditLayer(project), false)
  selectedLayer(project).locked = false
  selectedLayer(project).visible = false
  assert.equal(canEditLayer(project), false)
  assert.equal(selectedLayer(project).artwork.tagline, 'Field services')
})

test('opposite-side copying preserves readable orientation and independent artwork', () => {
  const project = migrated()
  const source = selectedLayer(project)
  const opposite = mirrorPlacement(source.placement, source.area, 3, areasFor(project.model, project.configuration))
  const layer = createVehicleLayer(project, opposite.area, source.artwork, { placement: opposite.placement, aspect: 3 })
  project.layers.push(layer)
  assert.equal(layer.area, 'right-body')
  assert.equal(layer.placement.u, -source.placement.u)
  assert.equal(layer.placement.rotation, -source.placement.rotation)
  layer.artwork.tagline = 'Passenger side'
  assert.equal(source.artwork.tagline, 'Field services')
})

test('v3 save/load and undo snapshots preserve unplaced layers, uploads and original targets', () => {
  const project = migrated()
  project.layers[0].artwork = { ...project.layers[0].artwork, kind: 'upload', upload: { name: 'logo.png', dataUrl: 'data:image/png;base64,iVBORw0KGgo=', aspect: 2 } }
  config(project, { cover: 'open' })
  const saved = JSON.stringify(project)
  const restored = validateProject(JSON.parse(saved))
  assert.deepEqual(restored, project)
  const snapshot = copyProject(restored)
  snapshot.layers[0].artwork.upload.name = 'Changed name'
  snapshot.layers[1].placement.width = 0.2
  snapshot.configuration.cover = 'tonneau'
  assert.equal(restored.layers[0].artwork.upload.name, 'logo.png')
  assert.equal(restored.layers[1].placement.width, 1.65)
  assert.equal(restored.configuration.cover, 'open')
})

test('empty projects remain valid and a new layer can be added after deleting all artwork', () => {
  const project = migrated()
  project.layers = []
  project.selectedLayerId = null
  reconcileLayers(project)
  const restored = validateProject(project)
  assert.equal(restored.layers.length, 0)
  assert.equal(restored.artwork.kind, 'none')
  assert.equal(canEditLayer(restored), false)
  const layer = createVehicleLayer(restored, 'left', oldProject().artwork)
  assert.equal(layer.id, 'layer-1')
})

test('layer validation rejects duplicate IDs, unsafe sources, invalid targets and incompatible versions', () => {
  const invalid = (mutate) => { const p = migrated(); mutate(p); assert.throws(() => validateProject(p)) }
  invalid((p) => { p.layers[1].id = p.layers[0].id })
  invalid((p) => { p.layers[0].area = '__proto__' })
  invalid((p) => { p.layers[0].visible = 'yes' })
  invalid((p) => { p.layers[0].placement.width = Infinity })
  invalid((p) => { p.layers[0].aspect = 0 })
  invalid((p) => { p.layers[0].artwork.kind = 'file'; p.layers[0].artwork.file = '../secret.svg' })
  invalid((p) => { p.layers[0].targetConfiguration.cover = 'airplane' })
  invalid((p) => { p.selectedLayerId = 'missing' })
  invalid((p) => { p.assetVersion = 'vehicle-assets/999' })
  invalid((p) => { p.surfaceVersion = 'vehicle-surfaces/999' })
})

test('layer counts and individual data are bounded before allocating renderer resources', () => {
  const project = migrated()
  while (project.layers.length < MAX_LAYERS) project.layers.push(createVehicleLayer(project, 'left', project.artwork))
  assert.equal(validateProject(project).layers.length, MAX_LAYERS)
  assert.throws(() => createVehicleLayer(project, 'left', project.artwork), /up to/)
  project.layers.push(structuredClone(project.layers[0]))
  assert.throws(() => validateProject(project), /up to/)
})


test('per-model versions and checksums are retained in snapshots and checked for named projects', () => {
  const assets = { 'truck-canopy': { assetVersion: 'generic-work-truck/1', surfaceVersion: 'generic-work-truck/1', sha256: null } }
  const project = validateProject(oldProject(), { assets })
  assert.deepEqual(project.assetReferences['truck-canopy'], assets['truck-canopy'])
  const saved = copyProject(project)
  assert.deepEqual(validateProject(saved, { assets }).assetReferences, assets)
  saved.assetReferences['truck-canopy'].surfaceVersion = 'generic-work-truck/2'
  assert.throws(() => validateProject(saved, { assets }), /different version/)
  assert.equal(project.assetReferences['truck-canopy'].surfaceVersion, 'generic-work-truck/1')
  const car = { ...oldProject(), model: 'suv', area: 'left', placements: { left: oldProject().placements.left }, modelSha256: 'a'.repeat(64) }
  assert.throws(() => validateProject(car, { assets: { suv: { assetVersion: 'suv/1', surfaceVersion: 'generic-car/1', sha256: 'b'.repeat(64) } } }), /different version/)
})
