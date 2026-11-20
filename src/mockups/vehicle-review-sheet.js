const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character])

/** Self-contained, printable review sheet; all original artwork is already in the four PNGs. */
export const vehicleReviewSheet = ({ brand, model, configuration, project, images }) => {
  const rows = project.layers ?? []
  const width = 1800
  const height = 1490 + rows.length * 39
  const tileWidth = 810
  const tiles = images.map(({ label, dataUrl }, index) => {
    if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(dataUrl)) throw new Error('The review sheet needs a rendered PNG for each view.')
    const x = 66 + (index % 2) * 858
    const y = 220 + Math.floor(index / 2) * 510
    return `<g><rect x="${x}" y="${y}" width="${tileWidth}" height="455" rx="12" fill="#f4f5f6"/><image href="${dataUrl}" x="${x}" y="${y}" width="${tileWidth}" height="455"/><text x="${x}" y="${y + 484}" font-size="22">${escape(label)}</text></g>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/><g font-family="Arial, sans-serif" fill="#162a49"><text x="66" y="72" font-size="21" letter-spacing="3">BRANDKIT · VEHICLE DESIGN REVIEW</text><text x="66" y="128" font-size="42" font-weight="700">${escape(brand)}</text><text x="66" y="172" font-size="24">${escape(model)} · ${escape(configuration)}</text>${tiles}<text x="66" y="1270" font-size="25" font-weight="700">Artwork and placement</text><text x="66" y="1310" font-size="18" fill="#505b66">Generic preview geometry. Confirm vehicle dimensions and templates before production.</text>${rows.map((layer, index) => `<text x="66" y="${1363 + index * 39}" font-size="19">${escape(layer.name)} · ${escape(layer.area)} · ${(layer.placement.width * 1000).toFixed(0)} × ${(layer.placement.width / (layer.aspect || 1) * 1000).toFixed(0)} mm · ${layer.unplaced ? 'Unplaced — retained' : layer.visible ? 'Visible' : 'Hidden'}${layer.locked ? ' · Locked' : ''}</text>`).join('')}<text x="66" y="${height - 38}" font-size="16" fill="#66717c">${escape(project.schema)} · Original brand artwork · Visual approval sheet</text></g></svg>`
}
