/**
 * Operational records for a managed website handover. Identity artwork belongs in
 * separate Brandkit profiles. Validation checks data, not whether its claims are true.
 * This record must never contain credentials or account recovery material.
 */
import { WELCOME_COVER_VARIANTS } from './cover-variants.js'

export const HANDOVER_SCHEMA = 'brandkit/managed-site-handover/1'

const text = (max = 2000, extra = {}) => ({ type: 'text', max, ...extra })
const list = (item, max = 30) => ({ type: 'list', item, max })
const object = (fields, extra = {}) => ({ type: 'object', fields, ...extra })
const url = (contact = false) => text(2048, { url: contact ? 'contact' : 'https' })
const email = () => text(254, { email: true })
const date = () => text(40, { date: true })
const slug = () => text(100, { slug: true })

const SHAPE = object({
  schema: text(80, { values: [HANDOVER_SCHEMA] }),
  id: slug(),
  kind: text(20, { values: ['template', 'example', 'client'] }),
  status: text(20, { values: ['draft', 'ready'] }),
  version: text(80),
  preparedAt: date(),
  provider: object({
    name: text(200), brandId: slug(), supportEmail: email(), supportUrl: url(true),
    hours: text(500), responseTarget: text(1000), urgentRoute: text(1000)
  }),
  client: object({
    name: text(200), brandId: slug(), contactName: text(200), contactEmail: email()
  }),
  site: object({ name: text(200), url: url(), loginUrl: url(), helpUrl: url(true), launchDate: date() }),
  access: object({
    method: text(30, { values: ['invitation', 'password', 'sso', 'passwordless', 'managed-only', 'unconfirmed'] }),
    role: text(500), accountLabel: text(300), invitationSender: text(300), invitationExpiry: text(500),
    setupInstructions: list(text(2000), 20), recoveryInstructions: text(3000), mfaInstructions: text(3000)
  }),
  tasks: list(object({ title: text(200), steps: list(text(2000), 20), confirmation: text(1000), tutorialUrl: url() }), 20),
  services: list(object({
    name: text(200), accountOwner: text(500), managedBy: text(500), clientAccess: text(1000),
    billedBy: text(500), renewalDate: text(300), costText: text(500), scope: text(2000)
  }), 30),
  care: object({
    included: list(text(1000), 30), requests: text(3000), backups: text(3000), restore: text(3000),
    dataExport: text(3000), agreementRef: text(1000), rights: text(4000)
  }),
  assets: list(object({ name: text(200), url: url(), note: text(2000) }), 50),
  nextSteps: list(text(2000), 30),
  notes: list(text(2000), 30),
  review: object({ checkedBy: text(200), checkedOn: date() }),
  // Optional cover wording and design. Omitted fields keep the welcome pack's defaults.
  cover: object({
    variant: text(20, { values: ['', ...WELCOME_COVER_VARIANTS.map(item => item.id)], optional: true }),
    kicker: text(60, { optional: true }), title: text(80, { optional: true }), subtitle: text(220, { optional: true }),
    sections: { ...list(object({ title: text(24), description: text(100) }), 4), optional: true }
  }, { optional: true })
})

