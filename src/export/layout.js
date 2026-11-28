// A Word file laid out as pages, with document-kit's engine: the PDF the preview shows, the PDF a person
// downloads or prints, and the PDF the command line writes are this one layout of the Word file.
//
// This module pulls in the whole layout engine (about 1.5 MB before minifying), so nothing on the app's
// first load may import it: the browser reaches it only through the layout worker (layout.worker.js),
// and it is DOM-free so that worker, Node and the tests run it alike. The caller hands in the fonts: the
// open stand-ins for the Office faces (layout-fonts.js in the browser, layout-fonts-node.js in Node) and
// the brand's own faces by family name (brand-faces.js).
import { layoutDocx } from 'document-kit/layout'
import { layoutFaces } from './brand-faces.js'

/**
 * Lays out `docx` and writes it as a tagged PDF: `{ bytes, pageCount, pageSizes, pageText, notices }`.
 * `namedFonts` are the brand's faces (`brandFaces(ctx)`); `title` goes in the PDF's information.
 */
export async function layoutDocument(docx, fonts, { title, tagged = true, namedFonts = [] } = {}) {
  const named = layoutFaces(namedFonts)
  const laid = await layoutDocx(docx instanceof Uint8Array ? docx : new Uint8Array(docx), { fonts, namedFonts: named.faces, tagged })
  const pdf = laid.toPdf(title ? { info: { title } } : {})
  return {
    bytes: pdf.bytes,
    pageCount: pdf.pageCount,
    pageSizes: pdf.pageSizes.map(({ widthPt, heightPt }) => ({ widthPt, heightPt })),
    pageText: [...laid.pageText],
    notices: [...named.notices, ...layoutNotices(pdf.losses)]
  }
}

/**
 * A face Word names drawn with the open face that has its widths (Arial with Arimo) is how every
 * document is laid out, so it is not worth a word. Only that form is expected; a face drawn with
 * another family because its own was missing is not.
 */
const expected = (loss) => loss.severity === 'substituted' && loss.feature === 'fonts.substitution' && /drawn with its stand-in/.test(loss.detail)

const SEVERITY_WORDS = { substituted: 'Printed with a substitute', degraded: 'Printed with less detail', dropped: 'Left out of the PDF' }

/** At most this many notices; the rest are counted in one line. */
const MAX_NOTICES = 6

/**
 * The layout's losses as sentences for the person exporting: what was left out, drawn with less
 * detail, or drawn with something else, each once, with the page where the engine says.
 */
export function layoutNotices(losses = []) {
  const seen = new Set()
  const notices = []
  for (const loss of losses) {
    if (expected(loss)) continue
    const detail = String(loss.detail ?? '').trim().replace(/\.$/, '')
    const line = `${SEVERITY_WORDS[loss.severity] ?? 'Changed'}: ${detail}${loss.where ? ` (${loss.where})` : ''}.`
    if (seen.has(line)) continue
    seen.add(line)
    notices.push(line)
  }
  if (notices.length <= MAX_NOTICES) return notices
  const rest = notices.length - MAX_NOTICES
  return [...notices.slice(0, MAX_NOTICES), `…and ${rest} more like ${rest === 1 ? 'it' : 'them'}.`]
}
