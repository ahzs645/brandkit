/**
 * Task-based selections. Each pack decides its own formats, so a person chooses what they are
 * making and never a list of file types. `logoWidths` and `symbolWidths` narrow the PNG sizes
 * made for that pack; Office rendering is independent from delivered PNG assets.
 */
export const KIT_PACKS = [
  { id: 'logos', label: 'Logos', description: 'The logo in every approved colour as SVG, PNG and PDF, with the colour files.',
    options: { rasters: true, pdfs: true, office: false, assets: true, documentation: false, logoWidths: [2048], symbolWidths: [1024] } },
  { id: 'documents', label: 'Documents & slides', description: 'Word starters, PowerPoint, the email signature, one PNG logo and the fonts.',
    options: { rasters: false, pdfs: false, office: true, assets: true, documentation: true } },
  { id: 'web', label: 'Website', description: 'CSS, design tokens, React assets, icons, fonts and a portable consumer profile.',
    options: { rasters: true, pdfs: false, office: false, assets: true, documentation: true } },
  { id: 'print', label: 'Print shop', description: 'Vector artwork, graphic PDFs, physical specifications and font licences.',
    options: { rasters: false, pdfs: true, office: false, assets: true, documentation: true } },
  { id: 'complete', label: 'Everything', description: 'All artwork, templates, documents, fonts and source files, for designers and archives.',
    options: { rasters: true, pdfs: true, office: true, assets: true, documentation: true } }
]

// Former pack ids the CLI and older scripts may still pass: presentations merged into documents.
const ALIASES = { presentations: 'documents' }
export const packId = (pack = 'complete') => {
  const id = ALIASES[pack] ?? pack
  if (!KIT_PACKS.some((item) => item.id === id)) throw new Error(`Unknown export pack: ${pack}`)
  return id
}

/**
 * Files every pack carries so the folder explains itself: the offline index and what it links,
 * the definition, and the brand's identity record. Not artwork anyone asked for, so the kit view
 * folds them into one line.
 */
export const isSupportFile = (entry) => entry.kind === 'index' || /^(README|CHANGELOG)\./.test(entry.path) ||
  ['web/brand.css', 'web/favicon.svg', 'source/brand.json', 'reference/identity-rules.json', 'reference/PROVENANCE.json', 'reference/README.md'].includes(entry.path)

export const inPack = (entry, pack = 'complete') => {
  pack = packId(pack)
  if (pack === 'complete' || isSupportFile(entry)) return true
  const path = entry.path
  // A chosen department's logo travels with any pack; planKit has already left out the others.
  if (entry.unit) return true
  // The logo and the main symbol in their approved colours. Inherited-colour SVGs are for web
  // pages, and further symbols (doodles, explorations, supporting graphics) for designers. A
  // departmental signature comes from the department folder, set for a real unit, rather than
  // here with placeholders or as a second copy of the chosen one.
  if (pack === 'logos') return (/^(logos\/(outlined|png|pdf)|symbol)\//.test(path) && !/-(currentcolor|master)\.svg$/.test(path) && !entry.furtherSymbol && !entry.departmental) || /^guidelines\/(COLOURS\.json|[^/]+\.gpl)$/.test(path)
  // Every other pack is used to make something, so it brings the fonts, profiles and originals.
  if (/^(source\/|fonts\/)/.test(path) || entry.identityReference) return true
  if (pack === 'documents') return entry.preferred === true || entry.presentation === true || /^(documents\/|official-templates\/|guidelines\/documentation)/.test(path) || /templates\/(?:png\/|pdf\/)?(?:slide|presentation)/.test(path)
  if (pack === 'web') return /^(web\/|logos\/|symbol\/|icons\/|patterns\/)/.test(path)
  if (pack === 'print') return /\.pdf$/.test(path) || /^(logos\/|symbol\/)/.test(path) || /^guidelines\/(?:documentation|COLOURS)/.test(path)
  return false
}