const SECRET_KEY = /(?:password|passphrase|secret|token|credential|privatekey|apikey|recoverycode|backupcode|authenticatorseed|otp|totp)/i
const SECRET_QUERY = /^(?:password|passwd|pwd|passphrase|token|accesstoken|refreshtoken|idtoken|activationtoken|invitationtoken|resettoken|auth|authorization|authcode|code|key|apikey|secret|clientsecret|signature|sig|session|sessionid|sid|ticket|credential|credentials|recoverycode|backupcode|otp|totp|samlresponse|samlrequest|sastoken|xamzcredential|xamzsignature|googsignature|googleaccessid)$/i
const SECRET_QUERY_PART = /(?:token|password|passwd|passphrase|secret|signature|credential|recoverycode|backupcode|authorization|authcode)/i
const SECRET_ASSIGNMENT = /\b(?:password|passwd|passphrase|token|(?:access|refresh|activation|invitation|reset|api)[ _-]?(?:token|key)|secret|recovery[ _-]?codes?|backup[ _-]?codes?|authenticator[ _-]?seed|otp|totp)\s*[:=]\s*\S+/i
const SECRET_MATERIAL = /-----BEGIN (?:[A-Z ]*PRIVATE KEY|OPENSSH PRIVATE KEY)-----|\bBearer\s+[A-Za-z0-9._~+/=-]{12,}|\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/i
// Detect unfinished fields without rejecting real task instructions such as
// "enter your email", "select [Save]", or "publish to confirm the change".
const PLACEHOLDER = /\b(?:TBD|TBC|TODO)\b|\bto be (?:confirmed|provided)\b|(?:^|[\n:;])\s*to confirm\b|\{\{[^}]+\}\}|\$\{[^}]+\}|\[\s*(?:(?:client|company|provider|contact)(?:\s+(?:name|email|id))?|name|email(?:\s+address)?|url|address|date|amount|cost|hours|role|support(?:\s+(?:email|url|hours))?|(?:your|insert|replace)\s+[^\]\n]{1,80}|tbd|tbc|todo)\s*\]|<(?:client|company|name|email|url|date|contact|provider)[^>]*>/i
const EXAMPLE_TEXT = /\b(?:example\.(?:com|net|org)|[a-z0-9.-]+\.(?:example|invalid|test|localhost))\b|\b(?:example only|illustrative example|demonstration only)\b/i
const EMAIL = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
}

function reservedHost(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, '').replace(/^\[|\]$/g, '')
  return host === 'localhost' || /(?:^|\.)(?:example|invalid|test|localhost|local)$/.test(host) ||
    /(?:^|\.)example\.(?:com|net|org)$/.test(host) ||
    /^(?:0|10|127)\./.test(host) || /^192\.168\./.test(host) ||
    /^172\.(?:1[6-9]|2\d|3[01])\./.test(host) || /^169\.254\./.test(host) ||
    /^192\.0\.[02]\./.test(host) || /^198\.(?:1[89]\.|51\.100\.)/.test(host) || /^203\.0\.113\./.test(host) ||
    /^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host) || /^(?:22[4-9]|23\d|24\d|25[0-5])\./.test(host) ||
    ['::', '::1'].includes(host) || /^::ffff:/i.test(host) || /^(?:f[cd][a-f0-9]{2}|fe[89ab][a-f0-9]|ff[a-f0-9]{2}|2001:db8):/i.test(host)
}

function dateValid(value) {
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return false
  const day = new Date(value.slice(0, 10) + 'T00:00:00.000Z')
  return Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === value.slice(0, 10) &&
    Number.isFinite(Date.parse(value))
}

