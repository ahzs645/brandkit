import { useState } from 'react'
import { icon, logoDocument, symbolDocument } from '../../engine/artwork.js'
import { colour, colourName, isDark } from '../../engine/brand.js'
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
  if (!brand.families?.length) return <SignatureLogos brand={brand} fonts={fonts} openManual={openManual} after={<SupportingAssets brand={brand} onPatterns={onPatterns} />} />
  const ctx = { brand }
  const colours = brand.logoColours.filter((key) => key !== 'currentColor')
  return (
    <div className="view">
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
