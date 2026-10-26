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
import { departmentLines } from './signatures.js'

const hexOf = (brand, key, fallback) => colour(brand, brand.roles?.[key] ?? key ?? fallback) ?? fallback
const inline = (svg) => svg.replace(/^<\?xml[^>]*>\s*/, '').replace(/<title>[\s\S]*?<\/title>|<desc>[\s\S]*?<\/desc>/g, '').replace(/\s(width|height)="[^"]*"/g, '')
const list = (items, render) => (items ?? []).map(render).join('')
// Icons drawn for the components (not Font Awesome): search, the search tab's chevron, the menu.
const SEARCH_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="6.8" cy="6.8" r="5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10.5 10.5 15 15" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'
const CHEVRON_ICON = '<svg viewBox="0 0 14 16" aria-hidden="true"><path d="M2 11l5-5 5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
const MENU_ICON = '<svg viewBox="0 0 28 24" aria-hidden="true"><path d="M2 4h24M2 12h24M2 20h24" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>'
const HOME_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 1 7.6h2v6.9h3.7V10h2.6v4.5H13V7.6h2z" fill="currentColor"/></svg>'
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
    surface: c('surface', '#f4f4f4'), warm: c('warm', '#eee'), 'warm-hover': c('warmHover', '#ddd'), crumb: c('crumb', '#999'), accent: c('accent', '#063'), 'aside-bar': c('asideBar', '#960'), 'aside-ground': c('asideGround', '#f0eeec'),
    'font-body': stack('body'), 'font-bold': stack('bold'), 'font-display': stack('display'),
    'logo-width': `${page.logo?.widthPx ?? 340}px`, 'footer-logo-width': `${page.logo?.footer?.widthPx ?? 200}px`
  }
  return `${fontFace}
:root{${Object.entries(tokens).map(([key, value]) => `--${p}-${key}:${value}`).join(';')}}
*{box-sizing:border-box}body{margin:0;background:#fff;color:var(--${p}-text);font:16px/1.5 var(--${p}-font-body)}a{color:var(--${p}-link)}
.${p}-wrap{width:100%;margin:0 auto;padding-left:15px;padding-right:15px}@media(min-width:768px){.${p}-wrap{max-width:750px}}@media(min-width:992px){.${p}-wrap{max-width:970px}}@media(min-width:1200px){.${p}-wrap{max-width:1170px}}@media(min-width:1590px){.${p}-wrap{max-width:1560px}}
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
  // How many lines the department takes under the wordmark: longer lockups are drawn narrower.
  const subLogo = name && brand.signatures?.find((entry) => entry.id === page.logo?.signature)
  const lineCount = subLogo ? departmentLines(ctx, subLogo, { [field]: department }).reduce((sum, entry) => sum + entry.lines.length, 0) : 0
  const all = [
    { id: 'header', label: 'Header', use: 'Masthead as www.unbc.ca draws it: the call to action and search tab hanging from the top edge, the logo (the department’s sub-logo when one is named) in the top row and the main menu in the row below; on phones, the menu button, logo and search tab in one 80 px row.',
      html: `<header class="${p}-header">${page.cta || page.search !== false ? `<div class="${p}-wrap ${p}-header__utility">${page.cta ? `<a class="${p}-header__cta" href="#">${escape(page.cta)}</a>` : ''}${page.search !== false ? `<button class="${p}-header__search" type="button" aria-label="Search">${SEARCH_ICON}${CHEVRON_ICON}</button>` : ''}</div>` : ''}
<div class="${p}-wrap ${p}-header__top"><button class="${p}-header__toggle" type="button" aria-label="Menu">${MENU_ICON}</button><a class="${p}-header__logo" href="#" data-lines="${lineCount}" aria-label="${escape([brand.organization?.name ?? brand.name, name].filter(Boolean).join(', '))}">${logoAt()}</a></div>
<nav class="${p}-wrap ${p}-header__bottom" aria-label="Main"><ul class="${p}-header__menu">${list(page.menu, (item, index) => `<li><a href="#"${index ? '' : ' aria-current="page"'}>${escape(item)}</a></li>`)}</ul></nav></header>`,
      // Geometry from www.unbc.ca (the UNBC chrome's measurements): a radial vignette; 141 px tall
      // from 1200 px with the wordmark 38.7 px down and the menu at 100 px; 156 px from 768 px;
      // an 80 px bar on phones. Longer department lockups step the logo down in width.
      css: `.${p}-header{position:relative;background-color:${v('masthead-from')};background-image:radial-gradient(ellipse at center,${v('masthead-from')} 59%,${v('masthead-to')} 100%);color:${v('masthead-text')}}
