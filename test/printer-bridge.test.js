import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BRIDGE_CHANNEL, connectPrinter, createPrinterSession, PRINTER_WEBSITE, printerWebsiteUrl } from '../src/printer/bridge.js'

test('standalone website links accept published packages and keep local transfers out of the URL', () => {
  assert.equal(printerWebsiteUrl(), PRINTER_WEBSITE)
  const source = 'https://projects.ahmadjalil.com/builds/configs/staff_card.zip'
  assert.equal(new URL(printerWebsiteUrl(source)).searchParams.get('url'), source)
  const custom = printerWebsiteUrl(null, { website: 'https://printer.example/tools/?url=old.zip&printer-transfer=secret&theme=dark' })
  assert.equal(custom, 'https://printer.example/tools/?theme=dark')
  for (const local of ['blob:https://brandkit.example/local-design', 'data:application/zip;base64,AAA', 'javascript:alert(1)', '/local.zip']) {
    assert.throws(() => printerWebsiteUrl(local))
  }
  assert.throws(() => printerWebsiteUrl(null, { website: 'javascript:alert(1)' }), /HTTP or HTTPS/)
})

test('a host chooses its own deployment prefix, mount and display name', () => {
  const session = createPrinterSession('https://example.com/tools/', new Uint8Array([1, 2, 3]), { mount: 'cards/', label: 'Another application' })
  assert.equal(new URL(session.url).pathname, '/tools/cards/')
  assert.equal(new URL(session.url).searchParams.get('printer-transfer'), session.token)
  assert.equal(session.label, 'Another application')
  assert.throws(() => createPrinterSession('https://example.com/', new Uint8Array(26 * 1024 * 1024)), /25 MB/)
})

test('the bridge accepts only registered windows, matching origin, protocol and token, and disconnects', () => {
  const previous = { add: globalThis.addEventListener, remove: globalThis.removeEventListener }
  let listener, removed
  globalThis.addEventListener = (type, fn) => { assert.equal(type, 'message'); listener = fn }
  globalThis.removeEventListener = (type, fn) => { removed = fn }
  try {
    const sent = []
    const target = { postMessage: (...args) => sent.push(args) }
    const other = { postMessage: () => { throw new Error('Unregistered window received data') } }
    const session = createPrinterSession('https://example.com/project/', new Uint8Array([1, 2]), { label: 'Test host' })
    const disconnect = connectPrinter({ session, targets: () => [target], origin: 'https://example.com' })
    const event = { origin: 'https://example.com', source: target, data: { channel: BRIDGE_CHANNEL, type: 'request', token: session.token } }
    listener({ ...event, origin: 'https://elsewhere.test' })
    listener({ ...event, source: other })
    listener({ ...event, data: { ...event.data, token: 'wrong' } })
    listener({ ...event, data: { ...event.data, channel: 'unknown' } })
    assert.equal(sent.length, 0)
    listener(event)
    assert.equal(sent.length, 1)
    assert.deepEqual(sent[0][0].bytes, session.bytes)
    assert.equal(sent[0][0].label, 'Test host')
    assert.equal(sent[0][1], 'https://example.com')
    disconnect()
    assert.equal(removed, listener)
  } finally { globalThis.addEventListener = previous.add; globalThis.removeEventListener = previous.remove }
})
