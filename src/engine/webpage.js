// A brand's web components and the page made from them: the anatomy its own website uses, drawn
// from `brand.web.page`. Each component (header, tabs, title, breadcrumbs, eyebrow, button, aside,
// cards, table, note, footer, legal bar) is its own markup and stylesheet over shared tokens, so
// a site can take one part or all of them; the page template is those components composed.
// UNBC's follow www.unbc.ca; any brand can describe its own.
//
//   brand.web.page: {
//     colours: { masthead: [from, to], mastheadText, cta, ctaText, title, rule, link, text, muted,
//                surface, warm, accent, asideBar, asideGround },   brand colour keys or roles
//     fonts: { body, bold, italic, display },                       brand font keys
//     logo: { signature, colourway, widthPx, footer: { colourway, widthPx } },
//     cta, menu: [label], tabs: [label], breadcrumbs: [label],
//     content: { title, eyebrow, headline, lead, body, button, aside: { eyebrow, title, body },
//                sectionEyebrow, sectionTitle, cards: [{ title, body, link }], table: { caption,
//                headers, rows }, note },
//     footer: { name, lines: [], phone: { label, number }, links: [], acknowledgement, legal: [] }
//   }
//
// The department (or the brand's department field) sets the header's sub-logo and the page title,
// as a department's own site on unbc.ca does.

import { colour } from './brand.js'
import { logoDocument } from './artwork.js'
import { escape } from './format.js'

const hexOf = (brand, key, fallback) => colour(brand, brand.roles?.[key] ?? key ?? fallback) ?? fallback
const inline = (svg) => svg.replace(/^<\?xml[^>]*>\s*/, '').replace(/<title>[\s\S]*?<\/title>|<desc>[\s\S]*?<\/desc>/g, '').replace(/\s(width|height)="[^"]*"/g, '')
const list = (items, render) => (items ?? []).map(render).join('')
const ARROW = '<svg class="{p}-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>'

/** Whether the brand describes web components. */
export const hasWebPage = (brand) => Boolean(brand?.web?.page)

/**
 * The shared stylesheet every component sits on: the brand's web faces and its tokens as custom
 * properties, the page body and the content width. `fontUrl(file)` makes a font file loadable.
 */
const foundation = (ctx, fontUrl) => {
  const { brand } = ctx
  const page = brand.web.page
  const p = brand.web.cssPrefix ?? brand.id
  const c = (key, fallback) => hexOf(brand, page.colours?.[key], fallback)
  const fonts = page.fonts ?? {}
  const familyOf = (key) => `"${brand.id}-${key}"`
  const faces = [...new Set(Object.values(fonts))].filter((key) => brand.fonts?.[key]?.web)
  const fontFace = faces.map((key) => {
    const face = brand.fonts[key]
    const format = face.web.endsWith('.woff2') ? 'woff2' : face.web.endsWith('.woff') ? 'woff' : face.web.endsWith('.otf') ? 'opentype' : 'truetype'
    return `@font-face{font-family:${familyOf(key)};src:url("${fontUrl(face.web)}") format("${format}");font-weight:${face.weight ?? 400};font-style:${face.style ?? 'normal'};font-display:swap}`
  }).join('\n')
  const stack = (key) => `${brand.fonts?.[fonts[key]] ? `${familyOf(fonts[key])},` : ''}${brand.fonts?.[fonts[key]]?.stack ?? 'Arial,sans-serif'}`
  const [from, to] = (page.colours?.masthead ?? ['primary', 'primary']).map((key) => hexOf(brand, key))
  const tokens = {
    'masthead-from': from, 'masthead-to': to, 'masthead-text': c('mastheadText', '#fff'), cta: c('cta', '#960'), 'cta-text': c('ctaText', '#fff'),
    title: c('title', '#960'), rule: c('rule', '#eee'), link: c('link', '#036'), text: c('text', '#222'), muted: c('muted', '#666'),
    surface: c('surface', '#f4f4f4'), warm: c('warm', '#eee'), accent: c('accent', '#063'), 'aside-bar': c('asideBar', '#960'), 'aside-ground': c('asideGround', '#f0eeec'),
    'font-body': stack('body'), 'font-bold': stack('bold'), 'font-display': stack('display'),
    'logo-width': `${page.logo?.widthPx ?? 340}px`, 'footer-logo-width': `${page.logo?.footer?.widthPx ?? 200}px`
  }
  return `${fontFace}
:root{${Object.entries(tokens).map(([key, value]) => `--${p}-${key}:${value}`).join(';')}}
*{box-sizing:border-box}body{margin:0;background:#fff;color:var(--${p}-text);font:16px/1.5 var(--${p}-font-body)}a{color:var(--${p}-link)}
.${p}-wrap{max-width:1170px;margin:0 auto;padding-left:15px;padding-right:15px}
.${p}-arrow{width:16px;height:16px;flex:none}
h2,h3{font-family:var(--${p}-font-display);font-weight:400;color:var(--${p}-text);margin:0 0 14px}h2{font-size:clamp(28px,calc(23.8px + .7vw),35px);line-height:1.1}h3{font-size:22px;line-height:1.2}`
}

