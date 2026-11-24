// Browser-safe bridge. The host supplies rasterizers, so a text-only job needs no browser in Node.
import { createDiagramRegistry, mermaidAdapter } from 'document-kit/diagrams'
import { d3Adapter } from 'document-kit/diagrams/d3'
import { bindDeviceScreens, devicesAdapter } from './devices.js'
import { tableGrid } from 'document-kit'
import { documentProfile } from '../engine/documentation.js'
import { publicationCell, tableLook } from '../export/table-styles.js'
import { compileRecipe, renderRecipe, sharedLibrary } from 'document-kit/recipe'
import { writeDocx } from 'document-kit/docx'
import { consumerProfile } from '../engine/consumer.js'
import { officeFont } from '../engine/office.js'

export const RECIPE_SCHEMA = 'brandkit/recipe/1'

export function diagramConfig(profile) {
  const { colours, typography } = profile
  return {
    startOnLoad: false, securityLevel: 'strict', theme: 'base', htmlLabels: false,
    themeVariables: {
      fontFamily: typography.body.family, fontSize: '16px', primaryColor: colours.paper,
      primaryTextColor: colours.ink, primaryBorderColor: colours.muted, lineColor: colours.muted,
      xyChart: { plotColorPalette: colours.light, backgroundColor: colours.paper }
    },
    flowchart: { htmlLabels: false, useMaxWidth: false, nodeSpacing: 18, rankSpacing: 34, padding: 9, curve: 'linear' },
    xyChart: { width: 880, height: 300, useMaxWidth: false, showDataLabel: true }
  }
}

function brandTheme(ctx, profile) {
  const { colours, typography } = profile
  const display = officeFont(ctx.brand, 'display')
  const heading = { font: display.name, bold: display.bold, color: colours.ink }
  const print = documentProfile(ctx.brand)
  return {
    body: { font: typography.body.family, color: colours.ink, size: 10.5, after: 7, line: 1.15 },
    headings: [{ ...heading, size: 23, before: 0, after: 10 }, { ...heading, size: 13, before: 13, after: 5 }],
    small: { font: typography.label.family, color: colours.muted, size: 8, before: 13 },
    footer: { font: typography.label.family, color: colours.muted, size: 8 },
    table: { size: print.typography.table.sizePt, headerFill: '', headerText: { bold: false }, headerAlign: 'left',
      outerBorder: { style: 'none' }, innerBorder: { style: 'none' } }
  }
}

function applyTableLook(blocks, look, tableType) {
  for (const block of blocks ?? []) {
    if (block.blocks) applyTableLook(block.blocks, look, tableType)
    if (block.type !== 'table') continue
    const grid = tableGrid(block)
    let bodyIndex = 0
    block.line ??= tableType.lineHeight
    for (const [index, row] of block.rows.entries()) {
      const header = row.role === 'header'
      row.cells = grid.rows[index].filter(entry => entry.kind === 'cell').map(({ placed }) => {
        const cell = placed.cell
        const style = publicationCell(look, {
          header, firstRow: index === 0, lastRow: index + placed.rowSpan === block.rows.length,
          firstColumn: placed.column === 0, lastColumn: placed.column + placed.colSpan === grid.columns, bodyIndex
        })
        const spec = style.text
        const text = spec ? {
          ...(spec.face && { font: spec.face.name, bold: spec.face.bold, italic: spec.face.italic }),
          ...(spec.bold && { bold: true }), ...(spec.sizePt && { size: spec.sizePt }),
          ...(spec.colour && { color: spec.colour }), ...(spec.caps && { allCaps: true })
        } : {}
        const padding = Object.fromEntries(Object.entries(style.padding).map(([edge, mm]) => [edge, mm * 72 / 25.4]))
        const borders = Object.fromEntries(Object.entries(style.borders).map(([edge, rule]) =>
          [edge, rule ? { style: 'single', color: rule.colour, width: rule.pt } : { style: 'none' }]))
        applyTableLook(cell.blocks, look, tableType)
        return { ...cell, shading: cell.shading ?? style.fill, padding: { ...padding, ...block.cellPadding, ...cell.padding },
          borders: { ...borders, ...cell.borders }, text: { ...text, ...cell.text } }
      })
      if (!header) bodyIndex++
    }
  }
}

