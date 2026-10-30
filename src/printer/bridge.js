// Links to the standalone Template Printer website. brandkit renders the printer itself as a
// component (vendor/template-printer, src/app/views/TemplatePrinter.jsx), so nothing here frames
// it or posts packages between windows; a package goes to another site only as a published URL.
export const PRINTER_WEBSITE = 'https://projects.ahmadjalil.com/template-printer/'
/** A standalone deployment can fetch a published HTTP(S) package; browser blobs stay local. */
export const printerWebsiteUrl = (packageUrl, { website = PRINTER_WEBSITE } = {}) => {
  const url = new URL(website)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('The printer website must use HTTP or HTTPS.')
  url.searchParams.delete('url')
  url.searchParams.delete('printer-transfer')
  if (packageUrl) {
    const published = new URL(packageUrl)
    if (!['http:', 'https:'].includes(published.protocol)) throw new Error('Publish the package at an HTTP or HTTPS URL, or download it and open the ZIP on the printer website.')
    url.searchParams.set('url', published.href)
  }
  return url.href
}
