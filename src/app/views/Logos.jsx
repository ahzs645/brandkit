import { icon, logoDocument, pattern, symbolDocument } from '../../engine/artwork.js'
import { colour, colourName, isDark } from '../../engine/brand.js'
import { Downloads, SvgImage } from '../ui.jsx'

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

export const Logos = ({ brand }) => {
  const ctx = { brand }
  const colours = brand.logoColours.filter((key) => key !== 'currentColor')
  return (
    <div className="view">
      {brand.families.map((entry) => (
        <section key={entry.id} className="panel">
          <h2>{entry.label ?? entry.id}</h2>
          {LAYOUTS.map((layout) => (
            <div key={layout} className="asset-row">
              <h3>{layout}</h3>
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
      {brand.patterns?.length > 0 && (
        <section className="panel">
          <h2>Patterns</h2>
          <div className="asset-grid asset-grid--wide">
            {brand.patterns.map((spec) => <Card key={spec.id} wide title={spec.id} name={spec.id} width={spec.width * 2} make={() => pattern(ctx, spec)} />)}
          </div>
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
    </div>
  )
}
