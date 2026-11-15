// Cover designs are document applications, not new logo masters or approved identity variants.
// Each follows the provider's published rules (First Form's DESIGN.md): see cover-designs.js.
export const WELCOME_COVER_VARIANTS = Object.freeze([
  { id: 'hero', label: 'Hero', description: 'The website on paper: the Ash bar, one rounded Black panel with the large-crop mark in Hairline, the headline at its foot, and a closing Ash panel with the client’s plate.', status: 'recommended' },
  { id: 'blocks', label: 'Stacked blocks', description: 'Full-bleed Ink with a flight of stacked blocks on the mark’s 30° axis and the logo on its Ash plate.', status: 'proposed' },
  { id: 'grid', label: 'Isometric grid', description: 'A construction drawing: Ash with the isometric grid in White and the complete mark set on it in Black.', status: 'proposed' },
  { id: 'index', label: 'Index', description: 'Type alone: the headline and the document’s contents as a ruled list, between the Ash bar and a closing Ash panel.', status: 'proposed' }
].map(Object.freeze))

export const DEFAULT_COVER_VARIANT = 'hero'

export const welcomeCoverVariant = (id = DEFAULT_COVER_VARIANT) => {
  const variant = WELCOME_COVER_VARIANTS.find(item => item.id === id)
  if (!variant) throw new Error(`Unknown cover variant: ${String(id)}. Choose ${WELCOME_COVER_VARIANTS.map(item => item.id).join(', ')}.`)
  return variant
}
