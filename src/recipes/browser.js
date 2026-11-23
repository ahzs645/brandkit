import { recipeDocx, diagramConfig } from './index.js'
import { rasterise } from '../export/render.js'

// Standalone SVG images cannot see the app's loaded fonts. Supply the same face for
// Mermaid's label measurements and for the canvas rasterization used inside Word.
export async function browserRecipeDocx(ctx, job, { diagrams = [] } = {}) {
  let face, fontRule
  async function drawDiagram(source, profile) {
    const { default: mermaid } = await import('mermaid')
    const config = diagramConfig(profile)
    const bytes = ctx.fonts?.faces?.body?.bytes
    if (bytes && !face) {
      const family = 'RecipeFont' + crypto.randomUUID().replaceAll('-', '')
      face = await new FontFace(family, bytes).load()
      document.fonts.add(face)
      const url = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(new Blob([bytes], { type: 'font/ttf' }))
      })
      fontRule = '@font-face{font-family:' + family + ';src:url(' + url + ')}'
    }
    if (face) config.themeVariables.fontFamily = face.family
    mermaid.initialize(config)
    const { svg } = await mermaid.render('recipe-' + crypto.randomUUID(), source)
    if (!fontRule) return rasterise(svg, 1800)
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
    const style = doc.createElementNS('http://www.w3.org/2000/svg', 'style')
    style.textContent = fontRule
    doc.documentElement.prepend(style)
    return rasterise(new XMLSerializer().serializeToString(doc), 1800)
  }
  try {
    return await recipeDocx(ctx, job, { png: rasterise, diagrams, mermaid: drawDiagram })
  } finally {
    if (face) document.fonts.delete(face)
  }
}
