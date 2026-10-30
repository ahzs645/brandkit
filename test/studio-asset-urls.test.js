import test from 'node:test'
import assert from 'node:assert/strict'
import { safeDocumentHref } from '../src/studio/asset-urls.js'

test('audit links keep host-relative paths and supported resolved asset URLs', () => {
  for (const href of [
    'docs/manual-audit.html', '../reference/manual-audit.html',
    '/brandkit/assets/manual-audit.html', '?view=audit#H18',
    'https://projects.example/brandkit/manual-audit.html',
    'http://localhost:5173/manual-audit.html',
    '//projects.example/manual-audit.html',
    'blob:https://projects.example/45157c6f-e487-4135-83ea-9b6b066185b1',
    'blob:null/45157c6f-e487-4135-83ea-9b6b066185b1'
  ]) assert.equal(safeDocumentHref(href), href)
  assert.equal(safeDocumentHref('  docs/manual-audit.html  '), 'docs/manual-audit.html')
})

test('imported report links cannot execute a script or data document', () => {
  for (const href of [
    'javascript:alert(1)', 'JaVaScRiPt:alert(1)',
    'java\nscript:alert(1)', 'java\tscript:alert(1)',
    '\u0000javascript:alert(1)', ' \r\n javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)', 'file:///etc/passwd', 'ftp://example.com/manual.html'
  ]) assert.equal(safeDocumentHref(href), null, JSON.stringify(href))
})

test('missing, non-string and malformed document URLs do not produce an anchor', () => {
  for (const href of [undefined, null, '', '  ', 1, {}, 'https://', 'https://[invalid']) {
    assert.equal(safeDocumentHref(href), null)
  }
})
