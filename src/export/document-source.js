// One snapshot of a document, one Word file, one PDF. The preview, "Download Word", "Download PDF" and
// "Print" all ask for a snapshot's files here, so they are the same bytes: the Word file is written once
// and the PDF is that Word file laid out once (document-kit/pdf-preview's createPdfSource). A new
// snapshot is made whenever the document changes; files of a snapshot nobody holds are let go.
import { createPdfSource } from 'document-kit/pdf-preview'

/**
 * A document as it stands: `word()` writes its Word file; `title` goes in the PDF; `faces` are the
 * brand's faces the layout draws with (brandFaces). Frozen, since the files are cached by it.
 */
export const documentSnapshot = ({ word, title, faces = [], name }) => Object.freeze({ word, title, faces, name })

/** The files of snapshots, laid out by `layout(docx, { title, namedFonts })`. */
export const documentSource = (layout) => {
  const words = new WeakMap()
  const wordFor = (snapshot) => {
    let pending = words.get(snapshot)
    if (!pending) {
      pending = Promise.resolve().then(() => snapshot.word())
      words.set(snapshot, pending)
      pending.catch(() => words.delete(snapshot))
    }
    return pending
  }
  const pdf = createPdfSource(async (snapshot) => layout(await wordFor(snapshot), { title: snapshot.title, namedFonts: snapshot.faces }))
  return { wordFor, pdfFor: (snapshot) => pdf(snapshot, 'pdf') }
}