function urlProblem(value, mode, forIssue) {
  if (value !== value.trim() || /\s|%0[ad]/i.test(value)) return 'must be a URL without whitespace or line breaks'
  let parsed
  try { parsed = new URL(value) } catch { return 'must be an absolute HTTPS URL' }
  if (parsed.protocol !== 'https:' && !(mode === 'contact' && parsed.protocol === 'mailto:')) {
    return mode === 'contact' ? 'must use HTTPS or mailto' : 'must use HTTPS'
  }
  if (parsed.username || parsed.password) return 'must not contain embedded credentials'
  if (parsed.protocol === 'mailto:') {
    if (!EMAIL.test(parsed.pathname) || parsed.hash) return 'must contain one email address'
    if ([...parsed.searchParams.keys()].some(key => key.toLowerCase() !== 'subject')) {
      return 'may contain only an optional mail subject'
    }
    if (forIssue && reservedHost(parsed.pathname.split('@')[1])) return 'must not use a reserved or example address when issuing'
  } else {
    if (!parsed.hostname) return 'must include a hostname'
    if (forIssue && reservedHost(parsed.hostname)) return 'must not use a reserved, example or local address when issuing'
    if (/\/(?:activate|activation|invite|invitation|reset|reset-password|password-reset|magic-link)\/[^/]+/i.test(parsed.pathname)) {
      return 'must be a stable page address, not an activation or recovery link'
    }
  }
  const fragments = new URLSearchParams(parsed.hash.replace(/^#/, ''))
  for (const params of [parsed.searchParams, fragments]) {
    for (const [key, item] of params) {
      const normalizedKey = key.replace(/[^a-z0-9]/gi, '')
      if (SECRET_QUERY.test(normalizedKey) || SECRET_QUERY_PART.test(normalizedKey) || SECRET_ASSIGNMENT.test(item) || SECRET_MATERIAL.test(item)) {
        return 'must not contain secret query or fragment data'
      }
    }
  }
  return null
}

/** Return a new blank record; editing it never changes another template. */
export function createHandoverTemplate() {
  return {
    schema: HANDOVER_SCHEMA, id: '', kind: 'template', status: 'draft', version: '1', preparedAt: '',
    provider: { name: '', brandId: '', supportEmail: '', supportUrl: '', hours: '', responseTarget: '', urgentRoute: '' },
    client: { name: '', brandId: '', contactName: '', contactEmail: '' },
    site: { name: '', url: '', loginUrl: '', helpUrl: '', launchDate: '' },
    access: {
      method: 'unconfirmed', role: '', accountLabel: '', invitationSender: '', invitationExpiry: '',
      setupInstructions: [], recoveryInstructions: '', mfaInstructions: ''
    },
    tasks: [], services: [],
    care: { included: [], requests: '', backups: '', restore: '', dataExport: '', agreementRef: '', rights: '' },
    assets: [], nextSteps: [], notes: [], review: { checkedBy: '', checkedOn: '' }
  }
}

/**
 * Check record structure and safe link formats. forIssue adds completeness gates;
 * it does not verify facts, contractual rights, delivery or service availability.
 * Unknown draft values remain empty strings and are never replaced with promises.
 * @returns {string[]}
 */
export function handoverProblems(record, { forIssue = false } = {}) {
  const problems = []
  const strings = []
  function check(value, spec, path) {
    if (spec.type === 'object') {
      if (!plainObject(value)) { problems.push(`${path} must be a plain object`); return }
      for (const key of Object.keys(value)) {
        if (!Object.hasOwn(spec.fields, key)) {
          problems.push(SECRET_KEY.test(key.replace(/[^a-z0-9]/gi, ''))
            ? `${path} must not contain secret field ${key}`
            : `${path} contains an unsupported field ${key}`)
        }
      }
      for (const [key, child] of Object.entries(spec.fields)) if (!(child.optional && value[key] === undefined)) check(value[key], child, `${path}.${key}`)
      return
    }
    if (spec.type === 'list') {
      if (!Array.isArray(value)) { problems.push(`${path} must be an array`); return }
      if (value.length > spec.max) problems.push(`${path} must contain at most ${spec.max} entries`)
      for (let index = 0; index < Math.min(value.length, spec.max + 1); index++) check(value[index], spec.item, `${path}[${index}]`)
      return
    }
    if (typeof value !== 'string') { problems.push(`${path} must be a string`); return }
    if (value.length > spec.max) { problems.push(`${path} must be at most ${spec.max} characters`); return }
    strings.push([path, value])
    if (CONTROL.test(value)) problems.push(`${path} must not contain control characters`)
    if (SECRET_ASSIGNMENT.test(value) || SECRET_MATERIAL.test(value)) problems.push(`${path} must not contain credentials or recovery material`)
    if (spec.values && !spec.values.includes(value)) problems.push(`${path} must be one of ${spec.values.join(', ')}`)
    if (value && spec.slug && !/^[a-z0-9][a-z0-9_-]*$/.test(value)) problems.push(`${path} must be a lowercase ID using letters, numbers, hyphens or underscores`)
    if (value && spec.email && !EMAIL.test(value)) problems.push(`${path} must be an email address`)
    if (value && spec.date && !dateValid(value)) problems.push(`${path} must be an ISO date or timestamp`)
    if (value && spec.url) {
      const problem = urlProblem(value, spec.url, forIssue)
      if (problem) problems.push(`${path} ${problem}`)
    }
    // Instructions and notes can also contain links. Apply the same rules so a
    // pasted activation URL cannot bypass the dedicated URL-field checks.
    if (!spec.url) {
      for (const match of value.matchAll(/\b(?:https?:\/\/|mailto:)[^\s<>"']+/gi)) {
        const link = match[0].replace(/[),.;!?]+$/, '')
        const problem = urlProblem(link, 'contact', forIssue)
        if (problem) problems.push(`${path} contains a link that ${problem}`)
      }
    }
    if (forIssue && value && spec.email && EMAIL.test(value) && reservedHost(value.split('@')[1])) {
      problems.push(`${path} must not use a reserved or example address when issuing`)
    }
  }
  check(record, SHAPE, 'handover')
  if (!forIssue || !plainObject(record)) return problems

  // Avoid property errors on incomplete or malformed input. Structural errors
  // are still returned alongside useful completeness messages.
  function valueAt(path) { return path.split('.').reduce((value, key) => value?.[key], record) }
  function requireText(path) {
    const value = valueAt(path)
    if (typeof value !== 'string' || !value.trim()) problems.push(`handover.${path} is required before issuing`)
  }
  function requireList(path) {
    const value = valueAt(path)
    if (!Array.isArray(value) || value.length === 0) problems.push(`handover.${path} needs at least one entry before issuing`)
  }
  if (record.kind !== 'client') problems.push('Only a client record can be issued; templates and examples must remain labelled')
  if (record.status !== 'ready') problems.push('The handover must have ready status before issuing')
  for (const path of [
    'id', 'version', 'preparedAt', 'provider.name', 'provider.brandId', 'provider.hours',
    'provider.responseTarget', 'provider.urgentRoute', 'client.name', 'client.brandId',
    'client.contactName', 'client.contactEmail', 'site.name', 'site.url',
    'access.role', 'care.requests', 'care.backups', 'care.restore', 'care.dataExport',
    'care.agreementRef', 'care.rights', 'review.checkedBy', 'review.checkedOn'
  ]) requireText(path)
  if (![valueAt('provider.supportEmail'), valueAt('provider.supportUrl')].some(value => typeof value === 'string' && value.trim())) {
    problems.push('handover.provider needs a supportEmail or supportUrl before issuing')
  }
  if (valueAt('access.method') === 'unconfirmed') problems.push('handover.access.method must be confirmed before issuing')
  if (valueAt('access.method') !== 'managed-only') {
    for (const path of ['site.loginUrl', 'access.accountLabel', 'access.recoveryInstructions', 'access.mfaInstructions']) requireText(path)
  }
  if (valueAt('access.method') === 'invitation') {
    requireText('access.invitationSender')
    requireText('access.invitationExpiry')
  }
  for (const path of ['access.setupInstructions', 'tasks', 'services', 'care.included', 'assets']) requireList(path)
  for (const [index, task] of (Array.isArray(record.tasks) ? record.tasks.slice(0, 20) : []).entries()) {
    if (!plainObject(task)) continue
    for (const key of ['title', 'confirmation']) if (typeof task[key] !== 'string' || !task[key].trim()) problems.push(`handover.tasks[${index}].${key} is required before issuing`)
    if (!Array.isArray(task.steps) || task.steps.length === 0) problems.push(`handover.tasks[${index}].steps needs at least one entry before issuing`)
  }
  for (const [index, service] of (Array.isArray(record.services) ? record.services.slice(0, 30) : []).entries()) {
    if (!plainObject(service)) continue
    for (const key of Object.keys(SHAPE.fields.services.item.fields)) {
      if (typeof service[key] !== 'string' || !service[key].trim()) problems.push(`handover.services[${index}].${key} is required before issuing`)
    }
  }
  for (const [index, asset] of (Array.isArray(record.assets) ? record.assets.slice(0, 50) : []).entries()) {
    if (!plainObject(asset)) continue
    for (const key of ['name', 'url']) if (typeof asset[key] !== 'string' || !asset[key].trim()) problems.push(`handover.assets[${index}].${key} is required before issuing`)
  }
  for (const [path, value] of strings) {
    if (PLACEHOLDER.test(value) || EXAMPLE_TEXT.test(value)) problems.push(`${path} contains example or placeholder text and cannot be issued`)
    // Blank optional scalar fields are fine, but blank list entries do not
    // document a task, instruction, included service or next action.
    if (/\[\d+\]$/.test(path) && !value.trim()) problems.push(`${path} must not be blank when issuing`)
  }
  return [...new Set(problems)]
}

/** Return the supplied record or throw a readable list of validation problems. */
export function assertHandover(record, options) {
  const problems = handoverProblems(record, options)
  if (problems.length) throw new Error(`Invalid managed site handover:\n${problems.map(problem => `- ${problem}`).join('\n')}`)
  return record
}
