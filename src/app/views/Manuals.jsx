import { useMemo, useState } from 'react'
import { BC_BOOKS, BC_FAMILIES, BC_FOOTNOTE } from '../../../manuals/bc/index.js'
import { ManualLibrary, pageUrlFrom } from '../../manuals/ManualLibrary.jsx'
import { BuiltFrom } from './Sources.jsx'

const pageUrl = pageUrlFrom(`${import.meta.env.BASE_URL}manuals/bc/`)

/** Every manual book a brand cites: the `book` of each `{ book, page }` source anywhere in it. */
const citedBooks = (brand) => {
  const books = new Set()
  const walk = (value) => {
    if (Array.isArray(value)) return value.forEach(walk)
    if (!value || typeof value !== 'object') return
    if (typeof value.book === 'string' && 'page' in value) books.add(value.book)
    Object.values(value).forEach(walk)
  }
  walk(brand)
  return books
}

/**
 * Historical manuals, rebuilt as drawings. For a brand built from them, the shelf shows that
 * brand's own manuals (every book of each family it cites), with the rest a click away; a brand
 * built from none sees the whole library.
 */
export const Manuals = ({ brand, openBuilt }) => {
  const [everything, setEverything] = useState(false)
  const own = useMemo(() => {
    const cited = brand ? citedBooks(brand) : new Set()
    return BC_FAMILIES.filter((family) => family.books.some((id) => cited.has(id)))
  }, [brand])
  const filtered = own.length > 0 && !everything
  const families = filtered ? own : BC_FAMILIES
  const books = filtered ? BC_BOOKS.filter((book) => own.some((family) => family.books.includes(book.id))) : BC_BOOKS
  return (
    <div className="view">
      <ManualLibrary key={filtered ? 'own' : 'all'} books={books} families={families} pageUrl={pageUrl}
        heading={filtered ? `${brand.name} manuals` : 'Manual library'}
        intro={filtered
          ? <>The manuals {brand.name} is rebuilt from. <button type="button" className="link" onClick={() => setEverything(true)}>Show every manual</button></>
          : <>Identity manuals rebuilt page by page as drawings: how the British Columbia government and BC Hydro set out their identities, 1977 to 1983.{own.length > 0 && <> <button type="button" className="link" onClick={() => setEverything(false)}>Only {brand.name}’s</button></>}</>}
        footnote={BC_FOOTNOTE} urlState={{ set: { view: 'manuals' }, book: 'guide', page: 'page' }} label="Manual library"
        pageAside={(book, page) => <BuiltFrom book={book} page={page} openBuilt={openBuilt} />} />
    </div>
  )
}
