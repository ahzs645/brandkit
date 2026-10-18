// Shared helpers for the scripts that write the BC example brands' brand.json files.
//
// The brands are written by script rather than by hand because nearly every number in them is
// arithmetic from a manual's measurement: "4 in from the right trim", "two cap-heights below the
// signature's baseline". Keeping the arithmetic here keeps each figure's source next to it.

import { readFileSync, writeFileSync } from 'node:fs'

export const MM_PER_IN = 25.4
export const MM_PER_PT = 25.4 / 72
/** Inches to millimetres, to 3 places. */
export const inch = (value) => Math.round(value * MM_PER_IN * 1000) / 1000
/** Points to millimetres, to 3 places. */
export const pt = (value) => Math.round(value * MM_PER_PT * 1000) / 1000
export const round = (value, places = 3) => Math.round(value * 10 ** places) / 10 ** places

export const readJson = (url) => JSON.parse(readFileSync(url, 'utf8'))
export const writeBrand = (url, brand) => {
  writeFileSync(url, `${JSON.stringify(brand, null, 1)}\n`)
  // Keep the app's brand menu (brands/index.json) in step.
  const manifestUrl = new URL('../../brands/index.json', import.meta.url)
  const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8')).filter((entry) => entry.id !== brand.id)
  manifest.push({ id: brand.id, name: brand.name })
  manifest.sort((a, b) => a.id.localeCompare(b.id))
  writeFileSync(manifestUrl, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`${new URL(url).pathname.split('/brands/')[1]}: ${brand.templates.length} templates, ${brand.signatures.length} signatures, ${brand.guide.pages.length} guide pages`)
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
  const total = items.reduce((sum, item) => sum + item.ratio * height, 0) + gap * (items.length - 1)
  const scale = Math.min(1, width / total)
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
