// Sharing a brand with the people who use it: a link (?brand=…&share=1) that opens brandkit as
// that brand's own resource centre. The viewer sees the approved identity (its logos, templates,
// guide and kit) and none of the workshop: no revisions, no editing, no other brands, no manual
// library and no notes on which manual page a template follows.
//
// It is a way of presenting the brand, not of protecting it: the site is static, and the full
// app is the same address without `share`.

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { BrandLogo, Field, Segmented } from './ui.jsx'

export const isSharedView = () => new URLSearchParams(globalThis.location?.search ?? '').has('share')

/** True inside a shared view, for the pieces that only the people making the brand should see. */
export const Shared = createContext(false)
export const useShared = () => useContext(Shared)

// What a shared view offers, and where its link can open.
export const SHARED_VIEWS = ['overview', 'logos', 'templates', 'guide', 'kit']
const START_LABELS = { overview: 'Overview', logos: 'Logos', templates: 'Templates', guide: 'Guide', kit: 'Download kit' }

export const shareUrl = (brandId, view = 'overview') => {
  const url = new URL(import.meta.env.BASE_URL, globalThis.location.origin)
  url.searchParams.set('brand', brandId)
  if (view !== 'overview') url.searchParams.set('view', view)
  url.searchParams.set('share', '1')
  return url.href
}

/** The shared view's masthead mark: the brand's own logo, and what this is. */
export const SharedMark = ({ brand }) => (
  <a className="shared-mark" href={shareUrl(brand.id)} aria-label={`${brand.name} brand centre`}>
    <BrandLogo brand={brand} />
    <span className="shared-mark__label">Brand centre</span>
  </a>
)

/** The dialog behind the masthead's Share button: what a viewer will see, and the link to copy. */
export const ShareDialog = ({ brand, shareable, edited, revision, view, onClose }) => {
  const dialog = useRef(null)
  const [start, setStart] = useState(SHARED_VIEWS.includes(view) ? view : 'overview')
  const [copied, setCopied] = useState(false)
  const link = shareUrl(brand.id, start)
  useEffect(() => {
    const element = dialog.current
    element?.showModal?.()
    return () => element?.close?.()
  }, [])
  useEffect(() => { setCopied(false) }, [link])
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true) } catch { /* the field is selectable */ }
  }

  return (
    <dialog ref={dialog} className="share-dialog" aria-labelledby="share-title" onClose={onClose} onClick={(event) => { if (event.target === dialog.current) dialog.current.close() }}>
      <div className="share-dialog__body">
        <div className="share-dialog__head">
          <h2 id="share-title">Share {brand.name}</h2>
          <button type="button" className="share-dialog__close" aria-label="Close" onClick={() => dialog.current?.close()}>×</button>
        </div>
        <p className="muted">A link for colleagues: {brand.name}’s approved identity as its own brand centre, without the tools for working on it.</p>

        <div className="share-dialog__compare">
          <div>
            <h3>They’ll see</h3>
            <ul className="share-list share-list--yes">
              <li>The approved logo, v{brand.displayVersion ?? brand.version}</li>
              <li>Logos and symbols to download</li>
              <li>Templates to fill in, and the Office files</li>
              <li>The brand guide</li>
              <li>The whole kit, as one download</li>
            </ul>
          </div>
          <div>
            <h3>Left out</h3>
            <ul className="share-list share-list--no">
              <li>Revisions and proposals</li>
              <li>Edit brand, New brand, Open…</li>
              <li>Other brands</li>
              <li>The manual library and its references</li>
            </ul>
          </div>
        </div>

        {shareable ? (
          <>
            <Field label="Opens on">
              <Segmented label="Opens on" value={start} options={SHARED_VIEWS.map((value) => ({ value, label: START_LABELS[value] }))} onChange={setStart} />
            </Field>
            <div className="share-link">
              <input type="text" readOnly value={link} aria-label="Share link" onFocus={(event) => event.target.select()} />
              <button type="button" className="button" onClick={copy}>{copied ? 'Copied' : 'Copy link'}</button>
            </div>
            {edited && <p className="notice">The link shares {brand.name} as it is on the site, without the edits you’ve made here.</p>}
            {revision && <p className="notice">You’re looking at the {revision.title.toLowerCase()} ({revision.status}). The link shows the approved v{brand.displayVersion ?? brand.version} instead.</p>}
            <p className="share-dialog__foot">
              <a href={link} target="_blank" rel="noopener">Preview as a colleague ↗</a>
              <span className="muted">Anyone with the link can open it, and the full app is the same address without <code>share</code>; it shapes what people see rather than locking anything.</span>
            </p>
          </>
        ) : (
          <p className="notice">{brand.name} lives only in this browser, so a link would open nothing for anyone else. Download its <code>brand.json</code> (Download kit → Build sources) and add it to the repository’s <code>brands/</code> folder to share it.</p>
        )}
      </div>
    </dialog>
  )
}
