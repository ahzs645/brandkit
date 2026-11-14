// Table designs for publications. One declarative look per style, read by both the Word and the
// HTML exporters, so a table looks the same in both. A brand chooses its style once, in
// `documentation.tables.style`; every colour and face comes from its document profile.
//
//   grid    every cell boxed, a filled header row and banded rows (the original look; the default)
//   ruled   one rule under each row and a heavier one under the header, set in small capitals;
//           no boxes, no fills; the first column in the semibold face. Lists as a website sets them.
//   ledger  a specification sheet: heavy rules above and below, the first column set as labels
//   panel   the table on one tinted ground, rows parted by lines of paper
//   accent  a header row in the brand's accent colour over ruled rows

import { officeFont } from '../engine/office.js'
import { TABLE_STYLES } from '../engine/documentation.js'
export { TABLE_STYLES }

const hex = (value) => String(value ?? '').replace('#', '').toUpperCase()
const luminance = (value) => {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex(value).slice(i, i + 2), 16) / 255).map((c) => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

/** A face by brand font key, as Office names it, with the size and spacing to set it at. */
const faceOf = (brand, key, fallback) => {
  const spec = brand?.fonts?.[key] ? key : fallback
  return officeFont(brand, spec, { weight: brand?.fonts?.[spec]?.weight })
}

/**
 * The look of a table in this profile: who is ruled, filled and set in which face. Rules are in
 * points; padding in millimetres. `flush` sets the first column's text on the text's left edge
 * and the last column's on its right, as body text is.
 */
export const tableLook = (profile, brand) => {
  const style = profile.tables?.style ?? 'grid'
  if (!TABLE_STYLES.includes(style)) throw new Error(`Unknown table style: ${style}. Choose ${TABLE_STYLES.join(', ')}.`)
  const c = profile.colours
  const labelSpec = profile.typography.label ?? profile.typography.caption
  const label = { face: officeFont(brand, labelSpec.font, { weight: labelSpec.weight, italic: labelSpec.italic }), sizePt: Math.min(8, labelSpec.sizePt ?? 8), caps: true, trackingEm: Math.max(0.06, labelSpec.trackingEm ?? 0) }
  const strong = { face: faceOf(brand, 'bold', profile.typography.heading2?.font ?? 'body'), colour: c.ink }
  const line = (pt, colour) => ({ pt, colour })
  const looks = {
    grid: {
      header: { fill: c.tableHeader ?? c.ink, colour: c.tableHeaderText ?? c.reverse, bold: true },
      body: { band: c.light, rule: line(0.5, c.line) },
      frame: { outer: line(0.5, c.line), vertical: line(0.5, c.line) },
      padding: { y: 1.8, x: 1.9 }
    },
    ruled: {
      header: { colour: c.muted, ...label, rule: line(1, c.ink) },
      body: { rule: line(0.5, c.line) },
      first: strong,
      padding: { y: 2.3, x: 3, flush: true }
    },
    ledger: {
      header: { colour: c.ink, ...label, rule: line(0.5, c.ink) },
      body: { rule: line(0.5, c.line) },
      first: { colour: c.muted, ...label },
      frame: { top: line(1.5, c.ink), bottom: line(1.5, c.ink) },
      padding: { y: 2.6, x: 3, flush: true }
    },
    panel: (() => {
      // A ground the eye can see on the page: the light role, or the line role where light is
      // all but white.
      const ground = contrast(c.light, c.paper) >= 1.15 ? c.light : c.line
      return {
        header: { fill: ground, colour: c.muted, ...label, rule: line(2, c.paper) },
        body: { fill: ground, rule: line(1.5, c.paper) },
        first: strong,
        padding: { y: 2.6, x: 4 },
        radiusMm: 3,
        ground
      }
    })(),
    accent: {
      header: { fill: c.accent, colour: contrast(c.reverse, c.accent) >= 4.5 ? c.reverse : c.ink, ...label },
      body: { rule: line(0.5, c.line) },
      first: strong,
      frame: { bottom: line(1, c.accent) },
      padding: { y: 2.3, x: 3 }
    }
  }
  return { style, ...looks[style] }
}

/** Faces a table style sets beyond the profile's paragraph styles, for font embedding. */
export const tableFonts = (profile, brand) => {
  const look = tableLook(profile, brand)
  return [look.header?.face, look.first?.face].filter(Boolean).map((face) => ({ ...face, font: face.name, kind: 'field' }))
}

/** The look as CSS for a print view, scoped to `table.t-<style>`. */
export const tableCss = (profile, brand, cssFont) => {
  const look = tableLook(profile, brand)
  const t = `table.t-${look.style}`
  const rule = (r) => r ? `${r.pt}pt solid ${r.colour}` : '0'
  const text = (spec) => [
    spec.face ? `font-family:${cssFont(spec.face.name)},sans-serif;font-weight:${spec.face.bold ? 700 : 400}` : '',
    spec.bold ? 'font-weight:700' : '',
    spec.colour ? `color:${spec.colour}` : '',
    spec.caps ? 'text-transform:uppercase' : '',
    spec.trackingEm ? `letter-spacing:${spec.trackingEm}em` : '',
    spec.sizePt ? `font-size:${spec.sizePt}pt` : ''
  ].filter(Boolean).join(';')
  const p = look.padding
  const out = [
    `${t}{border-collapse:${look.radiusMm ? 'separate' : 'collapse'};border-spacing:0;width:100%;margin:4mm 0;${look.radiusMm ? `border-radius:${look.radiusMm}mm;overflow:hidden;background:${look.ground};` : ''}border-top:${rule(look.frame?.top ?? look.frame?.outer)};border-bottom:${rule(look.frame?.bottom ?? look.frame?.outer)};${look.frame?.outer ? `border-left:${rule(look.frame.outer)};border-right:${rule(look.frame.outer)};` : ''}}`,
    `${t} td,${t} th{padding:${p.y}mm ${p.x}mm;text-align:left;vertical-align:top;border:0;border-bottom:${rule(look.body.rule)};${look.frame?.vertical ? `border-left:${rule(look.frame.vertical)};` : ''}${look.body.fill ? `background:${look.body.fill};` : ''}}`,
    `${t} th{${text(look.header)};${look.header.fill ? `background:${look.header.fill};` : ''}border-bottom:${rule(look.header.rule ?? look.body.rule)}}`,
    `${t} tbody tr:last-child td{border-bottom:${look.frame?.bottom || look.radiusMm ? '0' : rule(look.body.rule)}}`,
    ...(look.body.band ? [`${t} tbody tr:nth-child(even) td{background:${look.body.band}}`] : []),
    ...(look.first ? [`${t} tbody td:first-child{${text(look.first)}}`] : []),
    ...(p.flush ? [`${t} td:first-child,${t} th:first-child{padding-left:0}`, `${t} td:last-child,${t} th:last-child{padding-right:0}`] : []),
    `${t} caption{caption-side:bottom;text-align:left;margin-top:3mm!important}`,
    `${t} thead{display:table-header-group}${t} tr{break-inside:avoid}`
  ]
  return out.join('\n')
}
