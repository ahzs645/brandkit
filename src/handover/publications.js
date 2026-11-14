// Managed-site content projected into Brandkit's existing editable publication format.
// Operational records never change either organization's identity definition.
import { coverStatus } from './cover.js'
import { publicationModel, validatePublication } from '../engine/documentation.js'
import { assertHandover } from './record.js'

const value = (text, fallback = 'To confirm') => String(text ?? '').trim() || fallback
const h = (text, level = 1, style) => ({ type: 'heading', text, level, ...(style ? { style } : {}) })
const p = (text, style) => ({ type: 'paragraph', text, ...(style ? { style } : {}) })
const list = (items, ordered = false) => ({ type: 'list', items: [...items], ordered })
const table = (headers, rows, widths) => ({ type: 'table', headers, rows, ...(widths ? { widths } : {}) })
const page = (id, title, blocks, kind = 'content') => ({ id, title, kind, blocks })
const chunks = (items, size) => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size))
const accessNames = { invitation: 'Account invitation', password: 'Password sign-in', sso: 'Organization sign-in (SSO)', passwordless: 'Passwordless sign-in', 'managed-only': 'Changes requested through your provider', unconfirmed: 'To confirm' }
const suppliedFigure = (figure) => figure ? [{ ...structuredClone(figure), type: 'figure' }] : []

