// A library of manuals: families of books, a book's pages as a grid, and one page at a time.
//
// The books can be finished drawings on disk (the BC manuals: each page an SVG file with a WebP
// thumbnail) or generated (a brand guide: each page an object URL the app made a moment ago).
// A page names its own `src` and `thumb`, or the library's `pageUrl` finds them.
//
// The place can live in the address (`?view=guides&guide=sign&page=S05`) so a page can be linked
// to: pass `urlState` to choose the parameter names, or `urlState={null}` to keep it in memory.
//
// Pages are shown as images of their own files: each is self-contained (fonts embedded or text
// outlined), and nothing in one can reach the rest of the page.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './manuals.css'

const ZOOMS = [
  { id: 'fit', label: 'Fit', scale: 1 },
  { id: 'large', label: '150%', scale: 1.5 },
  { id: 'detail', label: '250%', scale: 2.5 }
]

export const DEFAULT_URL_STATE = { set: { view: 'guides' }, book: 'guide', page: 'page' }

/** The page's own number as printed ("Page 4"), or what it is when it has none ("Front cover"). */
const pageLabel = ({ printed }) => {
  if (!printed) return ''
  if (/^\d+$/.test(printed)) return `Page ${printed}`
  return printed[0].toUpperCase() + printed.slice(1)
}