/**
 * Every component, in page order: `{ id, label, use, html, css }`. `html` is the component's
 * markup alone; `css` its own rules, which need the foundation (see webComponentDocument).
 */
export const webComponents = (ctx, { department = '' } = {}) => {
  const { brand } = ctx
  const page = brand.web?.page
  if (!page) throw new Error(`${brand.name} has no web components.`)
  const p = brand.web.cssPrefix ?? brand.id
  const v = (name) => `var(--${p}-${name})`
  const field = brand.departments?.field ?? 'department'
  const name = department.replace(/\s*\n\s*/g, ' ').trim()
  const t = page.content ?? {}
  const footer = page.footer ?? {}
  const title = name || t.title || brand.name
  const arrow = ARROW.replace('{p}', p)
  const logoAt = (spec = {}) => inline(logoDocument({ ...ctx, values: { [field]: department } }, {
    signature: name && page.logo?.signature ? page.logo.signature : brand.signatures?.[0]?.id,
    colourway: spec.colourway ?? page.logo?.colourway
  }))
  const crumbs = [...(page.breadcrumbs ?? []), title]
  const all = [
    { id: 'header', label: 'Header', use: 'Masthead with the logo (the department’s sub-logo when one is named), the call to action and the main menu.',
      html: `<header class="${p}-header"><div class="${p}-wrap ${p}-header__inner"><a class="${p}-header__logo" href="#" aria-label="${escape([brand.organization?.name ?? brand.name, name].filter(Boolean).join(', '))}">${logoAt()}</a>
<nav class="${p}-header__nav" aria-label="Main">${page.cta ? `<a class="${p}-header__cta" href="#">${escape(page.cta)}</a>` : ''}<ul class="${p}-header__menu">${list(page.menu, (item, index) => `<li><a href="#"${index ? '' : ' aria-current="page"'}>${escape(item)}</a></li>`)}</ul></nav></div></header>`,
      css: `.${p}-header{background:linear-gradient(180deg,${v('masthead-from')},${v('masthead-to')});color:${v('masthead-text')}}.${p}-header__inner{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding-top:22px;padding-bottom:18px}
.${p}-header__logo{width:${v('logo-width')};max-width:62vw;display:block}.${p}-header__logo svg{width:100%;height:auto;display:block}
.${p}-header__nav{display:flex;flex-direction:column;align-items:flex-end;gap:26px}.${p}-header__cta{background:${v('cta')};color:${v('cta-text')};font:700 15px/1 ${v('font-bold')};padding:8px 9px;border-radius:2px;text-decoration:none}
.${p}-header__menu{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px 22px;margin:0;padding:0;list-style:none;font:700 15px/1.3 ${v('font-bold')}}.${p}-header__menu a{color:inherit;text-decoration:none}.${p}-header__menu a[aria-current]{border-bottom:2px solid currentColor;padding-bottom:3px}
@media(max-width:700px){.${p}-header__inner{flex-direction:column}.${p}-header__nav{align-items:flex-start;gap:14px}.${p}-header__menu{justify-content:flex-start}}` },
    page.tabs?.length && { id: 'tabs', label: 'Audience tabs', use: 'Warm tabs under the header for each audience. Hidden on phones, where the menu carries them.',
      html: `<nav class="${p}-wrap ${p}-tabs" aria-label="Information for">${list(page.tabs, (item) => `<a href="#">${escape(item)}</a>`)}</nav>`,
      css: `.${p}-tabs{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;padding-top:10px}.${p}-tabs a{background:${v('warm')};color:${v('text')};font:700 13px/1 ${v('font-bold')};padding:7px 10px;text-decoration:none}@media(max-width:700px){.${p}-tabs{display:none}}` },
    { id: 'title', label: 'Page title', use: 'The page’s name, in the display face and title colour over a 6 px rule.',
      html: `<div class="${p}-wrap ${p}-title"><h1>${escape(title)}</h1></div>`,
      css: `.${p}-title{padding-top:56px}.${p}-title h1{margin:0;color:${v('title')};font:400 clamp(35px,calc(27.2px + 1.3vw),48px)/1.1 ${v('font-display')};padding-bottom:12px;border-bottom:6px solid ${v('rule')};overflow-wrap:break-word}@media(max-width:700px){.${p}-title{padding-top:30px}}` },
    { id: 'breadcrumbs', label: 'Breadcrumbs', use: 'Where the page sits, under its title.',
      html: `<nav class="${p}-wrap" aria-label="Breadcrumbs"><ol class="${p}-breadcrumbs">${list(crumbs, (item, index) => `<li>${index < crumbs.length - 1 ? `<a href="#">${escape(item)}</a>` : `<span aria-current="page">${escape(item)}</span>`}</li>`)}</ol></nav>`,
      css: `.${p}-breadcrumbs{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 0;padding:0;list-style:none;font-size:14px;color:${v('muted')}}.${p}-breadcrumbs li+li:before{content:"›";margin-right:6px}.${p}-breadcrumbs a{color:${v('link')};text-decoration:none}` },
    { id: 'intro', label: 'Introduction', use: 'Eyebrow, headline, lead and body copy opening a page or section.',
      html: `<div class="${p}-intro">${t.eyebrow ? `<p class="${p}-eyebrow">${escape(t.eyebrow)}</p>` : ''}<h2>${escape(t.headline ?? '')}</h2>${t.lead ? `<p class="${p}-lead">${escape(t.lead)}</p>` : ''}${t.body ? `<p>${escape(t.body)}</p>` : ''}</div>`,
      css: `.${p}-eyebrow{margin:0 0 10px;color:${v('muted')};font:700 13px/1.3 ${v('font-bold')};letter-spacing:.08em;text-transform:uppercase}.${p}-intro h2{font-size:clamp(35px,calc(27.2px + 1.3vw),48px)}.${p}-lead{font-size:clamp(19px,calc(16px + .5vw),24px);line-height:1.45;margin:0 0 16px}` },
    t.button && { id: 'button', label: 'Button', use: 'The page’s main call to action.',
      html: `<a class="${p}-button" href="#">${escape(t.button)}${arrow}</a>`,
      css: `.${p}-button{display:inline-flex;align-items:center;gap:10px;margin-top:16px;padding:12px;border-radius:3px;background:${v('accent')};color:#fff;font:700 18px/22px ${v('font-bold')};letter-spacing:1px;text-decoration:none}` },
    t.aside && { id: 'aside', label: 'Aside', use: 'One fact, deadline or contact set apart: a short accent rule above, a gold bar below.',
      html: `<aside class="${p}-aside">${t.aside.eyebrow ? `<p class="${p}-eyebrow">${escape(t.aside.eyebrow)}</p>` : ''}<h3>${escape(t.aside.title ?? '')}</h3><p>${escape(t.aside.body ?? '')}</p></aside>`,
      css: `.${p}-aside{background:${v('aside-ground')};padding:36px 38px 30px;border-bottom:6px solid ${v('aside-bar')}}.${p}-aside:before{content:"";display:block;width:54px;height:4px;background:${v('accent')};margin-bottom:34px}.${p}-aside .${p}-eyebrow{margin:0 0 10px;color:${v('muted')};font:700 13px/1.3 ${v('font-bold')};letter-spacing:.08em;text-transform:uppercase}@media(max-width:700px){.${p}-aside{padding:28px 24px}}` },
    t.cards?.length && { id: 'cards', label: 'Cards', use: 'Routes onward from a page, each under a 4 px accent rule.',
      html: `<div class="${p}-cards">${list(t.cards, (card) => `<article class="${p}-card"><h3>${escape(card.title)}</h3><p>${escape(card.body)}</p>${card.link ? `<a class="${p}-card__link" href="#">${escape(card.link)}${arrow}</a>` : ''}</article>`)}</div>`,
      css: `.${p}-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:24px}.${p}-card{border:1px solid ${v('warm')};border-top:4px solid ${v('accent')};padding:30px}.${p}-card__link{display:inline-flex;align-items:center;gap:10px;font-family:${v('font-bold')};font-weight:700}` },
    t.table && { id: 'table', label: 'Table', use: 'Data with its source and period in the caption.',
      html: `<table class="${p}-table">${t.table.caption ? `<caption>${escape(t.table.caption)}</caption>` : ''}<thead><tr>${list(t.table.headers, (cell) => `<th scope="col">${escape(cell)}</th>`)}</tr></thead><tbody>${list(t.table.rows, (row) => `<tr>${list(row, (cell) => `<td>${escape(cell)}</td>`)}</tr>`)}</tbody></table>`,
      css: `.${p}-table{width:100%;border-collapse:collapse;font-size:15px}.${p}-table caption{caption-side:bottom;text-align:left;color:${v('muted')};font-size:13px;padding-top:8px}.${p}-table th,.${p}-table td{text-align:left;padding:10px 12px;border-bottom:1px solid ${v('warm')};vertical-align:top}.${p}-table th{background:${v('warm')};font-family:${v('font-bold')}}` },
    t.note && { id: 'note', label: 'Note', use: 'Small print: scope, sources and caveats.',
      html: `<p class="${p}-note">${escape(t.note)}</p>`,
      css: `.${p}-note{color:${v('muted')};font-size:14px;max-width:840px}` },
    { id: 'footer', label: 'Footer', use: 'Address, acknowledgement and footer links.',
      html: `<footer class="${p}-footer"><div class="${p}-wrap"><address>${footer.name ? `<strong>${escape(footer.name)}</strong><br>` : ''}${list(footer.lines, (line) => `${escape(line)}<br>`)}${footer.phone ? `<strong>${escape(footer.phone.label ?? 'Phone:')}</strong> ${escape(footer.phone.number ?? '')}` : ''}</address>
${footer.acknowledgement ? `<p class="${p}-footer__ack">${escape(footer.acknowledgement)}</p>` : ''}<p class="${p}-footer__links">${list(footer.links, (item) => `<a href="#">${escape(item)}</a>`)}</p></div></footer>`,
      css: `.${p}-footer{background:${v('surface')};padding:48px 0 30px}.${p}-footer address{font-style:normal}.${p}-footer__ack{font-style:italic;max-width:1100px;margin:28px 0}.${p}-footer__links{display:flex;flex-wrap:wrap;gap:6px 18px;font-family:${v('font-bold')};font-weight:700}.${p}-footer__links a{text-decoration:none}` },
    { id: 'legal', label: 'Legal bar', use: 'The logo again, small, with the legal links.',
      html: `<div class="${p}-wrap ${p}-legal"><span class="${p}-legal__logo">${logoAt(page.logo?.footer)}</span>${list(footer.legal, (item) => `<a href="#">${escape(item)}</a>`)}</div>`,
      css: `.${p}-legal{display:flex;flex-wrap:wrap;align-items:center;gap:16px 28px;padding-top:22px;padding-bottom:22px;font-size:14px}.${p}-legal__logo{width:${v('footer-logo-width')}}.${p}-legal__logo svg{width:100%;height:auto;display:block}.${p}-legal a{text-decoration:none}` }
  ]
  return all.filter(Boolean)
}