.${p}-header__utility{position:relative;height:0;z-index:2}.${p}-header__utility>*{position:absolute;top:0}
.${p}-header__cta{right:82px;top:14.5px!important;background:${v('cta')};color:${v('cta-text')};font:700 15px/22.5px ${v('font-bold')};padding:3px 9px;border-radius:3px;text-decoration:none;white-space:nowrap}
.${p}-header__search{right:15px;display:flex;align-items:center;justify-content:space-between;width:55px;height:43px;padding:21px 9px 6px;border:0;border-radius:0 0 3px 3px;background:${v('surface')};color:${v('masthead-from')};cursor:pointer}.${p}-header__search svg{height:16px;width:auto}
.${p}-header__top{display:flex;align-items:center;gap:15px;height:80px}
.${p}-header__toggle{display:none;flex:none;width:32px;padding:0;border:0;background:none;color:inherit;cursor:pointer}.${p}-header__toggle svg{display:block;height:32px;width:auto}
.${p}-header__logo{display:block;flex:none;line-height:0;width:min(235px,calc(100vw - 147px))}.${p}-header__logo svg{display:block;width:100%;height:auto;overflow:visible}
.${p}-header__logo[data-lines="3"]{width:min(212px,calc(100vw - 147px))}.${p}-header__logo[data-lines="4"],.${p}-header__logo[data-lines="5"],.${p}-header__logo[data-lines="6"]{width:min(180px,calc(100vw - 147px))}
.${p}-header__bottom{display:none}
.${p}-header__menu{display:flex;flex-wrap:wrap;justify-content:flex-end;margin:0;padding:0;list-style:none}.${p}-header__menu li{margin:0 10px}.${p}-header__menu li:last-child{margin-right:0}
.${p}-header__menu a{display:block;color:inherit;font:700 15px/22.5px ${v('font-bold')};text-decoration:none;border-bottom:2px solid transparent}.${p}-header__menu a[aria-current],.${p}-header__menu a:hover{border-bottom-color:currentColor}
@media(max-width:767.98px){.${p}-header{height:80px}.${p}-header__cta{display:none}.${p}-header__toggle{display:block}}
@media(min-width:768px){.${p}-header{padding:15px 0}.${p}-header__top{align-items:flex-start}.${p}-header__logo{margin-top:5.7px;width:${v('logo-width')}}.${p}-header__logo[data-lines="3"]{width:260px}.${p}-header__logo[data-lines="4"],.${p}-header__logo[data-lines="5"],.${p}-header__logo[data-lines="6"]{width:200px}.${p}-header__bottom{display:block;margin-top:20px}}
@media(min-width:1200px){.${p}-header{padding:0 0 15px}.${p}-header__logo{margin-top:38.7px}.${p}-header__logo[data-lines="3"]{width:290px}.${p}-header__logo[data-lines="4"],.${p}-header__logo[data-lines="5"],.${p}-header__logo[data-lines="6"]{width:230px}}` },
    page.tabs?.length && { id: 'tabs', label: 'Audience tabs', use: 'Warm tabs hanging from the header’s bottom edge, one per audience. Hidden on phones, where the menu carries them.',
      html: `<nav class="${p}-wrap ${p}-tabs" aria-label="Information for"><ul>${list(page.tabs, (item) => `<li><a href="#">${escape(item)}</a></li>`)}</ul></nav>`,
      css: `.${p}-tabs{position:relative;height:0;z-index:1}.${p}-tabs ul{position:absolute;top:0;right:27px;display:flex;gap:12px;margin:0;padding:0;list-style:none}.${p}-tabs a{display:block;background:${v('warm')};color:#000;border-radius:0 0 3px 3px;font:700 14px/21px ${v('font-bold')};padding:6px 12px;white-space:nowrap;text-decoration:none}.${p}-tabs a:hover{background:${v('warm-hover')}}@media(max-width:767.98px){.${p}-tabs{display:none}}` },
    { id: 'title', label: 'Page title', use: 'The page’s name, in the display face and title colour over a 6 px rule.',
      html: `<div class="${p}-wrap ${p}-title"><h1>${escape(title)}</h1></div>`,
      css: `.${p}-title{padding-top:64px}.${p}-title h1{margin:0;color:${v('title')};font:400 clamp(35px,calc(27.2px + 1.3vw),48px)/1.1 ${v('font-display')};padding-bottom:12px;border-bottom:6px solid ${v('rule')};overflow-wrap:break-word}@media(max-width:700px){.${p}-title{padding-top:30px}}` },
    { id: 'breadcrumbs', label: 'Breadcrumbs', use: 'Where the page sits, under its title: home as an icon, chevrons between, the current page in grey.',
      html: `<nav class="${p}-wrap" aria-label="Breadcrumbs"><ol class="${p}-breadcrumbs">${list(crumbs, (item, index) => `<li>${index === crumbs.length - 1 ? `<span aria-current="page">${escape(item)}</span>` : `<a href="#"${index ? '' : ` aria-label="${escape(item)}"`}>${index ? escape(item) : HOME_ICON}</a>`}</li>`)}</ol></nav>`,
      css: `.${p}-breadcrumbs{display:flex;flex-wrap:wrap;align-items:center;margin:12px 0 0 -3px;padding:0;list-style:none;font-size:14px;line-height:21px;color:${v('crumb')}}.${p}-breadcrumbs li{display:flex;align-items:center}.${p}-breadcrumbs li+li:before{content:"";width:6px;height:6px;margin:0 10px 0 8px;border:solid ${v('crumb')};border-width:1.5px 1.5px 0 0;transform:rotate(45deg)}.${p}-breadcrumbs a{color:${v('link')};text-decoration:none}.${p}-breadcrumbs a:hover{text-decoration:underline}.${p}-breadcrumbs svg{display:block;width:15px;height:15px}` },
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
