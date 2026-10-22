// Small pieces the views share.

import { useEffect, useMemo, useState } from 'react'
import { download, pdf, rasterise } from '../export/render.js'
import { physicalSize } from '../engine/templates.js'
import { aspectOf, mastheadArt } from './masthead.js'

/** An object URL for an SVG string, revoked when the string changes or the component goes. */
export const useSvgUrl = (svg) => {
  // Made and revoked in one effect: a memoised URL would be revoked by StrictMode's rehearsal
  // unmount and then handed out again.
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!svg) { setUrl(null); return undefined }
    const next = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    setUrl(next)
    // Revoked a little later: an <img> still fetching the old URL when the art changes (switching
    // brand or revision) would otherwise fail to load it.
    return () => setTimeout(() => URL.revokeObjectURL(next), 5000)
  }, [svg])
  return url
}

export const SvgImage = ({ svg, alt = '', ...props }) => {
  const url = useSvgUrl(svg)
  return url ? <img src={url} alt={alt} draggable={false} {...props} /> : null
}

const menuLogos = new Map()
const MenuArt = ({ svg, name }) => {
  const aspect = aspectOf(svg)
  return (
    <span className="menu-logo">
      {aspect && <span className="menu-logo__art" style={{ aspectRatio: aspect }} dangerouslySetInnerHTML={{ __html: svg }} />}
      {(!aspect || aspect < 1.6) && <span className="menu-logo__name">{name}</span>}
    </span>
  )
}

/**
 * A brand in the brand menu, as its logo: a built-in brand's pre-drawn file (`url`), fetched once,
 * or, for a brand made or opened here, drawn from its definition. A near-square logo (a symbol)
 * has the name beside it; until the logo arrives, the name stands in.
 */
export const MenuLogo = ({ url, brand, name }) => {
  const [svg, setSvg] = useState(() => (url ? menuLogos.get(url) ?? null : null))
  useEffect(() => {
    if (!url || menuLogos.has(url)) return undefined
    let live = true
    fetch(url).then((response) => (response.ok ? response.text() : null)).then((text) => { if (text) menuLogos.set(url, text); if (live) setSvg(text) }, () => {})
    return () => { live = false }
  }, [url])
  const drawn = useMemo(() => {
    if (url || !brand) return null
    try { return mastheadArt(brand).svg?.replace(/<svg[^>]*>/, (tag) => tag.replace(/\s(width|height|role|aria-label)="[^"]*"/g, '').replace('<svg', '<svg aria-hidden="true"')) } catch { return null }
  }, [url, brand])
  const art = svg ?? drawn
  return art ? <MenuArt svg={art} name={name} /> : <span className="menu-logo"><span className="menu-logo__name">{name}</span></span>
}

/** The brand's logo in the masthead, drawn inline in currentColor to take the ink of light and dark alike. */
export const BrandLogo = ({ brand }) => {
  const art = useMemo(() => { try { return mastheadArt(brand) } catch { return { named: true } } }, [brand])
  const aspect = aspectOf(art.svg)
  return (
    <span className="brand-logo" role="img" aria-label={brand.name}>
      {aspect && <span className="brand-logo__art" style={{ aspectRatio: aspect }} dangerouslySetInnerHTML={{ __html: art.svg.replace(/<svg[^>]*>/, (tag) => tag.replace(/\s(width|height|role|aria-label)="[^"]*"/g, '').replace('<svg', '<svg aria-hidden="true"')) }} />}
      {(art.named || !aspect) && <span className="brand-logo__name" aria-hidden="true">{brand.name}</span>}
    </span>
  )
}

export const Segmented = ({ label, value, options, onChange }) => (
  <div className="segmented" role="group" aria-label={label}>
    {options.map((option) => {
      const { value: optionValue, label: optionLabel, title } = typeof option === 'string' ? { value: option, label: option } : option
      return <button key={optionValue} type="button" title={title} aria-pressed={value === optionValue} onClick={() => onChange(optionValue)}>{optionLabel}</button>
    })}
  </div>
)

export const Field = ({ label, children, hint }) => (
  <label className="field">
    <span className="field__label">{label}</span>
    {children}
    {hint && <span className="field__hint">{hint}</span>}
  </label>
)

const viewBoxSize = (svg) => {
  const match = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg)
  return match ? { width: Number(match[1]), height: Number(match[2]) } : { width: 1000, height: 1000 }
}

/**
 * Downloads one piece of artwork in a format. `make(outline)` returns the SVG; images and PDFs ask
 * for outlined text, since neither can rely on the type being installed.
 */
export const downloadArtwork = async ({ make, name, format, width, rendered }) => {
  if (format === 'svg') return download(make(false), `${name}.svg`)
  const svg = make(true)
  if (format === 'png') return download(await rasterise(svg, width ?? Math.max(1024, viewBoxSize(svg).width)), `${name}.png`)
  if (format === 'pdf') {
    const size = rendered ? physicalSize(rendered) : { ...viewBoxSize(svg), unit: 'pt' }
    if (!rendered) { size.width *= 0.75; size.height *= 0.75 }
    return download(await pdf([{ svg, ...size }], { title: name }), `${name}.pdf`)
  }
  throw new Error(`Unknown format ${format}`)
}

/** SVG / PNG / PDF buttons, with a busy state while a file is made. */
export const Downloads = ({ make, name, width, rendered, formats = ['svg', 'png', 'pdf'], labels = {} }) => {
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const go = async (format) => {
    setBusy(format)
    setError(null)
    try { await downloadArtwork({ make, name, format, width, rendered }) } catch (problem) { setError(problem.message) } finally { setBusy(null) }
  }
  return (
    <div className="downloads">
      {formats.map((format) => (
        <button key={format} type="button" className="button button--quiet" disabled={Boolean(busy)} onClick={() => go(format)}>
          {busy === format ? '…' : '↓'} {labels[format] ?? format.toUpperCase()}
        </button>
      ))}
      {error && <span className="downloads__error" role="alert">{error}</span>}
    </div>
  )
}

/** A value kept in localStorage under `key`. */
export const useStored = (key, initial) => {
  const [value, setValue] = useState(() => {
    try { const stored = localStorage.getItem(key); return stored == null ? initial : JSON.parse(stored) } catch { return initial }
  })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* not persisted */ } }, [key, value])
  return [value, setValue]
}
