// Correct H18's two locomotive placeholders and the card-width extension line.
// The rest of the imported page remains byte-for-byte intact, apart from metadata.
// CHROMIUM_PATH=/path/to/chromium node scripts/update-bc-hydro-manual-bce.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bceRouteIllustrations, BCE_ROUTE_SOURCE } from './brands/bc-hydro-bce-route.mjs'

const root = new URL('../', import.meta.url)
const pageFile = new URL('manuals/bc/pages/hydro/H18.svg', root)
const booksFile = new URL('manuals/bc/books.js', root)
const escape = (text) => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const unescape = (text) => text.replaceAll('&quot;', '"').replaceAll('&gt;', '>').replaceAll('&lt;', '<').replaceAll('&amp;', '&')
const number = (value) => Number(value.toFixed(6))

export const H18_BCE_NOTE = 'The two BCE route drawings use source-page vector traces: black outline on the letterhead and blue with white lettering on the card. The card-width extension line ends above the Rail signature as in the source. Other artwork and typography retain the earlier reconstruction limits.'
const isBceNote = (note) => note.startsWith('The two BCE route drawings use source-page vector traces:')

// Supplied PDF page 18 has this explicit vector stroke. The imported page's
// y2=742 mistakenly extended it through the card's locomotive and lower labels.
export const H18_CARD_WIDTH_EXTENSION = { x1: 318.96, y1: 560.16, x2: 318.96, y2: 605.52 }

// The embedded 2562 x 3311 pixel page image spans 614.88 x 794.64 pt.
// H18's 612 x 792 pt crop starts 1.44 pt from the left and 1.20 pt from the top.
// This uniform map preserves the native source registration; no visual fit is used.
export const H18_BCE_REGISTRATION = {
  sourceImagePixels: [2562, 3311],
  sourceImageRectPoints: [-1.44, -1.20, 614.88, 794.64],
  pointsPerPixel: 0.24,
  offsetPoints: [-1.44, -1.20]
}

const placements = [
  { variant: 'bce-route-outline', id: 'H18-bce-route-letterhead', legacyId: 'manual-18-4-letterhead-rail-3' },
  { variant: 'bce-route-card', id: 'H18-bce-route-card', legacyId: 'manual-18-14-business-card-rail-layout-6' }
]

// Locate complete outer groups without serializing the rest of the imported SVG.
const outerGroups = (svg) => {
  const groups = []
  let depth = 0, start = 0
  for (const match of svg.matchAll(/<\/?g\b[^>]*>/g)) {
    if (match[0].startsWith('</')) {
      if (--depth === 0) groups.push({ start, end: match.index + match[0].length })
    } else if (!match[0].endsWith('/>')) {
      if (depth++ === 0) start = match.index
    }
  }
  if (depth) throw new Error('H18 contains unbalanced artwork groups.')
  return groups
}

