// Exporting a motion study: as video (MP4 or WebM, in a choice of frames) or GIF, made in the
// browser by ./motion-export.js, which loads only when something is exported.

import { useEffect, useState } from 'react'
import { download } from '../export/render.js'
import { Segmented } from './ui.jsx'

const exporter = () => import('./motion-export.js')
const SIZES = [
  { id: '16x9', label: '16 : 9', width: 1920, height: 1080 },
  { id: '1x1', label: '1 : 1', width: 1080, height: 1080 },
  { id: '4x3', label: '4 : 3', width: 1440, height: 1080 },
  { id: '9x16', label: '9 : 16', width: 1080, height: 1920 }
]
/** GIFs are kept small: the long side at 640 px, in whole even pixels. */
const gifSize = ({ width, height }) => {
  const scale = 640 / Math.max(width, height)
  return { width: Math.round((width * scale) / 2) * 2, height: Math.round((height * scale) / 2) * 2 }
}

let formatsOnce = null
const useVideoFormats = () => {
  const [formats, setFormats] = useState(null)
  useEffect(() => {
    let live = true
    formatsOnce ??= exporter().then((module) => module.videoFormats())
    formatsOnce.then((found) => { if (live) setFormats(found) }, () => { if (live) setFormats([]) })
    return () => { live = false }
  }, [])
  return formats
}

/** Runs one export at a time, with its progress and any error. */
const useExport = (brand, library, study) => {
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const run = async (label, make, name) => {
    setBusy({ label, progress: 0 })
    setError(null)
    try {
      const module = await exporter()
      const file = await make(module, (progress) => setBusy({ label, progress }))
      download(new Blob([file.bytes], { type: file.type }), `${name}.${file.extension}`)
    } catch (problem) {
      setError(problem?.message ?? String(problem))
    } finally { setBusy(null) }
  }
  const video = (format, size) => run(format.label, (module, onProgress) => module.studyVideo(library, study.id, { width: size.width, height: size.height, format, onProgress }), `${brand.id}-motion-${study.id}-${size.id}`)
  const gif = (size) => run('GIF', (module, onProgress) => module.studyGif(library, study.id, { ...gifSize(size), onProgress }), `${brand.id}-motion-${study.id}`)
  return { busy, error, video, gif }
}

const Progress = ({ busy, error }) => (
  <>
    {busy && <span className="motion-export__progress" role="status"><span style={{ width: `${Math.round(busy.progress * 100)}%` }} />Making the {busy.label}… {Math.round(busy.progress * 100)}%</span>}
    {error && <span className="downloads__error" role="alert">{error}</span>}
  </>
)

/** The full set of choices, for the Motion tab: frame, format, then export. */
export const MotionExport = ({ brand, library, study }) => {
  const formats = useVideoFormats()
  const [sizeId, setSize] = useState('16x9')
  const size = SIZES.find((entry) => entry.id === sizeId)
  const { busy, error, video, gif } = useExport(brand, library, study)
  return (
    <div className="motion-export">
      <span className="field__label">Export</span>
      <Segmented label="Frame" value={sizeId} options={SIZES.map(({ id, label }) => ({ value: id, label }))} onChange={setSize} />
      <div className="downloads">
        {(formats ?? []).map((format) => <button key={format.id} type="button" className="button button--quiet" disabled={Boolean(busy)} onClick={() => video(format, size)}>↓ {format.label}</button>)}
        <button type="button" className="button button--quiet" disabled={Boolean(busy)} onClick={() => gif(size)}>↓ GIF</button>
      </div>
      <Progress busy={busy} error={error} />
      <span className="field__hint">{size.width} × {size.height} at 30 frames a second, on the study’s ground{formats?.some((format) => format.alpha) ? ' (or transparent, as WebM)' : ''}. GIFs are {gifSize(size).width} px wide.{formats && !formats.length ? ' This browser cannot encode video; GIF still works.' : ''}</span>
    </div>
  )
}

/** Two quick buttons for a card: the first video format this browser makes, and a GIF. */
export const QuickExport = ({ brand, library, study }) => {
  const formats = useVideoFormats()
  const { busy, error, video, gif } = useExport(brand, library, study)
  const format = formats?.find((entry) => !entry.alpha)
  return (
    <>
      {format && <button type="button" className="button button--quiet" disabled={Boolean(busy)} onClick={() => video(format, SIZES[0])}>↓ {format.label}</button>}
      <button type="button" className="button button--quiet" disabled={Boolean(busy)} onClick={() => gif(SIZES[0])}>↓ GIF</button>
      <Progress busy={busy} error={error} />
    </>
  )
}
