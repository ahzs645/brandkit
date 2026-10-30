import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { manualPages } from './src/vite.js'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command, isPreview }) => ({
  // Tailwind compiles only the Template Printer's own stylesheet (scoped to .template-printer);
  // brandkit's CSS has no Tailwind directives, so it passes through untouched.
  plugins: [react(), tailwindcss(), manualPages({ pack: 'bc', mount: 'manuals/bc' })],
  // GitHub Pages serves a project site from the repository's name; the workflow passes it so a
  // renamed repository cannot ship a build whose asset URLs all 404.
  // Packages consumed from source (vendor/door-sign, vendor/template-printer) share the app's React.
  resolve: { dedupe: ['react', 'react-dom'] },
  base: process.env.BASE_PATH || (command === 'build' || isPreview ? '/brandkit/' : '/'),
  build: { outDir: 'dist', assetsDir: 'assets', chunkSizeWarningLimit: 1200 }
}))
