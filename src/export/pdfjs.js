// PDF.js, loaded the first time a PDF is shown, with its worker served by the app.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

let library

export const loadPdfjs = () => {
  library ??= import('pdfjs-dist').then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
    return pdfjs
  })
  return library
}