export function updateH18Bce(svg) {
  if (!svg.includes('id="manual-18-title"')) throw new Error('BCE correction expects manual page H18.')
  const illustrations = bceRouteIllustrations()
  for (const placement of placements) {
    const matches = outerGroups(svg).filter(({ start, end }) => {
      const group = svg.slice(start, end)
      return [placement.legacyId, placement.id].some((id) => group.includes(`id="${id}"`))
    })
    if (matches.length !== 1) throw new Error(`Expected one H18 artwork group for ${placement.variant}; found ${matches.length}.`)
    const artwork = illustrations[placement.variant]
    const [left, top] = artwork.source.cropNativePixels
    const { pointsPerPixel: scale, offsetPoints: [offsetX, offsetY] } = H18_BCE_REGISTRATION
    const x = number(left * scale + offsetX), y = number(top * scale + offsetY)
    const object = artwork.object.replaceAll('id="bce-route-', 'id="H18-bce-route-')
    const group = `<g id="${placement.id}" data-role="source-registered-bce-vector" transform="translate(${x} ${y}) scale(${scale})" aria-label="${escape(artwork.title)}">${object}</g>`
    const [{ start, end }] = matches
    svg = svg.slice(0, start) + group + svg.slice(end)
  }
  let dimensionCount = 0
  svg = svg.replace(/<line\b[^>]*\/>/g, (line) => {
    const attributes = Object.fromEntries([...line.matchAll(/([\w-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]))
    const legacy = attributes.x1 === '318' && attributes.y1 === '563' && attributes.x2 === '318' && attributes.y2 === '742'
    if (!legacy && attributes.id !== 'H18-card-width-extension') return line
    dimensionCount++
    for (const [name, value] of Object.entries(H18_CARD_WIDTH_EXTENSION)) line = line.replace(new RegExp(`\\b${name}="[^"]*"`), `${name}="${value}"`)
    if (!attributes.id) line = line.replace(/\s*\/>$/, ' id="H18-card-width-extension" />')
    return line
  })
  if (dimensionCount !== 1) throw new Error(`Expected one H18 card-width extension line; found ${dimensionCount}.`)
  let metadataCount = 0
  svg = svg.replace(/<metadata>([\s\S]*?)<\/metadata>/g, (_, encoded) => {
    metadataCount++
    const metadata = JSON.parse(unescape(encoded))
    metadata.notes = [...(metadata.notes ?? []).filter((note) => !isBceNote(note)), H18_BCE_NOTE]
    const correction = {
      id: 'bce-route-source-forms',
      date: '2026-10-30',
      generator: 'scripts/update-bc-hydro-manual-bce.mjs',
      source: { filename: BCE_ROUTE_SOURCE.filename, sha256: BCE_ROUTE_SOURCE.sha256, pdfPage: 18, printedPage: 17 },
      registration: H18_BCE_REGISTRATION,
      cardWidthExtensionLine: { source: 'Vector stroke in supplied PDF page 18', coordinatesPoints: H18_CARD_WIDTH_EXTENSION },
      note: H18_BCE_NOTE
    }
    metadata.localCorrections = [...(metadata.localCorrections ?? []).filter((item) => item.id !== correction.id), correction]
    return `<metadata>${escape(JSON.stringify(metadata))}</metadata>`
  })
  if (metadataCount !== 1) throw new Error(`Expected one H18 metadata element; found ${metadataCount}.`)
  return svg
}

function updateCatalogueNote(books) {
  const expression = /("id": "H18",[\s\S]*?"notes": \[)([\s\S]*?)(\n    \])/
  if (!expression.test(books)) throw new Error('H18 catalogue entry is missing.')
  return books.replace(expression, (_, start, content, end) => {
    const notes = JSON.parse(`[${content}]`)
    if (notes.includes(H18_BCE_NOTE)) return start + content + end
    return start + '\n' + [...notes.filter((note) => !isBceNote(note)), H18_BCE_NOTE].map((note) => `     ${JSON.stringify(note)}`).join(',\n') + end
  })
}

async function thumbnail(svg) {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  })
  try {
    const page = await browser.newPage()
    const encoded = await page.evaluate(async (svg) => {
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
      try {
        const image = new Image()
        await new Promise((done, fail) => { image.onload = done; image.onerror = fail; image.src = url })
        const canvas = document.createElement('canvas')
        canvas.width = 320
        canvas.height = Math.round(320 * 792 / 612)
        const context = canvas.getContext('2d')
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        return canvas.toDataURL('image/webp', 0.82).split(',')[1]
      } finally { URL.revokeObjectURL(url) }
    }, svg)
    return Buffer.from(encoded, 'base64')
  } finally { await browser.close() }
}

export async function writeH18BceCorrection() {
  const svg = updateH18Bce(readFileSync(pageFile, 'utf8'))
  const books = updateCatalogueNote(readFileSync(booksFile, 'utf8'))
  // Render first so a missing browser cannot leave the drawing and thumbnail out of sync.
  const webp = await thumbnail(svg)
  writeFileSync(pageFile, svg)
  writeFileSync(booksFile, books)
  writeFileSync(new URL('manuals/bc/pages/hydro/H18.webp', root), webp)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await writeH18BceCorrection()
  console.log('H18: corrected two BCE source forms and card-width extension line, recorded source registration, updated thumbnail.')
}
