// Plays a brand's motion studies inside brandkit's own interface, from the brand's motion library
// page (`motion.page`).
//
// A page whose studies are CSS (each a `.stage[data-study]` holding its artwork, playing while the
// stage has the `play` class) is read once, and each study is drawn in a shadow root with the
// page's own styles: the same keyframes, a still final frame at rest, as many at once as a view
// needs. A page that draws its studies with a script is shown in a frame cropped to the one study,
// and driven through the page's own Replay and Pause buttons.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { stageCss } from './motion.js'

const BASE = `
:host { display: block; position: relative; overflow: hidden; }
.bk-frame { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
.bk-frame > [data-study] { width: 100% !important; height: 100% !important; max-width: none !important; aspect-ratio: auto !important; margin: 0 !important; border-radius: 0 !important; box-shadow: none !important; box-sizing: border-box; }
:host(.is-paused) *, :host(.is-paused) *::before, :host(.is-paused) *::after { animation-play-state: paused !important; }
`

const libraries = new Map()

const readLibrary = async (brand, source) => {
  const url = source.url(brand.motion.page)
  const html = new TextDecoder().decode(await source.read(brand.motion.page))
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const stages = new Map()
  for (const study of brand.motion.studies ?? []) {
    const element = doc.querySelector(`.stage[data-study="${CSS.escape(study.id)}"]`)
    if (!element?.children.length) continue
    element.classList.remove('play')
    stages.set(study.id, {
      className: element.className,
      markup: element.innerHTML,
      xml: new XMLSerializer().serializeToString(element),
      // Artwork without words plays the same anywhere; words need the brand's fonts.
      shapesOnly: !element.textContent.trim()
    })
  }
  const css = [...doc.querySelectorAll('style')].map((style) => style.textContent).join('\n')
  const scripted = stages.size < (brand.motion.studies?.length ?? 0)
  if (scripted) return { mode: 'frame', url }
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(`${stageCss(css)}\n${BASE}`)
  return { mode: 'css', url, css: css.replace(/@font-face\s*\{[^}]*\}/g, ''), sheet, stages }
}

