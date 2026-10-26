/** Task-based selections. Office rendering is independent from delivered PNG assets. */
export const KIT_PACKS = [
  { id: 'complete', label: 'Complete brand kit', description: 'All artwork, templates, documents, fonts and source files.', options: { rasters: true, pdfs: true, office: true, assets: true, documentation: true } },
  { id: 'documents', label: 'Write a document', description: 'Editable Word starters, printable HTML, document profiles, logos and fonts.', options: { rasters: false, pdfs: false, office: true, assets: true, documentation: true } },
  { id: 'presentations', label: 'Make a presentation', description: 'PowerPoint layouts, slide artwork, logos and fonts.', options: { rasters: false, pdfs: false, office: true, assets: true, documentation: false } },
  { id: 'web', label: 'Build a website', description: 'CSS, design tokens, React assets, icons, fonts and a portable consumer profile.', options: { rasters: true, pdfs: false, office: false, assets: true, documentation: true } },
  { id: 'print', label: 'Send to a printer', description: 'Vector artwork, graphic PDFs, physical specifications and font licences.', options: { rasters: false, pdfs: true, office: false, assets: true, documentation: true } }
]

export const inPack = (entry, pack = 'complete') => {
  if (!KIT_PACKS.some((item) => item.id === pack)) throw new Error(`Unknown export pack: ${pack}`)
  if (pack === 'complete' || entry.kind === 'index') return true
  const path = entry.path
  const essential = /^(source\/|fonts\/)/.test(path) || /^(README|CHANGELOG)\./.test(path) || ['web/brand.css', 'web/favicon.svg', 'reference/identity-rules.json', 'reference/PROVENANCE.json', 'reference/README.md'].includes(path)
  if (essential || entry.identityReference) return true
  if (pack === 'documents') return /^(logos\/|symbol\/|documents\/|official-templates\/|guidelines\/documentation)/.test(path) && !/\.pptx$/.test(path)
  if (pack === 'presentations') return entry.presentation === true || /^(logos\/|symbol\/)/.test(path) || /\.pptx$/.test(path) || /templates\/(?:png\/|pdf\/)?(?:slide|presentation)/.test(path)
  if (pack === 'web') return /^(web\/|logos\/|symbol\/|icons\/|patterns\/)/.test(path)
  if (pack === 'print') return /\.pdf$/.test(path) || /^(logos\/|symbol\/)/.test(path) || /^guidelines\/(?:documentation|COLOURS)/.test(path)
  return false
}
