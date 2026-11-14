import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHandoverTemplate } from '../src/handover/record.js'
import { handoverPublications } from '../src/handover/publications.js'
import { validatePublication } from '../src/engine/documentation.js'
import { publicationHtml } from '../src/export/publication.js'

const northwind = JSON.parse(readFileSync(new URL('../brands/northwind/brand.json', import.meta.url), 'utf8'))
const exampleSource = JSON.parse(readFileSync(new URL('../examples/managed-site/ddc-north.json', import.meta.url), 'utf8'))
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

function brands() {
  const providerBrand = structuredClone(northwind)
  const clientBrand = structuredClone(northwind)
  providerBrand.id = 'firstform'
  providerBrand.name = 'Provider identity'
  providerBrand.colours.primary = '#234567'
  clientBrand.id = 'ddcnorth'
  clientBrand.name = 'Client identity'
  clientBrand.colours.primary = '#765432'
  return { providerBrand, clientBrand }
}

const example = () => structuredClone(exampleSource)

// Complete test data exercises the issue gate; no addresses are contacted and
// no test value represents a real First Form service commitment.
function completeRecord() {
  const record = createHandoverTemplate()
  Object.assign(record, { id: 'client-guide', kind: 'client', status: 'ready', version: '1', preparedAt: '2026-11-14' })
  Object.assign(record.provider, {
    name: 'Provider', brandId: 'firstform', supportUrl: 'https://support.provider-company.ca',
    hours: 'Business hours in America/Vancouver.', responseTarget: 'No guaranteed response time is included.',
    urgentRoute: 'Use the incident contact route in the service agreement.'
  })
  Object.assign(record.client, { name: 'Client', brandId: 'ddcnorth', contactName: 'Primary contact', contactEmail: 'contact@client-company.ca' })
  Object.assign(record.site, { name: 'Client website', url: 'https://client-company.ca', loginUrl: 'https://portal.provider-company.ca/login' })
  Object.assign(record.access, {
    method: 'password', role: 'Content editor', accountLabel: 'contact@client-company.ca',
    setupInstructions: ['Complete the agreed account setup with the provider.'],
    recoveryInstructions: 'Use the account recovery route on the login page.',
    mfaInstructions: 'Use the supported verification method specified in the account setup guide.'
  })
  record.tasks = [{ title: 'Request a change', steps: ['Send the page address and requested wording through support.'], confirmation: 'Check the revised page.', tutorialUrl: '' }]
  record.services = [{
    name: 'Managed website', accountOwner: 'Provider', managedBy: 'Provider', clientAccess: 'Content editor', billedBy: 'Provider',
    renewalDate: 'As recorded in agreement 24.', costText: 'As recorded in agreement 24.', scope: 'Website operation as defined in agreement 24.'
  }]
  Object.assign(record.care, {
    included: ['The website operations listed in agreement 24.'], requests: 'Send requests to support.',
    backups: 'As specified in agreement 24, section 3.', restore: 'Request restoration under agreement 24, section 3.',
    dataExport: 'Request the agreed data files under agreement 24, section 4.', agreementRef: 'Agreement 24.',
    rights: 'Content, brand and platform rights are allocated in agreement 24, section 5.'
  })
  record.assets = [{ name: 'Client assets', url: 'https://client-company.ca/brand', note: '' }]
  record.review = { checkedBy: 'Reviewer', checkedOn: '2026-11-14' }
  return record
}

function textOf(model) {
  return model.pages.flatMap(page => page.blocks.flatMap(block => [
    block.text || '', ...(block.items || []), ...(block.headers || []), ...(block.rows || []).flat()
  ])).join('\n')
}

test('provider and client identities remain separate and the source definitions are unchanged', () => {
  const identities = brands()
  const record = example()
  const before = structuredClone({ identities, record })
  const { welcome, quickStart, brandGuide } = handoverPublications(record, identities)
  assert.equal(welcome.profile.brandId, identities.providerBrand.id)
  assert.equal(quickStart.profile.brandId, identities.providerBrand.id)
  assert.equal(brandGuide.profile.brandId, identities.clientBrand.id)
  assert.equal(welcome.profile.colours.accent, '#234567')
  assert.equal(brandGuide.profile.colours.accent, '#765432')
  assert.deepEqual({ identities, record }, before)
  quickStart.profile.typography.title.sizePt = 41
  assert.notEqual(welcome.profile.typography.title.sizePt, 41)
  assert.deepEqual(identities, before.identities)
})

test('generated publications keep a snapshot when the operational record is edited later', () => {
  const record = example()
  record.care.included = ['Original service description']
  const publications = handoverPublications(record, brands())
  const before = structuredClone(publications)
  record.access.setupInstructions[0] = 'New account process'
  record.tasks[0].steps[0] = 'New task'
  record.care.included[0] = 'New service'
  record.nextSteps.push('New action')
  record.notes[0] = 'New note'
  assert.deepEqual(publications, before)
})

test('all three outputs use valid shared publication models on Letter and A4', () => {
  for (const paper of ['letter', 'a4']) {
    const publications = handoverPublications(example(), { ...brands(), paper })
    assert.deepEqual(Object.keys(publications).sort(), ['brandGuide', 'quickStart', 'welcome'])
    for (const publication of Object.values(publications)) {
      assert.equal(publication.schema, 'brandkit/publication/1')
      assert.equal(publication.paper, paper)
      assert.deepEqual(validatePublication(publication), [])
    }
    assert.equal(publications.quickStart.pages.length, 1)
    assert.notEqual(publications.welcome.id, publications.brandGuide.id)
  }
})

