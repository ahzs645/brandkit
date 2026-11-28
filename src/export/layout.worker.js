// Lays out Word files off the page's thread. The open stand-in faces are served by the app; the
// brand's own faces arrive with each request. One layout at a time, in the order asked.
import { appFontProvider } from './layout-fonts.js'
import { layoutDocument } from './layout.js'

const fonts = appFontProvider()
let queue = Promise.resolve()

self.onmessage = ({ data: { id, docx, options } }) => {
  queue = queue.then(async () => {
    try {
      const pdf = await layoutDocument(new Uint8Array(docx), fonts, options)
      self.postMessage({ id, ok: true, pdf }, [pdf.bytes.buffer])
    } catch (cause) {
      self.postMessage({ id, ok: false, error: cause instanceof Error ? cause.message : String(cause) })
    }
  })
}
