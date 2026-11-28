// The brand's own faces, once, for every document output: the Word file embeds them, the layout draws
// the PDF and its preview with them, and the HTML print view carries them (document-kit's `NamedFont`).
// Each face is named as brandkit's documents name it (officeFont): a weight Word cannot call regular or
// bold is a family of its own ("Inter SemiBold"), so the name in the document, the embedded face and the
// layout's face always agree.
import { fontEmbeddingReport, fontFileInfo } from 'document-kit'
import { officeFont } from '../engine/office.js'

/**
 * The brand's faces that have font bytes, as `{ family, bytes, weight, style, key }`. A face that stands
 * in for an installed Office face (`office` differs from `family`) is left out: its documents name the
 * installed face, which Word, the layout (through its open stand-in) and the browser all use.
 */
export const brandFaces = (ctx) => {
  const faces = []
  const seen = new Set()
  for (const [key, spec] of Object.entries(ctx?.brand?.fonts ?? {})) {
    const bytes = ctx.fonts?.faces?.[key]?.bytes
    if (!bytes?.length || (spec.office && spec.office !== spec.family)) continue
    const face = officeFont(ctx.brand, key)
    const weight = face.bold ? 700 : 400
    const style = face.italic ? 'italic' : 'normal'
    const id = `${face.name.toLowerCase()}|${weight}|${style}`
    if (seen.has(id)) continue
    seen.add(id)
    faces.push({ family: face.name, bytes, weight, style, key })
  }
  return faces
}

/**
 * The faces the layout may draw with and put in a PDF: every face but one whose licence forbids
 * embedding (restricted, or bitmaps only), which is drawn with its stand-in and reported instead.
 */
export const layoutFaces = (faces = []) => {
  const usable = []
  const refused = []
  for (const face of faces) {
    const info = fontFileInfo(face.bytes)
    if (info.level === 'restricted' || info.bitmapOnly) refused.push(face)
    else usable.push({ family: face.family, bytes: face.bytes, weight: face.weight, style: face.style })
  }
  return {
    faces: usable,
    notices: refused.map((face) => `Printed with a substitute: ${face.family} forbids embedding in its licence, so the PDF uses a stand-in face.`)
  }
}

/**
 * What went into a Word file or a print view, by face, as brandkit records it (`brandkit.fontRequirements`):
 * the face's role, family, weight and style, whether it was embedded and why, and its licence notes.
 */
export const fontRequirements = (ctx, faces, target = 'docx') => {
  const report = fontEmbeddingReport(faces, target)
  return faces.map((face, index) => {
    const spec = ctx.brand.fonts?.[face.key] ?? {}
    const entry = report[index]
    return { role: face.key, family: face.family, weight: face.weight, style: face.style, embedded: entry.embedded, reason: entry.reason, fsType: entry.fsType ?? null, licence: spec.license ?? null, usage: spec.usage ?? null }
  })
}
