// Printing the brand's cards, built from Template Printer's parts (vendor/template-printer,
// embed/parts) in brandkit's own panels: the card's front and back, the people to put on it, a
// layout and a PDF. Everything else the printer does (its card designer, people database,
// calibration, lanyards) is on its website, one link away, rather than a second app in the page.
import { useEffect, useMemo, useState } from 'react'
import { CardPreview, PRINT_LAYOUTS, exportCardPng, exportCardsPdf, parsePeople, printLayoutKind, useCardPackage } from '../../../vendor/template-printer/frontend/src/embed/parts'
import { download } from '../../export/render.js'
import { PRINTER_WEBSITE, printerWebsiteUrl } from '../../printer/bridge.js'
import { createPrinterPackage } from '../../printer/package.js'
import { Field, Segmented, Select, useStored } from '../ui.jsx'

const KINDS = [
  { value: 'card', label: 'One card', hint: 'A page the size of the card, for a card printer' },
  { value: 'sheet', label: 'Sheet', hint: 'Several cards to a page, to cut out' },
  { value: 'tray', label: 'Card tray', hint: 'PVC cards in an inkjet’s card or disc tray' }
]
const SENT = '~sent'
const slug = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const nameOf = (person, inputs) => [person.firstName, person.lastName].filter(Boolean).join(' ') || inputs.map((input) => input.kind === 'text' && person[input.key]).find(Boolean) || 'Unnamed'
const readImage = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(new Error('That image could not be read.'))
  reader.readAsDataURL(file)
})

/** The card's package: a brand preset, opened with the fields the brand has filled in, or the one sent from Templates. */
const usePackageBytes = (brand, source, choice, request) => {
  const [loaded, setLoaded] = useState({ key: null, bytes: null, error: null })
  const preset = brand.printer?.packages?.find((entry) => entry.id === choice)
  useEffect(() => {
    if (!preset) return undefined
    let live = true
    // The preset's own front, so the package carries the artwork as the brand has it now and the
    // values typed in Templates, the same package Templates' "Edit & print" sends.
    const front = brand.templates.find((entry) => entry.printer?.packageId === preset.id && entry.printer.side === 'front')
    let values = {}
    try { values = JSON.parse(localStorage.getItem(`brandkit:fields:${brand.id}`) || '{}') } catch { /* none kept */ }
    const make = front ? createPrinterPackage({ brand, values }, front, { readAsset: source.read }).then((result) => result.bytes) : source.read(preset.file).then((bytes) => new Uint8Array(bytes))
    make.then((bytes) => { if (live) setLoaded({ key: preset.id, bytes, error: null }) }, (problem) => { if (live) setLoaded({ key: preset.id, bytes: null, error: problem.message }) })
    return () => { live = false }
  }, [brand, source, preset])
  if (choice === SENT) return { bytes: request?.bytes ?? null, error: null }
  return loaded.key === preset?.id ? loaded : { bytes: null, error: null }
}

