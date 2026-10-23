import { BRIDGE_CHANNEL, TRANSFER_PARAM } from '../bridge.js'

let packageUrl = null
let packageSource = 'the sending app'
export const trustedPackageUrl = () => packageUrl
export const trustedPackageSource = () => packageSource
export const receivePackage = async () => {
  const location = new URL(window.location.href)
  const token = location.searchParams.get(TRANSFER_PARAM)
  if (!token) return
  const host = window.parent !== window ? window.parent : window.opener
  if (!host) throw new Error('Reopen this design from the tab that sent it.')
  const packet = await new Promise((resolve, reject) => {
    const request = () => host.postMessage({ channel: BRIDGE_CHANNEL, type: 'request', token }, window.location.origin)
    const cleanup = () => { clearInterval(retry); clearTimeout(timeout); window.removeEventListener('message', listener) }
    const listener = (event) => {
      if (event.origin !== window.location.origin || event.source !== host || event.data?.channel !== BRIDGE_CHANNEL || event.data.type !== 'package' || event.data.token !== token) return
      cleanup(); resolve(event.data)
    }
    window.addEventListener('message', listener)
    const retry = setInterval(request, 400)
    const timeout = setTimeout(() => { cleanup(); reject(new Error('The sending tab did not respond. Reopen this design from that tab.')) }, 15000)
    request()
  })
  const bytes = packet.bytes
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > 25 * 1024 * 1024) throw new Error('Invalid template package transfer.')
  packageSource = typeof packet.label === 'string' ? packet.label.slice(0, 100) : packageSource
  packageUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }))
  location.searchParams.delete(TRANSFER_PARAM)
  location.searchParams.set('url', packageUrl)
  window.history.replaceState(null, '', location)
  window.addEventListener('pagehide', () => URL.revokeObjectURL(packageUrl), { once: true })
}
