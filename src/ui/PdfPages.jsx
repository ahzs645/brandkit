// A document's pages as they print: the PDF its Word file lays out to (the same bytes "Download PDF"
// and "Print" use), drawn with PDF.js. While a change is laid out the pages already shown stay; a page
// is drawn only near the visible area, and lets its pixels go when scrolled away. Ported from
// nalsreport's PrintPaper.
import { useEffect, useRef, useState } from 'react'
import { openPdfPreview } from 'document-kit/pdf-preview'
import { pdfFor } from '../export/document-pdf.js'
import { loadPdfjs } from '../export/pdfjs.js'
import './pdf-pages.css'

const PX_PER_PT = 96 / 72
const SETTLE_MS = 600

const closePdf = (task) => { void task?.destroy().catch(() => undefined) }

/** Keeps the current PDF visible while preparing the latest one asked for. */
const previewLoop = (show, fail) => {
  let latest, active, pending
  let running = false
  let disposed = false
  const run = async () => {
    const target = latest
    if (!target || running || disposed) return
    running = true
    try {
      const [pdf, pdfjs] = await Promise.all([pdfFor(target), loadPdfjs()])
      if (disposed || latest !== target) return
      pending = openPdfPreview(pdf, (data) => pdfjs.getDocument({ data, useSystemFonts: false, isEvalSupported: false }))
      const source = await pending.promise
      if (disposed || latest !== target) return
      closePdf(active)
      active = pending
      pending = undefined
      show({ target, pdf, source })
    } catch (error) {
      if (!disposed && latest === target) fail({ target, message: error instanceof Error ? error.message : 'The PDF could not be opened.' })
    } finally {
      closePdf(pending)
      pending = undefined
      running = false
      if (!disposed && latest !== target) void run()
    }
  }
  return {
    request (target) { latest = target; void run() },
    dispose () { disposed = true; closePdf(active); closePdf(pending); pending = undefined }
  }
}

const PdfPage = ({ source, number, width, height }) => {
  const host = useRef(null)
  const [visible, setVisible] = useState(false)
  const [failed, setFailed] = useState(null)

  useEffect(() => {
    const element = host.current
    if (!element) return undefined
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '400px 0px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const element = host.current
    if (!element) return undefined
    if (!visible) { element.replaceChildren(); return undefined }
    let cancelled = false
    let task
    void (async () => {
      try {
        const page = await source.getPage(number)
        if (cancelled) return
        const atSize = page.getViewport({ scale: 1 })
        const deviceScale = Math.min(window.devicePixelRatio || 1, 2)
        const viewport = page.getViewport({ scale: width * deviceScale / atSize.width })
        const canvas = document.createElement('canvas')
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        task = page.render({ canvas, viewport })
        try { await task.promise } finally { page.cleanup() }
        if (cancelled) return
        element.replaceChildren(canvas)
        setFailed(null)
      } catch {
        if (!cancelled) setFailed({ source, width })
      }
    })()
    return () => { cancelled = true; task?.cancel() }
  }, [source, number, visible, width])

  return (
    <div className="pdf-pages__page" role="img" aria-label={`Page ${number} of ${source.numPages}`} style={{ width, height }}>
      <div className="pdf-pages__canvas" ref={host} />
      {failed?.source === source && failed.width === width && <span className="pdf-pages__error">Page {number} could not be drawn.</span>}
    </div>
  )
}

/**
 * The pages of `snapshot` (a documentSnapshot), fitted to the width they are given. `immediate` lays
 * out without waiting for typing to settle (a document opened, not edited).
 */
export const PdfPages = ({ snapshot, label = 'Pages as printed', immediate = false, onView }) => {
  const [view, setView] = useState(null)
  const [failure, setFailure] = useState(null)
  const [room, setRoom] = useState(0)
  const loop = useRef(null)
  const box = useRef(null)

  useEffect(() => {
    const started = previewLoop(setView, setFailure)
    loop.current = started
    return () => { started.dispose(); loop.current = null }
  }, [])

  useEffect(() => {
    if (!snapshot) return undefined
    const timer = setTimeout(() => loop.current?.request(snapshot), immediate || !view ? 0 : SETTLE_MS)
    return () => clearTimeout(timer)
  }, [snapshot, immediate]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const element = box.current
    if (!element) return undefined
    const observer = new ResizeObserver(() => setRoom(element.clientWidth))
    observer.observe(element)
    setRoom(element.clientWidth)
    return () => observer.disconnect()
  }, [])

  useEffect(() => { if (view) onView?.(view.pdf) }, [view]) // eslint-disable-line react-hooks/exhaustive-deps

  const error = failure?.target === snapshot ? failure.message : undefined
  const updating = snapshot && view?.target !== snapshot && !error
  return (
    <div className="pdf-pages" ref={box}>
      {updating && <p className="pdf-pages__status" role="status">{view ? 'Updating the pages…' : 'Laying out the pages…'}</p>}
      {error && <p className="notice notice--error" role="alert">The pages could not be laid out: {error}</p>}
      {!!view?.pdf.notices?.length && <div className="notice pdf-pages__notices" role="note">{view.pdf.notices.map((notice) => <p key={notice}>{notice}</p>)}</div>}
      {view && room > 0
        ? <div className="pdf-pages__list" aria-label={label} data-pages={view.source.numPages}>
          {view.pdf.pageSizes.map(({ widthPt, heightPt }, index) => {
            const width = Math.min(room - 24, widthPt * PX_PER_PT)
            return <PdfPage key={index} source={view.source} number={index + 1} width={width} height={width * heightPt / widthPt} />
          })}
        </div>
        : !error && <div className="pdf-pages__skeleton" />}
    </div>
  )
}
