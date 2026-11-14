import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { HANDOVER_SCHEMA, createHandoverTemplate, handoverProblems, assertHandover } from '../src/handover/record.js'

const fixture = name => readFile(new URL(`../examples/managed-site/${name}.json`, import.meta.url), 'utf8').then(JSON.parse)

// Test data only. These addresses are never contacted or described as deployed.
function readyRecord() {
  return {
    ...createHandoverTemplate(),
    id: 'cedar-harbour-handover', kind: 'client', status: 'ready', preparedAt: '2026-11-14',
    provider: {
      name: 'Provider', brandId: 'provider', supportEmail: 'help@provider-company.ca', supportUrl: '',
      hours: 'Monday to Friday, 09:00 to 17:00 America/Vancouver.',
      responseTarget: 'No guaranteed response time is included in this service.',
      urgentRoute: 'Call the contact listed in the signed agreement. No after-hours coverage is included.'
    },
    client: { name: 'Cedar Harbour', brandId: 'cedar-harbour', contactName: 'Client contact', contactEmail: 'owner@cedar-harbour.ca' },
    site: { name: 'Cedar Harbour website', url: 'https://cedar-harbour.ca', loginUrl: 'https://portal.provider-company.ca/login', helpUrl: '', launchDate: '' },
    access: {
      method: 'invitation', role: 'Content editor', accountLabel: 'owner@cedar-harbour.ca',
      invitationSender: 'accounts@provider-company.ca', invitationExpiry: 'The expiry time is shown in the invitation email.',
      setupInstructions: ['Accept the invitation sent to your account email and choose your password.'],
      recoveryInstructions: 'Use the account recovery option on the login page or contact support.',
      mfaInstructions: 'Set up the supported second factor during the guided handover and store recovery information securely.'
    },
    tasks: [{ title: 'Request an edit', steps: ['Send the page address and approved wording to support.'], confirmation: 'Review the published page.', tutorialUrl: '' }],
    services: [{
      name: 'Website platform', accountOwner: 'Provider', managedBy: 'Provider', clientAccess: 'Content editing',
      billedBy: 'Provider', renewalDate: '2027-11-14', costText: 'As specified in agreement A-24.', scope: 'Website operation under agreement A-24.'
    }],
    care: {
      included: ['Operation of the agreed website.'], requests: 'Send requested changes to the support address.',
      backups: 'Backup responsibility and coverage are described in agreement A-24, section 4.',
      restore: 'Request a restore through support under agreement A-24, section 4.',
      dataExport: 'Request the agreed export through support under agreement A-24, section 6.',
      agreementRef: 'A-24, signed 2026-11-13.', rights: 'The allocation for content, brand assets and platform rights is recorded in A-24, section 5.'
    },
    assets: [{ name: 'Client brand kit', url: 'https://cedar-harbour.ca/brand-kit', note: '' }],
    review: { checkedBy: 'Reviewer', checkedOn: '2026-11-14' }
  }
}

test('blank template and labelled example are valid drafts without invented values', async () => {
  const template = createHandoverTemplate()
  assert.equal(template.schema, HANDOVER_SCHEMA)
  assert.deepEqual(template, await fixture('template'))
  assert.deepEqual(handoverProblems(template), [])
  const example = await fixture('ddc-north')
  assert.deepEqual(handoverProblems(example), [])
  assert.equal(example.provider.name, 'First Form')
  assert.equal(example.client.brandId, 'ddcnorth')
  assert.equal(example.access.method, 'unconfirmed')
  assert.equal(example.tasks.length, 3)
  assert.equal(example.services.length, 4)
  assert.ok(example.tasks.every(task => task.steps[0].startsWith('Illustrative task')))
  assert.equal(example.services[0].costText, '')
  assert.equal(example.provider.responseTarget, '')
  assert.ok(handoverProblems(example, { forIssue: true }).some(problem => /Only a client/.test(problem)))
})

test('template calls return independent nested arrays and objects', () => {
  const a = createHandoverTemplate()
  const b = createHandoverTemplate()
  a.access.setupInstructions.push('Changed')
  a.provider.name = 'Changed'
  assert.deepEqual(b.access.setupInstructions, [])
  assert.equal(b.provider.name, '')
})

test('issue gate accepts complete data without claiming to verify its facts', () => {
  const record = readyRecord()
  assert.deepEqual(handoverProblems(record, { forIssue: true }), [])
  assert.equal(assertHandover(record, { forIssue: true }), record)
})

test('issue gate rejects draft, examples, unresolved operational facts and missing review', () => {
  const record = readyRecord()
  record.kind = 'example'
  record.status = 'draft'
  record.access.method = 'unconfirmed'
  record.provider.hours = ''
  record.services[0].costText = ''
  record.care.dataExport = ''
  record.review.checkedBy = ''
  const problems = handoverProblems(record, { forIssue: true }).join('\n')
  for (const expected of ['Only a client', 'ready status', 'method must be confirmed', 'provider.hours', 'costText', 'care.dataExport', 'review.checkedBy']) assert.ok(problems.includes(expected), expected)
  assert.throws(() => assertHandover(record, { forIssue: true }), /Invalid managed site handover:/)
})

test('managed-only handover does not invent a login or require MFA', () => {
  const record = readyRecord()
  record.access.method = 'managed-only'
  record.access.role = 'Changes requested through provider support'
  record.access.accountLabel = ''
  record.access.recoveryInstructions = ''
  record.access.mfaInstructions = ''
  record.access.invitationSender = ''
  record.access.invitationExpiry = ''
  record.access.setupInstructions = ['Confirm your named contact and support route.']
  record.site.loginUrl = ''
  assert.deepEqual(handoverProblems(record, { forIssue: true }), [])
})

