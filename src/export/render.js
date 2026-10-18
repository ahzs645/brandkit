// Turning SVG into the other formats a kit ships, in the browser: PNG through a canvas, PDF
// through jsPDF and svg2pdf, a favicon .ico packed by hand, and the whole kit as a zip.
//
// Nothing here talks to a server. jsPDF and svg2pdf are loaded the first time a PDF is asked for.

const viewBoxOf = (svg) => {
  const match = /viewBox="\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*"/.exec(svg)
  return match ? { width: Number(match[1]), height: Number(match[2]) } : { width: 1, height: 1 }
}

const loadImage = (svg) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  const image = new Image()
  image.onload = () => { URL.revokeObjectURL(url); resolve(image) }
  image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('The browser could not draw this SVG.')) }
  image.src = url
})

/**
 * Rasterises an SVG at `width` pixels (height follows its viewBox). Text must already be
 * outlined: an SVG drawn as an image cannot see the page's web fonts.
 */
export const rasterise = async (svg, width, { type = 'image/png', background, quality } = {}) => {
  const { width: vw, height: vh } = viewBoxOf(svg)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(width * vh / vw))
  const context = canvas.getContext('2d')
  if (background || type === 'image/jpeg') {
    context.fillStyle = background ?? '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
  }
  // Sizing the SVG's own width/height to the target keeps the vector crisp: drawImage would
  // otherwise rasterise at the intrinsic size and scale the bitmap.
  const sized = svg.replace(/^(<\?xml[^>]*>\s*)?<svg\b([^>]*)>/, (match, xml = '', attributes) => `${xml}<svg${attributes.replace(/\s(width|height)="[^"]*"/g, '')} width="${canvas.width}" height="${canvas.height}">`)
  const image = await loadImage(sized)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality))
  return new Uint8Array(await blob.arrayBuffer())
}

const MM_TO_PT = 72 / 25.4

/**
 * One PDF from a list of pages, `{ svg, width, height, unit: 'pt' | 'mm' }`, each page its own
 * size, vector throughout.
 */
export const pdf = async (pages, { title, author, subject } = {}) => {
  const [{ jsPDF }, { svg2pdf }] = await Promise.all([import('jspdf'), import('svg2pdf.js')])
  let document_ = null
  // svg2pdf reads computed styles, which only exist for elements in the document.
  const holder = document.createElement('div')
  holder.style.cssText = 'position:fixed;left:-100000px;top:0;width:0;height:0;overflow:hidden'
  document.body.appendChild(holder)
  try {
    for (const page of pages) {
      const scale = page.unit === 'mm' ? MM_TO_PT : 1
      const width = page.width * scale
      const height = page.height * scale
      const orientation = width >= height ? 'landscape' : 'portrait'
      if (!document_) document_ = new jsPDF({ unit: 'pt', format: [width, height], orientation, compress: true })
      else document_.addPage([width, height], orientation)
      const element = new DOMParser().parseFromString(page.svg.replace(/^<\?xml[^>]*>\s*/, ''), 'image/svg+xml').documentElement
      holder.replaceChildren(element)
      await svg2pdf(element, document_, { x: 0, y: 0, width, height })
    }
  } finally {
    holder.remove()
  }
  document_.setProperties({ title: title ?? '', author: author ?? '', subject: subject ?? '', creator: 'brandkit' })
  return new Uint8Array(document_.output('arraybuffer'))
}

/** A multi-size .ico holding each size's own PNG, so small sizes keep their own rendering. */
export const ico = (pngs, sizes) => {
  const header = new DataView(new ArrayBuffer(6 + 16 * pngs.length))
  header.setUint16(0, 0, true)
  header.setUint16(2, 1, true)
  header.setUint16(4, pngs.length, true)
  let offset = 6 + 16 * pngs.length
  pngs.forEach((png, index) => {
    const size = sizes[index]
    const at = 6 + 16 * index
    header.setUint8(at, size < 256 ? size : 0)
    header.setUint8(at + 1, size < 256 ? size : 0)
    header.setUint8(at + 2, 0)
    header.setUint8(at + 3, 0)
    header.setUint16(at + 4, 1, true)
    header.setUint16(at + 6, 32, true)
    header.setUint32(at + 8, png.length, true)
    header.setUint32(at + 12, offset, true)
    offset += png.length
  })
  const out = new Uint8Array(offset)
  out.set(new Uint8Array(header.buffer), 0)
  let cursor = 6 + 16 * pngs.length
  for (const png of pngs) { out.set(png, cursor); cursor += png.length }
  return out
}

/** The renderer buildKit() expects. */
export const createBrowserRenderer = () => ({
  png: (svg, width) => rasterise(svg, width),
  pdf: (pages, meta) => pdf(pages, meta),
  ico: (pngs, sizes) => ico(pngs, sizes)
})

/** Zips a Map of path → bytes under one folder. Images and fonts are stored, not recompressed. */
export const zip = async (files, folder) => {
  const { zip: zipAsync } = await import('fflate')
  const tree = {}
  for (const [path, bytes] of files) {
    const stored = /\.(png|jpe?g|webp|woff2?|pdf|ico|zip)$/i.test(path)
    tree[folder ? `${folder}/${path}` : path] = [bytes, { level: stored ? 0 : 6 }]
  }
  return new Promise((resolve, reject) => zipAsync(tree, (error, data) => (error ? reject(error) : resolve(data))))
}

/** Reads a zip into a Map of path → bytes, for opening a kit or a brand folder. */
export const unzip = async (bytes) => {
  const { unzip: unzipAsync } = await import('fflate')
  const data = await new Promise((resolve, reject) => unzipAsync(new Uint8Array(bytes), (error, result) => (error ? reject(error) : resolve(result))))
  return new Map(Object.entries(data).filter(([path]) => !path.endsWith('/') && !path.includes('__MACOSX')))
}

export const MIME = { svg: 'image/svg+xml', png: 'image/png', pdf: 'application/pdf', zip: 'application/zip', json: 'application/json', css: 'text/css', html: 'text/html', tsx: 'text/plain', ico: 'image/x-icon', md: 'text/markdown', txt: 'text/plain' }

/** Hands a file to the browser as a download. */
export const download = (content, name, type) => {
  const blob = content instanceof Blob ? content : new Blob([content], { type: type ?? MIME[name.split('.').pop()] ?? 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
