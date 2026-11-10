// A brand's product family (brand.products): each product's name set beside the parent logo, which
// is embedded exactly as the Logos tab draws it. What changes from product to product is the name,
// the descriptor, the accent and (where a family has them) the pictogram; the arrangement, the colour and the tile style are
// chosen once for the whole family, so every product is seen the same way.

import { useMemo, useState } from 'react'
import { colour, colourName, isDark, paintOptions } from '../../engine/brand.js'
import { svgDocument } from '../../engine/artwork.js'
import {
  defaultProductArrangement, defaultProductTile, productArrangements, productDirections, productDocument, productLockup,
  productParent, productParentLockup, productPictogram, productTile, productTileStyles, productsOf
} from '../../engine/products.js'
import { contrast, grade, ratioLabel } from '../colours.js'
import { Downloads, Field, Segmented, SvgImage } from '../ui.jsx'

const ARRANGEMENT_LABELS = { endorsed: 'Endorsed', label: 'Label', 'product-led': 'Product-led', compact: 'Compact' }
const ARRANGEMENT_USES = {
  endorsed: 'The parent logo, a rule in the product’s accent, then the product’s name on the logo’s baseline.',
  label: 'The parent logo with the product named beneath its lettering, in the label face.',
  'product-led': 'A tile in the product’s accent and the product’s name lead; the parent logo signs off beneath, at its own size.',
  compact: 'The symbol, the rule and the name, for spaces narrower than the full logo’s minimum width.'
}
// The `icon` tile carries a product's pictogram; in a family without pictograms it is the symbol on the accent.
const tileLabels = (brand) => ({ symbol: 'Symbol', icon: productsOf(brand).some((item) => productPictogram(brand, item)) ? 'Pictogram' : 'Accent', paper: 'Paper' })

const slug = (value) => String(value).toLowerCase().replace(/\s+/g, '-')
const Grade = ({ value }) => <span className={`grade grade--${slug(value)}`}>{value}</span>

/** A ground that shows a logo painted this way: white, or the primary colour under a light logo. */
const groundFor = (brand, paint) => {
  if (paint.colourway) return colour(brand, paint.ground ?? brand.colourways?.[paint.colourway]?.ground ?? 'reverse')
  return isDark(colour(brand, paint.colour)) ? '#ffffff' : colour(brand, 'primary')
}

/** A colour as a ground with what is drawn `on` it, or, given a `ground`, as text on that ground. */
const Swatch = ({ label, hex, on, ground, ratio, against }) => (
  <div className="product-swatch">
    <span className="product-swatch__fill" style={ground ? { background: ground, color: hex } : { background: hex, color: on }}>Aa</span>
    <span className="product-swatch__text"><strong>{label}</strong><code>{hex}</code></span>
    {ratio != null && <span className="product-swatch__score" title={`${ratioLabel(ratio)} ${against}`}><Grade value={grade(ratio)} /><code>{ratioLabel(ratio)}</code></span>}
  </div>
)