/** The brand's motion library, read once per page: `{ mode: 'css' | 'frame', … }`, or null while it loads. */
export const useMotionLibrary = (brand, source) => {
  const key = brand?.motion?.page && source ? `${source.url(brand.motion.page)}#${brand.id}` : null
  const [state, setState] = useState(() => (key && libraries.has(key) && !(libraries.get(key) instanceof Promise) ? libraries.get(key) : null))
  useEffect(() => {
    if (!key) { setState(null); return undefined }
    let live = true
    const known = libraries.get(key)
    if (known && !(known instanceof Promise)) { setState(known); return undefined }
    setState(null)
    const pending = known ?? readLibrary(brand, source).catch((problem) => ({ mode: 'error', error: problem.message, url: source.url(brand.motion.page) }))
    libraries.set(key, pending)
    pending.then((library) => { libraries.set(key, library); if (live) setState(library) })
    return () => { live = false }
    // The page and its studies are what matter, not every edit to the brand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return state
}

/** Whether the device asks for reduced motion, kept up to date. */
export const useReducedMotion = () => {
  const query = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null
  const [reduced, setReduced] = useState(Boolean(query?.matches))
  useEffect(() => {
    if (!query) return undefined
    const change = () => setReduced(query.matches)
    query.addEventListener?.('change', change)
    return () => query.removeEventListener?.('change', change)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return reduced
}

/** Runs `again` once every finite animation under `root` has finished, then a hold; returns a cancel. */
const whenFinished = (root, again, hold = 1400) => {
  let cancelled = false
  let timer
  requestAnimationFrame(() => {
    if (cancelled || !root?.isConnected) return
    const finite = root.getAnimations({ subtree: true }).filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
    if (!finite.length) return
    Promise.all(finite.map((animation) => animation.finished)).then(() => { if (!cancelled) timer = setTimeout(again, hold) }, () => {})
  })
  return () => { cancelled = true; clearTimeout(timer) }
}

/**
 * One CSS study, drawn at `design` px wide (or wider) and scaled to its box. `play` changes to
 * replay it; `play = 0` shows the still final frame.
 */
export const CssStage = ({ library, id, play = 0, paused = false, loop = false, design = 480, className = '', label }) => {
  const host = useRef(null)
  const stageRef = useRef(null)
  const [tick, setTick] = useState(0)
  useLayoutEffect(() => {
    const element = host.current
    const shadow = element.shadowRoot ?? element.attachShadow({ mode: 'open' })
    shadow.adoptedStyleSheets = [library.sheet]
    const stage = library.stages.get(id)
    const frame = document.createElement('div')
    frame.className = 'bk-frame'
    frame.innerHTML = `<div class="${stage.className}" data-study="${id}">${stage.markup}</div>`
    shadow.replaceChildren(frame)
    stageRef.current = frame.firstElementChild
    const fit = () => {
      const { width, height } = element.getBoundingClientRect()
      if (!width || !height) return
      const scale = Math.min(1, width / design)
      frame.style.width = `${width / scale}px`
      frame.style.height = `${height / scale}px`
      frame.style.transform = `scale(${scale})`
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(element)
    return () => observer.disconnect()
  }, [library, id, design])
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return undefined
    stage.classList.remove('play')
    if (!play && !tick) return undefined
    void stage.offsetWidth
    stage.classList.add('play')
    return loop ? whenFinished(stage, () => setTick((value) => value + 1)) : undefined
  }, [play, tick, loop, library, id])
  return <div ref={host} className={`motion-stage${paused ? ' is-paused' : ''}${className ? ` ${className}` : ''}`} role="img" aria-label={label} />
}

/** The style that crops a library page to one study, filling the frame. */
const focusCss = (id) => {
  const stage = `[data-study="${id}"] .stage, .stage[data-study="${id}"]`
  return `html, body { margin: 0 !important; overflow: hidden !important; background: transparent !important; }
body * { visibility: hidden !important; }
${stage.split(', ').map((selector) => `${selector}, ${selector} *`).join(', ')} { visibility: visible !important; }
${stage} { position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important; max-width: none !important; aspect-ratio: auto !important; margin: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; z-index: 2147483647 !important; }`
}

/** One study of a page that draws its studies itself, in a frame cropped to that study. */
export const FrameStage = ({ url, id, play = 0, paused = false, loop = false, label }) => {
  const frame = useRef(null)
  const [doc, setDoc] = useState(null)
  const [tick, setTick] = useState(0)
  const attach = () => {
    try {
      const next = frame.current?.contentDocument
      if (next?.body) setDoc(next)
    } catch { setDoc(null) }
  }
  useEffect(() => {
    if (!doc) return
    let style = doc.getElementById('brandkit-focus')
    if (!style) {
      style = doc.createElement('style')
      style.id = 'brandkit-focus'
      doc.head.appendChild(style)
    }
    style.textContent = focusCss(id)
  }, [doc, id])
  useEffect(() => {
    if (!doc) return undefined
    doc.querySelector(`[data-replay="${id}"]`)?.click()
    const stage = doc.querySelector(`[data-study="${id}"] .stage, .stage[data-study="${id}"]`)
    return loop ? whenFinished(stage, () => setTick((value) => value + 1)) : undefined
  }, [doc, id, play, tick, loop])
  useEffect(() => {
    if (!doc) return
    const button = doc.getElementById('pause')
    if (button && (button.getAttribute('aria-pressed') === 'true') !== paused) button.click()
    for (const animation of doc.getAnimations()) {
      if (paused && animation.playState === 'running') animation.pause()
      else if (!paused && animation.playState === 'paused') animation.play()
    }
  }, [doc, paused])
  return <iframe ref={frame} className="motion-stage motion-stage--frame" title={label} src={url} onLoad={attach} />
}

/** A study on its own, in whichever way its library plays. */
export const StudyStage = ({ library, ...props }) => (library.mode === 'css'
  ? <CssStage library={library} {...props} />
  : <FrameStage url={library.url} {...props} />)

/**
 * A CSS study as a self-contained animated SVG, for a web page or a slide that plays SVG: the
 * study's artwork and the library's styles, playing once from the first frame. Reduced motion
 * shows the final frame, as in the library.
 */
export const animatedSvg = (library, id, { width = 800, height = 600 } = {}) => {
  const stage = library.stages.get(id)
  // The serialised stage is the root of the artwork: its first class list is the stage's own.
  const xml = stage.xml.replace(/class="([^"]*)"/, (match, names) => `class="${names} play"`)
  const css = `${library.css}\n.bk-frame > [data-study] { width: 100%; height: 100%; max-width: none; aspect-ratio: auto; margin: 0; border-radius: 0; box-shadow: none; box-sizing: border-box; }`.replace(/]]>/g, ']] >')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style><![CDATA[${css}]]></style><foreignObject x="0" y="0" width="${width}" height="${height}"><div xmlns="http://www.w3.org/1999/xhtml" class="bk-frame" style="width:${width}px;height:${height}px">${xml}</div></foreignObject></svg>\n`
}
