// Brand extensions: capabilities a brand takes from packages of its own rather than from its
// brand.json, named there as `extension`. UNBC's adds social-media profile pictures (from the UNBC
// logo package) and a door-sign editor (from the door-sign package). Each loads only when a brand
// that names it is open.
//
// An extension module may export:
//   profilePictures   { label, use, shapes, size, caption(name), clipped(name, shape), render(ctx, { name, shape }) }
//   view              { label, use, load: () => import(…) }   a tab of its own; the module's
//                     default export is a React component taking { brand, fonts }

const EXTENSIONS = {
  unbc: () => import('./unbc.js')
}

/** The extension a brand names, or null. */
export const loadExtension = async (brand) => {
  const load = brand?.extension && EXTENSIONS[brand.extension]
  return load ? load() : null
}