const documentOf = (ctx, title, css, body) => `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><style>${css}</style></head>
<body>
${body}
</body></html>
`

/** The stylesheet for every component: the foundation and each component's own rules. */
export const webStylesheet = (ctx, { fontUrl = (file) => `../${file}` } = {}) => [foundation(ctx, fontUrl), ...webComponents(ctx).map((component) => `/* ${component.label} */\n${component.css}`)].join('\n')

/** One component on its own page, for previewing or taking into another site. */
export const webComponentDocument = (ctx, id, { department = '', fontUrl = (file) => `../${file}` } = {}) => {
  const component = webComponents(ctx, { department }).find((entry) => entry.id === id)
  if (!component) throw new Error(`${ctx.brand.name} has no web component “${id}”.`)
  const p = ctx.brand.web.cssPrefix ?? ctx.brand.id
  // Components that sit inside the content width get it here too, so they preview as placed.
  const wrapped = ['header', 'tabs', 'title', 'breadcrumbs', 'footer', 'legal'].includes(id) ? component.html : `<div class="${p}-wrap" style="padding-top:24px;padding-bottom:24px">${component.html}</div>`
  return documentOf(ctx, `${component.label} | ${ctx.brand.name}`, `${foundation(ctx, fontUrl)}\n${component.css}`, wrapped)
}

