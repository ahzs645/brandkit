// Portable SVG support for printer packages. No browser globals are required.
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'
import { code128, code39, ean13, qrcode, rationalizedCodabar, drawingSVG } from 'bwip-js/generic'
const barcodeEncoders = { code128, code39, ean13, qrcode, codabar: rationalizedCodabar }

export const SVG_NS = 'http://www.w3.org/2000/svg'
export const parseSvg = (svg) => {
  if (/<!DOCTYPE|<!ENTITY/i.test(svg)) throw new Error('SVG document types and entities are not supported.')
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  if (doc.documentElement?.localName !== 'svg') throw new Error('The package artwork is not SVG.')
  return doc
}
export const serializeSvg = (doc) => new XMLSerializer().serializeToString(doc)
export const nodes = (root, name) => Array.from(root.getElementsByTagName(name))
const tags = new Set('svg g defs style title desc metadata path rect circle ellipse line polyline polygon text tspan textPath image use symbol pattern clipPath mask linearGradient radialGradient stop filter feGaussianBlur feOffset feBlend feColorMatrix feFlood feComposite feMerge feMergeNode'.toLowerCase().split(' '))
const safeReference = (value) => /^#[\w:.-]+$/.test(value) || /^data:image\/(png|jpe?g|gif|webp);base64,[a-z\d+/=\s]+$/i.test(value)

