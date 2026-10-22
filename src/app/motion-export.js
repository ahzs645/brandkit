// Motion studies as video and GIF, made in the browser.
//
// A study plays in a hidden stage with its animations paused; each frame seeks them to its time
// and copies the drawing, with every computed style written onto it, into a plain SVG. Drawing a
// plain SVG onto a canvas leaves the canvas readable (one with HTML inside, via foreignObject,
// would not), so only studies drawn in SVG export: the logo studies, and others made of shapes.
// Frames go to WebCodecs and are packed as MP4 (H.264) where the browser can encode it, else WebM
// (VP9, which can also keep a transparent ground); GIFs are encoded with gifenc.

const PROPERTIES = ['transform', 'transform-origin', 'transform-box', 'opacity', 'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'visibility', 'display', 'overflow', 'clip-path', 'mask', 'paint-order']

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()))

const style = (element, properties) => {
  const computed = getComputedStyle(element)
  // Every value is written, `none` included: with no stylesheet, `fill: none` is not the default.
  return properties.map((name) => [name, computed.getPropertyValue(name)]).filter(([, value]) => value).map(([name, value]) => `${name}:${value}`).join(';')
}

/** `inset(t r b l)` on a box of `width` × `height` as a rectangle, or null for any other clip. */
const insetRect = (value, width, height) => {
  const match = /^inset\(([^)]*)\)/.exec(value)
  if (!match) return null
  const parts = match[1].split(/\s+round\s+/)[0].trim().split(/\s+/)
  const [t, r = t, b = t, l = r] = parts.map((part, index) => (part.endsWith('%') ? (parseFloat(part) / 100) * (index % 2 ? width : height) : parseFloat(part) || 0))
  return { x: l, y: t, width: Math.max(0, width - l - r), height: Math.max(0, height - t - b) }
}

let uid = 0

/**
 * A study ready to draw frame by frame at `width` × `height`: `{ duration, svgAt(ms), dispose }`.
 * A study that ends is recorded to its end and held; a loop is recorded for two turns.
 */
export const studyFrames = async (library, id, { width: frameWidth, height: frameHeight, hold = 1200, aspect = 4 / 3 }) => {
  const stage = library.stages.get(id)
  // Libraries size their artwork for a 4 : 3 stage, so the study plays in the largest 4 : 3 box
  // that fits, centred on its ground in the frame.
  const width = Math.round(Math.min(frameWidth, frameHeight * aspect))
  const height = Math.round(width / aspect)
  const [offsetX, offsetY] = [(frameWidth - width) / 2, (frameHeight - height) / 2]
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = `position:fixed;left:${-width - 200}px;top:0;width:${width}px;height:${height}px;pointer-events:none;contain:strict`
  document.body.appendChild(host)
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.adoptedStyleSheets = [library.sheet]
  shadow.innerHTML = `<div class="bk-frame" style="width:${width}px;height:${height}px"><div class="${stage.className} play" data-study="${id}">${stage.markup}</div></div>`
  const root = shadow.querySelector('[data-study]')
  await nextFrame()
  await nextFrame()
  const animations = root.getAnimations({ subtree: true })
  for (const animation of animations) animation.pause()
  const finite = animations.map((animation) => animation.effect.getComputedTiming()).filter((timing) => Number.isFinite(timing.endTime))
  const loops = animations.map((animation) => animation.effect.getComputedTiming()).filter((timing) => !Number.isFinite(timing.endTime))
  const end = Math.max(0, ...finite.map((timing) => timing.endTime))
  const turn = Math.max(0, ...loops.map((timing) => timing.duration))
  const duration = loops.length ? Math.max(end, turn * 2) : end + hold
  const prefix = `f${(uid += 1)}`

  const svgAt = (ms, { ground = true } = {}) => {
    for (const animation of animations) animation.currentTime = ms
    const box = root.getBoundingClientRect()
    const look = getComputedStyle(root)
    const parts = [...root.querySelectorAll('svg')].filter((svg) => !svg.parentElement.closest('svg')).map((svg, index) => {
      const clone = svg.cloneNode(true)
      const live = [svg, ...svg.querySelectorAll('*')]
      const copies = [clone, ...clone.querySelectorAll('*')]
      live.forEach((element, at) => {
        copies[at].removeAttribute('class')
        copies[at].setAttribute('style', style(element, PROPERTIES))
      })
      const r = svg.getBoundingClientRect()
      Object.entries({ x: r.left - box.left + offsetX, y: r.top - box.top + offsetY, width: r.width, height: r.height }).forEach(([name, value]) => clone.setAttribute(name, value))
      // Ids must stay unique across the parts of one frame.
      let markup = new XMLSerializer().serializeToString(clone).replace(/\bid="([^"]+)"/g, `id="${prefix}-${index}-$1"`).replace(/url\((?:&quot;|")?#([^)&"]+)(?:&quot;|")?\)/g, `url(#${prefix}-${index}-$1)`)
      // The wrappers between the stage and this drawing (an ink roller's clip, a fade) move with it.
      for (let wrapper = svg.parentElement; wrapper && wrapper !== root; wrapper = wrapper.parentElement) {
        const computed = getComputedStyle(wrapper)
        const w = wrapper.getBoundingClientRect()
        const clip = insetRect(computed.clipPath, w.width, w.height)
        const clipId = `${prefix}-${index}-clip-${wrapper.tagName}-${Math.round(w.left)}`
        const defs = clip ? `<clipPath id="${clipId}"><rect x="${w.left - box.left + clip.x + offsetX}" y="${w.top - box.top + clip.y + offsetY}" width="${clip.width}" height="${clip.height}"/></clipPath>` : ''
        const attributes = [clip && `clip-path="url(#${clipId})"`, computed.opacity !== '1' && `opacity="${computed.opacity}"`].filter(Boolean).join(' ')
        if (attributes) markup = `${defs}<g ${attributes}>${markup}</g>`
      }
      return markup
    })
    const background = ground && look.backgroundColor !== 'rgba(0, 0, 0, 0)' ? `<rect width="${frameWidth}" height="${frameHeight}" fill="${look.backgroundColor}"/>` : ''
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${frameWidth}" height="${frameHeight}" viewBox="0 0 ${frameWidth} ${frameHeight}" color="${look.color}">${background}${parts.join('')}</svg>`
  }
  return { duration, svgAt, dispose: () => host.remove() }
}

