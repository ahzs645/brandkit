import { useMemo, useState } from 'react'
import { buildKit, GROUPS, planKit } from '../../engine/kit.js'
import { createBrowserRenderer, download, zip } from '../../export/render.js'
import { formatBytes } from '../../engine/web.js'

const KIND_LABEL = { text: 'vector or text', png: 'image', pdf: 'PDF', ico: 'icon', asset: 'supplied', index: 'index' }

/** The whole kit: what it will contain, then every file made here and zipped. */
export const Kit = ({ brand, fonts, source }) => {
  const [options, setOptions] = useState({ rasters: true, pdfs: true, assets: true })
  const [progress, setProgress] = useState(null)
  const [result, setResult] = useState(null)
  const plan = useMemo(() => planKit(brand, options), [brand, options])
  const groups = GROUPS.map((group) => [group, plan.filter((entry) => entry.group === group)]).filter(([, entries]) => entries.length)
  const kinds = plan.reduce((counts, entry) => ({ ...counts, [entry.kind]: (counts[entry.kind] ?? 0) + 1 }), {})

  const build = async () => {
    setResult(null)
    setProgress({ done: 0, total: plan.length, path: '' })
    const started = performance.now()
    const { files, skipped } = await buildKit({ brand, fonts }, {
      ...options,
      renderer: options.rasters || options.pdfs ? createBrowserRenderer() : undefined,
      readAsset: options.assets ? source.read : undefined,
      onProgress: (done, total, path) => setProgress({ done, total, path })
    })
    setProgress({ done: plan.length, total: plan.length, path: 'Zipping…' })
    const archive = await zip(files, `${brand.id}-brand-kit`)
    download(archive, `${brand.id}-brand-kit.zip`)
    setResult({ count: files.size, bytes: archive.length, skipped, seconds: (performance.now() - started) / 1000 })
    setProgress(null)
  }

  const toggle = (key) => setOptions({ ...options, [key]: !options[key] })
  return (
    <div className="view">
      <section className="panel kit-head">
        <div>
          <h2>The {brand.name} kit</h2>
          <p className="muted">{plan.length} files: {Object.entries(kinds).map(([kind, count]) => `${count} ${KIND_LABEL[kind] ?? kind}`).join(', ')}. Every one is made in this browser from brand.json; nothing is uploaded.</p>
          <div className="checks">
            <label><input type="checkbox" checked={options.rasters} onChange={() => toggle('rasters')} /> Images (PNG, favicon.ico)</label>
            <label><input type="checkbox" checked={options.pdfs} onChange={() => toggle('pdfs')} /> PDFs (logos, templates, the guide)</label>
            <label><input type="checkbox" checked={options.assets} onChange={() => toggle('assets')} /> Fonts, licences and documents</label>
          </div>
          {!fonts && <p className="notice">The brand’s fonts are still loading; the guide and template images need them to set text as outlines.</p>}
        </div>
        <div className="kit-action">
          <button type="button" className="button button--large" disabled={Boolean(progress) || !fonts} onClick={build}>{progress ? 'Building…' : 'Build and download'}</button>
          {progress && (
            <div className="progress" role="status">
              <div className="progress__bar"><span style={{ width: `${(100 * progress.done) / Math.max(1, progress.total)}%` }} /></div>
              <span className="progress__label">{progress.done} of {progress.total} · {progress.path}</span>
            </div>
          )}
          {result && (
            <p className="muted" role="status">{result.count} files, {formatBytes(result.bytes)} zipped, in {result.seconds.toFixed(1)} s.{result.skipped.length ? ` ${result.skipped.length} could not be made: ${result.skipped.map((entry) => `${entry.path} (${entry.error.message})`).join('; ')}` : ''}</p>
          )}
        </div>
      </section>
      <section className="panel">
        {groups.map(([group, entries]) => (
          <details key={group} className="plan-group" open={group === 'Logos'}>
            <summary>{group} <span className="muted">{entries.length}</span></summary>
            <ul className="plan-list">
              {entries.map((entry) => <li key={entry.path}><code>{entry.path}</code><span className="muted">{KIND_LABEL[entry.kind]}</span></li>)}
            </ul>
          </details>
        ))}
      </section>
    </div>
  )
}
