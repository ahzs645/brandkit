// Brand extensions: capabilities a brand takes from a package of its own rather than from its
// brand.json, named there as `extension` (UNBC's social-media profile pictures come from the
// UNBC logo package). Each loads only when a brand that names it is open.

const EXTENSIONS = {
  'unbc-logo': () => import('./unbc-logo.js')
}

/** The extension a brand names, or null. */
export const loadExtension = async (brand) => {
  const load = brand?.extension && EXTENSIONS[brand.extension]
  return load ? load() : null
}