function model(brand, record, title, purpose, paper, forIssue) {
  const state = forIssue ? 'Issued' : record.kind === 'example' ? 'EXAMPLE · DRAFT' : record.kind === 'template' ? 'TEMPLATE · DRAFT' : 'DRAFT'
  const result = publicationModel(brand, { paper, purpose, values: {
    title, subtitle: record.client.name || 'Client website', edition: `${state} · v${value(record.version, '1')}`, example: !forIssue
  } })
  result.id = `${record.id || 'managed-site'}-${purpose}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  result.example = !forIssue
  result.profile.header.text = `${value(record.provider.name, 'Service provider')} / ${value(record.client.name, 'Client')} / ${state}`
  result.profile.footer.text = `${value(record.client.name, 'Client')} · ${value(record.preparedAt, 'Date to confirm')}`
  result.pages = []
  return result
}

/**
 * Returns three publication/1 models. Optional figures must be embedded PNG/JPEG images.
 * `forIssue` is an explicit data-quality gate, never an assertion that claims are verified.
 * Inspect Word/PDF pagination after filling a record: arbitrary prose can extend a page.
 */
export function handoverPublications(record, { providerBrand, clientBrand, paper = 'letter', providerLogo, brandFigures = {}, welcomeCover, forIssue = false } = {}) {
  assertHandover(record, { forIssue })
  if (!providerBrand?.id || !clientBrand?.id) throw new TypeError('Provider and client brand definitions are required.')
  if (record.provider.brandId && record.provider.brandId !== providerBrand.id) throw new Error('Provider brandId does not match the provider brand.')
  if (record.client.brandId && record.client.brandId !== clientBrand.id) throw new Error('Client brandId does not match the client brand.')
  for (const [name, figure] of Object.entries({ providerLogo, ...brandFigures })) {
    if (figure != null && (figure.placeholder || !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(figure.src || ''))) throw new Error(`${name} must contain an embedded PNG/JPEG image.`)
  }
  const provider = value(record.provider.name, providerBrand.name)
  const client = value(record.client.name, clientBrand.name)
  const draft = !forIssue
  const draftNote = record.kind === 'example'
    ? 'Example for review. Website addresses, account details and service terms are illustrative or still to confirm. This is not an issued service agreement.'
    : 'Draft for review. Confirm the account, service and support details before giving this guide to the client.'
  const help = value(record.provider.supportUrl || record.provider.supportEmail)
  const welcome = model(providerBrand, record, 'Website welcome guide', 'report', paper, forIssue)
  const quickStart = model(providerBrand, record, 'Website quick start', 'brief', paper, forIssue)
  const brandGuide = model(clientBrand, record, 'Brand reference', 'portfolio', paper, forIssue)
  // A small sizing allowance keeps the reference logo comfortably above its minimum;
  // source SVGs may include transparent space outside the visible artwork.
  brandGuide.profile.logo.widthMm = Math.max(brandGuide.profile.logo.widthMm, brandGuide.profile.logo.minimumWidthMm * 1.1)
  if (providerLogo) {
    welcome.profile.logo.hidden = true
    quickStart.profile.logo.hidden = true
  }
  const coverLogo = suppliedFigure(providerLogo)

  welcome.pages.push(page('welcome', 'Your managed website', [
    ...coverLogo,
    p(`PREPARED BY ${provider.toUpperCase()} FOR ${client.toUpperCase()}`, 'label'),
    h('Your website.\nYour next steps.', 1, 'title'),
    p(`${client} · managed website welcome guide`, 'subtitle'),
    p('Keep this guide with your business records. It explains access, everyday requests, service responsibilities and where to get help.'),
    ...(draft ? [p(draftNote, 'caption')] : []),
    table(['Your website', 'Details'], [
      ['Website address', value(record.site.url)],
      ['Website name', value(record.site.name)],
      ...(record.site.launchDate || draft ? [['Launch date', value(record.site.launchDate)]] : []),
      ['Your contact', [record.client.contactName, record.client.contactEmail].filter(Boolean).join('\n') || 'To confirm'],
      ['Service agreement', value(record.care.agreementRef)]
    ], [1, 2.2]),
    p('Start with the one-page quick-start sheet. Use the rest of this guide when you need to make a change or check who is responsible for a service.', 'caption')
  ], 'cover'))

  const managedOnly = record.access.method === 'managed-only'
  const setup = record.access.setupInstructions.length ? record.access.setupInstructions : ['Confirm your access method and the steps for your named account with your provider.']
  welcome.pages.push(page('access', 'Getting started', [
    h('01 / Getting started'),
    p(managedOnly ? 'Your agreed access is through the managed service. Use the support route below for website changes.' : 'Use the permanent sign-in address below. Your account should belong to the named person who will use it.'),
    table(['Access detail', 'Your information'], [
      ['Access method', accessNames[record.access.method]],
      ...(!managedOnly ? [['Sign-in address', value(record.site.loginUrl)], ['Username / account email', value(record.access.accountLabel)], ['Account role', value(record.access.role)]] : []),
      ...(record.access.method === 'invitation' ? [['Invitation sender', value(record.access.invitationSender)], ['Invitation expires', value(record.access.invitationExpiry)]] : []),
      ['Help', value(record.site.helpUrl || help)]
    ], [1, 2.2]),
    h('Your first session', 2), list(setup, true),
    ...(!managedOnly ? [
      h('If you cannot sign in', 2), p(value(record.access.recoveryInstructions)),
      h('Two-step verification', 2), p(value(record.access.mfaInstructions)),
      p('Keep setup invitations, passwords and recovery codes separate from this printed guide. If a temporary password is used, follow the confirmed change process before continuing.', 'caption')
    ] : [p('Keep the support route available to the people authorized to request changes.', 'caption')])
  ]))

  const taskGroups = chunks(record.tasks, 3)
  if (!taskGroups.length) taskGroups.push([])
  taskGroups.forEach((group, i) => welcome.pages.push(page(`tasks-${i + 1}`, 'Everyday tasks', [
    h(`02 / Everyday tasks${i ? ' — continued' : ''}`),
    ...(draft ? [p('These examples need to be checked against the agreed service and the actual client interface.', 'caption')] : []),
    ...(group.length ? group.flatMap(task => [
      h(task.title, 2), list(task.steps.length ? task.steps : ['Task steps to confirm.'], true),
      p(`Check: ${value(task.confirmation)}`),
      ...(task.tutorialUrl ? [p(`Walkthrough: ${task.tutorialUrl}`, 'caption')] : [])
    ]) : [p('Add the tasks this client will perform, with verified steps and a clear way to check the result.')])
  ])))

  const serviceGroups = chunks(record.services, 2)
  if (!serviceGroups.length) serviceGroups.push([])
  serviceGroups.forEach((group, i) => welcome.pages.push(page(`services-${i + 1}`, 'Services and responsibilities', [
    h(`03 / Services & responsibilities${i ? ' — continued' : ''}`),
    ...(!i ? [p('Keep account ownership, day-to-day management and billing clear. A blank fee or renewal entry means it still needs to be confirmed.')] : []),
    ...(group.length ? group.flatMap(service => [
      h(service.name, 2),
      table(['Responsibility', 'Details'], [
        ['Account owner / manager', `${value(service.accountOwner)} / ${value(service.managedBy)}`],
        ['Client access', value(service.clientAccess)],
        ['Billing / cost', `${value(service.billedBy)} / ${value(service.costText)}`],
        ['Renewal', value(service.renewalDate)]
      ], [1, 2.2]),
      p(value(service.scope), 'caption')
    ]) : [p('List the domain, hosting, website platform and any other services actually supplied.')])
  ], 'comparison')))

  welcome.pages.push(page('support', 'Help and ongoing care', [
    h('04 / Help & ongoing care'),
    table(['Contact', 'Details'], [
      ['Support', help], ...(record.provider.supportEmail || draft ? [['Support email', value(record.provider.supportEmail)]] : []),
      ['Hours', value(record.provider.hours)], ['Response target', value(record.provider.responseTarget)],
      ['Urgent issue', value(record.provider.urgentRoute)]
    ], [1, 2.2]),
    h('What your service includes', 2),
    list(record.care.included.length ? record.care.included : ['Included services and limits to confirm.']),
    h('Requesting a change', 2), p(value(record.care.requests)),
    p('A useful request includes the affected page address, the change you need, approved wording or images, and any deadline. For a fault, include the time, what you tried and a screenshot with private information removed.', 'caption')
  ]))
  welcome.pages.push(page('continuity', 'Keep your information current', [
    h('05 / Keeping things current'),
    h('Backups', 2), p(value(record.care.backups)),
    h('Restoring the website', 2), p(value(record.care.restore)),
    h('Your content, assets and data', 2), p(value(record.care.rights)),
    h('Exporting or moving your website', 2), p(value(record.care.dataExport)),
    p('The agreement should identify the rights and files supplied to you, together with any platform, licence or transfer limits. Keep this guide aligned with that agreement.', 'caption'),
    h('Before handover is complete', 2),
    list(record.nextSteps.length ? record.nextSteps : ['Confirm the details in this guide and practise the agreed tasks together.']),
    p(`Checked by: ${value(record.review.checkedBy)} · Checked on: ${value(record.review.checkedOn)}`, 'caption')
  ], 'closing'))
  if (record.assets.length || record.notes.length) welcome.pages.push(page('resources', 'Useful files and notes', [
    h('06 / Useful files & notes'),
    ...record.assets.flatMap(asset => [h(value(asset.name), 2), p(value(asset.url)), ...(asset.note ? [p(asset.note, 'caption')] : [])]),
    ...(record.notes.length ? [h('Notes for this website', 2), list(record.notes)] : [])
  ]))

  quickStart.profile.typography.title.sizePt = 26
  quickStart.pages = [page('quick-start', 'Your website at a glance', [
    ...suppliedFigure(providerLogo),
    h('Your website at a glance', 1, 'title'),
    p(`${client} · managed by ${provider}`, 'subtitle'),
    ...(draft ? [p(`${record.kind === 'example' ? 'EXAMPLE / ' : ''}DRAFT — confirm these details before use.`, 'caption')] : []),
    table(['Keep handy', 'Your information'], [
      ['Website', value(record.site.url)],
      ...(!managedOnly ? [['Sign in', value(record.site.loginUrl)], ['Username / email', value(record.access.accountLabel)]] : []),
      ['Access method', accessNames[record.access.method]],
      ['Support', help]
    ], [1, 2.2]),
    h('Start here', 2), list(setup.slice(0, 3), true),
    h('Need a hand?', 2),
    p(record.provider.hours ? `Support hours: ${record.provider.hours}` : 'Support hours: to confirm.'),
    ...(!managedOnly ? [p(record.access.recoveryInstructions || 'Ask your provider to confirm the account recovery route before handover.')] : []),
    p(managedOnly ? 'Keep the full welcome guide and brand reference together with the agreed support details.' : 'Keep the full welcome guide and brand reference together. Use the agreed separate process for setup invitations and passwords.', 'caption')
  ])]

  const brandVersion = clientBrand.displayVersion || clientBrand.version
  const colours = Object.entries(clientBrand.colours || {}).filter(([, hex]) => /^#[0-9a-f]{6}$/i.test(hex))
  const colourName = key => clientBrand.colourNames?.[key] || key.replaceAll('-', ' ').replace(/^./, c => c.toUpperCase())
  const typeRows = [['Headings', 'headlines', 'display'], ['Body text', 'body', 'body'], ['Labels', 'labels', 'label']].map(([label, role, font]) => {
    const spec = clientBrand.typography?.[role] || {}
    const face = clientBrand.fonts?.[font] || {}
    return [label, spec.family || face.family || 'See source kit', String(spec.weight || face.weight || 'See source kit'), spec.trackingEm == null ? 'Default' : `${spec.trackingEm} em`]
  })
  brandGuide.pages = [
    page('brand-cover', 'Your brand, consistently applied', [
      p(`${client.toUpperCase()} / IDENTITY REFERENCE`, 'label'),
      h('Your brand,\nconsistently applied.', 1, 'title'),
      p('A practical reference for your website, documents and print.', 'subtitle'),
      p(`Prepared by ${provider} for ${client}. This companion guide draws its artwork, palette and type roles from the supplied ${clientBrand.name} brand kit.`),
      ...(draft ? [p('Draft companion reference. Review it with the source brand kit before issue.', 'caption')] : []),
      table(['Reference', 'Details'], [
        ['Brand', clientBrand.name], ['Identity version', value(brandVersion)],
        ['Prepared for', client], ['Prepared by', provider], ['Document edition', record.version || '1']
      ], [1, 2]),
      p('Use the supplied artwork as the starting point for every application. The source brand kit remains the detailed reference for artwork and identity rules.', 'caption')
    ], 'cover'),
    page('brand-logo', 'Using the logo', [
      h('01 / Using the logo'),
      ...suppliedFigure(brandFigures.logoVariants),
      h('Keep the artwork intact', 2),
      list(['Use the supplied vector or raster file; do not retype the wordmark.', 'Keep the artwork in proportion and leave all of the symbol and lettering visible.', 'Choose the supplied variant that remains clear against its background.']),
      table(['Source rule', 'Requirement'], [
        ['Clear space', value(clientBrand.lockup?.clearspaceRecommendation, 'Consult the source brand kit.')],
        ['Complete horizontal logo', (clientBrand.logoPolicy?.minimumWidthMm ?? clientBrand.lockup?.minimumHorizontalWidthMm) ? `At least ${clientBrand.logoPolicy?.minimumWidthMm ?? clientBrand.lockup.minimumHorizontalWidthMm} mm wide in print${clientBrand.lockup?.minimumHorizontalWidthPx ? ` / ${clientBrand.lockup.minimumHorizontalWidthPx} px on screen` : ''}.` : 'Consult the source brand kit.'],
        ['Symbol', clientBrand.logoPolicy?.standaloneSymbol === false ? 'Use only as part of the complete supplied logo.' : clientBrand.lockup?.minimumSymbolHeightMm ? `At least ${clientBrand.lockup.minimumSymbolHeightMm} mm high in print${clientBrand.lockup.minimumSymbolHeightPx ? ` / ${clientBrand.lockup.minimumSymbolHeightPx} px on screen` : ''}.` : 'Consult the source brand kit.']
      ], [1, 2.2]),
      p('Source artwork status', 'label'), p(value(clientBrand.status, 'Use the source kit for artwork provenance and approval status.'), 'caption')
    ]),
    page('brand-colours', 'Colour and typography', [
      h('02 / Colour & typography'),
      ...suppliedFigure(brandFigures.palette),
      table(['Colour', 'Digital value'], colours.map(([key, hex]) => [colourName(key), hex.toUpperCase()]), [1.5, 1]),
      p('These are the supplied digital colour values. Confirm a print proof with your printer for colour-critical work.', 'caption'),
      h('The type system', 2),
      table(['Use', 'Family', 'Weight', 'Tracking'], typeRows, [1, 1.4, .7, .8]),
      p('Use the fonts and licences from the source kit. These typography roles describe editable text; they do not replace the logo artwork.', 'caption')
    ]),
    page('brand-files', 'Choose the right file', [
      h('03 / Choose the right file'),
      table(['Format', 'Use it for', 'Keep in mind'], [
        ['SVG', 'Websites and scalable artwork.', 'Preserve the supplied paths and viewBox.'],
        ['PNG', 'Office documents, email and previews.', 'Choose a suitable size; do not enlarge a small image for print.'],
        ['PDF', 'A fixed reference or printer handoff.', 'Use the source kit’s production artwork and the printer’s requirements.'],
        ['DOCX', 'Editing this guide and client documents.', 'Keep the required fonts available; recheck page breaks after edits.']
      ], [0.7, 1.4, 2]),
      h('Keep these together', 2),
      list(['The original brand kit and its licence files.', 'The supplied primary, black and reverse logo files.', 'This brand reference and the current website welcome guide.']),
      h('Provider and client identity', 2),
      p(`${provider} is identified separately as the managed-service provider. ${client} remains the client identity used on its website and branded materials. Follow the agreement for asset ownership and usage rights.`),
      h('Before using an asset', 2),
      list(['Check the intended background and the complete logo’s minimum size.', 'Keep the required clear space around the visible artwork.', 'Check the final screen or printed proof at its actual size.'], true),
      p(`Source: ${value(clientBrand.source, `${clientBrand.name} brand kit`)} · identity v${value(brandVersion)}.`, 'caption')
    ], 'closing')
  ]
  if (welcomeCover) {
    const supplied = structuredClone(welcomeCover)
    supplied.clientName = client
    supplied.preparedBy = provider
    supplied.status = coverStatus(record, forIssue)
    const overview = welcome.pages[0]
    overview.kind = 'content'
    overview.title = 'Your website details'
    // Keep the practical information formerly on the first page after the new front cover.
    const firstParagraph = overview.blocks.findIndex(block => block.type === 'paragraph' && !block.style)
    overview.blocks = [h('Your website details'), ...overview.blocks.slice(firstParagraph)]
    welcome.pages.unshift({ id: 'front-cover', title: supplied.kicker || 'Cover', kind: 'cover', cover: supplied, blocks: [] })
  }
  for (const publication of [welcome, quickStart, brandGuide]) {
    const problems = validatePublication(publication)
    if (problems.length) throw new Error(`Invalid handover publication: ${problems.join('; ')}`)
  }
  return { welcome, quickStart, brandGuide }
}
