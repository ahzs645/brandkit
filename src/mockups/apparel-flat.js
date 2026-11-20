import { APPAREL_PRODUCTS, APPAREL_SIZES, APPAREL_METHODS, apparelAreas, apparelLayerStatus, apparelPlacement } from './apparel-layout.js'

const escape = (value) => String(value).replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[char]))
const number = (value) => Number(value.toFixed(2))
const dataUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

/** One common scale fits the full sleeve silhouette in each panel, including XXL. */
export const apparelSheetFrame = (sizeId) => {
  const size = APPAREL_SIZES[sizeId]
  const width = 1160, margin = 40, gap = 60, panelWidth = (width - margin * 2 - gap) / 2
  const halfWidthMm = size.width / 2 + 145
  const scale = Math.min(0.62, (panelWidth - 4) / (2 * halfWidthMm))
  const centres = [margin + panelWidth / 2, width - margin - panelWidth / 2]
  return { width, margin, gap, panelWidth, scale, centres, top: 160, halfWidth: halfWidthMm * scale, garmentBottom: 160 + size.height * scale }
}

/** A review sheet, never a supplier pattern: coordinates and artwork are shared with 3D. */
export const apparelFlatSvg = (project, logos, { brandName = '', guides = true } = {}) => {
  const size = APPAREL_SIZES[project.size]
  const areas = apparelAreas(project.product)
  const frame = apparelSheetFrame(project.size)
  const { scale } = frame
  const parts = []
  const image = (layer, width, height, x = 0, y = 0) => {
    const logo = logos.find((entry) => entry.id === layer.logo)
    if (!logo) return ''
    return `<image x="${number(x - width / 2)}" y="${number(y - height / 2)}" width="${number(width)}" height="${number(height)}" href="${escape(dataUrl(logo.make()))}"/>`
  }
  for (const [surface, centre] of [['front', frame.centres[0]], ['back', frame.centres[1]]]) {
    const half = size.width / 2, height = size.height
    const top = frame.top
    const body = `M -95 0 Q 0 ${surface === 'front' ? 130 : 55} 95 0 L ${half - 20} 20 L ${half + 145} 420 L ${half + 70} 455 L ${half - 35} 215 L ${half * 0.91} ${height} L ${-half * 0.91} ${height} L ${-half + 35} 215 L ${-half - 70} 455 L ${-half - 145} 420 L ${-half + 20} 20 Z`
    parts.push(`<text x="${centre}" y="125" text-anchor="middle" font-size="17" font-weight="650" fill="#27394b">${surface === 'front' ? 'FRONT' : 'BACK'}</text>`)
    parts.push(`<g transform="translate(${centre} ${top}) scale(${scale})"><path d="${body}" fill="${project.colour}" stroke="#000000" stroke-opacity=".18" stroke-width="2"/>`)
    parts.push(`<path d="M ${-half * 0.91} ${height - 48} H ${half * 0.91}" stroke="#ffffff" stroke-opacity=".15" stroke-width="2"/>`)
    if (project.product === 'hoodie') {
      if (surface === 'front') parts.push(`<path data-part="pocket" data-top-mm="${height - 260}" d="M -170 ${height - 80} L -178 ${height - 95} L -140 ${height - 245} Q -135 ${height - 260} -120 ${height - 260} H 120 Q 135 ${height - 260} 140 ${height - 245} L 178 ${height - 95} L 170 ${height - 80} Z" fill="#ffffff" fill-opacity=".035" stroke="#ffffff" stroke-opacity=".22" stroke-width="2"/><path d="M -45 65 L -50 190 M 45 65 L 50 190" stroke="#b8b8b8" stroke-width="4"/>`)
      else parts.push('<path d="M -130 20 Q -150 265 0 260 Q 150 265 130 20 Q 0 -45 -130 20Z" fill="#000000" fill-opacity=".12" stroke="#ffffff" stroke-opacity=".15" stroke-width="2"/>')
    }
    if (guides) for (const area of Object.values(areas)) {
      if (area.surface !== surface) continue
      parts.push(`<rect x="${area.x - area.width / 2}" y="${area.y - area.height / 2}" width="${area.width}" height="${area.height}" rx="4" fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-dasharray="7 7" stroke-width="1.4"/>`)
    }
    for (const layer of project.layers) {
      if (!layer.visible || !apparelLayerStatus(project, layer).placed) continue
      const placement = apparelPlacement(project, layer)
      if (placement.surface !== surface) continue
      parts.push(`<g transform="translate(${number(placement.x)} ${number(placement.y)}) rotate(${layer.rotation})">`)
      if (layer.method === 'patch') parts.push(`<rect x="${-placement.width / 2 - 5}" y="${-placement.height / 2 - 5}" width="${placement.width + 10}" height="${placement.height + 10}" rx="5" fill="#f1efdf" stroke="#a8a58f" stroke-dasharray="2 2"/>`)
      parts.push(image(layer, placement.width, placement.height))
      if (guides && layer.id === project.selectedLayerId) parts.push(`<rect x="${-placement.width / 2 - 2}" y="${-placement.height / 2 - 2}" width="${placement.width + 4}" height="${placement.height + 4}" fill="none" stroke="#64cbec" stroke-width="2"/><text x="0" y="${placement.height / 2 + 25}" text-anchor="middle" fill="#ffffff" font-size="16">${number(layer.widthMm)} mm</text>`)
      parts.push('</g>')
    }
    parts.push('</g>')
  }
  const visibleLayers = project.layers.filter((layer) => layer.visible)
  const notesY = Math.ceil(frame.garmentBottom + 62)
  parts.push(`<path d="M 40 ${notesY - 24} H 1120" stroke="#d9dde2"/>`)
  if (!visibleLayers.length) parts.push(`<text x="40" y="${notesY + 12}" font-size="15" fill="#65717e">No visible artwork layers.</text>`)
  visibleLayers.forEach((layer, index) => {
    const row = Math.floor(index / 2), col = index % 2, x = 50 + col * 570, y = notesY + row * 56
    const status = apparelLayerStatus(project, layer)
    if (layer.area.endsWith('sleeve')) {
      parts.push(`<rect x="${x}" y="${y - 14}" width="54" height="38" rx="5" fill="${project.colour}"/>`)
      parts.push(`<g transform="translate(${x + 27} ${y + 4})">${image(layer, 44, 44 / layer.aspect)}</g>`)
    }
    parts.push(`<text x="${x + 67}" y="${y}" font-size="14" font-weight="650" fill="#27394b">${escape(layer.name)} · ${escape(areas[layer.area].label)}</text>`)
    parts.push(`<text x="${x + 67}" y="${y + 21}" font-size="12" fill="${status.placed ? '#65717e' : '#9a5621'}">${number(layer.widthMm)} × ${number(layer.widthMm / layer.aspect)} mm · ${escape(APPAREL_METHODS[layer.method])}${status.placed ? '' : ' · needs placement'}</text>`)
  })
  const height = notesY + Math.max(1, Math.ceil(visibleLayers.length / 2)) * 56 + 65
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1160" height="${height}" viewBox="0 0 1160 ${height}" role="img" aria-label="Garment layout with physical artwork dimensions"><rect width="1160" height="${height}" fill="#f7f6f2"/><g font-family="Arial, sans-serif"><text x="40" y="46" font-size="24" font-weight="700" fill="#1c2e43">${escape(brandName)} · ${escape(APPAREL_PRODUCTS[project.product].label)}</text><text x="40" y="75" font-size="14" fill="#65717e">Size ${escape(project.size)} · ${project.colour.toUpperCase()} · Generic garment preview</text>${parts.join('')}<text x="40" y="${height - 30}" font-size="12" fill="#65717e">Artwork dimensions are physical. Garment fit and decoration regions are illustrative; confirm the blank and placement with your supplier.</text></g></svg>`
}
