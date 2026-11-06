import { printerWebsiteUrl } from '../printer/bridge.js'
import './printer-website.css'

// The live standalone app accepts URLs or an uploaded ZIP. Keep current edits in the ZIP;
// a published source link deliberately opens the original saved package instead.
export const PrinterWebsite = ({ onDownload, disabled, sourceUrl, website }) => {
  let url, problem
  try { url = printerWebsiteUrl(null, { website }) } catch (error) { problem = error.message }
  let original
  try { if (sourceUrl) original = printerWebsiteUrl(sourceUrl, { website }) } catch { /* A local asset cannot be opened by another website. */ }
  return (
    <details className="printer-website">
      <summary>Use on the Template Printer website</summary>
      <p>Download the design, then open the ZIP there with <strong>Design → Import SVG → Open</strong>.</p>
      <div className="printer-website__actions">
        <button type="button" className="button button--quiet" disabled={disabled} onClick={onDownload}>↓ Template files (.zip)</button>
        {url && <a className="button" href={url} target="_blank" rel="noopener noreferrer">Open Template Printer website ↗</a>}
      </div>
      {problem && <p role="alert">{problem}</p>}
      {original && <p><a href={original} target="_blank" rel="noopener noreferrer">Open the published original ↗</a> with its sample data.</p>}
    </details>
  )
}
