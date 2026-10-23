import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import { templatePrinter } from 'brandkit/printer/vite'

export default defineConfig({
  root: fileURLToPath(new URL('./', import.meta.url)),
  base: process.env.BASE_PATH || '/',
  plugins: [templatePrinter({ dir: fileURLToPath(new URL('../../.template-printer/', import.meta.url)) })]
})
