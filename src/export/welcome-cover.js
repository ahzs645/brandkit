// Optional designed cover for managed-site publications. The page's artwork (grounds, supporting
// graphic, both logos) is one image behind the page; every word is native text in a frame placed
// over it, so the cover stays editable in Word and selectable in HTML. See handover/cover-designs.js.
// It is written by document-kit as the first section of its publication (welcomeCoverSection), as every
// brandkit document is.
import { officeFont } from '../engine/office.js'
import { welcomeCoverVariant } from '../handover/cover-variants.js'
import { COVER_FRAME_KEYS, COVER_PAPERS, frameText } from '../handover/cover-designs.js'

const SCHEMA = 'brandkit/welcome-cover/2'
const MAX_IMAGE_BYTES = 25 * 1024 * 1024
const MM_PT = 72 / 25.4
const plain = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const linesOf = (value) => value.replace(/\r\n?/g, '\n').split('\n')
const finite = (value) => typeof value === 'number' && Number.isFinite(value)
const encode64 = (bytes) => {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64')
  let text = ''
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(text)
}
const decode64 = (text) => typeof Buffer !== 'undefined' ? new Uint8Array(Buffer.from(text, 'base64')) : Uint8Array.from(atob(text), (c) => c.charCodeAt(0))

/** Decode once, before Word and HTML diverge. No SVG or remote image fallback. */
const pngSource = (source) => {
  if (typeof source !== 'string') throw new Error('must be an embedded PNG data URL.')
  if (source.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 22) throw new Error('must be no larger than 25 MB.')
  const prefix = 'data:image/png;base64,'
  const payload = source.slice(prefix.length)
  if (!source.startsWith(prefix) || !payload || payload.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(payload)) throw new Error('must be an embedded PNG data URL with valid base64.')
  const bytes = decode64(payload)
  if (bytes.length > MAX_IMAGE_BYTES) throw new Error('must be no larger than 25 MB.')
  if (encode64(bytes) !== payload) throw new Error('must use valid canonical base64.')
  if (bytes.length < 45 || [137, 80, 78, 71, 13, 10, 26, 10].some((value, i) => bytes[i] !== value)) throw new Error('does not contain a PNG signature.')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const chunkName = (offset) => String.fromCharCode(...bytes.subarray(offset + 4, offset + 8))
  if (view.getUint32(8) !== 13 || chunkName(8) !== 'IHDR') throw new Error('must have a valid PNG image header.')
  const width = view.getUint32(16), height = view.getUint32(20)
  if (!width || !height || width > 32768 || height > 32768 || width * height > 100000000) throw new Error('must have positive PNG dimensions within 32768 px and 100 megapixels.')
  const depths = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] }
  if (!depths[bytes[25]]?.includes(bytes[24]) || bytes[26] !== 0 || bytes[27] !== 0 || bytes[28] > 1) throw new Error('must have a supported PNG image header.')
  let offset = 8, hasData = false, ended = false
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset), name = chunkName(offset)
    if (offset + length + 12 > bytes.length) throw new Error('contains an incomplete PNG chunk.')
    if (name === 'IDAT' && length) hasData = true
    offset += length + 12
    if (name === 'IEND') {
      if (length || offset !== bytes.length) throw new Error('must end with the PNG end marker.')
      ended = true
      break
    }
  }
  if (!hasData || !ended) throw new Error('must contain complete PNG image data and an end marker.')
  return { bytes, width, height, ratio: width / height, src: source }
}

const TEXT_LIMITS = { kicker: [60, 2, true], title: [80, 3, true], subtitle: [220, 3, false], clientName: [120, 2, true], preparedBy: [120, 1, false], dateText: [80, 1, false], status: [120, 1, false] }
const ROLES = ['title', 'body', 'label']
const ALIGN = ['left', 'right', 'center']

