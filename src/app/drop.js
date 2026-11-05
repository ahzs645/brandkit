// Dropping a brand onto the app: a brand pack, a brand folder or kit zipped, or a brand.json,
// dragged from the desktop anywhere onto the page, opens as Open… would open it.
//
// The page-wide drop stands aside for what other parts of the app take: a drop onto a file input
// (a document's screenshot, a template's photo) goes to that input, a drop another handler has
// already taken is left alone, and dragged images are never treated as brands.

import { useEffect, useRef, useState } from 'react'

/** Whether a dragged item could be a brand: a zip or JSON, or a file the browser cannot type. */
const brandLike = (type) => !type || /zip|json/i.test(type) || type === 'application/octet-stream'
const isBrandFile = (file) => /\.(zip|json)$/i.test(file.name) || /zip|json/i.test(file.type)

const draggingFiles = (event) => [...(event.dataTransfer?.types ?? [])].includes('Files')
const onFileInput = (event) => Boolean(event.target?.closest?.('input[type="file"]'))
const draggedBrand = (event) => {
  const items = [...(event.dataTransfer?.items ?? [])].filter((item) => item.kind === 'file')
  // While dragging, browsers give types but not names; some give no items at all.
  return items.length === 0 || items.some((item) => brandLike(item.type))
}

/**
 * Listens for brands dropped on the page while `enabled`. Calls `onFile(file)` with the first
 * dropped file that can be a brand, or `onReject(message)` for a drop of something else.
 * Returns whether a brand is being dragged over the page, for the drop overlay.
 */
export const useBrandDrop = ({ enabled, onFile, onReject }) => {
  const [dragging, setDragging] = useState(false)
  const depth = useRef(0)
  const handlers = useRef({ onFile, onReject })
  handlers.current = { onFile, onReject }

  useEffect(() => {
    if (!enabled) { setDragging(false); depth.current = 0; return undefined }
    const take = (event) => enabled && draggingFiles(event) && !event.defaultPrevented && !onFileInput(event) && draggedBrand(event)
    const enter = (event) => {
      if (!take(event)) return
      event.preventDefault()
      depth.current += 1
      setDragging(true)
    }
    const over = (event) => {
      if (!take(event)) return
      // Without this the browser opens the file itself instead of letting the page take it.
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
    }
    const leave = (event) => {
      if (!draggingFiles(event)) return
      depth.current = Math.max(0, depth.current - 1)
      if (depth.current === 0) setDragging(false)
    }
    const drop = (event) => {
      depth.current = 0
      setDragging(false)
      if (!take(event)) return
      event.preventDefault()
      const files = [...(event.dataTransfer?.files ?? [])]
      const file = files.find(isBrandFile)
      if (file) handlers.current.onFile(file)
      else if (files.length) handlers.current.onReject?.(`${files[0].name} is not a brand. Drop a brand pack (.zip), a brand folder or kit zipped, or a brand.json.`)
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragover', over)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragover', over)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', drop)
    }
  }, [enabled])

  return dragging
}
