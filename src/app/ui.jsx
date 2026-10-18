// Small pieces the views share.

import { useEffect, useState } from 'react'
import { download, pdf, rasterise } from '../export/render.js'
import { physicalSize } from '../engine/templates.js'

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
