// A document's first page as a small picture: the same PDF the preview and "Download PDF" use (its
// Word file laid out in the layout worker), drawn once with PDF.js and kept as an image. Thumbnails
// are made one at a time, only once they scroll into view and `ready` says the page's own preview
// has had its turn, so a gallery never holds up the document being edited.
import { useEffect, useRef, useState } from 'react'
import { openPdfPreview } from 'document-kit/pdf-preview'
import { pdfFor } from '../export/document-pdf.js'
import { loadPdfjs } from '../export/pdfjs.js'
import './pdf-pages.css'

// One thumbnail at a time: each one is a Word file written on this thread and a layout in the worker.
let queue = Promise.resolve()
const inTurn = (job) => {
  const turn = queue.then(job)
  queue = turn.catch(() => undefined)
  return turn
}

const drawFirstPage = async (snapshot, width) => {
  const [pdf, pdfjs] = await Promise.all([pdfFor(snapshot), loadPdfjs()])
  const task = openPdfPreview(pdf, (data) => pdfjs.getDocument({ data, useSystemFonts: false, isEvalSupported: false }))
  try {
    const source = await task.promise
    const page = await source.getPage(1)
    try {
      const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      await page.render({ canvas, viewport }).promise
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('The page could not be drawn.')
      return URL.createObjectURL(blob)
    } finally { page.cleanup() }
  } finally { void task.destroy().catch(() => undefined) }
}

/**
 * `make()` returns (or resolves to) the documentSnapshot to draw; `cache` (a Map) keeps the image
 * under `cacheKey`, so a thumbnail made once is not made again while the cache lives.
 */
export const PdfThumb = ({ make, cache, cacheKey, ready = true, ratio = 8.5 / 11, pixels = 360 }) => {
  const host = useRef(null)
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState(() => ({ key: cacheKey, url: cache?.get(cacheKey) ?? null, failed: false }))
  const current = state.key === cacheKey ? state : { key: cacheKey, url: cache?.get(cacheKey) ?? null, failed: false }

  useEffect(() => {
    const element = host.current
    if (!element) return undefined
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisible(true) }, { rootMargin: '200px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || !ready || current.url || current.failed) return undefined
    let cancelled = false
    void inTurn(async () => {
      if (cancelled) return
      const known = cache?.get(cacheKey)
      const url = known ?? await drawFirstPage(await make(), pixels)
      cache?.set(cacheKey, url)
      if (!cancelled) setState({ key: cacheKey, url, failed: false })
    }).catch(() => { if (!cancelled) setState({ key: cacheKey, url: null, failed: true }) })
    return () => { cancelled = true }
  }, [visible, ready, cacheKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span ref={host} className="pdf-thumb" style={{ aspectRatio: ratio }} data-state={current.url ? 'ready' : current.failed ? 'failed' : 'pending'}>
      {current.url && <img src={current.url} alt="" draggable={false} />}
      {current.failed && <span className="pdf-thumb__note">No preview</span>}
    </span>
  )
}
