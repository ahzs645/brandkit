// The open stand-in faces for the layout in the browser, served by the app itself.
//
// document-kit lays a Word file out with open faces that have the widths of the Office faces (Tinos
// for Times New Roman, Arimo for Arial, Carlito for Calibri…) and never fetches one itself: it asks for
// a file and is handed the bytes. These imports make Vite copy the twenty files into the build as
// ordinary assets, so they come from this site and nowhere else, and the provider fetches a family
// only when a document asks for it. Listed one by one rather than globbed, so a file missing from the
// kit fails the build instead of a PDF. Imported only by the layout worker.
import { createFontProvider } from 'document-kit/layout'
import arimoBold from 'document-kit/fonts/Arimo-Bold.ttf?url'
import arimoBoldItalic from 'document-kit/fonts/Arimo-BoldItalic.ttf?url'
import arimoItalic from 'document-kit/fonts/Arimo-Italic.ttf?url'
import arimoRegular from 'document-kit/fonts/Arimo-Regular.ttf?url'
import caladeaBold from 'document-kit/fonts/Caladea-Bold.ttf?url'
import caladeaBoldItalic from 'document-kit/fonts/Caladea-BoldItalic.ttf?url'
import caladeaItalic from 'document-kit/fonts/Caladea-Italic.ttf?url'
import caladeaRegular from 'document-kit/fonts/Caladea-Regular.ttf?url'
import carlitoBold from 'document-kit/fonts/Carlito-Bold.ttf?url'
import carlitoBoldItalic from 'document-kit/fonts/Carlito-BoldItalic.ttf?url'
import carlitoItalic from 'document-kit/fonts/Carlito-Italic.ttf?url'
import carlitoRegular from 'document-kit/fonts/Carlito-Regular.ttf?url'
import cousineBold from 'document-kit/fonts/Cousine-Bold.ttf?url'
import cousineBoldItalic from 'document-kit/fonts/Cousine-BoldItalic.ttf?url'
import cousineItalic from 'document-kit/fonts/Cousine-Italic.ttf?url'
import cousineRegular from 'document-kit/fonts/Cousine-Regular.ttf?url'
import tinosBold from 'document-kit/fonts/Tinos-Bold.ttf?url'
import tinosBoldItalic from 'document-kit/fonts/Tinos-BoldItalic.ttf?url'
import tinosItalic from 'document-kit/fonts/Tinos-Italic.ttf?url'
import tinosRegular from 'document-kit/fonts/Tinos-Regular.ttf?url'

/** Each bundled file's URL in this build, by the name the kit asks for. */
export const FONT_URLS = Object.freeze({
  'Arimo-Bold.ttf': arimoBold, 'Arimo-BoldItalic.ttf': arimoBoldItalic, 'Arimo-Italic.ttf': arimoItalic, 'Arimo-Regular.ttf': arimoRegular,
  'Caladea-Bold.ttf': caladeaBold, 'Caladea-BoldItalic.ttf': caladeaBoldItalic, 'Caladea-Italic.ttf': caladeaItalic, 'Caladea-Regular.ttf': caladeaRegular,
  'Carlito-Bold.ttf': carlitoBold, 'Carlito-BoldItalic.ttf': carlitoBoldItalic, 'Carlito-Italic.ttf': carlitoItalic, 'Carlito-Regular.ttf': carlitoRegular,
  'Cousine-Bold.ttf': cousineBold, 'Cousine-BoldItalic.ttf': cousineBoldItalic, 'Cousine-Italic.ttf': cousineItalic, 'Cousine-Regular.ttf': cousineRegular,
  'Tinos-Bold.ttf': tinosBold, 'Tinos-BoldItalic.ttf': tinosBoldItalic, 'Tinos-Italic.ttf': tinosItalic, 'Tinos-Regular.ttf': tinosRegular
})

/**
 * Fetches each file from this site the first time a document needs its family. A file the build does
 * not have is answered with nothing, which the layout reports as a loss rather than reaching anywhere
 * else for it.
 */
export const appFontProvider = (fetchFont = fetch) => createFontProvider(async ({ file }) => {
  const url = FONT_URLS[file]
  if (!url) return undefined
  const response = await fetchFont(url)
  if (!response.ok) throw new Error(`${file} could not be loaded (${response.status})`)
  return new Uint8Array(await response.arrayBuffer())
})