/** Keep vector artwork, local references and embedded bitmap images; discard executable content. */
export const sanitizeSvg = (svg) => {
  const doc = parseSvg(svg)
  for (const node of nodes(doc, '*')) {
    if (!tags.has(node.localName.toLowerCase())) { node.parentNode?.removeChild(node); continue }
    for (const attr of Array.from(node.attributes)) {
      if (/^on/i.test(attr.name) || ['href', 'xlink:href'].includes(attr.name) && !safeReference(attr.value)) node.removeAttribute(attr.name)
      else if ((attr.name === 'style' || /url\s*\(/i.test(attr.value)) && !safeCss(attr.value)) node.removeAttribute(attr.name)
    }
    if (node.localName === 'style' && !safeCss(node.textContent)) node.parentNode?.removeChild(node)
  }
  return serializeSvg(doc)
}
const safeCss = (value) => !/[@\\]|expression\s*\(|javascript\s*:/i.test(value)
  && [...value.matchAll(/url\s*\(([^)]*)\)/gi)].every((match) => /^['"]?#[\w:.-]+['"]?$/.test(match[1].trim()))

export const svgSize = (svg) => {
  const root = parseSvg(svg).documentElement
  const box = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number)
  const width = box.length === 4 ? box[2] : parseFloat(root.getAttribute('width'))
  const height = box.length === 4 ? box[3] : parseFloat(root.getAttribute('height'))
  if (!(width > 0 && height > 0)) throw new Error('SVG artwork needs positive dimensions or a viewBox.')
  return { width, height, viewBox: box.length === 4 ? box : [0, 0, width, height], physical: [root.getAttribute('width') || `${width}px`, root.getAttribute('height') || `${height}px`] }
}

const cssProperties = (text) => Object.fromEntries(text.split(';').map((entry) => entry.split(/:(.*)/s).slice(0, 2).map((part) => part.trim())).filter(([key, value]) => key && value))
export const svgStyle = (node, doc) => {
  const style = node.parentNode?.nodeType === 1 ? svgStyle(node.parentNode, doc) : {}
  for (const name of ['font-family', 'font-weight', 'font-size', 'font-style', 'fill', 'letter-spacing', 'text-anchor']) {
    if (node.hasAttribute(name)) style[name] = node.getAttribute(name)
  }
  const classes = (node.getAttribute('class') || '').split(/\s+/)
  for (const sheet of nodes(doc, 'style')) for (const rule of sheet.textContent.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (rule[1].split(',').some((selector) => classes.some((name) => name && selector.trim() === `.${name}`) || selector.trim() === `#${node.getAttribute('id')}`)) Object.assign(style, cssProperties(rule[2]))
  }
  return Object.assign(style, cssProperties(node.getAttribute('style') || ''))
}
const familyName = (name = '') => name.split(',')[0].trim().replace(/^['"]|['"]$/g, '')
const fontKey = (brand, family, weight) => Object.entries(brand.fonts ?? {}).filter(([, face]) => face.family === familyName(family)).sort((a, b) => Math.abs((a[1].weight ?? 400) - weight) - Math.abs((b[1].weight ?? 400) - weight))[0]?.[0]
const wrap = (value, width, measure) => String(value).split(/\r?\n/).flatMap((paragraph) => {
  const lines = []; let line = ''
  for (const word of paragraph.split(/\s+/).filter(Boolean)) {
    const trial = line ? `${line} ${word}` : word
    if (line && measure(trial) > width) { lines.push(line); line = word } else line = trial
  }
  return [...lines, line]
})

/** Draw imported text, images and vector barcodes while keeping the original SVG geometry. */
export const renderPrinterSvg = (ctx, template) => {
  const doc = parseSvg(template.svg)
  const spec = template.printer
  for (const field of spec.fields ?? []) {
    const target = doc.getElementById(field.sourceId ?? field.id)
    if (!target) continue
    const key = spec.fieldKeys?.[field.id] ?? field.id
    const value = ctx.values?.[key] ?? spec.sampleData?.[field.id] ?? field.defaultValue
    if (value == null) continue
    if (field.type === 'image') {
      const image = target.localName === 'image' ? target : nodes(target, 'image')[0]
      const src = typeof value === 'string' ? value : value.src
      if (image && safeReference(src)) {
        image.setAttribute('href', src); image.removeAttribute('xlink:href')
        image.setAttribute('preserveAspectRatio', value.fit === 'contain' ? 'xMidYMid meet' : value.fit === 'fill' ? 'none' : 'xMidYMid slice')
        if (typeof value === 'object' && (value.scale != null || value.offsetX != null || value.offsetY != null)) {
          const x = Number(image.getAttribute('x')) || 0, y = Number(image.getAttribute('y')) || 0
          const width = Number(image.getAttribute('width')), height = Number(image.getAttribute('height'))
          const scale = Number.isFinite(value.scale) ? Math.max(0.1, Math.min(10, value.scale)) : 1
          const offsetX = Number.isFinite(value.offsetX) ? value.offsetX : 0, offsetY = Number.isFinite(value.offsetY) ? value.offsetY : 0
          const group = doc.createElementNS(SVG_NS, 'g')
          if (image.hasAttribute('transform')) { group.setAttribute('transform', image.getAttribute('transform')); image.removeAttribute('transform') }
          const defs = doc.createElementNS(SVG_NS, 'defs')
          const clip = doc.createElementNS(SVG_NS, 'clipPath')
          const rect = doc.createElementNS(SVG_NS, 'rect')
          let clipId = `printer-photo-${field.id.replace(/[^a-z0-9-]/gi, '-')}`
          while (doc.getElementById(clipId)) clipId += '-1'
          clip.setAttribute('id', clipId)
          for (const [name, amount] of Object.entries({ x, y, width, height })) rect.setAttribute(name, String(amount))
          clip.appendChild(rect); defs.appendChild(clip); group.appendChild(defs)
          const clipped = doc.createElementNS(SVG_NS, 'g'); clipped.setAttribute('clip-path', `url(#${clipId})`)
          image.parentNode.replaceChild(group, image); clipped.appendChild(image); group.appendChild(clipped)
          for (const [name, amount] of Object.entries({ x: x + offsetX * width - width * (scale - 1) / 2, y: y + offsetY * height - height * (scale - 1) / 2, width: width * scale, height: height * scale })) image.setAttribute(name, String(amount))
        }
      }
      continue
    }
    const style = svgStyle(target, doc)
    const first = nodes(target, 'tspan')[0]
    const x = target.getAttribute('x') || first?.getAttribute('x') || '0'
    const y = target.getAttribute('y') || first?.getAttribute('y') || '0'
    const size = field.fontSize ?? (parseFloat(style['font-size']) || 16)
    const font = fontKey(ctx.brand, field.fontFamily ?? style['font-family'], field.fontWeight ?? (Number(style['font-weight']) || 400))
    if (field.type === 'barcode') {
      const symbology = field.barcodeSymbology ?? 'code128'
      let text = String(value)
      if (symbology === 'codabar' && !/^[A-D].*[A-D]$/i.test(text)) text = `A${text}B`
      if (!text) { target.parentNode.removeChild(target); continue }
      const encode = barcodeEncoders[symbology]
      if (!encode) throw new Error(`Unsupported barcode type: ${symbology}`)
      const drawn = parseSvg(encode({ text, scale: 2, height: 12, includetext: false }, drawingSVG())).documentElement
      const width = field.width ? template.width * field.width / 100 : field.wrapWidth ?? 70
      const height = field.height ? template.height * field.height / 100 : size
      drawn.setAttribute('x', x); drawn.setAttribute('y', String(Number(y) - height)); drawn.setAttribute('width', String(width)); drawn.setAttribute('height', String(height))
      if (target.hasAttribute('transform')) drawn.setAttribute('transform', target.getAttribute('transform'))
      target.parentNode.replaceChild(doc.importNode(drawn, true), target)
      continue
    }
    const lines = wrap(value, field.wrapWidth ?? Infinity, (text) => ctx.fonts?.width(text, font, size) || text.length * size * 0.55).slice(0, field.maxLines ?? Infinity)
    while (target.firstChild) target.removeChild(target.firstChild)
    const properties = { ...style, 'font-family': field.fontFamily ?? style['font-family'], 'font-size': `${size}px`, 'font-weight': field.fontWeight ?? style['font-weight'], fill: field.color ?? style.fill,
      ...(field.align && { 'text-anchor': ({ left: 'start', center: 'middle', right: 'end' })[field.align] }),
      ...(field.letterSpacing != null && { 'letter-spacing': `${field.letterSpacing}px` }) }
    target.removeAttribute('class')
    target.setAttribute('style', Object.entries(properties).filter(([, v]) => v != null).map(([k, v]) => `${k}:${v}`).join(';'))
    lines.forEach((line, index) => {
      const span = doc.createElementNS(SVG_NS, 'tspan')
      span.setAttribute('x', x); span.setAttribute('y', String(Number(y) + index * (field.lineHeight || size * 1.2)))
      span.appendChild(doc.createTextNode(line)); target.appendChild(span)
    })
  }
  if (ctx.outline && ctx.fonts) for (const text of nodes(doc, 'text')) {
    const style = svgStyle(text, doc)
    const size = parseFloat(style['font-size']) || 16
    const key = fontKey(ctx.brand, style['font-family'], Number(style['font-weight']) || 400)
    if (!key || !ctx.fonts.has(key)) continue
    const group = doc.createElementNS(SVG_NS, 'g')
    for (const name of ['id', 'transform', 'opacity', 'clip-path']) if (text.hasAttribute(name)) group.setAttribute(name, text.getAttribute(name))
    const spans = nodes(text, 'tspan')
    let x = Number(text.getAttribute('x')) || 0, y = Number(text.getAttribute('y')) || 0
    for (const span of spans.length ? spans : [text]) {
      x = span.hasAttribute('x') ? Number(span.getAttribute('x')) : x
      y = span.hasAttribute('y') ? Number(span.getAttribute('y')) : y
      x += Number(span.getAttribute('dx')) || 0; y += Number(span.getAttribute('dy')) || 0
      const path = doc.createElementNS(SVG_NS, 'path')
      const tracking = (parseFloat(style['letter-spacing']) || 0) / size
      path.setAttribute('d', ctx.fonts.path(span.textContent, key, size, x, y, tracking, style['text-anchor'] || 'start'))
      path.setAttribute('fill', style.fill || '#000000'); group.appendChild(path)
      x += ctx.fonts.width(span.textContent, key, size, tracking)
    }
    text.parentNode.replaceChild(group, text)
  }
  const size = svgSize(template.svg)
  const physical = template.physical ?? size.physical
  doc.documentElement.setAttribute('width', physical[0]); doc.documentElement.setAttribute('height', physical[1])
  return { svg: sanitizeSvg(serializeSvg(doc)), width: template.width, height: template.height, unit: template.unit ?? 'px', physical }
}
