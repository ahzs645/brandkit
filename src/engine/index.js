// brandkit's engine: brand.json in, every file of a brand kit out. Plain functions over strings,
// with no DOM and no framework, so the same code runs in the app, in a host app, and in Node.

export { n, n6, escape, interpolate, humanize, slugify } from './format.js'
export { COLOUR_ROLES, colour, colourName, rgb, luminance, isDark, derive, copyContext, fill, family, face, validateBrand } from './brand.js'
export { LAYOUTS, mark, words, lockup, svgDocument, pattern, icon, logoDocument, symbolDocument, signatureDocument } from './artwork.js'
export { paintFor, paintMarkup, signatureOf, layoutSignature, signatureLockup, colourwaysOf, linesOf, departmentLines } from './signatures.js'
export { toUnits, scopeIds, wrapLines, placeLogo, motifInBox, renderTemplate, templateFields, allFields, physicalSize } from './templates.js'
export { createGuideKit, guidePages, guideSheets } from './guide.js'
export { illustrationArt, illustrationIdentity, placeIllustration } from './illustrations.js'
export { appIconSvg, faviconSvg, brandCss, tokens, reactComponent, landingHtml, indexHtml, coloursJson, gimpPalette, formatBytes } from './web.js'
export { GROUPS, groupOf, planKit, buildKit } from './kit.js'
export { STARTER_FONTS, STARTER_DEFAULTS, bakeWordmark, createStarterBrand } from './starter.js'
export { mergePatch, revisionsOf, findRevision, withRevision, approvedOnly, revisionReadme, additionsOf, changesArtwork } from './revisions.js'
export { DOCUMENT_PURPOSES, documentProfile, publicationModel, publicationLayouts, validatePublication, documentationGuide, documentationMarkdown, documentationDocumentsFor } from './documentation.js'
export { CONSUMER_PROFILE_SCHEMA, consumerProfile } from './consumer.js'
export { KIT_PACKS, inPack } from './packs.js'
export { patternLibrary } from './pattern-catalog.js'
export { assertLogoPaint, logoDimensions, identityRules } from './identity.js'
