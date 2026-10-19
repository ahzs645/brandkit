// Small pieces the views share.

import { useEffect, useMemo, useState } from 'react'
import { download, pdf, rasterise } from '../export/render.js'
import { physicalSize } from '../engine/templates.js'
import { logoDocument, symbolDocument } from '../engine/artwork.js'

/** An object URL for an SVG string, revoked when the string changes or the component goes. */
export const useSvgUrl = (svg) => {
  // Made and revoked in one effect: a memoised URL would be revoked by StrictMode's rehearsal
  // unmount and then handed out again.
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!svg) { setUrl(null); return undefined }
    const next = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [svg])
  return url
}

export const SvgImage = ({ svg, alt = '', ...props }) => {
  const url = useSvgUrl(svg)
  return url ? <img src={url} alt={alt} draggable={false} {...props} /> : null
}

const aspectOf = (svg) => {
  const [, , width, height] = svg?.match(/viewBox="([^"]+)"/)?.[1].split(/[\s,]+/).map(Number) ?? []
  return width && height ? width / height : null
}

/**
 * The art for a masthead: the horizontal logo; for a brand of signatures, the first that is not
 * set for a department and is wide enough to read 26 px tall; failing both, the symbol, with the
 * name beside it.
 */
const mastheadArt = (brand) => {
  if (brand.families?.length) return { svg: logoDocument({ brand }, { family: brand.families[0].id, layout: 'horizontal', colourKey: 'currentColor' }) }
  for (const signature of brand.signatures ?? []) {
    if (signature.departmental) continue
    const svg = logoDocument({ brand }, { signature: signature.id, colour: 'currentColor' })
    if (aspectOf(svg) >= 2.5) return { svg }
  }
  return { svg: brand.symbol ? symbolDocument({ brand }, { colourKey: 'currentColor' }) : null, named: true }
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
