#!/usr/bin/env node
// The ddcnorth publication system, converted from the design system's collateral sources into brandkit's
// `publications` schema (docs/brand-schema.md, "Publication system"), as the test fixture
// test/fixtures/ddcnorth/: a brand.json with the identity the documents need and its `publications`,
// and the screenshots the documents show, made small.
//
//   node scripts/brands/collateral-publications.mjs <design-system checkout> [out folder]
//
// It reads dist/brand.json (run the design system's build first), source/collateral.json and the
// documents it lists; it never writes to the design system. `convertCollateral` is exported so a
// design system's own build can make the same `publications` for its pack.
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PX_MM = 25.4 / 96
const mm = (px) => Math.round(px * PX_MM * 10) / 10
const KINDS = {
  'White paper': 'white-paper', 'Feature catalog': 'catalog', Brochure: 'brochure', 'Product sheet': 'product-sheet',
  'Product presentation': 'presentation', 'Executive presentation': 'presentation',
  'Template · Paper': 'white-paper', 'Template · Slides': 'presentation', 'Template · Briefing': 'briefing'
}
const KIND_NAMES = { 'white-paper': 'White paper', catalog: 'Feature catalog', brochure: 'Brochure', 'product-sheet': 'Product sheet', presentation: 'Presentation', briefing: 'Briefing letter' }

/** The design system's directions as brandkit styles: each part a design brandkit draws and its plate. */
const PARTS = {
  cover: { plan: { design: 'sheet', plate: { type: 'contour' } }, profile: { design: 'band', plate: { type: 'profile', reach: 0.64 } }, field: { design: 'field', plate: { type: 'field' } } },
  page: { plan: { running: 'title-block', look: 'ruled', table: 'sheet' }, profile: { running: 'bar', look: 'solid', table: 'banded' }, field: { running: 'dot-index', look: 'card', table: 'card' } },
  close: { plan: { design: 'sheet', plate: { type: 'contour', routes: false } }, profile: { design: 'band', plate: { type: 'profile', reach: 0.47 } }, field: { design: 'field', plate: { type: 'field' } }, night: { design: 'night', plate: { type: 'field' } } }
}

const styleOf = (direction) => {
  const parts = { cover: direction.id, page: direction.id, close: direction.id, mark: null, ...direction.parts }
  return {
    id: direction.id, name: direction.name, label: direction.label, status: direction.status, summary: direction.summary,
    ...(direction.ground ? { ground: direction.ground } : { ground: 'paper' }),
    cover: PARTS.cover[parts.cover], page: { ...PARTS.page[parts.page], ...(parts.mark ? { mark: 'symbol' } : {}) }, close: PARTS.close[parts.close]
  }
}

/** One collateral block as a publication block. `src` names a capture in screens/ by its id. */
const blockOf = (item, src) => {
  switch (item.t) {
    case 'hd': return { type: 'opening', ...(item.kicker ? { kicker: item.kicker } : {}), title: item.title, ...(item.lead ? { lead: item.lead } : {}) }
    case 'p': return { type: 'paragraph', text: item.text }
    case 'h2': return { type: 'heading', level: 2, text: item.text }
    case 'lead': case 'kicker': case 'masthead': case 'signoff': return { type: item.t, text: item.text }
    case 'note': return { type: 'note', ...(item.label ? { label: item.label } : {}), text: item.text }
    case 'list': return { type: 'list', items: item.items }
    case 'spacer': return { type: 'spacer', heightMm: mm(item.h ?? 12) }
    case 'push': return { type: 'push', blocks: item.blocks.map((entry) => blockOf(entry, src)) }
    case 'figure': return {
      type: 'figure', ...(item.src ? { src: src(item.src), alt: item.alt ?? item.caption } : { placeholder: item.placeholder ?? '[Screenshot placeholder]' }),
      ...(item.h ? { heightMm: mm(item.h) } : {}), ...(item.pos ? { position: item.pos } : {}), ...(item.label ? { label: item.label } : {}), ...(item.caption ? { caption: item.caption } : {})
    }
    case 'phones': return { type: 'phones', srcs: item.srcs.map(src), ...(item.label ? { label: item.label } : {}), ...(item.caption ? { caption: item.caption } : {}) }
    case 'devices': return { type: 'devices', ...(item.mockup ? { src: src(item.mockup) } : { items: item.items.map(([kind, file, label]) => [kind, src(file), label]) }), heightMm: mm(item.h ?? 200), ...(item.label ? { label: item.label } : {}), ...(item.caption ? { caption: item.caption } : {}) }
    case 'table': return { type: 'table', headers: item.head, rows: item.rows, ...(item.widths ? { widths: item.widths } : {}), ...(item.tight ? { tight: true } : {}) }
    case 'steps': return { type: 'steps', columns: item.cols ?? 2, items: item.items }
    case 'callout': return { type: 'callout', ...Object.fromEntries(['label', 'title', 'text', 'field', 'strong'].filter((key) => item[key] != null).map((key) => [key, item[key]])) }
    case 'cols': return { type: 'columns', columns: item.cols.map((column) => column.map((entry) => blockOf(entry, src))) }
    case 'facts': return { type: 'facts', columns: item.cols ?? 3, items: item.items }
    case 'toc': return { type: 'contents', columns: item.cols ?? 2, items: item.items }
    case 'refs': return { type: 'references', columns: item.cols ?? 2, items: item.items }
    case 'scale': return { type: 'scale', ...(item.label ? { label: item.label } : {}), ...(item.steps ? { steps: item.steps } : {}), items: item.items }
    default: throw new Error(`Unknown collateral block: ${item.t}`)
  }
}

