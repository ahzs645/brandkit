// Metadata shared by downloaded kits and published documentation packs.
// A checksum identifies bytes, not approval. Artwork provenance remains separate.
import { DOCUMENTATION_VERSION } from './documentation.js'

export const mimeOf = (path) => ({
  svg: 'image/svg+xml', png: 'image/png', pdf: 'application/pdf', ico: 'image/x-icon',
  json: 'application/json', md: 'text/markdown', txt: 'text/plain', css: 'text/css', html: 'text/html',
  tsx: 'text/plain', ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
}[path.split('.').at(-1).toLowerCase()] ?? 'application/octet-stream')

export const sha256 = async (bytes) => {
  if (!globalThis.crypto?.subtle) return null
  const data = bytes instanceof Uint8Array ? bytes : new TextEncoder().encode(bytes)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, '0')).join('')
}

export const assetRecord = async (brand, path, bytes, group, entry = {}) => {
  const mime = mimeOf(path)
  const record = { id: `${brand.id}:${path}`, path, group, bytes: bytes.length, mime, sha256: await sha256(bytes) }
  if (mime === 'image/svg+xml') {
    const svg = new TextDecoder().decode(bytes)
    const box = /\bviewBox="([^"]+)"/.exec(svg)?.[1].trim().split(/[\s,]+/).map(Number)
    if (box?.length === 4 && box.every(Number.isFinite)) record.viewBox = box
    record.editable = /<text\b/.test(svg) ? 'text-and-vector' : 'vector'
  } else if (/\.(docx|pptx|html)$/.test(path)) record.editable = 'text'
  if (entry.document?.publication) {
    record.purpose = entry.document.purpose
    record.paper = entry.document.paper
    record.profileVersion = entry.document.profileVersion ?? DOCUMENTATION_VERSION
  }
  record.brandVersion = brand.version
  if (/\.(docx|pptx)$/.test(path)) record.fontDependencies = [...new Set(Object.values(brand.fonts ?? {}).map((face) => face.file).filter(Boolean))]
  if (path.startsWith('logos/') || path.startsWith('symbol/')) record.provenance = { source: brand.source ?? null, status: brand.status ?? null }
  return record
}
