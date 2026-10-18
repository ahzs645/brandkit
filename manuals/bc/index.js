// British Columbia identity manuals, rebuilt page by page as drawings (from the ManualKit
// reconstruction project): the Province's Visual Identity Program of 1977 to 1982, and BC Hydro's
// Graphic Standards Manual of 1983.
//
// The books and their pages are generated (books.js, by scripts/import_visual_guides.py); which
// family a book belongs to is set here. A host adds its own links to a family by id: PofBC
// links each family to its marks in the generator and gallery.
//
// The page files are in ./pages/<book>/<page>.svg, with a .webp thumbnail beside each, and the
// licences of the font subsets the pages embed in ./pages/font-licences/. Serve the folder with
// the brandkit Vite plugin (brandkit/vite) and pass its URL as the library's `base`.

import { GUIDE_BOOKS } from './books.js'

export const BC_BOOKS = GUIDE_BOOKS

export const BC_FAMILIES = [
  {
    id: 'visual-identity-program',
    title: 'Province of British Columbia',
    kind: 'Visual Identity Program, 1977 to 1982',
    books: ['general', 'reproduction', 'sign', 'vehicle', 'policy-1982']
  },
  {
    id: 'bc-hydro',
    title: 'BC Hydro',
    kind: 'Graphic Standards Manual, 1983',
    books: ['hydro']
  }
]

export const BC_FOOTNOTE = 'Reconstructions, not the original printings. The type is set in open-licence stand-ins, and the originals’ photographs and signatures are left out.'

/** The folder the pack's page files are in, for the Vite plugin. */
export const BC_PAGES_DIR = 'manuals/bc/pages'