/** A CSS grid template (`1.2fr 1fr`, `560px 1fr`) as column shares of a slide's 1728 px, less its 72 px gaps. */
const shares = (split) => {
  const parts = String(split ?? '1fr 1fr').split(/\s+/)
  const room = 1728 - 72 * (parts.length - 1)
  const fixed = parts.filter((part) => part.endsWith('px')).reduce((sum, part) => sum + Number.parseFloat(part), 0)
  const fr = parts.filter((part) => !part.endsWith('px')).reduce((sum, part) => sum + (Number.parseFloat(part) || 1), 0)
  return parts.map((part) => Math.round(part.endsWith('px') ? Number.parseFloat(part) : (room - fixed) * (Number.parseFloat(part) || 1) / fr))
}
const picked = (object, keys) => Object.fromEntries(keys.filter((key) => object[key] != null).map((key) => [key, object[key]]))

/** A slide as a content page: its heading in the page, its body as blocks. */
const slideOf = (slide, src) => {
  if (slide.layout === 'title') return { layout: 'cover', ...picked(slide, ['kicker', 'title', 'subtitle']) }
  if (slide.layout === 'closing') return { layout: 'closing', ...picked(slide, ['kicker', 'title', 'subtitle']), ...(slide.meta ? { lines: slide.meta } : {}), ...(slide.small ? { small: true } : {}) }
  const head = { layout: 'content', ...picked(slide, ['section', 'kicker', 'title', 'subtitle', 'note']) }
  const media = (entry) => entry.src ? { type: 'figure', src: src(entry.src), alt: entry.alt ?? slide.title } : entry.srcs ? { type: 'phones', srcs: entry.srcs.map(src) } : { type: 'figure', placeholder: entry.placeholder ?? '[Screenshot placeholder]' }
  const items = (list, { numbered = true, stack = false } = {}) => ({ type: 'steps', columns: 1, ...(numbered ? {} : { numbered: false }), ...(stack ? { stack: true } : {}), items: list.map((entry) => picked(entry, ['n', 'title', 'text'])) })
  switch (slide.layout) {
    case 'steps': case 'points': return { ...head, blocks: [items(slide.items)] }
    case 'figure': return { ...head, blocks: [media(slide), ...(slide.statement ? [{ type: 'statement', text: slide.statement }] : [])] }
    case 'table': return { ...head, blocks: [{ type: 'table', headers: slide.head, rows: slide.rows, ...(slide.widths ? { widths: slide.widths } : {}) }] }
    case 'split': return { ...head, blocks: [{ type: 'columns', widths: shares(slide.split), columns: [[media(slide.media)], [...(slide.lede ? [{ type: 'lead', text: slide.lede }] : []), ...(slide.items?.length ? [items(slide.items, { stack: true })] : []), ...(slide.statement ? [{ type: 'statement', text: slide.statement }] : [])]] }] }
    case 'devices': return { ...head, blocks: [{ type: 'columns', widths: slide.mockup ? [1.6, 1] : [1, 1], columns: [[slide.mockup ? { type: 'devices', src: src(slide.mockup), heightMm: mm(slide.h ?? 330) } : { type: 'devices', items: slide.devices.map(([kind, file, label]) => [kind, src(file), label]), heightMm: mm(slide.h ?? 330) }], [items(slide.items, { numbered: false })]] }] }
    case 'sources': return { ...head, blocks: [{ type: 'columns', ruled: true, columns: slide.groups.map((group) => [{ type: 'heading', level: 3, text: group.title }, ...group.lines.map((line) => ({ type: 'paragraph', text: line }))]) }] }
    default: throw new Error(`Unknown slide layout: ${slide.layout}`)
  }
}

/** A letter page: covers and closing pages keep their words; a body page becomes a content page. */
const letterPage = (page, src) => {
  const motif = page.motif ? { motif: page.motif, ...(page.points ? { points: page.points } : {}) } : {}
  if (page.layout === 'cover') return { layout: 'cover', ...picked(page, ['kicker', 'title', 'subtitle', 'lines']), ...(page.hero ? { hero: { src: src(page.hero.src), ...(page.hero.caption ? { caption: page.hero.caption } : {}) } } : {}), ...motif }
  if (page.layout === 'closing') return { layout: 'closing', ...picked(page, ['kicker', 'title', 'text', 'asks', 'contact', 'fine', 'signoff']), ...motif }
  return { layout: 'content', ...picked(page, ['section', 'bare']), blocks: page.blocks.map((entry) => blockOf(entry, src)) }
}

