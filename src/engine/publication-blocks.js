// The publication block model: what a page of a publication says, as data, before any writer reads it.
// Shared by the plain publications (documentation.js, a brand's document profile) and the designed ones a
// brand defines in `publications` (publications.js); both are written by document-kit
// (src/export/publication.js, src/export/designed-publication.js).
//
//   heading     { text, level 1–3, style? }
//   paragraph   { text, style? }                 text takes **strong**, *second tone*, [label](https://…), [1,2] references
//   list        { items, ordered? }
//   table       { headers, rows, widths?, caption?, tight? }   a cell is text, a number, or { text, n?, ext? }
//   figure      { src?, alt?, caption?, label?, placeholder?, widthMm?, heightMm?, position? }
//   opening     { kicker?, title, lead? }         a page's kicker, heading and lead
//   kicker      { text }                         a small label line
//   lead        { text }                         a larger opening paragraph
//   note        { text, label? }                 small print
//   statement   { text }                         one large sentence (a slide's point)
//   steps       { items: [{ n?, title, text? }], columns?, numbered?, stack? }   stack: the number above the title
//   callout     { label?, title?, text?, field?, strong? }
//   facts       { items: [[label, value]], columns? }
//   columns     { columns: [[blocks], …], widths?, ruled? }                 ruled: a rule over each column
//   scale       { label?, steps?, items: [{ code?, name, level, note?, text? }] }
//   references  { items: [[n, title, text?]], columns? }
//   contents    { items: [[label, pages]], columns? }
//   devices     { src?, items?: [[kind, src, label]], heightMm?, caption?, label? }
//   phones      { srcs: [src, src], caption?, label? }
//   masthead    { text }                         the lockup and a label across a one-page sheet
//   signoff     { text }                         a ruled closing line
//   spacer      { heightMm }
//   push        { blocks }                       blocks set at the foot of the page
//
// A figure's `src` is an embedded PNG or JPEG data URL, or the path of a file the brand carries
// (`screens/03-workspace.jpg`), read through the brand's source when the document is written.

export const BLOCK_TYPES = Object.freeze(['heading', 'paragraph', 'list', 'table', 'figure', 'opening', 'kicker', 'lead', 'note', 'statement', 'steps', 'callout', 'facts',
  'columns', 'scale', 'references', 'contents', 'devices', 'phones', 'masthead', 'signoff', 'spacer', 'push'])

/** Blocks a `push` (the foot of a page) can hold: what a page-foot frame can set, plus a callout and facts, which it draws as ruled paragraphs. */
export const PUSH_BLOCKS = Object.freeze(['paragraph', 'kicker', 'lead', 'note', 'statement', 'signoff', 'callout', 'facts', 'list', 'heading', 'spacer'])

const object = (value) => value && typeof value === 'object' && !Array.isArray(value)
const text = (value) => typeof value === 'string'
const finite = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
const cellText = (cell) => text(cell) || (typeof cell === 'number' && Number.isFinite(cell)) || (object(cell) && text(cell.text) && (cell.n == null || text(cell.n)) && (cell.ext == null || text(cell.ext)))
/** A figure source: an embedded PNG/JPEG data URL, or a relative path inside the brand (no scheme, no `..`). */
export const isAssetPath = (value) => text(value) && !/^[a-z][a-z0-9+.-]*:/i.test(value) && !value.startsWith('/') && !value.split('/').includes('..') && /\.(png|jpe?g)$/i.test(value)
const isDataImage = (value) => text(value) && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)

/**
 * Problems with one block (and the blocks it holds), each prefixed with `where`. `widthMm` and
 * `heightMm` are the page's text area, for a figure's size. The original five block types are also
 * checked, more closely, by validatePublication.
 */
