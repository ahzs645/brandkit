// Cover applications are proposals, not new logo masters or approved identity variants.
export const WELCOME_COVER_VARIANTS = Object.freeze([
  { id: 'complete-mark', label: 'Complete mark', description: 'One complete white symbol with generous space on a Black field.', status: 'proposed' },
  { id: 'inset-frame', label: 'Inset frame', description: 'A complete black symbol centred on a contained Ash plate.', status: 'proposed' },
  { id: 'mark-pattern', label: 'Mark pattern', description: 'Three complete standard symbols in a finite, evenly spaced row.', status: 'proposed' },
  { id: 'type-only', label: 'Type only', description: 'An editable three-part contents index with no decorative symbol.', status: 'proposed' },
  { id: 'legacy-crop', label: 'Legacy crop', description: 'The original cropped supporting artwork, retained for reproducible earlier builds.', status: 'legacy' }
].map(Object.freeze))

export const welcomeCoverVariant = (id = 'legacy-crop') => {
  const variant = WELCOME_COVER_VARIANTS.find(item => item.id === id)
  if (!variant) throw new Error(`Unknown welcome cover variant: ${String(id)}. Choose ${WELCOME_COVER_VARIANTS.map(item => item.id).join(', ')}.`)
  return variant
}