test('invitation needs confirmed sender and expiry wording, other sign-in methods do not', () => {
  const record = readyRecord()
  record.access.invitationSender = ''
  record.access.invitationExpiry = ''
  assert.ok(handoverProblems(record, { forIssue: true }).some(problem => problem.includes('invitationExpiry')))
  record.access.method = 'sso'
  assert.deepEqual(handoverProblems(record, { forIssue: true }), [])
})

test('unsafe URL schemes, credentials and secret query or fragment data are rejected in drafts', () => {
  for (const unsafe of [
    'javascript:alert(1)', 'data:text/html,test', 'http://client.ca/login', '//client.ca/login',
    'https://person:password@client.ca', 'https://client.ca?token=abc',
    'https://client.ca?access_token=abc', 'https://client.ca?X-Amz-Signature=abc',
    'https://client.ca?auth_token=abc', 'https://client.ca?%73ecret_key=abc',
    'https://client.ca/#reset_token=abc', 'https://client.ca/invite/secret-value',
    'https://client.ca/%0aheader', ' https://client.ca/login'
  ]) {
    const record = createHandoverTemplate()
    record.site.loginUrl = unsafe
    assert.ok(handoverProblems(record).some(problem => problem.includes('site.loginUrl')), unsafe)
  }
  const record = createHandoverTemplate()
  record.site.loginUrl = 'https://client.example/login?lang=en&view=account'
  record.provider.supportUrl = 'mailto:support@client.example?subject=Website%20help'
  assert.deepEqual(handoverProblems(record), [])
  record.provider.supportUrl = 'mailto:support@client.example?bcc=hidden@client.example'
  assert.ok(handoverProblems(record).some(problem => problem.includes('mail subject')))
})

test('secret fields and pasted credentials are rejected while instructions are allowed', () => {
  for (const [field, value] of [['password', 'abc'], ['recoveryCodes', ['abc']], ['apiKey', 'abc']]) {
    const record = createHandoverTemplate()
    record.access[field] = value
    assert.ok(handoverProblems(record).some(problem => problem.includes('secret field')))
  }
  for (const secret of ['Password: SuperSecret', 'token=secret', 'Recovery codes: abc-def', 'Bearer abcdefghijklmnop', '-----BEGIN PRIVATE KEY-----']) {
    const record = createHandoverTemplate()
    record.notes = [secret]
    assert.ok(handoverProblems(record).some(problem => problem.includes('credentials or recovery material')), secret)
  }
  const record = createHandoverTemplate()
  record.access.method = 'password'
  record.access.setupInstructions = ['Choose your own password and keep recovery codes in your secure account vault.']
  assert.deepEqual(handoverProblems(record), [])
})

test('reserved addresses and unresolved placeholders are accepted only in drafts', () => {
  for (const address of ['https://client.example', 'https://example.com', 'https://sub.example.org', 'https://localhost', 'https://127.0.0.1', 'https://192.0.2.5', 'https://[fd00::1]', 'https://[2001:db8::1]']) {
    const record = readyRecord()
    record.site.url = address
    assert.deepEqual(handoverProblems(record), [])
    assert.ok(handoverProblems(record, { forIssue: true }).some(problem => problem.includes('reserved') || problem.includes('placeholder')), address)
  }
  for (const placeholder of ['TBD', 'To confirm', '[Client name]', '{{supportHours}}']) {
    const record = readyRecord()
    record.provider.hours = placeholder
    assert.ok(handoverProblems(record, { forIssue: true }).some(problem => problem.includes('placeholder')), placeholder)
  }
})

test('all structural types and practical size limits are checked without throwing', () => {
  for (const value of [null, [], 'text', 42]) assert.ok(handoverProblems(value).length)
  const record = createHandoverTemplate()
  record.provider = null
  record.tasks = [{ title: 8, steps: 'not an array', confirmation: '', tutorialUrl: '' }]
  record.services = Array.from({ length: 31 }, () => ({}))
  record.notes = ['a'.repeat(2001)]
  record.review.checkedOn = '2026-02-30'
  record.unexpected = true
  const problems = handoverProblems(record, { forIssue: true }).join('\n')
  for (const expected of ['provider must be a plain object', 'title must be a string', 'steps must be an array', 'at most 30 entries', 'at most 2000 characters', 'ISO date', 'unsupported field']) assert.ok(problems.includes(expected), expected)
})

test('blank list entries cannot satisfy issue requirements', () => {
  const record = readyRecord()
  record.access.setupInstructions = [' ']
  record.care.included = ['']
  assert.ok(handoverProblems(record, { forIssue: true }).filter(problem => problem.includes('must not be blank')).length >= 2)
})

test('ordinary task instructions and control labels are not mistaken for placeholders', () => {
  const record = readyRecord()
  record.tasks[0].steps = ['Enter your email address.', 'Select [Save] to confirm the change.']
  record.tasks[0].confirmation = 'Use the preview to complete your check.'
  assert.deepEqual(handoverProblems(record, { forIssue: true }), [])
  record.provider.hours = 'Hours: to confirm with the client.'
  assert.ok(handoverProblems(record, { forIssue: true }).some(problem => problem.includes('placeholder')))
})

test('secret-bearing links cannot be smuggled into notes or setup instructions', () => {
  for (const link of ['https://portal.client.ca/callback?code=secret', 'https://client.ca/file?sig=secret', 'https://user:secret@client.ca']) {
    const record = createHandoverTemplate()
    record.access.setupInstructions = [`Open this link: ${link}`]
    assert.ok(handoverProblems(record).some(problem => problem.includes('contains a link')), link)
  }
  const record = createHandoverTemplate()
  record.notes = ['Find help at https://client.example/help (or use https://client.example/support).']
  assert.deepEqual(handoverProblems(record), [])
})
