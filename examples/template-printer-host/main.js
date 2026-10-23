// The public entry points work in a plain JavaScript host, without brandkit's React app.
import { connectPrinter, createPrinterSession, printerUrl } from 'brandkit/printer/bridge'
import { readPrinterPackage } from 'brandkit/printer'
import exampleUrl from '../../brands/overtheedge/templates/staff-card.zip?url'

const base = new URL(import.meta.env.BASE_URL, location.origin)
const frame = document.getElementById('printer')
const status = document.getElementById('status')
let disconnect = () => {}

const open = (bytes) => {
  const { manifest } = readPrinterPackage(bytes)
  const session = createPrinterSession(base, bytes, { label: 'the host example' })
  disconnect()
  disconnect = connectPrinter({ session, targets: () => [frame.contentWindow] })
  frame.src = session.url
  status.textContent = `${manifest.name}: ${manifest.sides.back ? 'front and back' : 'front'}, ${manifest.fonts?.length ?? 0} fonts.`
}
const run = async (task) => { try { await task() } catch (error) { status.textContent = error.message } }
document.getElementById('example').onclick = () => run(async () => {
  const response = await fetch(exampleUrl)
  if (!response.ok) throw new Error('The example package could not be loaded.')
  open(new Uint8Array(await response.arrayBuffer()))
})
document.getElementById('package').onchange = (event) => run(async () => {
  const file = event.target.files?.[0]
  if (file) open(new Uint8Array(await file.arrayBuffer()))
})
document.getElementById('library').onclick = () => { disconnect(); frame.src = printerUrl(base); status.textContent = '' }
frame.src = printerUrl(base)
window.addEventListener('pagehide', () => disconnect(), { once: true })