/** The shape most of a book's pages share, as an aspect ratio, so its grid of pages is even. */
const usualShape = (pages) => {
  const counts = new Map()
  for (const { width, height } of pages) counts.set(`${width} / ${height}`, (counts.get(`${width} / ${height}`) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0]
}

const DefaultLink = ({ link }) => <a href={link.href}>{link.label} <span aria-hidden="true">→</span></a>

const Thumb = ({ src, page, onOpen, buttonRef, shape }) => (
  <button type="button" className="guides__thumb" onClick={onOpen} ref={buttonRef}>
    <span className="guides__thumb-page" style={{ aspectRatio: shape }}>
      <img src={src} alt="" loading="lazy" width="320" height={Math.round(320 * page.height / page.width)} />
    </span>
    <span className="guides__thumb-title">{page.title}</span>
    {pageLabel(page) && pageLabel(page).toLowerCase() !== page.title.toLowerCase() && <span className="guides__thumb-meta">{pageLabel(page)}</span>}
  </button>
)

const Families = ({ families, findBook, thumbOf, open, heading, intro, footnote, Link }) => (
  <>
    {(heading || intro) && (
      <div className="guides__intro">
        {heading && <h2>{heading}</h2>}
        {intro && <p>{intro}</p>}
      </div>
    )}
    {families.map((family) => (
      <section key={family.id} className="guides__family" aria-labelledby={`family-${family.id}`}>
        <header className="guides__family-head">
          <h3 id={`family-${family.id}`}>{family.title}</h3>
          {family.kind && <p>{family.kind}</p>}
        </header>
        <div className="guides__books">
          {family.books.map(findBook).filter(Boolean).map((book) => (
            <button key={book.id} type="button" className="guides__book" onClick={() => open({ book: book.id, page: null })}>
              <span className="guides__thumb-page">
                <img src={thumbOf(book, book.pages[0])} alt="" loading="lazy" />
              </span>
              <span className="guides__book-title">{book.title}</span>
              <span className="guides__thumb-meta">{[book.edition, `${book.pages.length} pages`].filter(Boolean).join(' · ')}</span>
            </button>
          ))}
        </div>
        {family.links?.length > 0 && (
          <ul className="guides__links">
            {family.links.map((link) => <li key={link.label}><Link link={link} /></li>)}
          </ul>
        )}
      </section>
    ))}
    {footnote && <p className="guides__footnote">{footnote}</p>}
  </>
)

const Book = ({ book, family, thumbOf, open, focusPage, showBack, backLabel, actions }) => {
  const shape = usualShape(book.pages)
  const thumbs = useRef({})
  useEffect(() => { if (focusPage) thumbs.current[focusPage]?.focus() }, [focusPage])
  return (
    <>
      <div className="guides__intro">
        {showBack && <button type="button" className="guides__back" onClick={() => open({ book: null, page: null })}>← {backLabel}</button>}
        <h2>{book.title}</h2>
        <p>{[family?.title, book.edition, `${book.pages.length} pages`].filter(Boolean).join(' · ')}</p>
        {actions && <div className="guides__toolbar">{actions}</div>}
      </div>
      <div className="guides__pages">
        {book.pages.map((page) => (
          <Thumb key={page.id} src={thumbOf(book, page)} page={page} shape={shape} onOpen={() => open({ book: book.id, page: page.id })} buttonRef={(element) => { thumbs.current[page.id] = element }} />
        ))}
      </div>
    </>
  )
}

const Page = ({ book, page, srcOf, open, aside }) => {
  const index = book.pages.findIndex((entry) => entry.id === page.id)
  const previous = book.pages[index - 1]
  const next = book.pages[index + 1]
  const [zoom, setZoom] = useState('fit')
  const [loaded, setLoaded] = useState(false)
  const title = useRef(null)
  const scale = ZOOMS.find((entry) => entry.id === zoom).scale
  const src = srcOf(book, page)
  useEffect(() => { setLoaded(false); title.current?.focus() }, [page.id])

  useEffect(() => {
    const onKey = (event) => {
      if (event.target.matches?.('input, textarea, select, [contenteditable]') || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === 'ArrowLeft' && previous) open({ book: book.id, page: previous.id })
      else if (event.key === 'ArrowRight' && next) open({ book: book.id, page: next.id })
      else if (event.key === 'Escape') open({ book: book.id, page: null, from: page.id })
      else return
      event.preventDefault()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [book.id, page.id, previous, next, open])

  return (
    <>
      <div className="guides__intro guides__page-head">
        <button type="button" className="guides__back" onClick={() => open({ book: book.id, page: null, from: page.id })}>← {book.title}</button>
        <h2 ref={title} tabIndex={-1}>{page.title}</h2>
        <p>{[pageLabel(page), `${index + 1} of ${book.pages.length}`].filter(Boolean).join(' · ')}</p>
        <div className="guides__toolbar">
          <div className="guides__step">
            <button type="button" disabled={!previous} onClick={() => open({ book: book.id, page: previous.id })} aria-label={previous ? `Previous page: ${previous.title}` : 'Previous page'}>←</button>
            <button type="button" disabled={!next} onClick={() => open({ book: book.id, page: next.id })} aria-label={next ? `Next page: ${next.title}` : 'Next page'}>→</button>
          </div>
          <div className="guides__zoom" role="group" aria-label="Zoom">
            {ZOOMS.map((entry) => <button key={entry.id} type="button" aria-pressed={zoom === entry.id} onClick={() => setZoom(entry.id)}>{entry.label}</button>)}
          </div>
          <a className="guides__download" href={src} download={`${page.file ?? page.id}.svg`} aria-label="Download SVG"><span aria-hidden="true">↓ </span><span className="guides__download-word">Download </span>SVG</a>
        </div>
      </div>
      <div className="guides__viewer" data-zoom={zoom}>
        <img
          key={page.id}
          className="guides__page"
          src={src}
          alt={`${book.title}: ${page.title}`}
          width={page.width}
          height={page.height}
          style={{ width: `${scale * 100}%`, aspectRatio: `${page.width} / ${page.height}`, opacity: loaded ? 1 : 0.35 }}
          onLoad={() => setLoaded(true)}
        />
      </div>
      {aside}
      {page.notes?.length > 0 && (
        <details className="guides__notes">
          <summary>{page.notesTitle ?? 'Reconstruction notes'}</summary>
          <ul>{page.notes.map((note) => <li key={note}>{note}</li>)}</ul>
        </details>
      )}
    </>
  )
}

const readPlace = (urlState, findBook) => {
  if (!urlState) return { book: null, page: null }
  const params = new URLSearchParams(globalThis.location?.search ?? '')
  const book = findBook(params.get(urlState.book))
  const page = book?.pages.find((entry) => entry.id === params.get(urlState.page)) ?? null
  return { book: book?.id ?? null, page: page?.id ?? null }
}

const writePlace = (urlState, { book, page }) => {
  if (!urlState || !globalThis.history?.replaceState) return
  const url = new URL(globalThis.location.href)
  for (const [key, value] of Object.entries(urlState.set ?? {})) url.searchParams.set(key, value)
  for (const [key, value] of [[urlState.book, book], [urlState.page, page]]) {
    if (value) url.searchParams.set(key, value)
    else url.searchParams.delete(key)
  }
  globalThis.history.replaceState(null, '', url)
}

/** A URL builder for a pack served from `base` (the folder holding <book>/<page>.svg). */
export const pageUrlFrom = (base) => (book, page, ext = 'svg') => `${base}${book.id}/${page.id}.${ext}`

/**
 * @param {object} props
 * @param {Array} props.books      `{ id, title, edition?, pages: [{ id, title, printed?, width, height, notes?, src?, thumb? }] }`
 * @param {Array} [props.families] `{ id, title, kind?, books: [bookId], links?: [{ label, href | to }] }`; one family per book if omitted
 * @param {(book, page, ext) => string} [props.pageUrl]   where a page's files are, when it does not say
 * @param {object|null} [props.urlState]   parameter names for the address; null keeps the place in memory
 * @param {Function} [props.renderLink]    renders a family link (a host's router link, say)
 * @param {string} [props.initialBook]     open on this book instead of the families
 * @param {(book) => React.ReactNode} [props.bookActions]   extra controls on a book's page
 * @param {(book, page) => React.ReactNode} [props.pageAside]   shown under a page (what it links to, say)
 */
export const ManualLibrary = ({
  books, families, pageUrl, urlState = DEFAULT_URL_STATE, renderLink, heading = 'Manuals', intro, footnote,
  initialBook = null, bookActions, pageAside, label = 'Manuals'
}) => {
  const findBook = useCallback((id) => books.find((book) => book.id === id) ?? null, [books])
  const groups = useMemo(() => families ?? books.map((book) => ({ id: book.id, title: book.title, books: [book.id] })), [families, books])
  const familyOf = (bookId) => groups.find((family) => family.books.includes(bookId)) ?? null
  const srcOf = (book, page) => page.src ?? pageUrl(book, page, 'svg')
  const thumbOf = (book, page) => page.thumb ?? page.src ?? pageUrl(book, page, 'webp')
  const Link = renderLink ? ({ link }) => renderLink(link) : DefaultLink
  const single = books.length === 1 && !families

  const [place, setPlace] = useState(() => {
    const fromUrl = readPlace(urlState, findBook)
    return fromUrl.book ? fromUrl : { book: initialBook ?? (single ? books[0].id : null), page: null }
  })
  const [focusPage, setFocusPage] = useState(null)
  const open = useCallback(({ book, page, from = null }) => {
    const next = { book: book ?? (single ? books[0].id : null), page }
    setPlace(next)
    writePlace(urlState, next)
    setFocusPage(from)
    globalThis.scrollTo?.({ top: 0 })
  }, [urlState, single, books])
  const book = place.book ? findBook(place.book) : null
  const page = book && place.page ? book.pages.find((entry) => entry.id === place.page) : null

  return (
    <section className="guides" aria-label={label}>
      {page ? <Page book={book} page={page} srcOf={srcOf} open={open} aside={pageAside?.(book, page)} />
        : book ? <Book book={book} family={familyOf(book.id)} thumbOf={thumbOf} open={open} focusPage={focusPage} showBack={!single} backLabel={heading} actions={bookActions?.(book)} />
          : <Families families={groups} findBook={findBook} thumbOf={thumbOf} open={open} heading={heading} intro={intro} footnote={footnote} Link={Link} />}
    </section>
  )
}