const ProductCard = ({ brand, fonts, item, arrangement, paint, descriptor, tile, ground }) => {
  const ctx = { brand, fonts }
  const paper = colour(brand, 'paper')
  const options = { product: item.id, arrangement, colourKey: paint.colour, colourway: paint.colourway, descriptor }
  const makeLockup = () => productDocument(ctx, options)
  const makeTile = () => productTile(ctx, { product: item.id, style: tile })
  const pictogram = productPictogram(brand, item)
  const pictogramSvg = pictogram ? svgDocument(ctx, pictogram.size, pictogram.size, pictogram.markup, `${item.name} pictogram`) : null
  const showTile = Boolean(tile) && brand.web?.icons !== false
  return (
    <article className="product-card" aria-labelledby={`product-${item.id}`}>
      <div className="product-card__art" style={{ background: ground }}>
        <SvgImage svg={makeLockup()} alt={`${brand.name} ${item.name}, ${ARRANGEMENT_LABELS[arrangement].toLowerCase()} lockup`} />
      </div>
      <div className="product-card__body">
        <div className="product-card__head">
          <h3 id={`product-${item.id}`}><span className="product-card__dot" style={{ background: item.accent }} />{item.fullName ?? item.name}</h3>
          <span className="product-card__tags">
            {item.role && <span className="product-card__role">{item.role}</span>}
            {item.status && <span className="badge">{item.status}</span>}
          </span>
        </div>
        {item.descriptor && <p className="muted">{item.descriptor}</p>}
        <div className="product-card__marks">
          {showTile && <figure><SvgImage svg={makeTile()} alt={`${item.name} app tile, ${tileLabels(brand)[tile].toLowerCase()}`} className="product-card__tile" /><figcaption>Tile</figcaption></figure>}
          {pictogramSvg && <figure><span className="product-card__pictogram" style={{ color: item.accentText }} dangerouslySetInnerHTML={{ __html: pictogramSvg.replace(/<svg /, '<svg aria-hidden="true" ').replace(/\s(width|height)="[^"]*"/g, '') }} /><figcaption>Pictogram</figcaption></figure>}
          <div className="product-card__swatches">
            <Swatch label={item.accentName ?? 'Accent'} hex={item.accent} on={item.onAccent} ratio={contrast(item.onAccent, item.accent)} against="for what is drawn on the accent" />
            <Swatch label="As text" hex={item.accentText} ground={paper} ratio={contrast(item.accentText, paper)} against="on paper" />
          </div>
        </div>
        <dl className="product-card__downloads">
          <div><dt>Lockup</dt><dd><Downloads make={makeLockup} name={[brand.id, item.id, arrangement, paint.id].join('-')} width={2048} /></dd></div>
          {showTile && <div><dt>Tile</dt><dd><Downloads make={makeTile} name={[brand.id, item.id, 'tile', tile].join('-')} width={1024} formats={['svg', 'png']} /></dd></div>}
        </dl>
      </div>
    </article>
  )
}

export const Products = ({ brand, fonts }) => {
  const products = brand.products
  const ctx = { brand, fonts }
  const items = useMemo(() => productsOf(brand), [brand])
  const arrangements = productArrangements(brand)
  const directions = productDirections(brand)
  const tiles = brand.web?.icons === false ? [] : productTileStyles(brand)
  const paints = paintOptions(brand).filter((paint) => paint.raster)
  const [directionId, setDirectionId] = useState(products.direction ?? directions[0]?.id ?? '')
  const [arrangement, setArrangement] = useState(() => directions.find((entry) => entry.id === directionId)?.arrangement ?? defaultProductArrangement(brand))
  const [tile, setTile] = useState(() => directions.find((entry) => entry.id === directionId)?.tile ?? defaultProductTile(brand))
  const [paintId, setPaintId] = useState(paints[0]?.id)
  const [descriptor, setDescriptor] = useState(false)
  const paint = paints.find((entry) => entry.id === paintId) ?? paints[0]
  // A direction is a named pair; changing either half by hand leaves no direction chosen.
  const direction = directions.find((entry) => entry.id === directionId && entry.arrangement === arrangement && (!tiles.length || entry.tile === tile))
  const chooseDirection = (id) => {
    const next = directions.find((entry) => entry.id === id)
    setDirectionId(id)
    if (next) { setArrangement(next.arrangement); if (tiles.includes(next.tile)) setTile(next.tile) }
  }
  const parent = productParent(brand)
  const ground = groundFor(brand, paint)
  const parentSvg = () => {
    const { width, height, art } = productParentLockup(ctx, { colour: paint.colourway ? undefined : colour(brand, paint.colour), colourway: paint.colourway })
    return svgDocument(ctx, width, height, art, `${brand.name} / parent logo`)
  }
  // Every lockup at one scale, so the family is compared as it would sit on a page.
  const family = useMemo(() => {
    const drawn = items.map((item) => {
      const size = productLockup(ctx, { product: item.id, arrangement, colour: paint.colourway ? undefined : colour(brand, paint.colour), colourway: paint.colourway, descriptor })
      return { item, width: size.width, svg: productDocument(ctx, { product: item.id, arrangement, colourKey: paint.colour, colourway: paint.colourway, descriptor }) }
    })
    const widest = Math.max(...drawn.map((entry) => entry.width))
    return drawn.map((entry) => ({ ...entry, share: entry.width / widest }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand, fonts, items, arrangement, paint, descriptor])
  const chosen = products.direction ? directions.find((entry) => entry.id === products.direction) : null

  return (
    <div className="view products-view">
      <section className="panel products-intro">
        <div className="products-intro__text">
          <div className="panel__head">
            <h2>{products.label ?? 'Products'} {products.status && <span className="badge">{products.status}</span>}</h2>
            {products.note && <p className="muted">{products.note}</p>}
          </div>
          <p>Every lockup here embeds the {parent.label} logo as it is: the same artwork as the Logos tab, never redrawn, re-typeset or resized on its own. A product adds its name, a descriptor and an accent{productsOf(brand).some((item) => productPictogram(brand, item)) ? ', and a pictogram' : ''}, each sized from the logo’s height.</p>
          <p className="muted">{chosen ? `Chosen direction: ${chosen.label}. The kit carries that arrangement${arrangements.includes('compact') && chosen.arrangement !== 'compact' ? ' and the compact one' : ''} for every product.` : directions.length ? 'No direction is chosen yet, so the kit carries every arrangement on offer for comparison.' : `The kit carries ${arrangements.length === 1 ? 'the arrangement' : `all ${arrangements.length} arrangements`} for every product.`}</p>
        </div>
        <figure className="asset-card products-intro__parent">
          <div className="asset-card__art" style={{ background: ground }}><SvgImage svg={parentSvg()} alt={`${brand.name} parent logo`} /></div>
          <figcaption><span>Parent identity — fixed</span></figcaption>
        </figure>
      </section>

      <section className="panel toolbar toolbar--panel products-controls" aria-label="How the family is shown">
        {directions.length > 0 && <Field label="Direction">
          <Segmented label="Direction" value={direction?.id ?? ''} options={directions.map((entry) => ({ value: entry.id, label: entry.label, title: entry.summary }))} onChange={chooseDirection} />
        </Field>}
        <Field label="Arrangement">
          <Segmented label="Arrangement" value={arrangement} options={arrangements.map((id) => ({ value: id, label: ARRANGEMENT_LABELS[id], title: ARRANGEMENT_USES[id] }))} onChange={setArrangement} />
        </Field>
        {paints.length > 1 && <Field label="Logo colour">
          <Segmented label="Logo colour" value={paint.id} options={paints.map((entry) => ({ value: entry.id, label: entry.colourway ? entry.label : colourName(brand, entry.colour) }))} onChange={setPaintId} />
        </Field>}
        {tiles.length > 1 && <Field label="Tile">
          <Segmented label="Tile" value={tile} options={tiles.map((id) => ({ value: id, label: tileLabels(brand)[id] }))} onChange={setTile} />
        </Field>}
        {items.some((item) => item.descriptor) && <label className="wordmark-toggle"><input type="checkbox" checked={descriptor} onChange={(event) => setDescriptor(event.target.checked)} /><span>Descriptor</span></label>}
        <p className="products-controls__about">{direction?.summary ?? ARRANGEMENT_USES[arrangement]}</p>
      </section>

      <section className="panel" aria-labelledby="products-family">
        <div className="panel__head">
          <h2 id="products-family">The family at a glance</h2>
          <p className="muted">All {items.length} at one scale. The parent logo is the same artwork in each.</p>
        </div>
        <div className={`products-family products-family--${arrangement}`} style={{ background: ground }}>
          {family.map(({ item, svg, share }) => <SvgImage key={item.id} svg={svg} alt={`${brand.name} ${item.name}`} style={{ width: `${(share * 100).toFixed(2)}%` }} />)}
        </div>
      </section>

      <div className="product-grid">
        {items.map((item) => <ProductCard key={item.id} brand={brand} fonts={fonts} item={item} arrangement={arrangement} paint={paint} descriptor={descriptor} tile={tiles.includes(tile) ? tile : tiles[0]} ground={ground} />)}
      </div>
    </div>
  )
}
