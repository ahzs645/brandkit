// A brand's table design (table-styles.js) laid onto document-kit tables: each cell's fill, padding,
// rules and text, decided by publicationCell. Publications and recipe jobs set their tables this way,
// so a table looks the same in both and in the Word file, the PDF and the print view.
import { tableGrid } from 'document-kit'
import { publicationCell } from './table-styles.js'

const MM_PT = 72 / 25.4

/**
 * Lays `look` (tableLook) onto every table in `blocks`, nested ones included. `tableType` is the
 * profile's table typography (its size sets tracking, its line height the rows'); `base` is the text
 * style every cell starts from, under the design's and the cell's own.
 */
export function applyTableLook(blocks, look, tableType, base = {}) {
  for (const block of blocks ?? []) {
    if (block.blocks) applyTableLook(block.blocks, look, tableType, base)
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
        const size = spec?.sizePt ?? tableType.sizePt
        const text = spec ? {
          ...(spec.face && { font: spec.face.name, bold: spec.face.bold, italic: spec.face.italic }),
          ...(spec.bold && { bold: true }), ...(spec.sizePt && { size: spec.sizePt }),
          ...(spec.colour && { color: spec.colour }), ...(spec.caps && { allCaps: true }),
          ...(spec.trackingEm && size && { characterSpacing: Math.round(spec.trackingEm * size * 20) / 20 })
        } : {}
        const padding = Object.fromEntries(Object.entries(style.padding).map(([edge, mm]) => [edge, mm * MM_PT]))
        const borders = Object.fromEntries(Object.entries(style.borders).map(([edge, rule]) =>
          [edge, rule ? { style: 'single', color: rule.colour, width: rule.pt } : { style: 'none' }]))
        applyTableLook(cell.blocks, look, tableType, base)
        return { ...cell, shading: cell.shading ?? style.fill, padding: { ...padding, ...block.cellPadding, ...cell.padding },
          borders: { ...borders, ...cell.borders }, text: { ...base, ...text, ...cell.text } }
      })
      if (!header) bodyIndex++
    }
  }
}
