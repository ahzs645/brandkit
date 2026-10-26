import { useState } from 'react'
import { icon, logoDocument, symbolDocument } from '../../engine/artwork.js'
import { colour, colourName, isDark } from '../../engine/brand.js'
import { download } from '../../export/render.js'
import { isLogoStudy } from '../motion.js'
import { animatedSvg, CssStage, useMotionLibrary, useReducedMotion } from '../motion-player.jsx'
import { QuickExport } from '../MotionExport.jsx'
import { Downloads, SvgImage } from '../ui.jsx'
import { SignatureLogos } from './Signatures.jsx'

const LAYOUTS = ['horizontal', 'stacked', 'wordmark']

/** A ground that shows a logo of this colour: the paper tone, or the primary colour for a light logo. */
const groundFor = (brand, key) => (isDark(colour(brand, key)) ? '#ffffff' : colour(brand, 'primary'))

const Card = ({ title, make, name, ground, width = 2048, wide }) => (
  <figure className={`asset-card${wide ? ' asset-card--wide' : ''}`}>
    <div className="asset-card__art" style={{ background: ground }}>
      <SvgImage svg={make()} alt={title} />
    </div>
    <figcaption>
      <span>{title}</span>
      <Downloads make={make} name={name} width={width} />
    </figcaption>
  </figure>
)

/** One logo animation: it plays as the tab opens, and again on hover or Play. */
const MotionCard = ({ brand, library, study, reduced }) => {
  const [play, setPlay] = useState(1)
  const replay = () => { if (!reduced) setPlay((value) => value + 1) }
  return (
    <figure className="asset-card motion-card" onMouseEnter={replay}>
      <div className="motion-card__art">
        <CssStage library={library} id={study.id} play={play} design={560} label={`${study.name}: ${study.description}`} />
      </div>
      <figcaption>
        <span className="motion-card__name">{study.name}<small>{study.use ?? study.timing}</small></span>
        <span className="downloads">
          <button type="button" className="button button--quiet" disabled={reduced} onClick={replay}>▶ Play</button>
          {library.stages.get(study.id)?.vector && <QuickExport brand={brand} library={library} study={study} />}
          {library.stages.get(study.id)?.shapesOnly && <button type="button" className="button button--quiet" title="For a web page: plays once, then holds the logo" onClick={() => download(animatedSvg(library, study.id), `${brand.id}-logo-${study.id}.svg`)}>↓ SVG</button>}
        </span>
      </figcaption>
    </figure>
  )
}

/** The brand's logo studies from its motion library, played in place: the logo as media. */
const LogoMotion = ({ brand, source }) => {
  const library = useMotionLibrary(brand, source)
  const reduced = useReducedMotion()
  const studies = (brand.motion?.studies ?? []).filter(isLogoStudy)
  if (!studies.length || library?.mode !== 'css') return null
  const shown = studies.filter((study) => library.stages.has(study.id))
  if (!shown.length) return null
  return (
    <section className="panel">
      <div className="panel__head">
        <h2>Logo in motion</h2>
        <p className="muted">From the motion library. Hover or press Play to run one again; each ends on the still logo. Download one as video or a GIF for slides and social, or as SVG for a web page.{reduced ? ' Your device asks for reduced motion, so each shows its final frame.' : ''}</p>
      </div>
      <div className="asset-grid asset-grid--motion">
        {shown.map((study) => <MotionCard key={study.id} brand={brand} library={library} study={study} reduced={reduced} />)}
      </div>
    </section>
  )
}

const SupportingAssets = ({ brand, onPatterns }) => {
  const ctx = { brand }
  const params = new URLSearchParams(globalThis.location?.search ?? '')
  params.set('brand', brand.id)
  params.set('view', 'patterns')
  for (const key of ['signature', 'template', 'study']) params.delete(key)
  return <>
    {brand.patterns?.length > 0 && (
      <section className="panel">
        <h2>Patterns</h2>
        <p className="muted">Explore {brand.patterns.length} patterns, their source shapes and the applications built from them.</p>
        <a className="button" href={`?${params}`} onClick={(event) => { if (!onPatterns || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); onPatterns() }}>Browse patterns ↗</a>
      </section>
    )}
    {brand.icons?.items?.length > 0 && (
      <section className="panel">
        <h2>Supporting icons</h2>
        <div className="asset-grid asset-grid--small">
          {brand.icons.items.map((item) => <Card key={item.id} title={item.id} name={item.id} ground="#fff" width={256} make={() => icon(ctx, item)} />)}
        </div>
      </section>
    )}
  </>
}

export const Logos = ({ brand, fonts, source, openManual, onPatterns }) => {
  if (!brand.families?.length) return <SignatureLogos brand={brand} fonts={fonts} openManual={openManual} before={brand.motion && <LogoMotion brand={brand} source={source} />} after={<SupportingAssets brand={brand} onPatterns={onPatterns} />} />
  const ctx = { brand }
  const colours = brand.logoColours.filter((key) => key !== 'currentColor')
  return (
    <div className="view">
      {brand.motion && <LogoMotion brand={brand} source={source} />}
      {brand.families.map((entry) => (
        <section key={entry.id} className="panel">
          <h2>{entry.label ?? entry.id}</h2>
          {[...LAYOUTS, ...(entry.stackedWordmark ? ['wordmark-stacked'] : [])].map((layout) => (
            <div key={layout} className="asset-row">
              <h3>{layout.replaceAll('-', ' ')}</h3>
              <div className="asset-grid">
                {colours.map((key) => (
                  <Card key={key} title={colourName(brand, key)} name={`${entry.id}-${layout}-${key}`} ground={groundFor(brand, key)}
                    make={() => logoDocument(ctx, { family: entry.id, layout, colourKey: key })} />
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
      <section className="panel">
        <h2>Symbol</h2>
        <div className="asset-grid">
          {colours.map((key) => (
            <Card key={key} title={colourName(brand, key)} name={`${brand.id}-symbol-${key}`} ground={groundFor(brand, key)} width={1024} make={() => symbolDocument(ctx, { colourKey: key })} />
          ))}
          {(brand.symbol.microRadius != null || brand.symbol.microPaths) && <Card title="Micro" name={`${brand.id}-symbol-micro`} ground="#fff" width={256} make={() => symbolDocument(ctx, { micro: true })} />}
        </div>
      </section>
      <SupportingAssets brand={brand} onPatterns={onPatterns} />
    </div>
  )
}
