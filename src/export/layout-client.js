// Starts the layout worker on first use and returns the PDF it lays out. The worker (and with it the
// layout engine and its fonts) is its own chunk: nothing on the app's first load pulls it in.

let worker
let nextId = 1
const pending = new Map()

const layoutWorker = () => {
  if (worker) return worker
  const started = new Worker(new URL('./layout.worker.js', import.meta.url), { type: 'module' })
  started.onmessage = ({ data }) => {
    const job = pending.get(data.id)
    if (!job) return
    pending.delete(data.id)
    if (data.ok) job.resolve(data.pdf)
    else job.reject(new Error(data.error))
  }
  started.onerror = (event) => {
    event.preventDefault()
    const error = new Error(event.message || 'The layout could not be started.')
    for (const job of pending.values()) job.reject(error)
    pending.clear()
    started.terminate()
    worker = undefined
  }
  worker = started
  return started
}

/**
 * The Word file `docx` laid out as a PDF in the worker: `{ bytes, pageCount, pageSizes, pageText, notices }`.
 * `options` are layoutDocument's (`title`, `namedFonts`). The caller's bytes are copied, never transferred.
 */
export const layoutInWorker = (docx, options = {}) => new Promise((resolve, reject) => {
  const id = nextId++
  const copy = docx.slice().buffer
  pending.set(id, { resolve, reject })
  try {
    layoutWorker().postMessage({ id, docx: copy, options }, [copy])
  } catch (error) {
    pending.delete(id)
    reject(error)
  }
})
