import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PRINTER_WEBSITE, printerWebsiteUrl } from '../src/printer/bridge.js'

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
