// The Revisions tab: each proposed change to the identity beside the approved one, with why, and a
// way to show the whole brand with it.
import { logoDocument } from '../../engine/artwork.js'
import { guideSheets } from '../../engine/guide.js'
import { revisionsOf, withRevision } from '../../engine/revisions.js'
import { Downloads, SvgImage } from '../ui.jsx'

/** Each proposed change to the logo, beside the approved one, with why and a way to try it. */
export const Revisions = ({ base, fonts, active, onRevision }) => {
  const revisions = revisionsOf(base)
  if (!revisions.length) return null
  const ink = base.rasterColours?.[0] ?? 'black'
  const family = base.families?.[0]?.id
  const logo = family ? { family, layout: 'horizontal', colourKey: ink } : { signature: base.signatures[0].id, colourway: base.defaultColourway }
  return (
    <div className="view">
      <section className="panel">
        <div className="panel__head">
          <h2>Logo revisions</h2>
          <p className="muted">Proposed changes. Showing one applies it everywhere, including the kit.</p>
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
    </div>
  )
}