const inspect = (cover, profile) => {
  const problems = []
  if (!plain(cover)) return { problems: ['Welcome cover must be an object.'] }
  const keys = new Set(['schema', 'variant', 'paper', 'artwork', 'frames', 'sections', ...Object.keys(TEXT_LIMITS)])
  for (const key of Object.keys(cover)) if (!keys.has(key)) problems.push(`Welcome cover has an unsupported field: ${key}.`)
  if (cover.schema !== SCHEMA) problems.push(`Welcome cover schema must be ${SCHEMA}.`)
  try { welcomeCoverVariant(cover.variant) } catch (error) { problems.push(error.message) }
  for (const [key, [max, maxLines, required]] of Object.entries(TEXT_LIMITS)) {
    const value = cover[key]
    if (value === undefined && !required) continue
    if (typeof value !== 'string') { problems.push(`Welcome cover ${key} must be text.`); continue }
    if (value.length > max || required && !value.trim()) problems.push(`Welcome cover ${key} must be ${required ? 'non-empty and ' : ''}no longer than ${max} characters.`)
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) || value.includes('\t')) problems.push(`Welcome cover ${key} must not contain control characters.`)
    if (linesOf(value).length > maxLines) problems.push(`Welcome cover ${key} must have no more than ${maxLines} line${maxLines === 1 ? '' : 's'}.`)
  }
  if (cover.variant === 'index') {
    if (!Array.isArray(cover.sections) || cover.sections.length < 1 || cover.sections.length > 4) problems.push('An index cover needs one to four contents sections.')
    else for (const [i, section] of cover.sections.entries()) {
      if (!plain(section)) { problems.push(`Welcome cover section ${i + 1} must be an object.`); continue }
      for (const key of Object.keys(section)) if (!['title', 'description'].includes(key)) problems.push(`Welcome cover section ${i + 1} has an unsupported field: ${key}.`)
      for (const [key, max] of [['title', 24], ['description', 100]]) {
        const value = section[key]
        if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) problems.push(`Welcome cover section ${i + 1}.${key} must be non-empty single-line text of at most ${max} characters.`)
      }
    }
  } else if (cover.sections !== undefined) problems.push('Welcome cover sections are supported only by the index cover.')

  const page = COVER_PAPERS[cover.paper]
  if (!page) problems.push('Welcome cover paper must be letter or a4.')
  else if (profile?.paper && (Math.abs(profile.paper.widthMm - page[0]) > 0.5 || Math.abs(profile.paper.heightMm - page[1]) > 0.5)) problems.push(`Welcome cover was laid out for ${cover.paper}; the publication is ${profile.paper.label ?? 'another size'}.`)
  for (const role of ROLES) {
    const spec = profile?.typography?.[role]
    if (!plain(spec) || typeof spec.family !== 'string' || !spec.family.trim() || spec.family.length > 120 || /[\u0000-\u001f\u007f]/.test(spec.family)) problems.push(`Welcome cover needs a ${role} font family in its profile.`)
  }

  let artwork
  if (!plain(cover.artwork)) problems.push('Welcome cover artwork must be an image object.')
  else {
    for (const field of Object.keys(cover.artwork)) if (!['src', 'alt'].includes(field)) problems.push(`Welcome cover artwork has an unsupported field: ${field}.`)
    if (typeof cover.artwork.alt !== 'string' || !cover.artwork.alt.trim() || cover.artwork.alt.length > 240 || /[\u0000-\u001f\u007f]/.test(cover.artwork.alt)) problems.push('Welcome cover artwork.alt must be non-empty text of at most 240 characters.')
    try { artwork = pngSource(cover.artwork.src) } catch (error) { problems.push(`Welcome cover artwork ${error.message}`) }
    if (artwork && page && Math.abs(artwork.ratio - page[0] / page[1]) > 0.01) problems.push('Welcome cover artwork must have the page’s proportions; supply the full page without its text.')
  }

  if (!Array.isArray(cover.frames) || !cover.frames.length || cover.frames.length > 40) problems.push('Welcome cover needs between 1 and 40 text frames.')
  else for (const [i, item] of cover.frames.entries()) {
    const at = `Welcome cover frame ${i + 1}`
    if (!plain(item)) { problems.push(`${at} must be an object.`); continue }
    for (const field of Object.keys(item)) if (!['key', 'x', 'y', 'width', 'sizePt', 'leadingPt', 'role', 'colour', 'caps', 'trackingEm', 'align', 'heading'].includes(field)) problems.push(`${at} has an unsupported field: ${field}.`)
    if (!COVER_FRAME_KEYS.includes(item.key)) problems.push(`${at} names an unknown field.`)
    const [w, h] = page ?? [300, 300]
    if (![item.x, item.y, item.width].every(finite) || item.x < 0 || item.y < 0 || item.width <= 0 || item.x + item.width > w + 0.5 || item.y > h) problems.push(`${at} must sit within the page.`)
    if (!finite(item.sizePt) || item.sizePt < 5 || item.sizePt > 96 || !finite(item.leadingPt) || item.leadingPt < item.sizePt * 0.8 || item.leadingPt > item.sizePt * 2.5) problems.push(`${at} needs a type size of 5–96 pt and a leading of 0.8–2.5 times it.`)
    if (!ROLES.includes(item.role)) problems.push(`${at} role must be ${ROLES.join(', ')}.`)
    if (typeof item.colour !== 'string' || !/^#[0-9a-f]{6}$/i.test(item.colour)) problems.push(`${at} colour must be a six-digit hex colour.`)
    if (typeof item.caps !== 'boolean' || !finite(item.trackingEm) || Math.abs(item.trackingEm) > 0.3 || !ALIGN.includes(item.align)) problems.push(`${at} needs caps, tracking (within ±0.3 em) and an alignment.`)
    if (item.heading !== undefined && ![1, 2].includes(item.heading)) problems.push(`${at} heading must be 1 or 2.`)
  }
  return { problems, artwork, page }
}

