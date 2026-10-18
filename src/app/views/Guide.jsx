import { useEffect, useMemo, useState } from 'react'
import { fill } from '../../engine/brand.js'
import { guidePages, guideSheets } from '../../engine/guide.js'
import { download, pdf, zip } from '../../export/render.js'
import { ManualLibrary } from '../../manuals/ManualLibrary.jsx'
import { ManualSources } from './Sources.jsx'

const pdfPage = (svg, page) => ({ svg, width: page.width * 0.75, height: page.height * 0.75, unit: 'pt' })

/** The brand's own guide, generated now, read in the same viewer as the historical manuals. */
export const Guide = ({ brand, fonts, openManual }) => {
  const ctx = useMemo(() => ({ brand, fonts }), [brand, fonts])
  const rendered = useMemo(() => {
    const pages = guidePages(ctx).map((page) => ({ ...page, svg: page.render() }))
    const sheets = guideSheets(ctx).map((page) => ({ ...page, svg: page.render() }))
    return { pages, sheets }
  }, [ctx])
  const [busy, setBusy] = useState(null)

  // Object URLs are made and revoked in one effect (see useSvgUrl in ../ui.jsx for why).
  const [books, setBooks] = useState(null)
  useEffect(() => {
    const urls = []
    const toPage = (page, printed) => {
      const src = URL.createObjectURL(new Blob([page.svg], { type: 'image/svg+xml' }))
      urls.push(src)
      return { id: page.id, title: page.name ?? page.title, printed, width: page.width, height: page.height, src, sources: page.sources }
    }
    const out = []
    if (rendered.pages.length) out.push({ id: 'guide', title: fill(brand, brand.guide?.title ?? '{name} brand guide'), edition: `v${brand.displayVersion ?? brand.version}`, pages: rendered.pages.map((page) => toPage(page, String(page.number))) })
    if (rendered.sheets.length) out.push({ id: 'sheets', title: 'Logo sheets and overview', edition: `v${brand.displayVersion ?? brand.version}`, pages: rendered.sheets.map((page) => toPage(page, null)) })
    setBooks(out)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [rendered, brand])

  const run = async (label, task) => { setBusy(label); try { await task() } finally { setBusy(null) } }
  const actions = (book) => {
    const pages = book.id === 'guide' ? rendered.pages : rendered.sheets
    return (
      <>
        <button type="button" className="button" disabled={Boolean(busy)} onClick={() => run('pdf', async () => download(await pdf(pages.map((page) => pdfPage(page.svg, page)), { title: book.title, author: brand.name }), `${brand.id}-${book.id === 'guide' ? 'brand-guide' : 'logo-sheets'}.pdf`))}>{busy === 'pdf' ? 'Making the PDF…' : '↓ PDF'}</button>
        <button type="button" className="button button--quiet" disabled={Boolean(busy)} onClick={() => run('svg', async () => download(await zip(new Map(pages.map((page) => [`${page.id}.svg`, new TextEncoder().encode(page.svg)])), book.id), `${brand.id}-${book.id}-svg.zip`))}>↓ SVG pages</button>
      </>
    )
  }

  if (!books) return null
  if (!books.length) return <div className="view"><p className="panel">This brand has no guide pages defined. Add a <code>guide</code> section to its brand.json.</p></div>
  return (
    <div className="view">
      {!fonts && <p className="notice">Loading the brand’s fonts: until they arrive, the pages use stand-in type.</p>}
      <ManualLibrary key={`${brand.id}-${Boolean(fonts)}`} books={books} families={[{ id: 'brand', title: brand.name, kind: 'Generated from brand.json', books: books.map((book) => book.id) }]}
        heading="Brand guide" intro="Every page is drawn from this brand’s definition, with its text set as outlines." urlState={{ set: { view: 'guide' }, book: 'book', page: 'page' }}
        initialBook="guide" bookActions={actions} label="Brand guide"
        pageAside={(book, page) => <ManualSources brand={brand} sources={page.sources} openManual={openManual} heading="This page sums up" />} />
    </div>
  )
}
