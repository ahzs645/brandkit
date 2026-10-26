// A read-only index of existing supporting artwork. Geometry stays in brand.patterns;
// direct references and shared graphic directions are deliberately different relationships.
import { fill } from './brand.js'
import { humanize, slugify } from './format.js'

const unique = (values) => [...new Set(values.filter(Boolean))]
const copy = (brand, value) => value == null ? '' : fill(brand, String(value))
const familyOf = (pattern) => pattern.name?.includes(' / ') ? pattern.name.split(' / ')[0].trim() : null
const pathOf = (value) => typeof value === 'string' && value && !/^(?:[a-z]+:|\/)/i.test(value) && !value.split('/').includes('..') ? value.replace(/^\.\//, '') : null
const pageReferences = (page) => (page.elements ?? []).map((element) => element.src).filter((src) => typeof src === 'string')
const guidePages = (brand) => [...(brand.guide?.pages ?? []), ...(brand.guide?.sheets ?? [])]
const guideNotes = (brand, pages) => unique(pages.flatMap((page) => [page.subtitle, ...(page.elements ?? []).filter((element) => ['para', 'paragraph'].includes(element.type)).map((element) => element.text)]).map((text) => copy(brand, text)))

const groupFor = (brand, spec, collectionIds) => {
  if (collectionIds.has(spec.id)) return { id: 'collection', label: brand.patternCollection.status ?? 'Supporting studies', status: brand.patternCollection.status ?? 'Supporting studies' }
  const family = familyOf(spec)
  if (family) return { id: `family-${slugify(family)}`, label: family, status: 'Kit supporting graphics', family }
  if (spec.extension) return { id: `extension-${slugify(spec.extension)}`, label: `${spec.extension} patterns`, status: spec.extension }
  return { id: 'base', label: 'Kit patterns', status: 'Existing kit pattern' }
}

const kindFor = (spec) => {
  if (spec.kind) return { kind: spec.kind, kindLabel: ({ tile: 'Repeating tile', focal: 'Focal composition' })[spec.kind] ?? humanize(spec.kind) }
  if (spec.repeat) return { kind: 'repeat', kindLabel: 'Symbol repeat' }
  // Some older definitions describe a focal composition in their copy, without a kind field.
  if (/\bfocal composition\b/i.test(spec.description ?? '')) return { kind: 'focal', kindLabel: 'Focal composition' }
  if (spec.lines?.length && !spec.place?.length && !spec.dots?.length) return { kind: 'lines', kindLabel: 'Line composition' }
  if (spec.dots?.length && !spec.place?.length && !spec.lines?.length) return { kind: 'dots', kindLabel: 'Dot field' }
  return { kind: 'composition', kindLabel: 'Composition' }
}

const motifsFor = (brand, spec) => {
  const used = new Map()
  const add = (id, reason) => {
    // Match artwork.pattern: an absent/unresolved placement symbol falls back to brand.symbol.
    const symbolId = id && brand.symbols?.[id] ? id : undefined
    const key = symbolId ? `named:${symbolId}` : 'primary'
    const symbol = symbolId ? brand.symbols[symbolId] : brand.symbol
    if (!symbol) return
    const previous = used.get(key)
    if (previous) { if (!previous.reason.includes(reason)) previous.reason += ` ${reason}`; return }
    used.set(key, {
      kind: 'symbol', id: key, symbolId,
      label: copy(brand, symbol.title ?? symbol.name ?? (symbolId ? humanize(symbolId) : `${brand.name} symbol`)),
      reason, sourceNotes: unique([symbol.construction?.note, symbol.masterDescription].map((value) => copy(brand, value))),
      sources: pathOf(symbol.construction?.source) ? [{ path: pathOf(symbol.construction.source), label: 'Source artwork' }] : []
    })
  }
  // repeat always uses the primary mark; the renderer does not read repeat.symbol.
  if (spec.repeat) add(undefined, 'Repeated as the complete source symbol.')
  for (const id of new Set((spec.place ?? []).map((place) => place.symbol))) add(id, 'Placed in this composition at the supplied scales and rotations.')
  return [...used.values()]
}

const resourceMetadata = (path) => {
  const name = path.split('/').at(-1)
  if (name === 'pattern-explorer.html') return { label: 'Interactive pattern explorer', description: 'Open the existing scale, density and colour controls, with vector and image downloads.', kind: 'explorer' }
  if (name === 'arrow-patterns.html') return { label: 'Arrow and spark explorer', description: 'Explore the existing arrow and spark presets with scale, density and colour controls.', kind: 'explorer' }
  if (name === 'patterns-and-templates.html') return { label: 'Patterns and applications', description: 'Compare the existing graphic directions alongside their editable application layouts.', kind: 'applications' }
  if (name === 'patterns-guide.html') return { label: 'Pattern usage guide', description: 'Read the source guidance for the supporting studies and their applications.', kind: 'guide' }
  if (name === 'patterns-README.md') return { label: 'Pattern source notes', description: 'Read the source record and rebuilding notes for this collection.', kind: 'source' }
  return { label: humanize(name.replace(/\.[^.]+$/, '')), description: 'Existing supporting graphics reference included in this kit.', kind: 'reference' }
}

const resourcesFor = (brand) => {
  const paths = unique([
    brand.patternCollection?.page, brand.patternCollection?.guide,
    ...(brand.files ?? []).map((file) => typeof file === 'string' ? file : file.from ?? file.to)
      .filter((path) => /(?:pattern|arrow|iconograph|supporting-graphic)/i.test(path ?? '') && /\.(?:html?|md)$/i.test(path ?? ''))
  ].map(pathOf))
  return paths.map((path) => ({ id: path, path, ...resourceMetadata(path) }))
}

const belongsToFamily = (template, family) => {
  if (!family) return false
  if (template.group === family || template.label?.startsWith(`${family} / `)) return true
  // SPARK's generators expand artwork into native elements. Their named ground/panel is
  // evidence of the graphic direction, including a Layers card grouped under Business cards.
  const prefix = `${slugify(family)}-`
  return (template.elements ?? []).some((element) => element.type === 'rect' && element.id === `${prefix}ground`)
}

/**
 * patternLibrary(brand) -> { patterns, applications, groups, resources, notes }.
 * `spec`/`template` are the original read-only render inputs, not reconstructed artwork.
 * Each application relationship is `pattern` (explicit element.pattern) or `family`
 * (existing family metadata/expanded artwork). Never infer a service-icon relationship.
 * The primary motif has id:'primary' and symbolId:undefined for symbolDocument().
 * Named motifs have id:'named:<source id>' and retain their exact symbolId.
 */
export const patternLibrary = (brand) => {
  const specs = brand.patterns ?? []
  const ids = specs.map((spec) => spec.id)
  if (ids.some((id) => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) throw new Error('Pattern ids must be present and unique within the brand.')
  const collection = brand.patternCollection
  const collectionIds = new Set(collection?.patterns ?? [])
  const pages = guidePages(brand)
  const resources = resourcesFor(brand)
  const groups = new Map()
  const applications = new Map()
  const patterns = specs.map((spec) => {
    const group = groupFor(brand, spec, collectionIds)
    if (!groups.has(group.id)) groups.set(group.id, { id: group.id, label: group.label, count: 0 })
    groups.get(group.id).count++
    const referencedPages = pages.filter((page) => pageReferences(page).includes(`patterns/${spec.id}`))
    const familyPages = group.family ? pages.filter((page) => page.name === `${group.family} applications`) : []
    const title = copy(brand, spec.title ?? `${brand.name} / ${humanize(spec.id)}`)
    const name = spec.name ?? title.replace(new RegExp(`^${brand.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*/\\s*`), '').replace(/\s*\/\s*supporting study$/i, '')
    const motifList = motifsFor(brand, spec)
    const related = []
    for (const template of brand.templates ?? []) {
      const direct = (template.elements ?? []).filter((element) => element.type === 'pattern' && element.pattern === spec.id)
      const family = belongsToFamily(template, group.family)
      if (!direct.length && !family) continue
      const relationship = direct.length ? 'pattern' : 'family'
      const reason = direct.length ? 'Uses this pattern in the layout.' : `Related application in the ${group.family} direction; its composition is adapted to the layout.`
      const relation = { id: template.id, label: template.label ?? humanize(template.id), reason, relationship, template }
      related.push(relation)
      if (!applications.has(template.id)) applications.set(template.id, { ...relation, patternIds: [], directPatternIds: [], relationships: [] })
      const application = applications.get(template.id)
      application.patternIds.push(spec.id)
      if (direct.length) application.directPatternIds.push(spec.id)
      application.relationships.push({ patternId: spec.id, relationship, reason })
    }
    const sources = [{ path: 'brand.json', label: 'Brand definition' }]
    if (collectionIds.has(spec.id)) sources.push(...resources.filter((resource) => [collection?.page, collection?.guide].includes(resource.path)).map(({ path, label }) => ({ path, label })))
    else if (group.family) sources.push(...resources.filter((resource) => resource.kind === 'applications' || resource.path.endsWith('/arrow-patterns.html') && group.family === 'Arrows').map(({ path, label }) => ({ path, label })))
    const sourceNotes = unique([
      ...guideNotes(brand, [...referencedPages, ...familyPages]),
      ...(collectionIds.has(spec.id) ? [copy(brand, collection?.description)] : []),
      ...motifList.flatMap((motif) => motif.sourceNotes)
    ])
    const record = { id: spec.id, key: `${brand.id}:${spec.id}`, name, title,
      description: copy(brand, spec.description), ...kindFor(spec), groupId: group.id, groupLabel: group.label, status: group.status,
      width: spec.width, height: spec.height, background: spec.background,
      spec, templateIds: related.map((application) => application.id), applications: related,
      motifs: motifList, sourceNotes, sources,
      techniques: [spec.repeat ? 'Symbol repeat' : null, spec.place?.length ? 'Placed symbols' : null, spec.dots?.length ? 'Circles' : null, spec.lines?.length ? 'Linework' : null].filter(Boolean)
    }
    record.searchText = [record.id, record.name, record.title, record.description, record.groupLabel, record.kindLabel, ...record.techniques, ...record.motifs.map((motif) => motif.label), ...record.applications.map((application) => application.label)].join(' ').toLowerCase()
    return record
  })
  const missing = [...collectionIds].filter((id) => !ids.includes(id))
  return { brandId: brand.id, patterns, applications: [...applications.values()], groups: [...groups.values()], resources,
    notes: unique([copy(brand, brand.status), copy(brand, collection?.description),
      ...(missing.length ? [`The collection lists unavailable patterns: ${missing.join(', ')}.`] : [])]) }
}