/** Structural and image checks only; this does not verify a brand or service claim. */
export const validateWelcomeCover = (cover, profile) => inspect(cover, profile).problems

const prepare = (cover, profile) => {
  const result = inspect(cover, profile)
  if (result.problems.length) throw new Error(`Invalid welcome cover: ${result.problems.join(' ')}`)
  const frames = cover.frames.map((item) => ({ ...item, text: frameText(cover, item.key) })).filter((item) => item.text.trim())
  return { artwork: result.artwork, widthMm: result.page[0], heightMm: result.page[1], frames }
}

// A document profile contains enough face information to resolve the same Office family alias the
// embedded fonts use, when no brand is at hand.
const fontOf = (profile, role, brand) => {
  const spec = profile.typography[role]
  const key = spec.font ?? role
  return officeFont(brand ?? { fonts: { [key]: { family: spec.family, office: spec.office, weight: spec.weight, style: spec.italic ? 'italic' : 'normal' } } }, key, { weight: spec.weight, italic: spec.italic })
}

/**
 * The cover as one document-kit section, the first of its publication: no margins, the artwork floating
 * behind the whole page from the section's header, and each frame a paragraph in a text frame placed on
 * the page, set with the frame's exact leading (`{ exact }` line height). Word, the PDF layout and the
 * print view all read this one section. `styles` are the named paragraph styles the frames use (the
 * cover's headings are Heading 1 and 2 underneath, so a contents list and the navigation pane find them).
 */
export const welcomeCoverSection = async (ctx, profile, cover) => {
  const layout = prepare(cover, profile)
  const { frame, floatingImage, image, paragraph, section } = await import('document-kit')
  const pt = (mm) => Math.round(mm * MM_PT * 100) / 100
  const none = { style: 'none' }
  const body = layout.frames.map((item) => {
    const face = fontOf(profile, item.role, ctx.brand)
    // Ordinary document styles may carry a rule, tracking or spacing; the cover states its own.
    const text = { font: face.name, bold: face.bold, italic: face.italic, size: item.sizePt, color: item.colour.slice(1), allCaps: item.caps, characterSpacing: Math.round(item.sizePt * item.trackingEm * 20) / 20 }
    const content = paragraph(item.text.replace(/\r\n?/g, '\n'), {
      style: item.heading ? `CoverHeading${item.heading}` : 'CoverText', text,
      align: item.align === 'right' ? 'right' : item.align === 'center' ? 'center' : 'left',
      keepWithNext: false, keepLinesTogether: true, indent: { left: 0, right: 0, firstLine: 0 },
      borders: { top: none, bottom: none, left: none, right: none },
      spacing: { before: 0, after: 0, line: { exact: item.leadingPt } }
    })
    return frame([content], { x: pt(item.x), y: pt(item.y), width: pt(item.width) }, { wrap: 'through', space: 0 })
  })
  const width = pt(layout.widthMm)
  const height = pt(layout.heightMm)
  return {
    section: section(body, {
      page: { paper: { width, height }, margins: { top: 0, right: 0, bottom: 0, left: 0, header: 0, footer: 0 } },
      header: [floatingImage(image(layout.artwork.bytes, { width: layout.artwork.width, height: layout.artwork.height }), 'page', { alt: cover.artwork.alt })],
      footer: []
    }),
    styles: [
      { id: 'CoverHeading1', name: 'Cover Heading 1', basedOn: 'heading1', next: 'normal', text: { before: 0, after: 0, keepWithNext: false } },
      { id: 'CoverHeading2', name: 'Cover Heading 2', basedOn: 'heading2', next: 'normal', text: { before: 0, after: 0, keepWithNext: false } },
      { id: 'CoverText', name: 'Cover Text', basedOn: 'normal', next: 'normal', text: { before: 0, after: 0, characterSpacing: 0 } }
    ],
    widthMm: layout.widthMm, heightMm: layout.heightMm
  }
}
