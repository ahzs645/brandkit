// Versioned same-origin transport. No React or application-storage coupling.
export const BRIDGE_CHANNEL = 'template-printer:package:v1'
export const TRANSFER_PARAM = 'printer-transfer'
export const PRINTER_WEBSITE = 'https://projects.ahmadjalil.com/template-printer/'
/** A standalone deployment can fetch a published HTTP(S) package; browser blobs stay local. */
export const printerWebsiteUrl = (packageUrl, { website = PRINTER_WEBSITE } = {}) => {
  const url = new URL(website)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('The printer website must use HTTP or HTTPS.')
  url.searchParams.delete('url')
  url.searchParams.delete(TRANSFER_PARAM)
  if (packageUrl) {
    const published = new URL(packageUrl)
    if (!['http:', 'https:'].includes(published.protocol)) throw new Error('Publish the package at an HTTP or HTTPS URL, or download it and open the ZIP on the printer website.')
    url.searchParams.set('url', published.href)
  }
  return url.href
}
export const printerUrl = (base, packageUrl, { mount = 'template-printer/' } = {}) => {
  const url = new URL(mount, base)
  if (packageUrl) url.searchParams.set('url', new URL(packageUrl, base).href)
  return url.href
}
export const createPrinterSession = (base, bytes, options) => {
  if (bytes.byteLength > 25 * 1024 * 1024) throw new Error('Template packages must be 25 MB or smaller.')
  const token = crypto.randomUUID()
  const url = new URL(printerUrl(base, null, options))
  url.searchParams.set(TRANSFER_PARAM, token)
  return { token, url: url.href, bytes: new Uint8Array(bytes), label: options?.label ?? 'the sending app' }
}
export const connectPrinter = ({ session, targets, origin = globalThis.location.origin }) => {
  const listener = (event) => {
    if (event.origin !== origin || !targets().includes(event.source)) return
    if (event.data?.channel !== BRIDGE_CHANNEL || event.data.type !== 'request' || event.data.token !== session.token) return
    event.source.postMessage({ channel: BRIDGE_CHANNEL, type: 'package', token: session.token, bytes: session.bytes, label: session.label }, origin)
  }
  globalThis.addEventListener('message', listener)
  return () => globalThis.removeEventListener('message', listener)
}