/**
 * The collateral as `publications`: `{ publications, screens }`, `screens` the capture files the
 * documents use (by file name). `filled` replaces {{captured}} and {{revision}} in captions.
 */
export const convertCollateral = ({ collateral, documents, crops = {}, filled = {} }) => {
  const used = new Set()
  const src = (id) => { const file = crops[id]?.file ?? `${id}.jpg`; used.add(file); return `screens/${file}` }
  const fill = (value) => JSON.parse(JSON.stringify(value).replace(/\{\{(\w+)\}\}/g, (match, key) => { if (!(key in filled)) throw new Error(`Unknown placeholder ${match}`); return filled[key] }))
  const docs = documents.map(fill).map((doc) => ({
    id: doc.id, kind: KINDS[doc.kind] ?? 'white-paper', label: doc.kind, ...(doc.product ? { product: doc.product } : {}),
    title: doc.title, short: doc.short, edition: doc.edition, ...(doc.status ? { status: doc.status } : {}), seed: doc.seed ?? 7, sections: doc.sections ?? [],
    pages: doc.pages.map((page) => (doc.format === 'slide' ? slideOf(page, src) : letterPage(page, src)))
  }))
  const kinds = [...new Set(docs.map((doc) => doc.kind))].map((id) => ({
    id, name: KIND_NAMES[id], format: id === 'presentation' ? 'slide' : 'page', paper: id === 'presentation' ? 'slide' : 'letter',
    ...(id === 'presentation' ? { orientation: 'landscape' } : {}),
    skeleton: id === 'product-sheet' ? ['sheet'] : id === 'brochure' ? ['cover', 'content', 'content'] : ['cover', 'content', 'content', 'closing']
  }))
  const grounds = [{ id: 'paper', name: 'Paper', colour: 'paper', summary: 'The kit’s off-white.' },
    ...(collateral.grounds?.options ?? []).map((ground) => ({ id: ground.id, name: ground.name, colour: ground.base, ...(ground.tint ? { tint: ground.tint, amount: ground.amount } : {}), status: ground.status, summary: ground.summary }))]
  const chosen = collateral.directions.find((direction) => /review/.test(direction.status ?? '')) ?? collateral.directions[0]
  return {
    screens: [...used],
    publications: {
      label: collateral.revision?.title ?? 'Publication system', status: collateral.revision?.status, summary: collateral.revision?.summary,
      style: chosen.id, ...(collateral.home ? { home: collateral.home } : {}),
      grounds, styles: collateral.directions.map(styleOf), kinds, documents: docs
    }
  }
}

/** The identity a document needs: colours, faces, the symbol and wordmarks, the product family. */
const IDENTITY = ['schema', 'id', 'name', 'version', 'displayVersion', 'colours', 'roles', 'logoColours', 'rasterColours', 'fonts', 'typography', 'symbol', 'wordmark', 'families', 'lockup', 'products', 'copy']

const main = async () => {
  const [checkout, out = fileURLToPath(new URL('../../test/fixtures/ddcnorth/', import.meta.url))] = process.argv.slice(2)
  if (!checkout) throw new Error('Usage: collateral-publications.mjs <design-system checkout> [out folder]')
  const root = resolve(checkout)
  const json = async (path) => JSON.parse(await readFile(join(root, path), 'utf8'))
  const brand = await json('dist/brand.json')
  const collateral = await json('source/collateral.json')
  const documents = await Promise.all([...collateral.documents, ...collateral.specimens].map((path) => json(`source/collateral/${path}`)))
  const crops = await json('source/collateral/access/screens/crops.json')
  const capture = crops._capture ?? {}
  const filled = { captured: capture.date ? new Date(`${capture.date}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'date not recorded', revision: capture.revision ?? 'not recorded' }
  const { publications, screens } = convertCollateral({ collateral, documents, crops, filled })
  const fixture = { ...Object.fromEntries(IDENTITY.filter((key) => brand[key] != null).map((key) => [key, brand[key]])), publications }
  await rm(join(out, 'screens'), { recursive: true, force: true })
  await mkdir(join(out, 'screens'), { recursive: true })
  await writeFile(join(out, 'brand.json'), `${JSON.stringify(fixture, null, 2)}\n`)
  // Small copies: the fixture tests the documents, not the captures (macOS sips; a PNG stays a PNG).
  for (const file of screens) {
    const from = join(root, 'source/collateral/access/screens', file)
    if (!existsSync(from)) throw new Error(`Missing capture ${file}`)
    const to = join(out, 'screens', file)
    const args = file.endsWith('.png') ? ['-Z', '520', from, '--out', to] : ['-Z', '480', '-s', 'formatOptions', '45', from, '--out', to]
    execFileSync('sips', args, { stdio: 'ignore' })
  }
  console.log(`Wrote ${join(out, 'brand.json')}: ${publications.styles.length} styles, ${publications.kinds.length} kinds, ${publications.documents.length} documents, ${screens.length} captures.`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