export const TemplatePrinter = ({ brand, source, request, onImport }) => {
  const presets = brand.printer?.packages ?? []
  const [choice, setChoice] = useState(request ? SENT : presets[0]?.id ?? null)
  // A card sent from Templates ("Edit & print") is shown as soon as it arrives.
  useEffect(() => { if (request) setChoice(SENT) }, [request])
  useEffect(() => { if (choice !== SENT && !presets.some((entry) => entry.id === choice)) setChoice(request ? SENT : presets[0]?.id ?? null) }, [presets, choice, request])
  const packageBytes = usePackageBytes(brand, source, choice, request)
  const { card, error: openError, loading } = useCardPackage(packageBytes.bytes)

  const [mode, setMode] = useState('one')
  const [person, setPerson] = useState({})
  const [list, setList] = useStored(`brandkit:printer:people:${brand.id}`, '')
  const [shown, setShown] = useState(0)
  const [kind, setKind] = useStored('brandkit:printer:kind', 'card')
  const [layoutId, setLayoutId] = useStored('brandkit:printer:layout', '')
  const [faces, setFaces] = useStored('brandkit:printer:faces', 'both')
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  // Each card opens with the person it was made with (or typed in Templates).
  useEffect(() => { if (card) setPerson(card.sample) }, [card])

  const people = useMemo(() => (card && mode === 'many' ? parsePeople(list, card.inputs) : [person]), [card, mode, list, person])
  const previewed = people[Math.min(shown, people.length - 1)] ?? {}
  // The most cards to a page first: the layout most people printing a batch want.
  const layouts = PRINT_LAYOUTS.filter((layout) => printLayoutKind(layout) === kind).sort((a, b) => b.cardsPerPage - a.cardsPerPage)
  const layout = layouts.find((entry) => entry.id === layoutId) ?? layouts[0]
  const back = Boolean(card?.back)
  const preset = presets.find((entry) => entry.id === choice)
  let website
  try { website = printerWebsiteUrl(preset?.sourceUrl ?? null, { website: brand.printer?.website }) } catch { website = PRINTER_WEBSITE }

  const run = async (label, task) => {
    setBusy(label)
    setError(null)
    try { await task() } catch (problem) { setError(problem.message) } finally { setBusy(null) }
  }
  const fileName = (suffix) => [brand.id, slug(card.name), people.length === 1 ? slug(nameOf(people[0], card.inputs)) : `${people.length}-cards`, suffix].filter(Boolean).join('-')
  const printPdf = () => run('pdf', async () => {
    // A sheet goes through the printer twice, turned over on its long edge, so its backs are
    // mirrored to land behind their fronts; a card tray is fed the same way round both times.
    const bytes = await exportCardsPdf(card, people, { layout, faces: back ? faces : 'front', mirrorBacks: kind === 'sheet' })
    download(bytes, `${fileName()}.pdf`)
  })
  const savePng = (face) => run(face, async () => download(await exportCardPng(card, face, previewed), `${fileName(face)}.png`))
  const addPackage = (file) => run('import', async () => onImport(new Uint8Array(await file.arrayBuffer())))
  const cards = [...presets.map((entry) => ({ value: entry.id, label: entry.name })), ...(request ? [{ value: SENT, label: `From Templates${card && choice === SENT ? `: ${card.name}` : ''}` }] : [])]

  return (
    <div className="view printer">
      <section className="panel printer__head">
        <div>
          <h2>Print {card?.name ?? 'cards'}</h2>
          <p className="muted">Fill in the card, check both sides and download a PDF ready to print. Designing cards, keeping a list of people, calibrating a printer and lanyards are on the Template Printer website.</p>
        </div>
        <div className="printer__controls">
          {cards.length > 1 && <Field label="Card"><Select value={choice} onChange={setChoice} options={cards} /></Field>}
          <label className="button button--quiet printer__file">
            <input type="file" accept=".zip,application/zip" disabled={Boolean(busy)} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) addPackage(file) }} />
            {busy === 'import' ? 'Adding…' : 'Add a printer package…'}
          </label>
          <a className="button button--quiet" href={website} target="_blank" rel="noopener noreferrer">Open the full printer website ↗</a>
        </div>
        {(packageBytes.error || openError) && <p className="notice notice--error" role="alert">{packageBytes.error ?? openError.message}</p>}
        {card?.missingFonts.length > 0 && <p className="notice">This card asks for {card.missingFonts.join(', ')}, which its package does not include; those lines print in a stand-in typeface.</p>}
      </section>

      {!card ? <section className="panel"><p className="muted">{loading || packageBytes.bytes ? 'Opening the card…' : 'This brand has no card set up for printing.'}</p></section> : (
        <div className="printer__layout">
          <section className="panel printer__stage" aria-label="Preview">
            {people.length > 1 && (
              <Field label="Showing">
                <Select value={String(Math.min(shown, people.length - 1))} onChange={(value) => setShown(Number(value))} options={people.map((entry, index) => ({ value: String(index), label: `${index + 1}. ${nameOf(entry, card.inputs)}` }))} />
              </Field>
            )}
            <div className="printer__faces">
              {['front', ...(back ? ['back'] : [])].map((face) => (
                <figure key={face} className="printer__face">
                  <CardPreview className="printer__card" card={card} face={face} person={previewed} label={`${card.name}, ${face}, for ${nameOf(previewed, card.inputs)}`} />
                  <figcaption>
                    <span>{face === 'front' ? 'Front' : 'Back'}</span>
                    <button type="button" className="link" disabled={Boolean(busy)} onClick={() => savePng(face)}>{busy === face ? 'Making…' : '↓ PNG'}</button>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>

          <section className="panel printer__fill">
            <div className="printer__step">
              <div className="printer__step-head">
                <h3>Who’s on it</h3>
                <Segmented label="People" value={mode} onChange={(value) => { setMode(value); setShown(0) }} options={[{ value: 'one', label: 'One person' }, { value: 'many', label: 'Several' }]} />
              </div>
              {mode === 'one' && card.inputs.length === 0 && <p className="muted printer__hint">Nothing to fill in on this card: it prints as designed.</p>}
              {mode === 'one' ? card.inputs.map((input) => (
                <Field key={input.key} label={input.label} hint={card.back && input.faces.length === 1 && input.faces[0] === 'back' ? 'On the back' : undefined}>
                  {input.kind === 'image' ? (
                    <span className="printer__image">
                      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={async (event) => { const file = event.target.files?.[0]; if (file) { const src = await readImage(file); setPerson((current) => ({ ...current, [input.key]: src })) } }} />
                      {person[input.key] && <button type="button" className="link" onClick={() => setPerson((current) => ({ ...current, [input.key]: '' }))}>Remove</button>}
                    </span>
                  ) : <input type="text" value={person[input.key] ?? ''} onChange={(event) => setPerson((current) => ({ ...current, [input.key]: event.target.value }))} />}
                </Field>
              )) : (
                <Field label={`${people.length} ${people.length === 1 ? 'person' : 'people'}`} hint={`One per line: ${card.inputs.filter((input) => input.kind === 'text').map((input) => input.label).join(', ')}. Paste from a spreadsheet, with or without its header row.`}>
                  <textarea rows={6} value={list} spellCheck={false} placeholder={card.inputs.filter((input) => input.kind === 'text').map((input) => card.sample[input.key] ?? input.label).join(', ')} onChange={(event) => setList(event.target.value)} />
                </Field>
              )}
            </div>

            <div className="printer__step">
              <h3>Print</h3>
              <Field label="On" hint={KINDS.find((entry) => entry.value === kind)?.hint}>
                <Segmented label="Print on" value={kind} onChange={setKind} options={KINDS.map(({ value, label }) => ({ value, label }))} />
              </Field>
              {layouts.length > 1 && (
                <Field label="Layout" hint={layout && [layout.paperSize, layout.printMedia].filter(Boolean).join(' · ')}>
                  <Select value={layout?.id} onChange={setLayoutId} options={layouts.map((entry) => ({ value: entry.id, label: entry.name }))} />
                </Field>
              )}
              {back && (
                <Field label="Sides">
                  <Segmented label="Sides" value={faces} onChange={setFaces} options={[{ value: 'both', label: 'Front and back' }, { value: 'front', label: 'Front only' }]} />
                </Field>
              )}
              <button type="button" className="button button--large printer__pdf" disabled={Boolean(busy) || !people.length || !layout} onClick={printPdf}>
                {busy === 'pdf' ? 'Making the PDF…' : `↓ PDF, ${people.length} ${people.length === 1 ? 'card' : 'cards'}`}
              </button>
              <p className="muted printer__hint">Print at 100% (actual size).{back && faces === 'both' ? kind === 'sheet' ? ' Each page of fronts is followed by its backs, mirrored for printing on both sides.' : ' Each page of fronts is followed by its backs.' : ''}</p>
              {error && <p className="notice notice--error" role="alert">{error}</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
