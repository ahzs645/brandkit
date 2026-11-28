// The open stand-in faces for the layout in Node: read from document-kit's own fonts folder, a family
// only when a document asks for it. Node-only (reads files); the browser's provider is layout-fonts.js.
import { readFile } from 'node:fs/promises'
import { createFontProvider } from 'document-kit/layout'

const folder = new URL('./', import.meta.resolve('document-kit/fonts/Arimo-Regular.ttf'))

/** A font provider over the stand-ins that ship with document-kit. */
export const nodeFontProvider = () => createFontProvider(async ({ file }) => {
  if (!/^[A-Za-z]+-[A-Za-z]+\.ttf$/.test(file)) return undefined
  return new Uint8Array(await readFile(new URL(file, folder)))
})
