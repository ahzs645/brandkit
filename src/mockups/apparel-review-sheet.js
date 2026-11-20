// Review composition only. Every garment pixel must come from the imported mesh
// renderer; there are no hand-drawn shirt silhouettes or substitute 2D assets.
import { APPAREL_ASSET, APPAREL_PRODUCTS, APPAREL_METHODS, apparelAreas, apparelLayerStatus } from './apparel-layout.js'
const escape = (value) => String(value).replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[char]))
const number = (value) => Number(value.toFixed(2))
export const apparelReviewSvg = (project, { brandName = '', views } = {}) => {
  if (!views?.front?.startsWith('data:image/png;base64,') || !views?.back?.startsWith('data:image/png;base64,')) throw new Error('The review sheet needs front and back renders of the imported garment.')
  const layers = project.layers.filter((layer) => layer.visible)
  const height = 650 + Math.max(1, Math.ceil(layers.length / 2)) * 58 + 95
  const rows = layers.map((layer, i) => {
    const x = 42 + (i % 2) * 580, y = 650 + Math.floor(i / 2) * 58
    const valid = apparelLayerStatus(project, layer).placed
    return `<text x="${x}" y="${y}" font-size="15" font-weight="600">${escape(layer.name)} · ${escape(apparelAreas()[layer.area].label)}</text><text x="${x}" y="${y + 23}" font-size="13" fill="${valid ? '#65717e' : '#9a5621'}">${number(layer.widthMm)} × ${number(layer.widthMm / layer.aspect)} mm · ${escape(APPAREL_METHODS[layer.method])}${valid ? '' : ' · needs placement'}</text>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}" role="img" aria-label="Orthographic front and back views of the imported garment"><rect width="1200" height="${height}" fill="#f4f3ef"/><g font-family="Arial, sans-serif" fill="#21364b"><text x="42" y="46" font-size="25" font-weight="700">${escape(brandName)} · ${escape(APPAREL_PRODUCTS[project.product].label)}</text><text x="42" y="75" font-size="14" fill="#65717e">Preview size ${escape(project.size)} · ${project.colour.toUpperCase()} · Orthographic renders of the same 3D model</text><image href="${views.front}" x="25" y="115" width="560" height="460"/><image href="${views.back}" x="615" y="115" width="560" height="460"/><text x="305" y="601" text-anchor="middle" font-size="14" font-weight="700">FRONT</text><text x="895" y="601" text-anchor="middle" font-size="14" font-weight="700">BACK</text><path d="M42 625H1158" stroke="#d4dce0"/>${rows}<text x="42" y="${height - 51}" font-size="12" fill="#65717e">Imported garment: ${escape(APPAREL_ASSET.author)} · ${escape(APPAREL_ASSET.license)} · ${escape(APPAREL_ASSET.id)}</text><text x="42" y="${height - 29}" font-size="12" fill="#65717e">Artwork dimensions use the reference mesh scale. Preview sizes are illustrative, not supplier grading or a production pattern.</text></g></svg>`
}
