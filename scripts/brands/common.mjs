// Shared helpers for the scripts that write the BC example brands' brand.json files.
//
// The brands are written by script rather than by hand because nearly every number in them is
// arithmetic from a manual's measurement: "4 in from the right trim", "two cap-heights below the
// signature's baseline". Keeping the arithmetic here keeps each figure's source next to it.

import { readFileSync, writeFileSync } from 'node:fs'
import { GUIDE_BOOKS } from '../../manuals/bc/books.js'

export const MM_PER_IN = 25.4
export const MM_PER_PT = 25.4 / 72
/** Inches to millimetres, to 3 places. */
export const inch = (value) => Math.round(value * MM_PER_IN * 1000) / 1000
/** Points to millimetres, to 3 places. */
export const pt = (value) => Math.round(value * MM_PER_PT * 1000) / 1000
export const round = (value, places = 3) => Math.round(value * 10 ** places) / 10 ** places

export const readJson = (url) => JSON.parse(readFileSync(url, 'utf8'))
/** Keeps the app's brand menu and page index (brands/index.json) in step with a brand. */
export const updateManifest = (brand) => {
  const manifestUrl = new URL('../../brands/index.json', import.meta.url)
  const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8')).filter((entry) => entry.id !== brand.id)
  manifest.push({ id: brand.id, name: brand.name, ...(brand.manuals ? { pages: pageIndex(brand) } : {}) })
  manifest.sort((a, b) => a.id.localeCompare(b.id))
  writeFileSync(manifestUrl, `${JSON.stringify(manifest, null, 2)}\n`)
}

export const writeBrand = (url, brand) => {
  writeFileSync(url, `${JSON.stringify(brand, null, 1)}\n`)
  updateManifest(brand)
  console.log(`${new URL(url).pathname.split('/brands/')[1]}: ${brand.templates.length} templates, ${brand.signatures.length} signatures, ${brand.guide.pages.length} guide pages`)
}

// --- Sources: which manual pages each template, signature and guide page is built from.

const PAGES = new Map(GUIDE_BOOKS.flatMap((book) => book.pages.map((page) => [page.id, { book, page }])))

/** `R08` → `{ book: 'reproduction', page: 'R08', manual: 'Reproduction Manual', title: 'General Use stationery', printed: '7' }`. */
export const source = (id) => {
  const found = PAGES.get(id)
  if (!found) throw new Error(`No manual page ${id}`)
  return { book: found.book.id, page: id, manual: found.book.title, title: found.page.title, ...(found.page.printed ? { printed: found.page.printed } : {}) }
}

/**
 * Gives every template, signature and guide page its `sources`, from page ids:
 * `{ templates: { id: ['R08', 'G12'] }, signatures: { id: [...] }, guide: [[...], ...] }`.
 * Throws when anything is left without a source or a source names something that is not there,
 * so the citations cannot fall behind the brand.
 */
export const cite = (brand, { pack, templates, signatures, guide }) => {
  const missing = []
  const apply = (items, map, kind) => {
    for (const item of items) {
      if (!map[item.id]) missing.push(`${kind} ${item.id}`)
      else item.sources = map[item.id].map(source)
    }
    for (const id of Object.keys(map)) if (!items.some((item) => item.id === id)) missing.push(`${kind} ${id} (cited, but there is no such ${kind})`)
  }
  apply(brand.templates, templates, 'template')
  apply(brand.signatures, signatures, 'signature')
  if (guide.length !== brand.guide.pages.length) missing.push(`guide: ${guide.length} entries for ${brand.guide.pages.length} pages`)
  brand.guide.pages.forEach((page, index) => { if (guide[index]) page.sources = guide[index].map(source) })
  if (missing.length) throw new Error(`Sources: ${missing.join('; ')}`)
  brand.manuals = { pack, books: [...new Set([...brand.templates, ...brand.signatures, ...brand.guide.pages].flatMap((item) => item.sources.map((entry) => entry.book)))] }
}

/** The manifest's reverse index: for each manual page, what in this brand is built from it. */
const pageIndex = (brand) => {
  const index = {}
  const add = (kind, id, label, sources) => {
    for (const entry of sources ?? []) (index[`${entry.book}/${entry.page}`] ??= []).push([kind, id, label])
  }
  for (const template of brand.templates) add('template', template.id, template.label, template.sources)
  for (const signature of brand.signatures ?? []) add('signature', signature.id, signature.label, signature.sources)
  brand.guide?.pages?.forEach((page, index) => add('guide', `guide-${String(index + 1).padStart(2, '0')}`, page.name ?? page.title, page.sources))
  return index
}

/** A text element in a template. */
export const text = (id, value, x, y, size, extra = {}) => ({ type: 'text', id, text: value, x, y, size, ...extra })
export const locked = (value, x, y, size, extra = {}) => ({ type: 'text', text: value, x, y, size, locked: true, ...extra })
export const line = (x1, y1, x2, y2, width, extra = {}) => ({ type: 'line', x1, y1, x2, y2, strokeWidth: width, stroke: 'ink', ...extra })
export const box = (x, y, width, height, extra = {}) => ({ type: 'rect', x, y, width, height, fill: 'none', stroke: 'ink', strokeWidth: '0.5pt', ...extra })

// Guide page elements.
export const g = {
  label: (value, x, y, colour) => ({ type: 'label', text: value, x, y, ...(colour ? { colour } : {}) }),
  text: (value, x, y, size, extra = {}) => ({ type: 'text', text: value, x, y, size, ...extra }),
  para: (value, x, y, width, size, extra = {}) => ({ type: 'para', text: value, x, y, width, size, ...extra }),
  rect: (x, y, width, height, fill, stroke) => ({ type: 'rect', x, y, width, height, fill, ...(stroke ? { stroke } : {}) }),
  logo: (x, y, width, extra = {}) => ({ type: 'logo', x, y, width, ...extra }),
  nested: (src, x, y, width, height) => ({ type: 'nested', src, x, y, width, height }),
  rule: (y) => ({ type: 'rule', y })
}

/**
 * Fits nested templates into a row of cells on a guide page, keeping each one's proportions and
 * aligning them along a common top edge.
 */
export const shelf = (items, { x = 64, y, width = 1312, height, gap = 32, labelGap = 26 }) => {
  // The gaps keep their size; only the pieces shrink to fit the row.
  const gaps = gap * (items.length - 1)
  const scale = Math.min(1, (width - gaps) / items.reduce((sum, item) => sum + item.ratio * height, 0))
  let cursor = x
  return items.flatMap((item) => {
    const w = item.ratio * height * scale
    const h = height * scale
    const out = [
      ...(item.frame ? [g.rect(cursor, y, w, h, 'reverse', 'line')] : []),
      g.nested(item.src, round(cursor, 1), y, round(w, 1), round(h, 1)),
      g.label(item.label, round(cursor, 1), round(y + h + labelGap, 1))
    ]
    cursor += w + gap
    return out
  })
}

// TeX Gyre Heros, standing in for Helvetica in the Province's brand, measured: capitals 0.729 em.
export const HEROS_CAP = 0.729
/** The baseline of `points` type whose capitals hang from `hang` mm (the manuals' "hang line"). */
export const hung = (hang, points, cap = HEROS_CAP) => round(hang + cap * pt(points), 2)
