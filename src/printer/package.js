// The shared interchange format is upstream's documented package, not either app's storage DB.
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { renderTemplate, templateFields, toUnits } from '../engine/templates.js'
import { nodes, parseSvg, sanitizeSvg, serializeSvg, svgSize } from './svg.js'
import { fromBase64, toBase64 } from '../assets.js'
export { fromBase64, toBase64 } from '../assets.js'

export const PACKAGE_FORMAT = 'template-printer-package'
export const MAX_PACKAGE_BYTES = 25 * 1024 * 1024
const slug = (value) => String(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'design'
const pathOk = (path) => typeof path === 'string' && !path.startsWith('/') && !path.includes('\\') && path.split('/').every((part) => part !== '..' && part !== '.')
const json = (value) => strToU8(`${JSON.stringify(value, null, 2)}\n`)

export const readPrinterPackage = (input) => {
  const bytes = new Uint8Array(input)
  if (bytes.byteLength > MAX_PACKAGE_BYTES) throw new Error('Template packages must be 25 MB or smaller.')
  let expanded = 0
  const files = unzipSync(bytes, { filter: (entry) => {
    expanded += entry.originalSize
    if (!pathOk(entry.name) || expanded > 100 * 1024 * 1024) throw new Error('The template package contains an unsafe path or too much expanded data.')
    return true
  } })
  if (!files['manifest.json']) throw new Error('This ZIP does not contain a Template Printer manifest.')
  const manifest = JSON.parse(strFromU8(files['manifest.json']))
  if (manifest.format !== PACKAGE_FORMAT || manifest.version !== 1 || !manifest.sides?.front?.file) throw new Error('Unsupported Template Printer package format.')
  const sides = [manifest.sides.front, manifest.sides.back, ...(manifest.variants ?? []).flatMap((variant) => [variant.front, variant.back])].filter(Boolean)
  for (const side of sides) {
    if (!pathOk(side.file) || !files[side.file]) throw new Error(`Missing package artwork: ${side.file}`)
    svgSize(strFromU8(files[side.file]))
  }
  for (const font of manifest.fonts ?? []) if (!pathOk(font.file) || !files[font.file]) throw new Error(`Missing package font: ${font.file}`)
  return { manifest, files, bytes }
}

/** Import every side/variant, with the complete source archive retained for a lossless return. */
export const importPrinterPackage = (brand, input, { id, embedAssets = true, file, sourceUrl } = {}) => {
  const { manifest, files, bytes } = readPrinterPackage(input)
  const next = structuredClone(brand)
  const packageId = slug(id ?? manifest.name)
  const existingPackage = next.printer?.packages?.find((entry) => entry.id === packageId)
  if (!existingPackage && (next.templates ?? []).some((entry) => entry.id.startsWith(`${packageId}-`))) throw new Error(`A template already uses the ${packageId} name. Import with a different id.`)
  const prefix = `printer/${packageId}`
  const assets = new Map([[file ?? `${prefix}/design.zip`, bytes]])
  const record = { id: packageId, name: manifest.name, file: file ?? `${prefix}/design.zip`, ...(sourceUrl && { sourceUrl }), manifest, templates: {} }
  const imported = []
  next.fonts ??= {}
  for (const [index, font] of (manifest.fonts ?? []).entries()) {
    const path = `${prefix}/fonts/${index}-${slug(font.name)}.${font.file.split('.').pop()}`
    assets.set(path, files[font.file])
    const weight = /bold/i.test(font.name) ? 700 : /medium/i.test(font.name) ? 500 : 400
    next.fonts[`${packageId}-font-${index}`] = { family: font.name, stack: `"${font.name}"`, weight, file: path, web: path, label: font.name }
  }
  const importSide = (side, label, sideName) => {
    if (!side) return null
    if (record.templates[side.file]) return record.templates[side.file]
    const svg = sanitizeSvg(strFromU8(files[side.file]))
    const size = svgSize(svg)
    const templateId = `${packageId}-${slug(sideName)}`
    const fields = side.fields ?? []
    const fieldKeys = Object.fromEntries(fields.map((field) => [field.id, `${packageId}-${field.id}`]))
    const template = {
      id: templateId, label, group: 'Printer designs', width: size.width, height: size.height, physical: size.physical,
      description: `${manifest.name}, imported from a Template Printer package. Original artwork and typography.`,
      elements: [], svg, raster: 1200,
      printer: { packageId, side: sideName, file: side.file, fields, mappings: side.mappings ?? [], fieldKeys, sampleData: manifest.sampleData ?? {}, ...(side.cardArea && { cardArea: side.cardArea }) }
    }
    next.fields ??= {}
    for (const field of fields) {
      const mapping = (side.mappings ?? []).find((entry) => entry.svgLayerId === field.sourceId)?.standardFieldName
      next.fields[fieldKeys[field.id]] = { label: /^fullName/.test(mapping ?? '') ? 'Full name' : /^position/.test(mapping ?? '') ? 'Position' : field.label || field.id, placeholder: String(manifest.sampleData?.[field.id] ?? '') }
    }
    record.templates[side.file] = templateId
    imported.push(template)
    return templateId
  }
  const front = importSide(manifest.sides.front, `${manifest.name} · front`, 'front')
  const back = importSide(manifest.sides.back, `${manifest.name} · back`, 'back')
  for (const variant of manifest.variants ?? []) {
    importSide(variant.front, `${manifest.name} · ${variant.name}`, `${variant.id}-front`)
    importSide(variant.back, `${manifest.name} · ${variant.name} · back`, `${variant.id}-back`)
  }
  const previous = next.printer?.packages?.find((entry) => entry.id === packageId)
  const previousIds = new Set(Object.values(previous?.templates ?? {}))
  next.templates = [...(next.templates ?? []).filter((entry) => !previousIds.has(entry.id)), ...imported]
  next.sets = [...(next.sets ?? []).filter((entry) => entry.id !== packageId), {
    id: packageId, label: manifest.name, group: 'Printer designs',
    variants: imported.map((entry) => ({ template: entry.id, label: entry.label.replace(`${manifest.name} · `, ''), side: entry.printer.side.endsWith('back') ? 'back' : 'front' })),
    printer: { front, ...(back && { back }) }
  }]
  next.printer = { ...next.printer, packages: [...(next.printer?.packages ?? []).filter((entry) => entry.id !== packageId), record] }
  next.files = [...(next.files ?? []).filter((entry) => !assets.has(entry.from ?? entry)), ...assets.keys()]
  if (embedAssets) next.assets = { ...next.assets, ...Object.fromEntries([...assets].map(([path, value]) => [path, toBase64(value)])) }
  return { brand: next, assets, record }
}

const assetBytes = async (brand, path, readAsset) => brand.assets?.[path] ? fromBase64(brand.assets[path]) : new Uint8Array(await readAsset(path))
const nativeSide = (ctx, template, files, path) => {
  const doc = parseSvg(renderTemplate({ ...ctx, outline: false }, template).svg)
  // Give each font role its own family so Regular/Bold/Italic files cannot overwrite one
  // another in upstream's font library, which is keyed by family name.
  for (const node of nodes(doc, 'text')) {
    const family = (node.getAttribute('font-family') || '').split(',')[0].trim().replace(/^['"]|['"]$/g, '')
    const weight = Number(node.getAttribute('font-weight')) || 400
    const style = node.getAttribute('font-style') || 'normal'
    const role = Object.entries(ctx.brand.fonts ?? {}).find(([, font]) => font.family === family && (font.weight ?? 400) === weight && (font.style ?? 'normal') === style)?.[0]
    if (role) node.setAttribute('font-family', `brandkit-${ctx.brand.id}-${role}`)
  }
  const fields = []
  const sampleData = {}
  const declared = templateFields(template, ctx.brand)
  for (const field of declared) {
    let text = doc.getElementById(field.id)
    if (!text) {
      const lines = nodes(doc, 'text').filter((node) => new RegExp(`^${field.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d+$`).test(node.getAttribute('id') || ''))
      if (lines.length) {
        text = lines[0]; text.setAttribute('id', field.id)
        const contents = lines.map((line) => ({ x: line.getAttribute('x'), y: line.getAttribute('y'), text: line.textContent }))
        while (text.firstChild) text.removeChild(text.firstChild)
        for (const line of contents) { const span = doc.createElementNS('http://www.w3.org/2000/svg', 'tspan'); span.setAttribute('x', line.x); span.setAttribute('y', line.y); span.appendChild(doc.createTextNode(line.text)); text.appendChild(span) }
        for (const line of lines.slice(1)) line.parentNode.removeChild(line)
      }
    }
    if (!text) continue
    const family = (text.getAttribute('font-family') || '').split(',')[0].trim().replace(/^['"]|['"]$/g, '')
    const size = Number(text.getAttribute('font-size')) || 16
    const fieldSpec = { id: field.id, sourceId: field.id, label: field.label, type: 'text', x: Number(text.getAttribute('x')) / template.width * 100, y: Number(text.getAttribute('y')) / template.height * 100, fontSize: size, fontFamily: family, fontWeight: Number(text.getAttribute('font-weight')) || 400, color: text.getAttribute('fill') || '#000000', align: ({ middle: 'center', end: 'right' })[text.getAttribute('text-anchor')] || 'left', auto: true }
    const element = template.elements.flatMap((entry) => entry.type === 'flow'
      ? entry.items.map((item) => ({ ...item, type: 'paragraph', width: item.wrap, leading: item.leading ?? item.size }))
      : entry.type === 'lines' ? entry.lines.map((line) => ({ ...entry, ...line, type: 'text' })) : [entry]).find((entry) => entry.id === field.id)
    if (element?.type === 'paragraph') {
      if (element.width) fieldSpec.wrapWidth = toUnits(element.width, template.unit)
      fieldSpec.lineHeight = toUnits(element.leading ?? size * 1.2, template.unit)
    }
    const sample = String(ctx.values?.[field.id] ?? field.placeholder ?? text.textContent)
    fields.push(fieldSpec); sampleData[field.id] = element?.caps ? sample.toUpperCase() : sample
  }
  // Match upstream's auto-extracted ids as well as its source ids, so reopening a saved
  // design keeps the same sample-data keys after it is parsed again.
  const autoIds = nodes(doc, 'text').filter((node) => node.textContent.trim()).map((node, index) => [node.getAttribute('id'), `${(node.getAttribute('id') || `text-field-${index + 1}`).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}_${index + 1}`])
  for (const field of fields) {
    const id = autoIds.find(([source]) => source === field.sourceId)?.[1]
    if (id && id !== field.id) { sampleData[id] = sampleData[field.id]; delete sampleData[field.id]; field.id = id }
  }
  files[path] = strToU8(serializeSvg(doc))
  const trim = template.elements.find((entry) => entry.type === 'printGuides')?.trim
  const ratio = template.unit === 'mm' ? 1 : template.physical?.[0]?.endsWith('mm') ? parseFloat(template.physical[0]) / template.width : 25.4 / 96
  const cardArea = trim && { formatId: 'custom', keepBleed: true, trimBox: { x: trim.x, y: trim.y, width: trim.width, height: trim.height }, trimWidthMm: trim.width * ratio, trimHeightMm: trim.height * ratio }
  return { side: { file: path, name: `${template.id}.svg`, fields, mappings: [], ...(cardArea && { cardArea }) }, sampleData }
}

/** Export native or imported templates as a complete package accepted by standalone Template Printer. */
export const createPrinterPackage = async (ctx, template, { readAsset } = {}) => {
  const { brand } = ctx
  const original = brand.printer?.packages?.find((entry) => entry.id === template.printer?.packageId)
  if (original) {
    const { manifest, files } = readPrinterPackage(await assetBytes(brand, original.file, readAsset))
    manifest.sampleData = { ...manifest.sampleData }
    for (const entry of brand.templates.filter((entry) => entry.printer?.packageId === original.id)) {
      files[entry.printer.file] = strToU8(entry.svg)
      for (const field of entry.printer.fields) {
        const value = ctx.values?.[entry.printer.fieldKeys?.[field.id] ?? field.id]
        if (value !== undefined) manifest.sampleData[field.id] = value
      }
    }
    files['manifest.json'] = json(manifest)
    return { bytes: zipSync(files), manifest }
  }
  const set = brand.sets?.find((entry) => entry.variants.some((variant) => variant.template === template.id))
  const members = (set?.variants ?? [{ template: template.id }]).map((variant) => ({ ...variant, template: brand.templates.find((entry) => entry.id === variant.template) })).filter((entry) => entry.template)
  const backs = members.filter((entry) => entry.side ? entry.side === 'back' : /(?:^|-)back(?:-|$)/.test(entry.template.id))
  const fronts = members.filter((entry) => !backs.includes(entry))
  if (!fronts.length) fronts.push(members[0])
  const files = {}
  const first = nativeSide(ctx, fronts[0].template, files, 'front.svg')
  const back = backs.length && !fronts.includes(backs[0]) ? nativeSide(ctx, backs[0].template, files, 'back.svg') : null
  const manifest = { format: PACKAGE_FORMAT, version: 1, createdAt: new Date().toISOString(), name: `${brand.name} · ${set?.label ?? template.label ?? template.id}`, sides: { front: first.side, ...(back && { back: back.side }) }, fonts: [], sampleData: { ...first.sampleData, ...back?.sampleData } }
  if (fronts.length > 1) manifest.variants = fronts.map((entry, index) => {
    const result = index === 0 ? first : nativeSide(ctx, entry.template, files, `variants/${slug(entry.template.id)}/front.svg`)
    Object.assign(manifest.sampleData, result.sampleData)
    return { id: entry.template.id, name: entry.label ?? entry.template.label ?? entry.template.id, front: result.side, ...(entry.match && { match: entry.match }) }
  })
  const used = new Set([...Object.values(files)].flatMap((bytes) => [...strFromU8(bytes).matchAll(/font-family="([^"]+)"/g)].map((match) => match[1].split(',')[0].trim().replace(/^['"]|['"]$/g, ''))))
  const copied = new Set()
  for (const [key, font] of Object.entries(brand.fonts ?? {})) {
    const alias = `brandkit-${brand.id}-${key}`
    if (!used.has(alias) || copied.has(alias)) continue
    const path = `fonts/${slug(key)}.${font.file.split('.').pop()}`
    try { files[path] = ctx.fonts?.faces?.[key]?.bytes ?? await assetBytes(brand, font.file, readAsset) } catch { (manifest.missingFonts ??= []).push(font.family); continue }
    manifest.fonts.push({ name: alias, file: path, fileName: font.file.split('/').pop(), mimeType: /\.otf$/i.test(path) ? 'font/otf' : 'font/ttf' }); copied.add(alias)
  }
  files['manifest.json'] = json(manifest)
  return { bytes: zipSync(files), manifest }
}
