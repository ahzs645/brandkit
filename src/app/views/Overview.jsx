import { useState } from 'react'
import { logoDocument, symbolDocument } from '../../engine/artwork.js'
import { colour, colourName, isDark, rgb } from '../../engine/brand.js'
import { guideSheets } from '../../engine/guide.js'
import { changesArtwork, mergePatch, revisionsOf, withRevision } from '../../engine/revisions.js'
import { colourEntries } from '../colours.js'
import { Downloads, Field, Segmented, Select, SvgImage } from '../ui.jsx'
import { SignatureStage } from './Signatures.jsx'
import { Typography } from './Typography.jsx'
import { OrganizationSources } from './Organization.jsx'

/** Each proposed change to the logo, beside the approved one, with why and a way to try it. */
const Revisions = ({ base, fonts, active, onRevision }) => {
  const revisions = revisionsOf(base)
  if (!revisions.length) return null
  const ink = base.rasterColours?.[0] ?? 'black'
  const family = base.families?.[0]?.id
  const logo = family ? { family, layout: 'horizontal', colourKey: ink } : { signature: base.signatures[0].id, colourway: base.defaultColourway }
  return (
    <section className="panel">
      <div className="panel__head">
        <h2>Logo revisions</h2>
        <p className="muted">Proposed changes, kept beside the approved identity. Choosing one shows every page of brandkit, and the kit download, as it would make them.</p>
      </div>
      {revisions.map((revision) => {
        const revised = withRevision(base, revision.id)
        const comparison = guideSheets({ brand: base, fonts }).find((sheet) => sheet.group === 'revisions' && sheet.path?.includes(`/${revision.id}/`))
        return (
          <article key={revision.id} className="revision">
            <div className="revision__head">
              <h3>{revision.title}</h3>
              <span className={`revision__status revision__status--${revision.status ?? 'proposed'}`}>{revision.status ?? 'proposed'}</span>
              <span className="muted">v{base.displayVersion ?? base.version} → v{revision.displayVersion ?? revision.version}{revision.date ? ` · ${revision.date}` : ''}</span>
            </div>
            <div className="revision__pair">
              <figure><div><SvgImage svg={logoDocument({ brand: base, fonts }, logo)} alt="Approved logo" /></div><figcaption>Approved</figcaption></figure>
              <figure><div><SvgImage svg={logoDocument({ brand: revised, fonts }, logo)} alt={`${revision.title}, proposed`} /></div><figcaption>{revision.title}</figcaption></figure>
            </div>
            {revision.summary && <p className="muted" style={{ margin: 0 }}>{revision.summary}</p>}
            {revision.rationale?.length > 0 && <ul>{revision.rationale.map((line) => <li key={line}>{line}</li>)}</ul>}
            <div className="row" style={{ marginTop: 0 }}>
              <button type="button" className="button" onClick={() => onRevision(active === revision.id ? null : revision.id)}>{active === revision.id ? 'Back to the approved identity' : 'Show everything with this revision'}</button>
              {comparison && <Downloads make={() => comparison.render()} name={`${base.id}-${revision.id}-comparison`} width={2880} />}
            </div>
          </article>
        )
      })}
    </section>
  )
}

const HistoryEntry = ({ brand, fonts, logo, entry }) => {
  const archivedArt = entry.status === 'archived' && entry.changes && changesArtwork(entry)
  return (
    <article className="revision">
      <div className="revision__head">
        <h3>{entry.title ?? `v${entry.displayVersion ?? entry.version}`}</h3>
        <span className={`revision__status revision__status--${entry.status}`}>{entry.status}</span>
        <span className="muted">v{entry.displayVersion ?? entry.version}{entry.date ? ` · ${entry.date}` : ''}{entry.archived ? ` · archived ${entry.archived}` : ''}{entry.approved ? ` · approved ${entry.approved}` : ''}</span>
      </div>
      {archivedArt && (
        <figure className="history__logo"><div><SvgImage svg={logoDocument({ brand: mergePatch(brand, entry.changes), fonts }, logo)} alt={`${entry.title}, archived`} /></div></figure>
      )}
      {entry.summary && <p className="muted" style={{ margin: 0 }}>{entry.summary}</p>}
      {entry.note && <p className="caption caption--flush" style={{ paddingTop: 0 }}>{entry.note}</p>}
    </article>
  )
}

/**
 * Where the identity stands: the approved version up front, and what it replaced or set aside
 * (superseded versions, archived proposals and their logos) folded away in an archive.
 */
