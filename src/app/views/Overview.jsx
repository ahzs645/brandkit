import { useState } from 'react'
import { logoDocument, symbolDocument } from '../../engine/artwork.js'
import { colour, colourName, fill, isDark, rgb } from '../../engine/brand.js'
import { guideSheets } from '../../engine/guide.js'
import { revisionsOf, withRevision } from '../../engine/revisions.js'
import { Downloads, Field, Segmented, SvgImage } from '../ui.jsx'
import { SignatureStage } from './Signatures.jsx'

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

const BACKGROUNDS = ['reverse', 'paper', 'light', 'primary', 'ink']

export const Overview = ({ brand, base = brand, fonts, go, revision, onRevision, openManual }) => {
  const [familyId, setFamily] = useState(brand.families?.[0]?.id)
  const [layout, setLayout] = useState('horizontal')
  const [background, setBackground] = useState('reverse')
  const colours = brand.logoColours.filter((key) => key !== 'currentColor')
  const backgroundHex = colour(brand, background)
  const [logoColour, setLogoColour] = useState(colours[0])
  // A white logo on a white stage is invisible: when the ground changes, pick a colour that reads.
  const pickBackground = (value) => {
    setBackground(value)
    const dark = isDark(colour(brand, value))
    const current = colour(brand, logoColour)
    if (dark === isDark(current) || current.toLowerCase() === colour(brand, value).toLowerCase()) {
      setLogoColour(colours.find((key) => isDark(colour(brand, key)) !== dark && colour(brand, key).toLowerCase() !== colour(brand, value).toLowerCase()) ?? colours[0])
    }
  }
  const ctx = { brand }
  const make = () => (layout === 'symbol' ? symbolDocument(ctx, { colourKey: logoColour }) : logoDocument(ctx, { family: familyId, layout, colourKey: logoColour }))
  const svg = brand.families?.length ? make() : null
  const name = layout === 'symbol' ? `${brand.id}-symbol-${logoColour}` : `${familyId}-${layout}-${logoColour}`

  return (
    <div className="view overview">
      <section className="hero">
        <div>
          <p className="eyebrow">{fill(brand, brand.web?.intro?.eyebrow ?? 'Brand identity')} · v{brand.displayVersion ?? brand.version}</p>
          <h1>{brand.name}</h1>
          <p className="hero__lede">{fill(brand, brand.web?.intro?.body ?? brand.copy?.tagline ?? '')}</p>
          <div className="hero__actions">
            <button type="button" className="button" onClick={() => go('kit')}>Download the whole kit</button>
            <button type="button" className="button button--quiet" onClick={() => go('guide')}>Read the brand guide</button>
            <button type="button" className="button button--quiet" onClick={() => go('templates')}>Make a business card</button>
          </div>
        </div>
      </section>

      {!brand.families?.length ? <SignatureStage brand={brand} fonts={fonts} openManual={openManual} /> : (
      <section className="panel stage-panel" aria-label="Logo preview">
        <div className="stage" style={{ background: backgroundHex }}>
          <SvgImage svg={svg} alt={`${brand.name} ${layout} logo`} className={`stage__art stage__art--${layout}`} />
        </div>
        <div className="toolbar">
          {brand.families?.length > 1 && (
            <Field label="Name">
              <Segmented label="Family" value={familyId} options={brand.families.map((entry) => ({ value: entry.id, label: entry.id }))} onChange={setFamily} />
            </Field>
          )}
          <Field label="Layout">
            <Segmented label="Layout" value={layout} options={['horizontal', 'stacked', 'wordmark', 'symbol'].map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }))} onChange={setLayout} />
          </Field>
          <Field label="Colour">
            <div className="chips">
              {colours.map((key) => <button key={key} type="button" className="chip" aria-pressed={logoColour === key} title={colourName(brand, key)} style={{ background: colour(brand, key) }} onClick={() => setLogoColour(key)} />)}
            </div>
          </Field>
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

      <section className="split">
        <div className="panel">
          <h2>Colour</h2>
          <div className="palette">
            {Object.entries(brand.colours).map(([key, hex]) => (
              <button key={key} type="button" className="swatch" onClick={() => navigator.clipboard?.writeText(hex)} title="Copy hex value">
                <span className="swatch__fill" style={{ background: hex, color: isDark(hex) ? '#fff' : '#000' }}>{Object.entries(brand.roles ?? {}).filter(([, value]) => value === key).map(([role]) => role).join(' · ')}</span>
                <strong>{colourName(brand, key)}</strong>
                <code>{hex}</code>
                <code>RGB {(rgb(hex) ?? []).join(', ')}</code>
              </button>
            ))}
          </div>
        </div>
        <div className="panel">
          <h2>Typography</h2>
          <div className="specimens">
            {['display', 'body', 'label'].map((key) => [key, brand.fonts?.[key]]).filter(([, face]) => face).map(([key, face]) => (
              <div key={key} className="specimen">
                <span className="eyebrow">{key} · {face.label ?? `${face.family} ${face.weight}`}</span>
                <p style={{ fontFamily: face.stack, fontWeight: face.weight, letterSpacing: key === 'display' ? `${brand.typography?.headlines?.trackingEm ?? -0.02}em` : key === 'label' ? `${brand.typography?.labels?.trackingEm ?? 0.12}em` : undefined, textTransform: key === 'label' ? 'uppercase' : undefined, fontSize: key === 'display' ? 40 : key === 'label' ? 13 : 17 }}>
                  {key === 'display' ? fill(brand, brand.copy?.tagline ?? brand.name) : key === 'label' ? `${brand.name} / labels / captions` : 'Clear, plain sentences set in the body face, for paragraphs and interface text.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
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
      </section>
    </div>
  )
}
