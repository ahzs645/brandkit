import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { manualPages } from './src/vite.js'
import { templatePrinter } from './src/printer/vite.js'

export default defineConfig(({ command, isPreview }) => ({
  plugins: [react(), manualPages({ pack: 'bc', mount: 'manuals/bc' }), templatePrinter()],
  // GitHub Pages serves a project site from the repository's name; the workflow passes it so a
  // renamed repository cannot ship a build whose asset URLs all 404.
  base: process.env.BASE_PATH || (command === 'build' || isPreview ? '/brandkit/' : '/'),
  build: { outDir: 'dist', assetsDir: 'assets', chunkSizeWarningLimit: 1200 }
}))