const History = ({ brand, fonts, logo }) => {
  if (!brand.history?.length) return null
  const entries = [...brand.history].reverse()
  const current = entries.filter((entry) => entry.status === 'approved')
  const archive = entries.filter((entry) => entry.status !== 'approved')
  return (
    <section className="panel">
      <div className="panel__head">
        <h2>Current version</h2>
        <p className="muted">{brand.name} v{brand.displayVersion ?? brand.version}, and what it was built from.</p>
      </div>
      {current.map((entry) => <HistoryEntry key={entry.id ?? entry.version} brand={brand} fonts={fonts} logo={logo} entry={entry} />)}
      {archive.length > 0 && (
        <details className="history__archive">
          <summary>Archive <span className="muted">{archive.length} earlier {archive.length === 1 ? 'version or proposal' : 'versions and proposals'}</span></summary>
          {archive.map((entry) => <HistoryEntry key={entry.id ?? entry.version} brand={brand} fonts={fonts} logo={logo} entry={entry} />)}
        </details>
      )}
    </section>
  )
}

const BACKGROUNDS = ['reverse', 'paper', 'light', 'primary', 'ink']

export const Overview = ({ brand, base = brand, fonts, source, revision, onRevision, openManual }) => {
  const [familyId, setFamily] = useState(brand.families?.[0]?.id)
  const [layout, setLayout] = useState('horizontal')
  const optional = brand.wordmark?.optionalSubtext
  const [wordmarkEnabled, setWordmarkEnabled] = useState(true)
  const drawingFamily = optional ? (wordmarkEnabled ? optional.withFamily : optional.withoutFamily) : familyId
  const [background, setBackground] = useState('reverse')
  const colours = brand.logoColours.filter((key) => key !== 'currentColor')
  const backgroundHex = colour(brand, background)
  const [logoColour, setLogoColour] = useState(colours[0])
  const [wordmarkColour, setWordmarkColour] = useState(optional?.colour ?? colours.find((key) => key !== colours[0] && isDark(colour(brand, key))) ?? colours[0])
  // A white logo on a white stage is invisible: when the ground changes, pick a colour that reads.
  const pickBackground = (value) => {
    setBackground(value)
    const dark = isDark(colour(brand, value))
    const readable = (key) => {
      const current = colour(brand, key)
      return dark === isDark(current) || current.toLowerCase() === colour(brand, value).toLowerCase()
        ? colours.find((entry) => isDark(colour(brand, entry)) !== dark && colour(brand, entry).toLowerCase() !== colour(brand, value).toLowerCase()) ?? colours[0]
        : key
    }
    setLogoColour(readable(logoColour))
    setWordmarkColour(readable(wordmarkColour))
  }
  const ctx = { brand }
  const symbolOnly = layout === 'symbol' || (!optional && !wordmarkEnabled)
  const make = () => (symbolOnly ? symbolDocument(ctx, { colourKey: logoColour }) : logoDocument(ctx, {
    family: drawingFamily, layout, colourKey: logoColour,
    ...(optional ? { subtextColour: wordmarkColour } : { wordmarkColour })
  }))
  const svg = brand.families?.length ? make() : null
  const name = symbolOnly ? `${brand.id}-symbol-${logoColour}` : `${drawingFamily}-${layout}-${logoColour}${wordmarkEnabled ? `-wordmark-${wordmarkColour}` : ''}`

  return (
    <div className="view overview">
      {!brand.families?.length ? <SignatureStage brand={brand} fonts={fonts} openManual={openManual} /> : (
      <section className="panel stage-panel" aria-label="Logo preview">
        <div className="stage" style={{ background: backgroundHex }}>
          <SvgImage svg={svg} alt={`${brand.name} ${layout} logo`} className={`stage__art stage__art--${layout}`} />
        </div>
        <div className="toolbar">
          {!optional && brand.families?.length > 1 && (
            <Field label="Name">
              <Segmented label="Family" value={familyId} options={brand.families.map((entry) => ({ value: entry.id, label: entry.id }))} onChange={setFamily} />
            </Field>
          )}
          <Field label="Layout">
            <Select value={layout} onChange={setLayout} options={['horizontal', 'stacked', 'symbol'].map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }))} />
          </Field>
          <label className="wordmark-toggle"><input type="checkbox" checked={wordmarkEnabled} disabled={layout === 'symbol'} onChange={(event) => setWordmarkEnabled(event.target.checked)} /><span>Wordmark</span></label>
          <Field label="Colour">
            <div className="chips" role="group" aria-label="Logo colour">
              {colours.map((key) => <button key={key} type="button" className="chip" aria-label={colourName(brand, key)} aria-pressed={logoColour === key} title={colourName(brand, key)} style={{ background: colour(brand, key) }} onClick={() => setLogoColour(key)} />)}
            </div>
          </Field>
          {wordmarkEnabled && layout !== 'symbol' && <div className="field">
            <span className="field__label">Wordmark colour</span>
            <div className="chips" role="group" aria-label="Wordmark colour">
              {colours.map((key) => <button key={key} type="button" className="chip" aria-label={colourName(brand, key)} aria-pressed={wordmarkColour === key} title={colourName(brand, key)} style={{ background: colour(brand, key) }} onClick={() => setWordmarkColour(key)} />)}
            </div>
          </div>}
          <Field label="Preview on">
            <div className="chips">
              {BACKGROUNDS.map((role) => <button key={role} type="button" className="chip" aria-pressed={background === role} title={role} style={{ background: colour(brand, role) }} onClick={() => pickBackground(role)} />)}
            </div>
          </Field>
          <Downloads make={make} name={name} width={2048} />
        </div>
        <p className="caption">The ground is a preview. Downloaded logos are transparent.</p>
      </section>
      )}

      <Revisions base={base} fonts={fonts} active={revision} onRevision={onRevision} />
      {!revision && <History brand={brand} fonts={fonts} logo={brand.families?.length ? { family: brand.families[0].id, layout: 'horizontal', colourKey: brand.rasterColours?.[0] ?? 'black' } : { signature: brand.signatures?.[0]?.id, colourway: brand.defaultColourway }} />}

      <section className="split">
        <div className="panel">
          <h2>Colour</h2>
          <div className="palette">
            {colourEntries(brand).map(({ key, name, hex, roles, own }) => (
              <button key={`${own ? 'role' : 'colour'}-${key}`} type="button" className="swatch" onClick={() => navigator.clipboard?.writeText(hex)} title="Copy hex value">
                <span className="swatch__fill" style={{ background: hex, color: isDark(hex) ? '#fff' : '#000' }}>{roles.join(' · ')}</span>
                <strong>{name}</strong>
                <code>{hex}</code>
                <code>RGB {(rgb(hex) ?? []).join(', ')}</code>
              </button>
            ))}
          </div>
        </div>
        <div className="panel">
          <h2>Typography</h2>
          <Typography key={brand.id} brand={brand} source={source} />
        </div>
      </section>

      {brand.logoPolicy?.standaloneSymbol !== false && <section className="panel">
        <h2>Symbol</h2>
        <div className="symbol-row">
          {['standard', 'micro'].filter((size) => size === 'standard' || brand.symbol.microRadius != null || brand.symbol.microPaths).map((size) => (
            <figure key={size} className="symbol-tile">
              <SvgImage svg={symbolDocument({ brand }, { colourKey: brand.rasterColours?.[0] ?? colours[0], micro: size === 'micro' })} alt={`${size} symbol`} />
              <figcaption>{size === 'micro' ? 'Micro, for favicons' : 'Standard'}</figcaption>
            </figure>
          ))}
          <dl className="facts">
            <div><dt>Canvas</dt><dd>{brand.symbol.viewBox[2]} × {brand.symbol.viewBox[3]} units</dd></div>
            {brand.symbol.centres && <div><dt>Elements</dt><dd>{brand.symbol.centres.length}{brand.symbol.rows ? `, rows ${brand.symbol.rows.join(' / ')}` : ''}</dd></div>}
            {brand.symbol.horizontalPitch && <div><dt>Spacing</dt><dd>{brand.symbol.horizontalPitch} units centre to centre</dd></div>}
            <div><dt>Clearspace</dt><dd>{brand.lockup?.clearspaceRecommendation ?? '—'}</dd></div>
            <div><dt>Minimum</dt><dd>{brand.lockup?.minimumHorizontalWidthPx} px wide (horizontal), {brand.lockup?.minimumSymbolHeightPx} px tall (symbol)</dd></div>
          </dl>
        </div>
      </section>}
      {brand.organization && <section className="panel">
        <h2>One institution with named departments</h2>
        <p>{brand.organization.naming?.note}</p>
        <p className="muted">Use Departments to set the parent and unit names, see the sizing rules, and carry those names into report, portfolio and stationery templates.</p>
        <a className="button" href={`?brand=${encodeURIComponent(brand.id)}&view=organization${new URLSearchParams(globalThis.location?.search ?? '').has('share') ? '&share=1' : ''}`}>Set department names ↗</a>
      </section>}
      <OrganizationSources brand={brand} />
    </div>
  )
}
