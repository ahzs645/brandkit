// Physical artwork dimensions are independent of the selected preview scale.
// The only garment is an imported, authored mesh. Sizes are visual scales, not
// supplier grading or measured production specifications.
export const APPAREL_SCHEMA = 'brandkit-apparel-mockup/2'
export const APPAREL_ASSET_ID = 'elvaerwyn-zip-hoodie-2018-v1'
export const APPAREL_ASSET = Object.freeze({
  id: APPAREL_ASSET_ID,
  url: `${import.meta.env?.BASE_URL ?? '/'}models/apparel/elvaerwyn-zip-hoodie.glb`,
  thumbnail: `${import.meta.env?.BASE_URL ?? '/'}models/apparel/elvaerwyn-zip-hoodie.png`,
  author: 'Elvaerwyn', license: 'CC-BY',
  source: 'https://static.makehumancommunity.org/assets/assetpacks/shirts02.html',
  originalSource: 'http://www.makehumancommunity.org/node/1450',
  width: 915.11, height: 625.16, depth: 343.42
})
export const APPAREL_PRODUCTS = Object.freeze({
  'zip-hoodie': Object.freeze({ label: 'Fitted zip hoodie', detail: 'Elvaerwyn · hood down · zip closed', version: 1 })
})
export const APPAREL_SIZES = Object.freeze(Object.fromEntries(
  [['S', 0.96], ['M', 1], ['L', 1.04], ['XL', 1.08], ['XXL', 1.12]].map(([size, scale]) => [size, Object.freeze({ scale, width: APPAREL_ASSET.width * scale, height: APPAREL_ASSET.height * scale })])
))
export const APPAREL_METHODS = Object.freeze({ print: 'Screen print', dtf: 'DTF / DTG', embroidery: 'Embroidery preview', patch: 'Patch preview' })
export const APPAREL_VIEWS = Object.freeze({ angle: 'Perspective', front: 'Front', back: 'Back', left: 'Left sleeve', right: 'Right sleeve' })
const region = (label, surface, x, y, width, height) => Object.freeze({ label, surface, x, y, width, height })
const AREAS = Object.freeze({
  'left-chest': region('Left chest · clear of zip', 'front', 102, 230, 110, 90),
  'right-chest': region('Right chest · clear of zip', 'front', -102, 230, 110, 90),
  back: region('Back · below hood', 'back', 0, 390, 280, 180),
  'left-sleeve': region('Left outer sleeve', 'left-sleeve', 0, 265, 70, 140),
  'right-sleeve': region('Right outer sleeve', 'right-sleeve', 0, 265, 70, 140)
})
export const apparelAreas = () => AREAS
export const apparelLayerId = () => globalThis.crypto?.randomUUID?.() ?? `art-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
const record = (value) => value && typeof value === 'object' && !Array.isArray(value)
const finite = (value) => typeof value === 'number' && Number.isFinite(value)
const text = (value, limit) => typeof value === 'string' && value.length <= limit

export const apparelExtent = (layer) => {
  const radians = layer.rotation * Math.PI / 180
  const cos = Math.abs(Math.cos(radians)), sin = Math.abs(Math.sin(radians))
  const border = layer.method === 'patch' ? 10 * (cos + sin) : 0
  return { width: layer.widthMm * (cos + sin / layer.aspect) + border, height: layer.widthMm * (sin + cos / layer.aspect) + border }
}
export const apparelLayerStatus = (project, layer) => {
  const area = apparelAreas(project.product)[layer.area]
  if (!area) return { placed: false, reason: 'Choose an available decoration area for this artwork.' }
  const bounds = apparelExtent(layer)
  const placed = Math.abs(layer.xMm) + bounds.width / 2 <= area.width / 2 + 0.001 && Math.abs(layer.yMm) + bounds.height / 2 <= area.height / 2 + 0.001
  return { placed, reason: placed ? '' : 'Retained artwork exceeds this model’s preview region. Resize it or choose another area.' }
}
export const fitApparelLayer = (layer, product) => {
  const area = apparelAreas(product)[layer.area]
  if (!area) return { ...layer }
  const angle = ((layer.rotation % 360) + 540) % 360 - 180
  const radians = angle * Math.PI / 180
  const cos = Math.abs(Math.cos(radians)), sin = Math.abs(Math.sin(radians))
  const border = layer.method === 'patch' ? 10 * (cos + sin) : 0
  const maximum = Math.min((area.width - border) / (cos + sin / layer.aspect), (area.height - border) / (sin + cos / layer.aspect))
  const widthMm = Math.max(Math.min(20, maximum), Math.min(layer.widthMm, maximum))
  const extent = apparelExtent({ ...layer, widthMm, rotation: angle })
  const limitX = Math.max(0, (area.width - extent.width) / 2), limitY = Math.max(0, (area.height - extent.height) / 2)
  return { ...layer, widthMm, rotation: angle, xMm: Math.min(limitX, Math.max(-limitX, layer.xMm)), yMm: Math.min(limitY, Math.max(-limitY, layer.yMm)) }
}
export const createApparelLayer = ({ logo = '', aspect = 3.5, area = 'left-chest', product = 'zip-hoodie', name = 'Brand lockup' } = {}) => fitApparelLayer({
  id: apparelLayerId(), name, logo, area, aspect, widthMm: area.endsWith('chest') ? 80 : area.endsWith('sleeve') ? 55 : 220,
  xMm: 0, yMm: 0, rotation: 0, method: 'print', visible: true, locked: false
}, product)
export const createApparelProject = ({ logo = '', aspect = 3.5 } = {}) => {
  const layer = createApparelLayer({ logo, aspect })
  return { schema: APPAREL_SCHEMA, assetId: APPAREL_ASSET_ID, assetVersion: 1, surfaceVersion: 2, product: 'zip-hoodie', size: 'M', colour: '#162a49', layers: [layer], selectedLayerId: layer.id, view: 'angle', mode: '3d' }
}
export const validateApparelProject = (input, { logos } = {}) => {
  if (record(input) && input.schema === 'brandkit-apparel-mockup/1') throw new Error('This draft uses the retired illustrative garment. Its artwork is preserved in the recovered JSON; it cannot be silently mapped onto the imported hoodie.')
  if (!record(input) || input.schema !== APPAREL_SCHEMA) throw new Error('Choose a clothing mockup saved by Brandkit for the imported garment.')
  if (input.assetId !== APPAREL_ASSET_ID || input.assetVersion !== 1 || input.surfaceVersion !== 2) throw new Error('This clothing asset or placement version is not supported.')
  if (!Object.hasOwn(APPAREL_PRODUCTS, input.product) || !Object.hasOwn(APPAREL_SIZES, input.size)) throw new Error('Unknown garment or preview size.')
  if (typeof input.colour !== 'string' || !/^#[\da-f]{6}$/i.test(input.colour)) throw new Error('Invalid garment colour.')
  if (!Array.isArray(input.layers) || input.layers.length > 24) throw new Error('Use at most 24 artwork layers.')
  const ids = new Set()
  const layers = input.layers.map((layer) => {
    if (!record(layer) || !text(layer.id, 100) || !layer.id || ids.has(layer.id)) throw new Error('Every artwork layer needs a unique ID.')
    ids.add(layer.id)
    if (!text(layer.name, 80) || !text(layer.logo, 200) || !Object.hasOwn(apparelAreas(input.product), layer.area)) throw new Error('Invalid artwork name, reference or area.')
    if (logos && layer.logo && !logos.includes(layer.logo)) throw new Error('This mockup uses artwork that is not in the open brand.')
    if (!finite(layer.aspect) || layer.aspect < 0.1 || layer.aspect > 20 || !finite(layer.widthMm) || layer.widthMm <= 0 || layer.widthMm > 2000) throw new Error('Invalid artwork dimensions.')
    if (!finite(layer.xMm) || !finite(layer.yMm) || Math.abs(layer.xMm) > 2000 || Math.abs(layer.yMm) > 2000 || !finite(layer.rotation) || Math.abs(layer.rotation) > 180) throw new Error('Invalid artwork position.')
    if (!Object.hasOwn(APPAREL_METHODS, layer.method) || typeof layer.visible !== 'boolean' || typeof layer.locked !== 'boolean') throw new Error('Invalid decoration method or layer state.')
    return { id: layer.id, name: layer.name, logo: layer.logo, area: layer.area, aspect: layer.aspect, widthMm: layer.widthMm, xMm: layer.xMm, yMm: layer.yMm, rotation: layer.rotation, method: layer.method, visible: layer.visible, locked: layer.locked }
  })
  const selectedLayerId = input.selectedLayerId === null && !layers.length ? null : input.selectedLayerId
  if (selectedLayerId !== null && !ids.has(selectedLayerId)) throw new Error('The selected artwork layer is missing.')
  if (!Object.hasOwn(APPAREL_VIEWS, input.view) || !['3d', 'flat'].includes(input.mode)) throw new Error('Invalid clothing preview view.')
  return { schema: APPAREL_SCHEMA, assetId: APPAREL_ASSET_ID, assetVersion: 1, surfaceVersion: 2, product: input.product, size: input.size, colour: input.colour.toLowerCase(), layers, selectedLayerId, view: input.mode === 'flat' && input.view === 'angle' ? 'front' : input.view, mode: input.mode }
}
export const apparelPlacement = (project, layer) => {
  const area = apparelAreas(project.product)[layer.area]
  return { surface: area.surface, x: area.x + layer.xMm, y: area.y + layer.yMm, width: layer.widthMm, height: layer.widthMm / layer.aspect, rotation: layer.rotation }
}
export const copyApparelLayer = (layer) => ({ ...layer, id: apparelLayerId(), name: `${layer.name.slice(0, 70)} copy`, locked: false })