export const blockProblems = (block, where, { widthMm = 500, heightMm = 700, inPush = false, depth = 0 } = {}) => {
  const problems = []
  const need = (condition, message) => { if (!condition) problems.push(`${where} ${message}`) }
  if (!object(block)) return [`${where} must be an object.`]
  if (!BLOCK_TYPES.includes(block.type)) return [`${where} has an unknown block type${block.type ? ` (${block.type})` : ''}.`]
  if (inPush) need(PUSH_BLOCKS.includes(block.type), `cannot hold a ${block.type} at the foot of the page; use ${PUSH_BLOCKS.join(', ')}.`)
  const items = (minimum = 1) => Array.isArray(block.items) && block.items.length >= minimum
  const columns = (max = 6) => block.columns == null || (Number.isInteger(block.columns) && block.columns >= 1 && block.columns <= max)
  const nested = (list, label) => {
    if (depth > 3) { need(false, 'nests blocks too deeply.'); return }
    list.forEach((child, index) => problems.push(...blockProblems(child, `${where}, ${label} ${index + 1}`, { widthMm, heightMm, inPush: inPush || block.type === 'push', depth: depth + 1 })))
  }
  switch (block.type) {
    case 'heading': case 'paragraph':
      need(text(block.text), 'needs text.')
      if (block.type === 'heading' && block.level != null) need(Number.isInteger(block.level) && block.level >= 1 && block.level <= 3, 'heading level must be 1, 2 or 3.')
      break
    case 'list': need(items() && block.items.every(text), 'list items must be text.'); break
    case 'table': {
      const count = Array.isArray(block.headers) ? block.headers.length : 0
      need(count > 0 && block.headers.every(text), 'table needs text headers.')
      need(Array.isArray(block.rows) && block.rows.every((row) => Array.isArray(row) && row.length === count && row.every(cellText)), 'table rows must match the headers and hold text, numbers or { text, n?, ext? } cells.')
      if (block.widths != null) need(Array.isArray(block.widths) && block.widths.length === count && block.widths.every((value) => finite(value, 0.001, 10000)), 'table widths must be positive shares matching the columns.')
      break
    }
    case 'figure':
      for (const key of ['alt', 'caption', 'label', 'placeholder', 'position']) if (block[key] != null) need(text(block[key]), `figure ${key} must be text.`)
      if (block.widthMm != null) need(finite(block.widthMm, 1, widthMm), 'figure width must fit within the content width.')
      if (block.heightMm != null) need(finite(block.heightMm, 1, heightMm), 'figure height must fit within the content height.')
      if (block.src != null) need(isDataImage(block.src) || isAssetPath(block.src), 'figure src must be an embedded PNG or JPEG data URL or the path of a PNG or JPEG the brand carries.')
      break
    case 'opening': need(text(block.title), 'needs a title.'); for (const key of ['kicker', 'lead']) if (block[key] != null) need(text(block[key]), `${key} must be text.`); break
    case 'kicker': case 'lead': case 'statement': case 'masthead': case 'signoff': need(text(block.text), 'needs text.'); break
    case 'note': need(text(block.text), 'needs text.'); if (block.label != null) need(text(block.label), 'label must be text.'); break
    case 'steps': need(items() && block.items.every((item) => object(item) && text(item.title) && (item.text == null || text(item.text)) && (item.n == null || text(item.n))), 'steps need items with a title.'); need(columns(4), 'columns must be 1 to 4.'); if (block.numbered != null) need(typeof block.numbered === 'boolean', 'numbered must be true or false.'); break
    case 'callout': need(['label', 'title', 'text', 'field'].some((key) => text(block[key])), 'needs a label, title, text or field.'); for (const key of ['label', 'title', 'text', 'field']) if (block[key] != null) need(text(block[key]), `${key} must be text.`); break
    case 'facts': need(items() && block.items.every((item) => Array.isArray(item) && item.length === 2 && item.every(text)), 'facts are [label, value] pairs of text.'); need(columns(), 'columns must be 1 to 6.'); break
    case 'references': need(items() && block.items.every((item) => Array.isArray(item) && item.length >= 2 && item.length <= 3 && item.every(text)), 'references are [number, title, text?] of text.'); need(columns(3), 'columns must be 1 to 3.'); break
    case 'contents': need(items() && block.items.every((item) => Array.isArray(item) && item.length === 2 && item.every(text)), 'contents are [label, pages] pairs of text.'); need(columns(3), 'columns must be 1 to 3.'); break
    case 'columns':
      need(Array.isArray(block.columns) && block.columns.length >= 2 && block.columns.length <= 4 && block.columns.every(Array.isArray), 'needs two to four columns, each a list of blocks.')
      if (block.widths != null) need(Array.isArray(block.widths) && block.widths.length === block.columns?.length && block.widths.every((value) => finite(value, 0.001, 10000)), 'widths must be positive shares, one a column.')
      if (Array.isArray(block.columns)) block.columns.forEach((column, index) => Array.isArray(column) && nested(column, `column ${index + 1}, block`))
      break
    case 'scale':
      need(items(2) && block.items.length <= 6 && block.items.every((item) => object(item) && text(item.name) && Number.isInteger(item.level) && item.level >= 0), 'a scale needs two to six items, each with a name and a whole level.')
      need(block.steps == null || (Number.isInteger(block.steps) && block.steps >= 1 && block.steps <= 10), 'steps must be 1 to 10.')
      if (items(2)) need(block.items.every((item) => item.level <= (block.steps ?? block.items.length)), 'a level cannot pass the number of steps.')
      break
    case 'devices':
      need(block.src != null || items(), 'needs a mockup src or device items.')
      if (block.src != null) need(isDataImage(block.src) || isAssetPath(block.src), 'src must be an embedded image or a PNG or JPEG the brand carries.')
      if (block.items != null) need(Array.isArray(block.items) && block.items.every((item) => Array.isArray(item) && item.length === 3 && item.every(text) && (isDataImage(item[1]) || isAssetPath(item[1]))), 'device items are [kind, src, label].')
      if (block.heightMm != null) need(finite(block.heightMm, 1, heightMm), 'height must fit the page.')
      break
    case 'phones': need(Array.isArray(block.srcs) && block.srcs.length >= 1 && block.srcs.length <= 3 && block.srcs.every((src) => isDataImage(src) || isAssetPath(src)), 'needs one to three phone captures.'); break
    case 'spacer': need(finite(block.heightMm, 0, heightMm), 'needs a height in millimetres.'); break
    case 'push':
      need(!inPush, 'cannot sit inside another push.')
      need(Array.isArray(block.blocks) && block.blocks.length > 0, 'needs blocks.')
      if (Array.isArray(block.blocks)) nested(block.blocks, 'block')
      break
  }
  return problems
}

/** Every figure source a list of blocks names, nested blocks included. */
export const blockSources = (blocks = []) => {
  const out = []
  for (const block of blocks) {
    if (!object(block)) continue
    if (text(block.src)) out.push(block.src)
    for (const src of block.srcs ?? []) out.push(src)
    for (const item of block.type === 'devices' ? block.items ?? [] : []) out.push(item[1])
    if (block.type === 'push') out.push(...blockSources(block.blocks))
    if (block.type === 'columns') for (const column of block.columns ?? []) out.push(...blockSources(column))
  }
  return out
}
