import { fileURLToPath } from 'node:url'
import { buildTemplatePrinter } from '../src/printer/vite.js'

await buildTemplatePrinter({
  frontend: fileURLToPath(new URL('../vendor/template-printer/frontend/', import.meta.url)),
  outDir: fileURLToPath(new URL('../.template-printer/', import.meta.url)),
  base: process.env.BASE_PATH || (process.argv.includes('--dev') ? '/' : '/brandkit/')
})
