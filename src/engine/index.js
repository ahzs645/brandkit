// brandkit's engine: brand.json in, every file of a brand kit out. Plain functions over strings,
// with no DOM and no framework, so the same code runs in the app, in a host app, and in Node.

export { n, n6, escape, interpolate, humanize, slugify } from './format.js'
export { COLOUR_ROLES, colour, colourName, rgb, luminance, isDark, derive, copyContext, fill, family, face, validateBrand } from './brand.js'
export { LAYOUTS, mark, words, lockup, svgDocument, pattern, icon, logoDocument, symbolDocument } from './artwork.js'
export { toUnits, scopeIds, placeLogo, motifInBox, renderTemplate, templateFields, allFields, physicalSize } from './templates.js'
export { createGuideKit, guidePages, guideSheets } from './guide.js'
export { appIconSvg, faviconSvg, brandCss, tokens, reactComponent, landingHtml, indexHtml, coloursJson, gimpPalette, formatBytes } from './web.js'
export { GROUPS, groupOf, planKit, buildKit } from './kit.js'
export { STARTER_FONTS, STARTER_DEFAULTS, bakeWordmark, createStarterBrand } from './starter.js'