function bindImages(value, images) {
  if (Array.isArray(value)) return value.map(item => bindImages(item, images))
  if (value === null || typeof value !== 'object') return value
  if (Object.hasOwn(value, '$image')) {
    if (!images.has(value.$image)) throw new Error('Unknown recipe image: ' + value.$image)
    return images.get(value.$image)
  }
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, bindImages(child, images)]))
}

export function diagramSource(asset) {
  if (asset && typeof asset.renderer === 'string') return { renderer: asset.renderer, source: asset.source }
  if (typeof asset?.mermaid === 'string') return { renderer: 'mermaid', source: asset.mermaid }
}

export function brandD3Adapter(ctx) {
  const profile = consumerProfile(ctx)
  const { colours, typography } = profile
  const regular = 'body'
  const strong = ctx.fonts.has('bold') ? 'bold' : ctx.fonts.has('display') ? 'display' : regular
  const typeface = bold => bold ? strong : regular
  return d3Adapter({
    font: typography.body.family, ink: colours.ink, paper: colours.paper, muted: colours.muted,
    accent: colours.primary, onAccent: colours.reverse, panel: colours.light, rule: colours.rule
  }, {
    measure: (text, size, bold) => ctx.fonts.width(text, typeface(bold), size),
    outline: (text, size, bold, x, y) => ctx.fonts.path(text, typeface(bold), size, x, y)
  })
}

export async function recipeDocx(ctx, job, { png, mermaid, logo, diagrams = [] } = {}) {
  if (job?.schema !== RECIPE_SCHEMA || job.recipe?.kind !== 'recipe' || !Array.isArray(job.components)
    || !job.data || typeof job.data !== 'object' || Array.isArray(job.data)) {
    throw new Error('Expected a brandkit/recipe/1 job with a recipe, components and data.')
  }
  const profile = consumerProfile(ctx)
  const recipe = structuredClone(job.recipe)
  recipe.document ??= {}
  recipe.document.theme = { ...brandTheme(ctx, profile), ...recipe.document.theme }
  const library = sharedLibrary({ recipes: [recipe], components: job.components })
  const compiled = compileRecipe(recipe.id, library)
  const images = new Map()
  const adapters = [brandD3Adapter(ctx), devicesAdapter({ brandColour: profile.colours.primary }), ...diagrams]
  if (mermaid) adapters.push(mermaidAdapter(async source => ({ bytes: await mermaid(source, profile) })))
  const registry = createDiagramRegistry(adapters, png)
  for (const [id, asset] of Object.entries(job.images ?? {})) {
    const spec = diagramSource(asset)
    if (spec) {
      const source = spec.renderer === 'devices' ? bindDeviceScreens(spec.source, job.images) : spec.source
      images.set(id, await registry.image({ ...spec, source }))
    } else if (typeof asset?.base64 === 'string' && ['image/jpeg', 'image/png'].includes(asset.type)) {
      images.set(id, { bytes: Uint8Array.from(atob(asset.base64), char => char.charCodeAt(0)) })
    } else throw new Error('Expected a PNG, JPEG or diagram source for ' + id)
  }
  const data = bindImages(job.data, images)
  const mark = profile.logos.primary
  data.logo = { bytes: logo?.bytes ?? await png(mark.svg, 400) }
  data.logoWidth = 72
  data.logoHeight = data.logoWidth * (logo ? logo.height / logo.width : mark.viewBox[3] / mark.viewBox[2])
  data.brandName = profile.name
  const rendered = renderRecipe(compiled, data)
  if (rendered.toComplete.length) throw new Error('Unresolved recipe fields: ' + JSON.stringify(rendered.toComplete))
  if (!job.recipe.document?.theme?.table) {
    const print = documentProfile(ctx.brand)
    const look = tableLook(print, ctx.brand)
    for (const section of rendered.document.sections) {
      for (const blocks of [section.body, section.header, section.footer, section.firstPage?.header, section.firstPage?.footer]) {
        applyTableLook(blocks, look, print.typography.table)
      }
    }
  }
  return writeDocx(rendered.document)
}
