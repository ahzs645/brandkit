// Node-only delivery builder. Uses the existing Brandkit publication, font and PDF engines.
import { createHash } from 'node:crypto'
import { lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { validateBrand } from '../engine/brand.js'
import { consumerProfile } from '../engine/consumer.js'
import { documentProfile } from '../engine/documentation.js'
import { loadBrandFontsFromDisk } from '../fonts/node.js'
import { publicationDocx, publicationHtml } from '../export/publication.js'
import { createNodeRenderer, pdfFromDocx } from '../export/node.js'
import { fontEmbeddingPermission } from '../export/office.js'
import { sanitizeSvg } from '../printer/svg.js'
import { assertHandover } from './record.js'
import { handoverPublications } from './publications.js'

const json = value => `${JSON.stringify(value, null, 2)}\n`
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const escape = text => String(text ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
const data = (bytes, mime) => `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`
const slugs = { welcome: 'welcome-guide', quickStart: 'quick-start', brandGuide: 'brand-reference' }
const safeProfile = ctx => {
  const profile = consumerProfile(ctx)
  for (const logo of Object.values(profile.logos)) logo.svg = sanitizeSvg(logo.svg)
  return profile
}

async function loadBrand(file) {
  const absolute = resolve(file)
  const bytes = await readFile(absolute)
  const brand = JSON.parse(bytes)
  const problems = validateBrand(brand)
  if (problems.length) throw new Error(`Invalid brand ${basename(file)}: ${problems.join('; ')}`)
  const definitionFolder = dirname(absolute)
  const folder = basename(definitionFolder) === 'source' && basename(absolute) === 'brand.json' ? dirname(definitionFolder) : definitionFolder
  const fonts = await loadBrandFontsFromDisk(brand, folder)
  if (fonts.failures.length) throw new Error(`Required brand fonts could not be loaded: ${fonts.failures.map(({ key, error }) => `${key}: ${error.message}`).join('; ')}`)
  return { brand, fonts, bytes }
}

function viewer(record, provider, client, originalLogo, { pdf, issue }) {
  const state = issue ? 'YOUR WEBSITE PACK' : record.kind === 'example' ? 'EXAMPLE / DRAFT' : 'DRAFT / FOR REVIEW'
  const names = { welcome: ['Welcome guide', 'Access, everyday tasks, service responsibilities and support.'], quickStart: ['Quick start', 'The essential website and account details on one sheet.'], brandGuide: ['Brand reference', 'Your logo, colours, type and everyday file choices.'] }
  const fontRules = ['body', 'display'].map(role => {
    const face = provider.fonts.faces[role]
    if (!face?.bytes || !fontEmbeddingPermission(face).allowed) return ''
    const weight = provider.brand.fonts[role].weight || 400
    const mime = Buffer.from(face.bytes).subarray(0, 4).toString() === 'OTTO' ? 'font/otf' : 'font/ttf'
    return `@font-face{font-family:Pack${role === 'body' ? 'Body' : 'Display'};src:url(${data(face.bytes, mime)});font-weight:${weight};font-display:swap}`
  }).join('\n')
  const providerLogo = originalLogo || data(Buffer.from(safeProfile(provider).logos.black.svg), 'image/svg+xml')
  const clientLogo = data(Buffer.from(client.logos.primary.svg), 'image/svg+xml')
  const cards = ['quickStart', 'welcome', 'brandGuide'].map(key => `<article class="card"><span class="eyebrow">${key === 'quickStart' ? 'START HERE' : key === 'welcome' ? 'YOUR SERVICE' : 'YOUR IDENTITY'}</span><h2>${names[key][0]}</h2><p>${names[key][1]}</p><a class="button" href="${slugs[key]}.html">Open ${names[key][0].toLowerCase()} <span aria-hidden="true">↗</span></a><div class="downloads">${pdf ? `<a href="${slugs[key]}.pdf" download>PDF for printing</a>` : ''}<a href="${slugs[key]}.docx" download>Editable Word</a></div></article>`).join('')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escape(record.client.name || client.name)} — website pack</title><style>
${fontRules}
*{box-sizing:border-box}body{margin:0;background:#fff;color:#000;font:${Number(provider.brand.fonts.body?.weight) || 400} 16px/1.55 PackBody,Arial,sans-serif}a{color:inherit;text-underline-offset:4px}a:focus-visible{outline:3px solid #484848;outline-offset:5px}.wrap{width:min(1140px,calc(100% - 48px));margin:auto}header{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:26px 0;border-bottom:1px solid #c8c8c8}header img{width:100px;max-height:64px;object-fit:contain}header p{font-size:12px;letter-spacing:.08em;text-align:right}.hero{padding:70px 0 52px;max-width:900px}.eyebrow{font-size:12px;letter-spacing:.1em;color:#484848}.client-logo{display:block;width:min(360px,75%);height:auto;margin:25px 0 36px}h1,h2{font-family:PackDisplay,PackBody,Arial,sans-serif}h1{font-size:clamp(34px,5vw,62px);font-weight:${Number(provider.brand.fonts.display?.weight) || 600};line-height:1.08;letter-spacing:-.025em;margin:0 0 22px}h2{font-size:24px;line-height:1.2;font-weight:${Number(provider.brand.fonts.display?.weight) || 600};margin:15px 0}.intro{font-size:19px;max-width:670px;color:#484848}.status{border-left:3px solid #000;padding:9px 16px;background:#f4f4f4;margin:22px 0 0;max-width:730px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:50px}.card{border:1px solid #c8c8c8;border-radius:24px;padding:27px 24px;display:flex;flex-direction:column}.card p{color:#484848;margin:0 0 24px}.button{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#000;color:#fff;border-radius:999px;text-decoration:none;padding:13px 18px;font-size:14px;margin-top:auto}.downloads{display:flex;flex-wrap:wrap;gap:12px;font-size:12px;margin-top:20px}.print-note{max-width:760px;border-top:1px solid #c8c8c8;padding-top:26px}.print-note h2{font-size:20px}footer{display:flex;flex-wrap:wrap;justify-content:space-between;gap:16px;border-top:1px solid #c8c8c8;margin-top:50px;padding:24px 0 36px;color:#484848;font-size:12px}@media(max-width:760px){.wrap{width:calc(100% - 32px)}.hero{padding-top:38px}.cards{grid-template-columns:1fr}.client-logo{width:280px}.card{padding:25px}.hero h1{max-width:560px}}@media print{header{padding:0 0 12px}.hero{padding:24px 0}.cards{display:block}.card{break-inside:avoid;margin-bottom:15px}.button,.downloads{display:none}.print-note,footer{margin-top:15px}}
</style></head><body><div class="wrap"><header><img src="${providerLogo}" alt="${escape(record.provider.name || provider.brand.name)}"><p>${escape(state)}<br>${escape(record.preparedAt || 'Date to confirm')} · v${escape(record.version || '1')}</p></header><main><section class="hero"><span class="eyebrow">PREPARED FOR ${escape(record.client.name || client.name).toUpperCase()}</span><img class="client-logo" src="${clientLogo}" alt="${escape(record.client.name || client.name)}"><h1>Everything you need<br>to get started.</h1><p class="intro">Your website guide, a quick-start sheet and a practical brand reference, prepared by ${escape(record.provider.name || provider.brand.name)}.</p>${issue ? '' : '<p class="status">This is a sample or draft pack. Confirm the website links, account details and service terms before using it with a client.</p>'}</section><section class="cards" aria-label="Your documents">${cards}</section><section class="print-note"><h2>A copy to keep close</h2><p>Print the quick-start sheet for your desk and keep the full welcome guide with your business records. The brand reference can travel with your logo files when you prepare a document or work with a printer.</p></section></main><footer><span>Prepared by ${escape(record.provider.name || provider.brand.name)} for ${escape(record.client.name || client.name)}</span><span>${escape(state)} · Keep your setup invitation separate</span></footer></div></body></html>`
}

/** Build into a new or empty directory; no existing delivery is overwritten. */
export async function buildHandover({ recordPath, providerPath, clientPath, outDir, paper = 'letter', pdf = false, issue = false, providerLogoPath, sourceRevision } = {}) {
  if (!recordPath || !providerPath || !clientPath || !outDir) throw new Error('recordPath, providerPath, clientPath and outDir are required.')
  if (!['letter', 'a4'].includes(paper)) throw new Error('paper must be letter or a4.')
  const recordBytes = await readFile(resolve(recordPath))
  if (recordBytes.length > 2 * 1024 * 1024) throw new Error('A handover record must be smaller than 2 MB.')
  const record = JSON.parse(recordBytes)
  assertHandover(record, { forIssue: issue })
  const [provider, client] = await Promise.all([loadBrand(providerPath), loadBrand(clientPath)])
  const source = sourceRevision ? String(sourceRevision).trim() : undefined
  const providerCtx = { brand: provider.brand, fonts: provider.fonts, sourceRevision: source }
  const clientCtx = { brand: client.brand, fonts: client.fonts, sourceRevision: source }
  const renderer = await createNodeRenderer()
  const providerProfile = safeProfile(providerCtx)
  const clientProfile = safeProfile(clientCtx)
  let originalBytes, originalMime, providerLogo
  if (providerLogoPath) {
    originalBytes = await readFile(resolve(providerLogoPath))
    if (!originalBytes.length || originalBytes.length > 25 * 1024 * 1024) throw new Error('Provider logo must be a nonempty PNG/JPEG smaller than 25 MB.')
    originalMime = originalBytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'image/png'
      : originalBytes[0] === 255 && originalBytes[1] === 216 && originalBytes[2] === 255 ? 'image/jpeg' : null
    if (!originalMime) throw new Error('Provider logo must be an original PNG or JPEG image.')
    providerLogo = { src: data(originalBytes, originalMime), alt: `${provider.brand.name} supplied logo`, widthMm: Math.max(40, provider.brand.logoPolicy?.minimumWidthMm ?? provider.brand.lockup?.minimumHorizontalWidthMm ?? 0), heightMm: 45 }
  }
  const clientDocument = documentProfile(client.brand, { paper })
  const figureWidth = Math.min(174, clientDocument.paper.widthMm - clientDocument.margins.leftMm - clientDocument.margins.rightMm)
  const colours = Object.values(client.brand.colours).filter(hex => /^#[0-9a-f]{6}$/i.test(hex))
  const columns = Math.min(6, colours.length)
  const paletteHeight = 92 * Math.ceil(colours.length / columns)
  const paletteSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="${paletteHeight}" viewBox="0 0 900 ${paletteHeight}">${colours.map((hex, i) => `<rect x="${(i % columns) * (900 / columns)}" y="${1 + 92 * Math.floor(i / columns)}" width="${900 / columns - 7}" height="90" fill="${hex}" stroke="#888" stroke-width="1"/>`).join('')}</svg>`
  const stackVariants = clientDocument.logo.minimumWidthMm > figureWidth * 370 / 840
  const variantWidth = stackVariants ? 760 : 370
  const logoOn = (key, x, y = 24) => {
    const entry = clientProfile.logos[key]
    return `<svg x="${x}" y="${y}" width="${variantWidth}" height="152" viewBox="${entry.viewBox.join(' ')}">${entry.svg.replace(/^.*?<svg\b[^>]*>/s, '').replace(/<\/svg>\s*$/, '')}</svg>`
  }
  const variantsSvg = stackVariants
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="420" viewBox="0 0 840 420"><rect width="840" height="200" fill="${clientProfile.colours.paper}"/><rect y="220" width="840" height="200" fill="${clientProfile.colours.primary}"/>${logoOn('primary', 40)}${logoOn('reverse', 40, 244)}</svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="200" viewBox="0 0 840 200"><rect width="410" height="200" fill="${clientProfile.colours.paper}"/><rect x="430" width="410" height="200" fill="${clientProfile.colours.primary}"/>${logoOn('primary', 20)}${logoOn('reverse', 450)}</svg>`
  const brandFigures = {
    palette: { src: data(await renderer.png(paletteSvg, 1800), 'image/png'), alt: 'Brand palette in the same order as the table below', widthMm: figureWidth, heightMm: Math.min(50, figureWidth * paletteHeight / 900) },
    ...(clientDocument.logo.minimumWidthMm <= figureWidth * variantWidth / 840 ? { logoVariants: { src: data(await renderer.png(variantsSvg, 2100), 'image/png'), alt: 'Supplied primary and reverse logos on contrasting backgrounds', caption: 'Primary on a light background · reverse on the primary background.', widthMm: figureWidth, heightMm: stackVariants ? 88 : 44 } } : {})
  }
  const publications = handoverPublications(record, { providerBrand: provider.brand, clientBrand: client.brand, paper, providerLogo, brandFigures, forIssue: issue })
  const target = resolve(outDir)
  const existing = await lstat(target).catch(error => { if (error.code === 'ENOENT') return null; throw error })
  if (existing && (!existing.isDirectory() || existing.isSymbolicLink() || (await readdir(target)).length)) throw new Error('Output must be a new or empty directory; existing deliveries are never overwritten.')
  await mkdir(dirname(target), { recursive: true })
  const work = await mkdtemp(join(dirname(target), '.brandkit-handover-'))
  try {
    await mkdir(join(work, 'sources'))
    await mkdir(join(work, 'assets'))
    await writeFile(join(work, 'sources', 'handover.json'), json(record))
    await writeFile(join(work, 'sources', 'provider-brand.json'), provider.bytes)
    await writeFile(join(work, 'sources', 'client-brand.json'), client.bytes)
    await writeFile(join(work, 'sources', 'provider-consumer.json'), json(providerProfile))
    await writeFile(join(work, 'sources', 'client-consumer.json'), json(clientProfile))
    if (originalBytes) await writeFile(join(work, 'assets', `provider-logo-original${originalMime === 'image/png' ? '.png' : '.jpg'}`), originalBytes)
    for (const [variant, entry] of Object.entries(clientProfile.logos)) {
      await writeFile(join(work, 'assets', `client-logo-${variant}.svg`), entry.svg)
      await writeFile(join(work, 'assets', `client-logo-${variant}.png`), await renderer.png(entry.svg, 2048))
    }
    for (const [key, publication] of Object.entries(publications)) {
      const ctx = key === 'brandGuide' ? clientCtx : providerCtx
      const stem = slugs[key]
      await writeFile(join(work, `${stem}.publication.json`), json(publication))
      await writeFile(join(work, `${stem}.html`), publicationHtml(ctx, publication))
      const docxPath = join(work, `${stem}.docx`)
      await writeFile(docxPath, await publicationDocx(ctx, publication, renderer))
      if (pdf) await pdfFromDocx(docxPath, { outDir: work, ctx })
    }
    await writeFile(join(work, 'index.html'), viewer(record, providerCtx, clientProfile, providerLogo?.src, { pdf, issue }))
    await writeFile(join(work, 'READ-ME.txt'), `MANAGED WEBSITE DELIVERY\n\nOpen index.html to browse the documents locally. Print the PDF files; edit the Word masters and re-export after changes. The publication JSON files can be imported in Brandkit Documents with the matching provider or client brand open.\n\nStatus: ${issue ? 'Issued from a reviewed client record' : 'DRAFT — not issued'}. This is a document pack, not a sign-in system or service agreement. Confirm operational facts, access steps, fees, rights and support terms with the client. No password or setup token belongs in these files.\n\nThe sources folder is an immutable snapshot of this build's records and brand definitions. It can include private client information. Deliver it through the agreed private channel; a public Brandkit share link is not access control. Rebuilding requires Brandkit and the original brand packs, including their fonts and licences. The assets folder contains derived client logo files; use the original kit for its full production assets and licence terms.\n\nProvider source: ${provider.brand.source || 'See source brand definition'}\nProvider artwork status: ${provider.brand.status || 'See source brand definition'}\n${originalBytes ? 'Visible provider logo: supplied original raster file, preserved without modification. The provider consumer profile separately retains the generated artwork and its source status.\n' : ''}Client source: ${client.brand.source || 'See source brand definition'}\nClient artwork status: ${client.brand.status || 'See source brand definition'}\n\nSource revision: ${source || 'Not supplied'}\nReview layout in Word/PDF after edits. File hashes in manifest.json identify this snapshot, not its factual correctness or legal approval.\n`)
    const files = []
    async function inventory(folder, prefix = '') {
      for (const entry of (await readdir(folder, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
        const relative = `${prefix}${entry.name}`
        if (entry.isDirectory()) await inventory(join(folder, entry.name), `${relative}/`)
        else { const bytes = await readFile(join(folder, entry.name)); files.push({ path: relative, bytes: bytes.length, sha256: hash(bytes) }) }
      }
    }
    await inventory(work)
    const manifest = { schema: 'brandkit/managed-site-delivery/1', recordId: record.id, kind: record.kind, status: issue ? 'issued' : 'draft', version: record.version, generatedAt: new Date().toISOString(), sourceRevision: source || null, paper,
      provider: { id: provider.brand.id, version: provider.brand.version, sha256: hash(provider.bytes), originalLogo: originalBytes ? { sha256: hash(originalBytes), format: originalMime } : null },
      client: { id: client.brand.id, version: client.brand.version, sha256: hash(client.bytes) },
      review: record.review, note: 'Validation checks the record structure and issue prerequisites. The preparer remains responsible for facts, agreements, artwork approval and final pagination.', files }
    await writeFile(join(work, 'manifest.json'), json(manifest))
    await rename(work, target)
    return manifest
  } catch (error) {
    await rm(work, { recursive: true, force: true })
    throw error
  }
}
