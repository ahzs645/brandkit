// brandkit's shared interface parts, used by the app and by the packages it exports (the template
// studio), with their own styles so a host gets them styled without the app's stylesheet.

import { useId, useRef, useState, useSyncExternalStore } from 'react'
import './edit-preview-dock.css'

// The same width as the stylesheet's: below it a form and its preview no longer fit side by side.
const QUERY = '(max-width: 760px)'
const subscribe = (change) => {
  const list = matchMedia(QUERY)
  list.addEventListener('change', change)
  return () => list.removeEventListener('change', change)
}
const compactNow = () => matchMedia(QUERY).matches

const EditIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></svg>
const PreviewIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>

/**
 * A long form and its preview: side by side where there is room (the host's own layout), and on a
 * phone one at a time, switched by two tabs in a bar pinned to the bottom of the screen, where a
 * thumb reaches them. Otherwise the preview is a long scroll past the form, after its own buttons.
 *
 *   const dock = useEditPreviewDock({ labels: { preview: 'Preview & download' } })
 *   <div ref={dock.ref} className={`my-layout ${dock.className}`}>
 *     <form {...dock.panel('edit')}>…</form>
 *     <section {...dock.panel('preview')}>…</section>
 *     {dock.bar}
 *   </div>
 *
 * The panels can be anywhere inside the element with `className`; anything else in it shows on both
 * tabs (the template studio's picker). The bar is sticky rather than fixed, so it never covers the
 * end of the content or what follows it: past the dock it goes with it.
 */
export const useEditPreviewDock = ({ initial = 'edit', labels = {}, label = 'Edit or preview' } = {}) => {
  const id = useId()
  const [tab, setTab] = useState(initial)
  const compact = useSyncExternalStore(subscribe, compactNow, () => false)
  const ref = useRef(null)
  const tabs = useRef({})
  const names = { edit: labels.edit ?? 'Edit', preview: labels.preview ?? 'Preview' }

  const show = (next, focus) => {
    if (focus) tabs.current[next]?.focus()
    if (next === tab) return
    setTab(next)
    // The other side opens at its start, not wherever the long form had been scrolled to. Its
    // scroll margin clears the masthead.
    const box = ref.current?.getBoundingClientRect()
    if (box && box.top < parseFloat(getComputedStyle(ref.current).scrollMarginTop || 0)) ref.current.scrollIntoView({ block: 'start' })
  }
  const onKeyDown = (event) => {
    const other = tab === 'edit' ? 'preview' : 'edit'
    if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); show(other, true) }
    if (event.key === 'Home') { event.preventDefault(); show('edit', true) }
    if (event.key === 'End') { event.preventDefault(); show('preview', true) }
  }

  return {
    tab, show, compact, ref,
    className: `edit-preview edit-preview--${tab}`,
    panel: (name) => ({ id: `${id}-${name}`, 'data-dock-panel': name, ...(compact ? { role: 'tabpanel', 'aria-labelledby': `${id}-${name}-tab` } : {}) }),
    bar: compact && (
      <nav className="edit-preview__bar" aria-label={label}>
        <div className="edit-preview__tabs" role="tablist" onKeyDown={onKeyDown}>
          {['edit', 'preview'].map((name) => (
            <button key={name} ref={(element) => { tabs.current[name] = element }} id={`${id}-${name}-tab`} type="button" role="tab" className="edit-preview__tab"
              aria-selected={tab === name} aria-controls={`${id}-${name}`} tabIndex={tab === name ? 0 : -1} onClick={() => show(name)}>
              {name === 'edit' ? <EditIcon /> : <PreviewIcon />}{names[name]}
            </button>
          ))}
        </div>
      </nav>
    )
  }
}
