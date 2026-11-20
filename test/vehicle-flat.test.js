import test from 'node:test'
import assert from 'node:assert/strict'
import { DOMParser } from '@xmldom/xmldom'
import { vehicleFlatSvg, flatAreaBox } from '../src/mockups/vehicle-flat-studio.js'
import { createVehicleLayer, validateProject, reconcileLayers, mirrorPlacement, areasFor, copyProject, defaultWrap } from '../src/mockups/vehicle-layout.js'

const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100"><path d="M0 0H300V100H0Z" fill="#162a49"/><text x="20" y="60" fill="white">READABLE</text></svg>')}`
const base = () => validateProject({ schema: 'brandkit-vehicle-mockup/2', model: 'truck-canopy', paint: '#ffffff', area: 'left', placements: { left: { u: .1, v: .05, width: 1.2, rotation: 15 } }, artwork: { kind: 'logo', logo: 'original-logo', tagline: '', website: '', upload: null }, wrap: defaultWrap(), backdrop: 'studio' })
const images = (project) => Object.fromEntries(project.layers.map((layer) => [layer.id, { url, aspect: 3 }]))
const parse = (svg) => new DOMParser({ onError: (level, message) => { if (level !== 'warning') throw new Error(message) } }).parseFromString(svg, 'image/svg+xml')
const elements = (doc, tag) => Array.from(doc.getElementsByTagName(tag))

test('flat output is valid standalone SVG in every view and identifies itself as a schematic', () => {
  const project = base()
  for (const view of ['side', 'opposite', 'front', 'rear', 'hood', 'angle']) {
    const svg = vehicleFlatSvg(project, { view, artworks: images(project) })
    const doc = parse(svg)
    assert.equal(doc.documentElement.localName, 'svg')
    assert.equal(doc.documentElement.getAttribute('viewBox'), '0 0 1200 680')
    assert.match(svg, /FLAT PREVIEW · NO WEBGL/)
    assert.match(svg, /Generic schematic/)
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/)
  }
})

test('artwork position and rotation use the same physical placement as the 3D project', () => {
  const project = base(), layer = project.layers[0]
  const before = JSON.stringify(project)
  const box = flatAreaBox(project, 'left', 'side')
  const doc = parse(vehicleFlatSvg(project, { view: 'side', artworks: images(project) }))
  const image = elements(doc, 'image').find((element) => element.getAttribute('data-layer-id') === layer.id)
  assert.ok(image)
  assert.equal(Number(image.getAttribute('width')), layer.placement.width * box.scale)
  assert.equal(Number(image.getAttribute('x')), box.cx + layer.placement.u * box.scale - layer.placement.width * box.scale / 2)
  assert.match(image.getAttribute('transform'), /^rotate\(-15 /)
  assert.match(image.parentNode.getAttribute('clip-path'), /area-left/)
  assert.equal(JSON.stringify(project), before, 'rendering never mutates the saved design')
})

test('opposite-side text is never mirrored even when the vehicle silhouette is reflected', () => {
  const project = base(), original = project.layers[0]
  const { area, placement } = mirrorPlacement(original.placement, 'left', original.aspect, areasFor(project.model, project.configuration))
  const layer = createVehicleLayer(project, area, original.artwork, { placement, aspect: original.aspect })
  project.layers.push(layer)
  reconcileLayers(project)
  const svg = vehicleFlatSvg(project, { view: 'opposite', artworks: images(project) })
  const doc = parse(svg), image = elements(doc, 'image').find((element) => element.getAttribute('data-layer-id') === layer.id)
  assert.ok(image)
  assert.doesNotMatch(image.getAttribute('transform'), /scale/)
  assert.match(image.getAttribute('transform'), /^rotate\(15 /)
  assert.equal(elements(doc, 'image').filter((element) => element.hasAttribute('data-layer-id')).length, 1)
})

test('hidden and unplaced layers remain saved and do not appear in the flat preview', () => {
  const project = base()
  const canopy = createVehicleLayer(project, 'left-body', project.artwork)
  project.layers.push(canopy)
  project.configuration.cover = 'open'
  reconcileLayers(project)
  project.layers[0].visible = false
  const before = copyProject(project)
  const svg = vehicleFlatSvg(project, { artworks: images(project) })
  assert.equal(elements(parse(svg), 'image').length, 0)
  assert.equal(project.layers.length, 2)
  assert.equal(canopy.unplaced, true)
  assert.deepEqual(project, before)
  project.configuration.cover = 'raised'
  reconcileLayers(project)
  const restored = vehicleFlatSvg(project, { artworks: images(project) })
  assert.match(restored, new RegExp(`data-layer-id="${canopy.id}"`))
})

test('overlap order follows the global layer order even across overlapping rear surfaces', () => {
  const project = base()
  project.layers = []
  const canopy = createVehicleLayer(project, 'canopy-rear', project.artwork)
  project.layers.push(canopy)
  const rear = createVehicleLayer(project, 'rear', project.artwork)
  project.layers.push(rear)
  reconcileLayers(project)
  const doc = parse(vehicleFlatSvg(project, { view: 'rear', artworks: images(project) }))
  const ids = elements(doc, 'image').map((element) => element.getAttribute('data-layer-id'))
  assert.deepEqual(ids, [canopy.id, rear.id])
})

test('configurations alter actual diagram components, independent finish and permitted surfaces', () => {
  const project = base()
  project.configuration = { cover: 'cab-high', sides: 'windows', rack: true, canopyPaint: '#445566' }
  reconcileLayers(project)
  const svg = vehicleFlatSvg(project)
  assert.match(svg, /data-component="canopy"/)
  assert.match(svg, /data-component="rack"/)
  assert.match(svg, /fill="#445566"/)
  assert.match(svg, /Side windows/)
  assert.ok(flatAreaBox(project, 'left-body').height < 20, 'windowed surface narrows to the safe lower strip')
  project.configuration.cover = 'open'
  reconcileLayers(project)
  assert.equal(flatAreaBox(project, 'left-body'), null)
  assert.doesNotMatch(vehicleFlatSvg(project), /data-component="canopy"/)
})

test('wraps use the body silhouette clip and guides disappear from exported layouts', () => {
  const project = base()
  project.wrap.coverage = 'full'
  const svg = vehicleFlatSvg(project, { artworks: images(project), wrapImage: { url, aspect: 3 }, guides: false })
  const doc = parse(svg), wrap = elements(doc, 'image').find((element) => element.hasAttribute('data-wrap'))
  assert.ok(wrap)
  assert.match(wrap.parentNode.parentNode.getAttribute('clip-path'), /body/)
  assert.equal(elements(doc, 'rect').filter((element) => element.hasAttribute('data-area')).length, 0)
  assert.doesNotMatch(svg, /stroke-dasharray/)
  assert.match(svg, /6\.77 m display length/)
})

test('remote and executable artwork URLs are not inserted into a flat SVG', () => {
  const project = base(), layer = project.layers[0]
  for (const source of ['https://example.com/image.svg', 'javascript:alert(1)', 'data:text/html,<script>bad()</script>']) {
    const doc = parse(vehicleFlatSvg(project, { artworks: { [layer.id]: { url: source, aspect: 3 } } }))
    assert.equal(elements(doc, 'image').length, 0)
  }
})