const draw = async (context, svg) => {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    context.clearRect(0, 0, context.canvas.width, context.canvas.height)
    context.drawImage(image, 0, 0, context.canvas.width, context.canvas.height)
  } finally { URL.revokeObjectURL(url) }
}

const supported = async (config) => {
  if (typeof VideoEncoder === 'undefined') return false
  try { return (await VideoEncoder.isConfigSupported(config)).supported } catch { return false }
}

/** The video formats this browser can make: MP4 (H.264), WebM (VP9), and WebM with a transparent ground. */
export const videoFormats = async ({ width = 1920, height = 1080 } = {}) => {
  const base = { width, height, bitrate: 8_000_000, framerate: 30 }
  const formats = []
  if (await supported({ ...base, codec: 'avc1.640028' })) formats.push({ id: 'mp4', label: 'MP4', extension: 'mp4', codec: 'avc1.640028' })
  if (await supported({ ...base, codec: 'vp09.00.40.08' })) formats.push({ id: 'webm', label: 'WebM', extension: 'webm', codec: 'vp09.00.40.08' })
  if (await supported({ ...base, codec: 'vp09.00.40.08', alpha: 'keep' })) formats.push({ id: 'webm-alpha', label: 'WebM, transparent', extension: 'webm', codec: 'vp09.00.40.08', alpha: true })
  return formats
}

/** A study as a video file's bytes and type. `onProgress(0…1)` follows the frames. */
export const studyVideo = async (library, id, { width, height, format, fps = 30, onProgress }) => {
  const frames = await studyFrames(library, id, { width, height })
  try {
    const mp4 = format.id === 'mp4'
    const { Muxer, ArrayBufferTarget } = mp4 ? await import('mp4-muxer') : await import('webm-muxer')
    const target = new ArrayBufferTarget()
    const muxer = mp4
      ? new Muxer({ target, video: { codec: 'avc', width, height }, fastStart: 'in-memory' })
      : new Muxer({ target, video: { codec: 'V_VP9', width, height, frameRate: fps, alpha: Boolean(format.alpha) } })
    let failure = null
    const encoder = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (problem) => { failure = problem } })
    encoder.configure({ codec: format.codec, width, height, bitrate: 8_000_000, framerate: fps, ...(format.alpha ? { alpha: 'keep' } : {}) })
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d')
    const count = Math.max(1, Math.round((frames.duration / 1000) * fps))
    for (let index = 0; index < count; index += 1) {
      if (failure) throw failure
      await draw(context, frames.svgAt((index * 1000) / fps, { ground: !format.alpha }))
      const frame = new VideoFrame(canvas, { timestamp: Math.round((index * 1e6) / fps), duration: Math.round(1e6 / fps), ...(format.alpha ? {} : { alpha: 'discard' }) })
      encoder.encode(frame, { keyFrame: index % (fps * 2) === 0 })
      frame.close()
      while (encoder.encodeQueueSize > 8) await new Promise((resolve) => setTimeout(resolve, 4))
      onProgress?.((index + 1) / count)
    }
    await encoder.flush()
    if (failure) throw failure
    encoder.close()
    muxer.finalize()
    return { bytes: new Uint8Array(target.buffer), type: mp4 ? 'video/mp4' : 'video/webm', extension: format.extension }
  } finally { frames.dispose() }
}

/** A study as an animated GIF, for chat and email where video does not play. */
export const studyGif = async (library, id, { width = 640, height = 360, fps = 25, onProgress }) => {
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc')
  const frames = await studyFrames(library, id, { width, height })
  try {
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d', { willReadFrequently: true })
    const gif = GIFEncoder()
    const count = Math.max(1, Math.round((frames.duration / 1000) * fps))
    for (let index = 0; index < count; index += 1) {
      await draw(context, frames.svgAt((index * 1000) / fps))
      const { data } = context.getImageData(0, 0, width, height)
      const palette = quantize(data, 256)
      gif.writeFrame(applyPalette(data, palette), width, height, { palette, delay: Math.round(1000 / fps) })
      onProgress?.((index + 1) / count)
      if (index % 4 === 3) await new Promise((resolve) => setTimeout(resolve, 0))
    }
    gif.finish()
    return { bytes: gif.bytes(), type: 'image/gif', extension: 'gif' }
  } finally { frames.dispose() }
}
