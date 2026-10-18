// Links between a brand and the manual pages it is built from, both ways: a template, signature
// or guide page names its `sources` (written into brand.json by the brand's script), and a manual
// page in the library lists what the built-in brands build from it (brands/index.json).

import MANIFEST from '../../../brands/index.json'

// The packs the app serves (see vite.config.js); a source in any other pack is shown as text.
const PACKS = { bc: `${import.meta.env.BASE_URL}manuals/bc/` }

export const manualHref = (book, page) => `?view=manuals&guide=${book}&page=${page}`

const pageLabel = (source) => [source.manual, source.printed && (/^\d/.test(source.printed) ? `p. ${source.printed}` : source.printed)].filter(Boolean).join(', ')

/** The manual pages a template, signature or guide page is built from, as thumbnails that open them. */
export const ManualSources = ({ brand, sources, openManual, heading }) => {
  if (!sources?.length) return null
  const base = PACKS[brand.manuals?.pack]
  return (
    <div className="sources">
      {/* A brand rebuilt from a manual is "from" it; one that borrows its system is "modelled on" it. */}
      <h4 className="sources__heading">{brand.manuals?.relation ?? heading ?? 'From the manual'}</h4>
      <ul className="sources__list">
        {sources.map((source) => {
          const content = (
            <>
              {base && <img src={`${base}${source.book}/${source.page}.webp`} alt="" loading="lazy" />}
              <span><strong>{source.title}</strong><span className="sources__meta">{pageLabel(source)} · {source.page}</span></span>
            </>
          )
          return (
            <li key={`${source.book}/${source.page}`}>
              {base && openManual
                ? <a className="sources__item" href={manualHref(source.book, source.page)} onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey) return; event.preventDefault(); openManual(source.book, source.page) }}>{content}</a>
                : <span className="sources__item">{content}</span>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const KIND = { template: 'Template', signature: 'Signature', guide: 'Guide page' }

const builtHref = (brand, kind, id) => `?brand=${brand}&${kind === 'template' ? `view=templates&template=${id}` : kind === 'signature' ? `view=logos&signature=${id}` : `view=guide&book=guide&page=${id}`}`

/** Under a manual page: everything the built-in brands build from it. */
export const BuiltFrom = ({ book, page, openBuilt }) => {
  const key = `${book.id}/${page.id}`
  const brands = MANIFEST.filter((entry) => entry.pages?.[key]?.length)
  if (!brands.length) return null
  return (
    <div className="sources sources--built">
      <h4 className="sources__heading">This page in brandkit</h4>
      {brands.map((entry) => (
        <div key={entry.id} className="sources__brand">
          <span className="sources__meta">{entry.name}{entry.relation ? `, ${entry.relation.toLowerCase()} this page` : ', built from this page'}</span>
          <ul className="sources__chips">
            {entry.pages[key].map(([kind, id, label]) => (
              <li key={`${kind}-${id}`}>
                <a className="sources__chip" href={builtHref(entry.id, kind, id)} onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey) return; event.preventDefault(); openBuilt(entry.id, kind, id) }}>
                  <span className="sources__kind">{KIND[kind]}</span> {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
