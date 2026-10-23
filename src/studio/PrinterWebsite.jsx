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
      <summary>Use on the Template Printer website ↗</summary>
      <p>Download your filled design, then open the ZIP in Template Printer using <strong>Design → Import SVG → Open</strong>. You can edit it, manage people, export and print there.</p>
      <div className="printer-website__actions">
        <button type="button" className="button button--quiet" disabled={disabled} onClick={onDownload}>↓ Template files (.zip)</button>
        {url && <a className="button" href={url} target="_blank" rel="noopener noreferrer">Open Template Printer website ↗</a>}
      </div>
      {problem && <p role="alert">{problem}</p>}
      <p>The ZIP includes the artwork, fonts, fields, both sides and variants. Unzip it for the source folder. SVG, PNG and PDF exports are also available in Brand Kit.</p>
      {original && <p><a href={original} target="_blank" rel="noopener noreferrer">Open published original directly ↗</a> — uses its saved sample data. Download the ZIP above to take your current changes.</p>}
    </details>
  )
}