/**
 * The page template: the components composed as a department's page. `fontUrl(file)` turns a
 * brand font's file into a URL the page can load; `department` names the unit.
 */
export const webPage = (ctx, { department = '', fontUrl = (file) => `../${file}` } = {}) => {
  const { brand } = ctx
  if (!hasWebPage(brand)) throw new Error(`${brand.name} has no web page.`)
  const p = brand.web.cssPrefix ?? brand.id
  const parts = Object.fromEntries(webComponents(ctx, { department }).map((component) => [component.id, component]))
  const t = brand.web.page.content ?? {}
  const html = (id) => parts[id]?.html ?? ''
  const name = department.replace(/\s*\n\s*/g, ' ').trim()
  const css = `${webStylesheet(ctx, { fontUrl })}
/* Page layout */
.${p}-hero{display:grid;grid-template-columns:1.5fr 1fr;gap:48px;align-items:start;padding-top:36px;padding-bottom:48px;background:linear-gradient(var(--${p}-warm),var(--${p}-warm)) 15px 100%/calc(100% - 30px) 1px no-repeat}
.${p}-section{padding-top:44px;padding-bottom:44px}.${p}-section>*+*{margin-top:22px}.${p}-page-footer{margin-top:40px}
@media(max-width:700px){.${p}-hero{grid-template-columns:1fr;gap:28px}}`
  return documentOf(ctx, `${name || t.title || brand.name} | ${brand.organization?.name ?? brand.name}`, css, `${html('header')}
${html('tabs')}
<main>
${html('title')}
${html('breadcrumbs')}
<section class="${p}-wrap ${p}-hero"><div>${html('intro')}${html('button')}</div>${html('aside')}</section>
<section class="${p}-wrap ${p}-section">${t.sectionEyebrow ? `<p class="${p}-eyebrow">${escape(t.sectionEyebrow)}</p>` : ''}${t.sectionTitle ? `<h2>${escape(t.sectionTitle)}</h2>` : ''}
${html('cards')}
${html('table')}
${html('note')}</section>
</main>
<div class="${p}-page-footer">${html('footer')}</div>
${html('legal')}`)
}