test('setting a record to ready does not remove draft labels without explicit issue', () => {
  const record = completeRecord()
  const identities = brands()
  const publications = handoverPublications(record, identities)
  for (const publication of Object.values(publications)) {
    assert.equal(publication.example, true)
    assert.match(publication.edition, /DRAFT/)
    assert.doesNotMatch(publication.edition, /Issued/)
  }
  const html = publicationHtml({ brand: identities.providerBrand }, publications.welcome)
  assert.match(html, /DRAFT/)
  assert.throws(() => handoverPublications(example(), { ...identities, forIssue: true }), /Only a client/)
})

test('issued guides do not turn omitted optional launch and support-email fields into unresolved claims', () => {
  const record = completeRecord()
  assert.equal(record.site.launchDate, '')
  assert.equal(record.provider.supportEmail, '')
  const publications = handoverPublications(record, { ...brands(), forIssue: true })
  for (const publication of Object.values(publications)) {
    assert.equal(publication.example, false)
    assert.match(publication.edition, /Issued/)
    assert.doesNotMatch(textOf(publication), /to confirm/i)
  }
})

test('a supplied original provider logo replaces only provider cover artwork and keeps source bytes', () => {
  const identities = brands()
  const providerLogo = { src: PNG, alt: 'Original provider logo', caption: 'Supplied original artwork', widthMm: 45, heightMm: 15 }
  const before = structuredClone(providerLogo)
  const publications = handoverPublications(example(), { ...identities, providerLogo })
  for (const publication of [publications.welcome, publications.quickStart]) {
    const logo = publication.pages[0].blocks.find(block => block.type === 'figure')
    assert.equal(logo.src, PNG)
    assert.equal(logo.alt, providerLogo.alt)
    const html = publicationHtml({ brand: identities.providerBrand }, publication)
    assert.ok(html.includes(PNG))
    assert.doesNotMatch(html, /class="brand-logo"/)
  }
  const clientHtml = publicationHtml({ brand: identities.clientBrand }, publications.brandGuide)
  assert.match(clientHtml, /class="brand-logo"/)
  assert.ok(!clientHtml.includes(PNG))
  assert.deepEqual(providerLogo, before)
})

test('an original-logo override must supply passive embedded artwork', () => {
  for (const providerLogo of [
    {}, { placeholder: true, alt: 'Missing logo' },
    { src: 'https://provider-company.ca/logo.png', alt: 'External image' },
    { src: 'data:image/svg+xml,<svg onload="alert(1)"/>', alt: 'Executable SVG' }
  ]) assert.throws(() => handoverPublications(example(), { ...brands(), providerLogo }), /logo|image|figure|PNG|JPEG/i)
})

test('mismatched provider or client brands cannot silently supply the wrong identity', () => {
  const identities = brands()
  const wrongProvider = { ...identities.providerBrand, id: 'another-provider' }
  const wrongClient = { ...identities.clientBrand, id: 'another-client' }
  assert.throws(() => handoverPublications(example(), { ...identities, providerBrand: wrongProvider }), /Provider brandId/)
  assert.throws(() => handoverPublications(example(), { ...identities, clientBrand: wrongClient }), /Client brandId/)
  assert.throws(() => handoverPublications(example(), { providerBrand: identities.providerBrand }), /required/)
})

test('managed-only guides describe support access without fabricating a sign-in journey', () => {
  const record = completeRecord()
  Object.assign(record.access, {
    method: 'managed-only', role: 'Website changes requested through support', accountLabel: '',
    recoveryInstructions: '', mfaInstructions: '', setupInstructions: ['Confirm the named contact and support route.']
  })
  record.site.loginUrl = ''
  const publications = handoverPublications(record, { ...brands(), forIssue: true })
  for (const publication of [publications.welcome, publications.quickStart]) {
    const copy = textOf(publication)
    assert.doesNotMatch(copy, /Sign-in address|Username \/|If you cannot sign in|Two-step verification|account recovery route/i)
    assert.match(copy, /support/i)
  }
})

test('client text is escaped by the actual HTML exporter in paragraphs, lists, tables and headings', () => {
  const record = example()
  record.client.name = 'Client <img src=x onerror=alert(1)> & Co'
  record.notes = ['</p><script>globalThis.HANDOVER_ATTACK = true</script>']
  record.tasks[0].title = '<script>taskAttack()</script>'
  record.tasks[0].steps = ['<iframe src="https://untrusted.ca"></iframe>']
  record.services[0].scope = 'Use A & B < carefully'
  const identities = brands()
  const { welcome } = handoverPublications(record, identities)
  const html = publicationHtml({ brand: identities.providerBrand }, welcome)
  assert.doesNotMatch(html, /<script\b|<iframe\b|<img src=x/i)
  assert.match(html, /&lt;script&gt;/)
  assert.match(html, /&lt;iframe src=&quot;/)
  assert.match(html, /Use A &amp; B &lt; carefully/)
  assert.match(html, /Client &lt;img src=x onerror=alert\(1\)&gt; &amp; Co/)
})
