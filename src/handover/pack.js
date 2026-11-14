// The client pack, composed from a handover record, two loaded brands and a set of choices: which
// documents, which of their sections, the cover and its design, the table style and the paper.
// Nothing here touches a file system or a network, so the app builds the same pack in the browser
// (a zip to download, a live preview as choices change) as the command line does on disk; the
// command line adds PDFs, which need LibreOffice.

import { consumerProfile } from '../engine/consumer.js'
import { TABLE_STYLES, documentProfile } from '../engine/documentation.js'
import { publicationDocx, publicationHtml } from '../export/publication.js'
import { fontEmbeddingPermission } from '../export/office.js'
import { sanitizeSvg } from '../printer/svg.js'
import { assertHandover } from './record.js'
import { BRAND_SECTIONS, WELCOME_SECTIONS, handoverPublications } from './publications.js'
import { WELCOME_COVER_SCHEMA, createWelcomeCover } from './cover.js'
import { DEFAULT_COVER_VARIANT, WELCOME_COVER_VARIANTS, welcomeCoverVariant } from './cover-variants.js'

export const PACK_SCHEMA = 'brandkit/managed-site-delivery/1'

/** The documents a pack can hold, in the order the pack's index lists them. */
export const PACK_DOCUMENTS = Object.freeze([
  { id: 'quickStart', file: 'quick-start', label: 'Quick start', description: 'The essential website and account details on one sheet.', eyebrow: 'START HERE' },
  { id: 'welcome', file: 'welcome-guide', label: 'Welcome guide', description: 'Access, everyday tasks, service responsibilities and support.', eyebrow: 'YOUR SERVICE' },
  { id: 'brandGuide', file: 'brand-reference', label: 'Brand reference', description: 'Your logo, colours, type and everyday file choices.', eyebrow: 'YOUR IDENTITY' },
  { id: 'frontCover', file: 'front-cover', label: 'Front cover', description: 'The welcome guide’s cover on its own, to print or send ahead.', eyebrow: 'COVER' }
].map(Object.freeze))
export { BRAND_SECTIONS, WELCOME_SECTIONS, WELCOME_COVER_VARIANTS, TABLE_STYLES }

