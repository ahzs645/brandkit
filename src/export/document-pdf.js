// The app's document files: Word written on the page's thread, laid out as a PDF in the layout worker.
import { layoutInWorker } from './layout-client.js'
import { documentSource } from './document-source.js'

export { documentSnapshot } from './document-source.js'
export const { wordFor, pdfFor } = documentSource(layoutInWorker)
