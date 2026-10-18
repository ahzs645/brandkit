import { BC_BOOKS, BC_FAMILIES, BC_FOOTNOTE } from '../../../manuals/bc/index.js'
import { ManualLibrary, pageUrlFrom } from '../../manuals/ManualLibrary.jsx'
import { BuiltFrom } from './Sources.jsx'

const pageUrl = pageUrlFrom(`${import.meta.env.BASE_URL}manuals/bc/`)

/** Historical manuals, rebuilt as drawings: a reference shelf for how identity manuals are made. */
export const Manuals = ({ openBuilt }) => (
  <div className="view">
    <ManualLibrary books={BC_BOOKS} families={BC_FAMILIES} pageUrl={pageUrl} heading="Manual library"
      intro="Identity manuals rebuilt page by page as drawings: how the British Columbia government and BC Hydro set out their identities, 1977 to 1983."
      footnote={BC_FOOTNOTE} urlState={{ set: { view: 'manuals' }, book: 'guide', page: 'page' }} label="Manual library"
      pageAside={(book, page) => <BuiltFrom book={book} page={page} openBuilt={openBuilt} />} />
  </div>
)
