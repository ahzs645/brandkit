// Prints a PDF the app made: the browser's own PDF viewer, in a frame off screen, opens its print
// dialog, so what prints (or is saved as PDF) is the same file as the preview and the download. Where
// the viewer cannot print from a frame, the PDF opens in a new tab to print from there.
export const printPdf = (bytes, title = 'document') => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
  const frame = document.createElement('iframe')
  frame.title = `${title} for printing`
  frame.setAttribute('aria-hidden', 'true')
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '1px', height: '1px', border: '0', opacity: '0' })
  const done = () => setTimeout(() => { frame.remove(); URL.revokeObjectURL(url) }, 60000)
  frame.onload = () => {
    try {
      frame.contentWindow.focus()
      frame.contentWindow.print()
      resolve('printed')
    } catch {
      if (window.open(url, '_blank')) resolve('opened')
      else reject(new Error('Allow pop-ups to print the PDF, or download it and print it from there.'))
    }
    done()
  }
  frame.onerror = () => { done(); reject(new Error('The PDF could not be opened for printing.')) }
  frame.src = url
  document.body.append(frame)
})