const ALL = (list) => list.map((item) => item.id)
const json = (value) => `${JSON.stringify(value, null, 2)}\n`
const encoder = new TextEncoder()
const bytesOf = (value) => typeof value === 'string' ? encoder.encode(value) : value
const base64 = (bytes) => {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64')
  let text = ''
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(text)
}
const dataUrl = (bytes, mime) => `data:${mime};base64,${base64(bytesOf(bytes))}`
const escape = (text) => String(text ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
const hex = (buffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')
/** SHA-256 of bytes or text, as hex: Web Crypto, in the browser and in Node alike. */
export const sha256 = async (value) => hex(await globalThis.crypto.subtle.digest('SHA-256', bytesOf(value)))

const safeProfile = (ctx) => {
  const profile = consumerProfile(ctx)
  for (const logo of Object.values(profile.logos)) logo.svg = sanitizeSvg(logo.svg)
  return profile
}

/**
 * The choices for one pack. Each comes from `overrides` (the command line or the app), then the
 * record's `pack`, then the default: every document and section, no cover unless the record names
 * a design, each brand's own table style, US Letter.
 */
export const packOptions = (record, overrides = {}) => {
  const pack = record.pack ?? {}
  const pick = (key, fallback) => overrides[key] !== undefined ? overrides[key] : pack[key] !== undefined && pack[key] !== '' ? pack[key] : fallback
  const documents = pick('documents', ALL(PACK_DOCUMENTS))
  const sections = pick('sections', ALL(WELCOME_SECTIONS))
  const brandSections = pick('brandSections', ALL(BRAND_SECTIONS))
  for (const [name, list, known] of [['documents', documents, PACK_DOCUMENTS], ['sections', sections, WELCOME_SECTIONS], ['brandSections', brandSections, BRAND_SECTIONS]]) {
    if (!Array.isArray(list) || list.some((id) => !known.some((item) => item.id === id))) throw new Error(`${name} must list only ${ALL(known).join(', ')}.`)
  }
  if (!documents.length) throw new Error('A pack needs at least one document.')
  // The cover: an explicit design wins; then an explicit on or off; then the record's own design.
  let coverVariant = null
  if (overrides.coverVariant !== undefined) coverVariant = welcomeCoverVariant(overrides.coverVariant).id
  else {
    const on = overrides.cover !== undefined ? overrides.cover : pack.cover === 'on' ? true : pack.cover === 'off' ? false : undefined
    if (on === true) coverVariant = welcomeCoverVariant(record.cover?.variant || DEFAULT_COVER_VARIANT).id
    else if (on !== false && record.cover?.variant) coverVariant = welcomeCoverVariant(record.cover.variant).id
  }
  const tableStyle = pick('tableStyle', undefined)
  if (tableStyle !== undefined && !TABLE_STYLES.includes(tableStyle)) throw new Error(`Unknown table style: ${String(tableStyle)}. Choose ${TABLE_STYLES.join(', ')}.`)
  const paper = pick('paper', 'letter')
  if (!['letter', 'a4'].includes(paper)) throw new Error('paper must be letter or a4.')
  return {
    // The standalone cover goes with the cover; without a welcome guide or a cover it has nothing to show.
    documents: documents.filter((id) => id !== 'frontCover' || coverVariant),
    sections: [...sections], brandSections: [...brandSections], coverVariant, tableStyle, paper,
    issue: Boolean(overrides.issue)
  }
}

/** The palette swatches and logo variants the brand reference shows, as embedded PNG figures. */
const brandFigures = async (client, clientProfile, paper, png) => {
  const clientDocument = documentProfile(client.brand, { paper })
  const figureWidth = Math.min(174, clientDocument.paper.widthMm - clientDocument.margins.leftMm - clientDocument.margins.rightMm)
  const colours = Object.values(client.brand.colours).filter((value) => /^#[0-9a-f]{6}$/i.test(value))
  const columns = Math.min(6, colours.length)
  const paletteHeight = 92 * Math.ceil(colours.length / columns)
  const paletteSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="${paletteHeight}" viewBox="0 0 900 ${paletteHeight}">${colours.map((value, i) => `<rect x="${(i % columns) * (900 / columns)}" y="${1 + 92 * Math.floor(i / columns)}" width="${900 / columns - 7}" height="90" fill="${value}" stroke="#888" stroke-width="1"/>`).join('')}</svg>`
  const stackVariants = clientDocument.logo.minimumWidthMm > figureWidth * 370 / 840
  const variantWidth = stackVariants ? 760 : 370
  const logoOn = (key, x, y = 24) => {
    const entry = clientProfile.logos[key]
    return `<svg x="${x}" y="${y}" width="${variantWidth}" height="152" viewBox="${entry.viewBox.join(' ')}">${entry.svg.replace(/^.*?<svg\b[^>]*>/s, '').replace(/<\/svg>\s*$/, '')}</svg>`
  }
  const variantsSvg = stackVariants
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="420" viewBox="0 0 840 420"><rect width="840" height="200" fill="${clientProfile.colours.paper}"/><rect y="220" width="840" height="200" fill="${clientProfile.colours.primary}"/>${logoOn('primary', 40)}${logoOn('reverse', 40, 244)}</svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="200" viewBox="0 0 840 200"><rect width="410" height="200" fill="${clientProfile.colours.paper}"/><rect x="430" width="410" height="200" fill="${clientProfile.colours.primary}"/>${logoOn('primary', 20)}${logoOn('reverse', 450)}</svg>`
  return {
    palette: { src: dataUrl(await png(paletteSvg, 1800), 'image/png'), alt: 'Brand palette in the same order as the table below', widthMm: figureWidth, heightMm: Math.min(50, figureWidth * paletteHeight / 900) },
    ...(clientDocument.logo.minimumWidthMm <= figureWidth * variantWidth / 840 ? { logoVariants: { src: dataUrl(await png(variantsSvg, 2100), 'image/png'), alt: 'Supplied primary and reverse logos on contrasting backgrounds', caption: 'Primary on a light background · reverse on the primary background.', widthMm: figureWidth, heightMm: stackVariants ? 88 : 44 } } : {})
  }
}

/**
 * Everything a pack holds but its files: the checked record, the resolved choices, the cover and
 * the publications (only the chosen documents, with only their chosen sections). `provider` and
 * `client` are loaded brands, `{ brand, fonts }`; `png(svg, width)` renders artwork. `dpi` sets the
 * cover artwork's resolution (a live preview can use less than print's 300).
 */
export async function preparePack({ record, provider, client, options = {}, png, providerLogo, dpi = 300, figures }) {
  if (typeof png !== 'function') throw new TypeError('A PNG renderer is required to compose a pack.')
  const choices = packOptions(record, options)
  assertHandover(record, { forIssue: choices.issue })
  const clientProfile = safeProfile(client)
  const brandArt = figures ?? await brandFigures(client, clientProfile, choices.paper, png)
  const cover = choices.coverVariant ? await createWelcomeCover(provider, client, record, { png, paper: choices.paper, issue: choices.issue, variant: choices.coverVariant, dpi }) : null
  const all = handoverPublications(record, {
    providerBrand: provider.brand, clientBrand: client.brand, paper: choices.paper, providerLogo, brandFigures: brandArt,
    welcomeCover: cover?.cover, forIssue: choices.issue, sections: choices.sections, brandSections: choices.brandSections,
    ...(choices.tableStyle !== undefined ? { tableStyle: choices.tableStyle } : {})
  })
  if (cover) all.frontCover = { ...structuredClone(all.welcome), id: `${record.id}-front-cover`, title: `${all.welcome.pages[0].title} cover`, pages: [structuredClone(all.welcome.pages[0])] }
  const publications = Object.fromEntries(PACK_DOCUMENTS.filter((item) => choices.documents.includes(item.id) && all[item.id]).map((item) => [item.id, all[item.id]]))
  return { record, choices, cover, publications, figures: brandArt, clientProfile, providerProfile: safeProfile(provider) }
}

/** The brand whose style a document is set in: the brand reference is the client's, the rest the provider's. */
export const documentBrand = (id, { provider, client }) => id === 'brandGuide' ? client : provider

/** The pack's print views, by document id: what a preview shows. */
export const packHtml = (prepared, { provider, client, sourceRevision }) => Object.fromEntries(Object.entries(prepared.publications).map(([id, publication]) => {
  const ctx = { ...documentBrand(id, { provider, client }), sourceRevision }
  return [id, publicationHtml(ctx, publication)]
}))

/** The pack's own front page, linking to each document it holds. */
export const packIndex = (prepared, { provider, client, pdf = false, providerLogoSrc } = {}) => {
  const { record, choices, clientProfile, providerProfile } = prepared
  const issue = choices.issue
  const state = issue ? 'YOUR WEBSITE PACK' : record.kind === 'example' ? 'EXAMPLE / DRAFT' : 'DRAFT / FOR REVIEW'
  const fontRules = ['body', 'display'].map((role) => {
    const face = provider.fonts?.faces?.[role]
    if (!face?.bytes || !fontEmbeddingPermission(face).allowed) return ''
    const weight = provider.brand.fonts[role].weight || 400
    const otf = face.bytes[0] === 79 && face.bytes[1] === 84 && face.bytes[2] === 84 && face.bytes[3] === 79
    return `@font-face{font-family:Pack${role === 'body' ? 'Body' : 'Display'};src:url(${dataUrl(face.bytes, otf ? 'font/otf' : 'font/ttf')});font-weight:${weight};font-display:swap}`
  }).join('\n')
  const providerName = record.provider.name || provider.brand.name
  const clientName = record.client.name || client.brand.name
  const providerLogo = providerLogoSrc || dataUrl(providerProfile.logos.black.svg, 'image/svg+xml')
  const clientLogo = dataUrl(clientProfile.logos.primary.svg, 'image/svg+xml')
  const listed = PACK_DOCUMENTS.filter((item) => item.id !== 'frontCover' && prepared.publications[item.id])
  const cards = listed.map((item) => `<article class="card"><span class="eyebrow">${item.eyebrow}</span><h2>${item.label}</h2><p>${item.description}</p><a class="button" href="${item.file}.html">Open ${item.label.toLowerCase()} <span aria-hidden="true">↗</span></a><div class="downloads">${pdf ? `<a href="${item.file}.pdf" download>PDF for printing</a>` : ''}<a href="${item.file}.docx" download>Editable Word</a></div></article>`).join('')
  const coverLinks = prepared.publications.frontCover ? `<p class="cover-downloads">${prepared.publications.welcome ? 'The welcome guide includes your designed front cover. ' : ''}<a href="front-cover.html">Preview the cover</a> or download it separately: ${pdf ? '<a href="front-cover.pdf" download>PDF</a> · ' : ''}<a href="front-cover.docx" download>Editable Word</a>.</p>` : ''
  const displayWeight = Number(provider.brand.fonts.display?.weight) || 600
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escape(clientName)} — website pack</title><style>
${fontRules}
*{box-sizing:border-box}body{margin:0;background:#fff;color:#000;font:${Number(provider.brand.fonts.body?.weight) || 400} 16px/1.55 PackBody,Arial,sans-serif}a{color:inherit;text-underline-offset:4px}a:focus-visible{outline:3px solid #484848;outline-offset:5px}.wrap{width:min(1140px,calc(100% - 48px));margin:auto}header{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:26px 28px;background:#dfdfdf;border-bottom:1px solid #c8c8c8}header img{width:100px;max-height:64px;object-fit:contain}header p{font-size:12px;letter-spacing:.08em;text-align:right}.hero{padding:70px 0 52px;max-width:900px}.eyebrow{font-size:12px;letter-spacing:.1em;color:#484848}.client-plate{display:flex;width:300px;max-width:100%;aspect-ratio:3/2;background:#fff;align-items:center;justify-content:center;margin:25px 0 36px;padding:25px}.client-logo{display:block;width:100%;height:auto;max-height:100%;object-fit:contain}h1,h2{font-family:PackDisplay,PackBody,Arial,sans-serif}h1{font-size:clamp(34px,5vw,62px);font-weight:${displayWeight};line-height:1.08;letter-spacing:-.025em;margin:0 0 22px}h2{font-size:24px;line-height:1.2;font-weight:${displayWeight};margin:15px 0}.intro{font-size:19px;max-width:670px;color:#484848}.status{border-left:3px solid #000;padding:9px 16px;background:#f4f4f4;margin:22px 0 0;max-width:730px}.cards{display:grid;grid-template-columns:repeat(${Math.max(1, listed.length)},1fr);gap:20px;margin-bottom:50px}.card{border:1px solid #c8c8c8;border-radius:24px;padding:27px 24px;display:flex;flex-direction:column}.card p{color:#484848;margin:0 0 24px}.button{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#000;color:#fff;border-radius:999px;text-decoration:none;padding:13px 18px;font-size:14px;margin-top:auto}.downloads{display:flex;flex-wrap:wrap;gap:12px;font-size:12px;margin-top:20px}.print-note{max-width:760px;border-top:1px solid #c8c8c8;padding-top:26px}.print-note h2{font-size:20px}footer{display:flex;flex-wrap:wrap;justify-content:space-between;gap:16px;border-top:1px solid #c8c8c8;margin-top:50px;padding:24px 0 36px;color:#484848;font-size:12px}@media(max-width:760px){.wrap{width:calc(100% - 32px)}.hero{padding-top:38px}.cards{grid-template-columns:1fr}.client-plate{width:280px}.card{padding:25px}.hero h1{max-width:560px}}@media print{header{padding:0 0 12px}.hero{padding:24px 0}.cards{display:block}.card{break-inside:avoid;margin-bottom:15px}.button,.downloads{display:none}.print-note,footer{margin-top:15px}}
</style></head><body><div class="wrap"><header><img src="${providerLogo}" alt="${escape(providerName)}"><p>${escape(state)}<br>${escape(record.preparedAt || 'Date to confirm')} · v${escape(record.version || '1')}</p></header><main><section class="hero"><span class="eyebrow">PREPARED FOR ${escape(clientName).toUpperCase()}</span><div class="client-plate"><img class="client-logo" src="${clientLogo}" alt="${escape(clientName)}"></div><h1>Your website.<br>Start here.</h1><p class="intro">${escape(listed.length ? `${listed.map((item) => item.label.toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' and $1').replace(/^./, (c) => c.toUpperCase())}, prepared by ${providerName}.` : `Prepared by ${providerName}.`)}</p>${issue ? '' : '<p class="status">This is a sample or draft pack. Confirm the website links, account details and service terms before using it with a client.</p>'}</section><section class="cards" aria-label="Your documents">${cards}</section>${coverLinks}<section class="print-note"><h2>A copy to keep close</h2><p>Print the quick-start sheet for your desk and keep the full welcome guide with your business records. The brand reference can travel with your logo files when you prepare a document or work with a printer.</p></section></main><footer><span>Prepared by ${escape(providerName)} for ${escape(clientName)}</span><span>${escape(state)} · Keep your setup invitation separate</span></footer></div></body></html>`
}

const readMe = (prepared, { provider, client, pdf, sourceRevision, originalLogo }) => {
  const { choices, cover } = prepared
  const choice = choices.coverVariant ? welcomeCoverVariant(choices.coverVariant) : null
  return `MANAGED WEBSITE DELIVERY\n\nOpen index.html to browse the documents locally. ${pdf ? 'Print the PDF files; edit' : 'Print from the HTML views or the Word masters; edit'} the Word masters and re-export after changes. ${cover ? `${prepared.publications.welcome ? 'The welcome guide opens with a designed front cover' : 'The pack has a designed front cover'}${prepared.publications.frontCover ? ', also exported separately as front-cover' : ''}. Cover design: ${choice.id} (${choice.label}; ${choice.status}). Every word on the cover is editable text; the page artwork behind it (grounds, supporting graphic and both logos) is one image, also kept as assets/cover-artwork.svg. The cover is a document composition for review, not a previously approved brand master. ` : ''}The publication JSON files can be imported in Brandkit Documents with the matching provider or client brand open.\n\nStatus: ${choices.issue ? 'Issued from a reviewed client record' : 'DRAFT — not issued'}. This is a document pack, not a sign-in system or service agreement. Confirm operational facts, access steps, fees, rights and support terms with the client. No password or setup token belongs in these files.\n\nThe sources folder is an immutable snapshot of this build's records and brand definitions. It can include private client information. Deliver it through the agreed private channel; a public Brandkit share link is not access control. Rebuilding requires Brandkit and the original brand packs, including their fonts and licences. The assets folder contains derived client logo files; use the original kit for its full production assets and licence terms.\n\nProvider source: ${provider.brand.source || 'See source brand definition'}\nProvider artwork status: ${provider.brand.status || 'See source brand definition'}\n${originalLogo ? 'Visible provider logo: supplied original raster file, preserved without modification. The provider consumer profile separately retains the generated artwork and its source status.\n' : ''}Client source: ${client.brand.source || 'See source brand definition'}\nClient artwork status: ${client.brand.status || 'See source brand definition'}\n\nSource revision: ${sourceRevision || 'Not supplied'}\nReview layout in Word/PDF after edits. File hashes in manifest.json identify this snapshot, not its factual correctness or legal approval.\n`
}

/**
 * Every file of the pack but the PDFs and the manifest, as `[path, bytes or text]` in a stable
 * order. `provider.bytes` / `client.bytes`, when given, are the brand definitions as read, kept
 * byte for byte in sources/.
 */
export async function packFiles(prepared, { provider, client, png, pdf = false, sourceRevision, originalLogo, providerLogoSrc }) {
  const { record, publications, cover, clientProfile, providerProfile } = prepared
  const files = [
    ['sources/handover.json', json(record)],
    ['sources/provider-brand.json', provider.bytes ?? json(provider.brand)],
    ['sources/client-brand.json', client.bytes ?? json(client.brand)],
    ['sources/provider-consumer.json', json(providerProfile)],
    ['sources/client-consumer.json', json(clientProfile)]
  ]
  if (cover) files.push(['assets/cover-artwork.svg', cover.svg.artwork], ['assets/provider-logo-primary.svg', cover.svg.providerLogo])
  if (originalLogo) files.push([`assets/provider-logo-original${originalLogo.mime === 'image/png' ? '.png' : '.jpg'}`, originalLogo.bytes])
  for (const [variant, entry] of Object.entries(clientProfile.logos)) files.push([`assets/client-logo-${variant}.svg`, entry.svg], [`assets/client-logo-${variant}.png`, await png(entry.svg, 2048)])
  for (const item of PACK_DOCUMENTS) {
    const publication = publications[item.id]
    if (!publication) continue
    const ctx = { ...documentBrand(item.id, { provider, client }), sourceRevision }
    files.push([`${item.file}.publication.json`, json(publication)], [`${item.file}.html`, publicationHtml(ctx, publication)], [`${item.file}.docx`, await publicationDocx(ctx, publication, { png })])
  }
  files.push(['index.html', packIndex(prepared, { provider, client, pdf, providerLogoSrc })], ['READ-ME.txt', readMe(prepared, { provider, client, pdf, sourceRevision, originalLogo })])
  return files.map(([path, value]) => [path, bytesOf(value)])
}

/** The manifest: what was chosen, from which sources, and a hash of every file. */
export async function packManifest(prepared, files, { provider, client, sourceRevision, originalLogo, generatedAt = new Date().toISOString() }) {
  const { record, choices, cover } = prepared
  const listed = [...files].sort(([a], [b]) => a.localeCompare(b))
  return {
    schema: PACK_SCHEMA, recordId: record.id, kind: record.kind, status: choices.issue ? 'issued' : 'draft', version: record.version, generatedAt, sourceRevision: sourceRevision || null, paper: choices.paper,
    cover: cover ? WELCOME_COVER_SCHEMA : null, coverVariant: choices.coverVariant,
    documents: PACK_DOCUMENTS.map((item) => item.id).filter((id) => prepared.publications[id]), sections: choices.sections, brandSections: choices.brandSections, tableStyle: choices.tableStyle ?? null,
    provider: { id: provider.brand.id, version: provider.brand.version, sha256: await sha256(provider.bytes ?? json(provider.brand)), originalLogo: originalLogo ? { sha256: await sha256(originalLogo.bytes), format: originalLogo.mime } : null },
    client: { id: client.brand.id, version: client.brand.version, sha256: await sha256(client.bytes ?? json(client.brand)) },
    review: record.review, note: 'Validation checks the record structure and issue prerequisites. The preparer remains responsible for facts, agreements, artwork approval and final pagination.',
    files: await Promise.all(listed.map(async ([path, bytes]) => ({ path, bytes: bytes.length, sha256: await sha256(bytes) })))
  }
}

/** The whole pack in memory, manifest included: what the app zips. */
export async function composePack(args) {
  const prepared = await preparePack(args)
  const files = await packFiles(prepared, args)
  const manifest = await packManifest(prepared, files, args)
  return { prepared, manifest, files: [...files, ['manifest.json', bytesOf(json(manifest))]] }
}
