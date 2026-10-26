import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFile, spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { documentPage } from '../src/engine/office.js'
import { loadBrandFontsFromDisk } from '../src/fonts/node.js'
import { officeFile } from '../src/export/office.js'
import { createNodeRenderer, pdfFromDocx } from '../src/export/node.js'

const folder = new URL('../brands/unbc/', import.meta.url).pathname
const brand = JSON.parse(await readFile(`${folder}brand.json`, 'utf8'))
const fonts = await loadBrandFontsFromDisk(brand, folder)
const ctx = { brand, fonts, values: { department: '', subdepartment: '' } }
const run = promisify(execFile)

test('a fixed footer rule stays in artwork while rules within the document body remain editable', () => {
  const template = {
    id: 'footer-boundary-check', width: 210, height: 297, unit: 'mm', elements: [
      { type: 'line', x1: 20, x2: 190, y1: 40, y2: 40, stroke: 'line' },
      { type: 'text', id: 'body', text: 'Editable body', x: 20, y: 80, size: 4, font: 'body' },
      { type: 'line', x1: 20, x2: 190, y1: 120, y2: 120, stroke: 'line' },
      { type: 'line', x1: 20, x2: 190, y1: 275, y2: 275, stroke: 'line' },
      { type: 'text', id: 'footer', text: 'Reference', x: 20, y: 282, size: 3, font: 'body' }
    ]
  }
  const page = documentPage(ctx, template)
  assert.deepEqual(page.body.filter(item => item.kind === 'rule').map(item => item.element), [2])
  assert.ok(page.background.includes(template.elements[3]), 'The fixed rule is still visibly rendered in the background')
  assert.ok(page.footer.some(item => item.id === 'footer'), 'Footer text remains native editable text')
})

const soffice = process.env.SOFFICE_PATH ?? 'soffice'
const canRender = [[soffice, ['--version']], ['pdfinfo', ['-v']], ['pdftotext', ['-v']]]
  .every(([command, args]) => spawnSync(command, args, { stdio: 'ignore' }).status === 0)
const requireRender = process.env.REQUIRE_DOCUMENT_RENDERERS === '1'

test('all ten native UNBC Word starters paginate without blank continuation pages', { skip: canRender || requireRender ? false : 'LibreOffice and Poppler are required for native Word pagination checks.', timeout: 180000 }, async () => {
  assert.ok(canRender, 'LibreOffice, pdfinfo and pdftotext must be installed for the required native Word pagination check')
  const work = await mkdtemp(join(tmpdir(), 'brandkit-unbc-pagination-'))
  const renderer = await createNodeRenderer()
  try {
    for (const descriptor of brand.documents.filter(item => item.format === 'docx')) {
      const file = await officeFile(ctx, descriptor, renderer)
      const path = join(work, file.name)
      await writeFile(path, file.bytes)
      const pdf = await pdfFromDocx(path, { ctx, soffice })
      const result = await run('pdfinfo', [pdf])
      const pages = Number(/^Pages:\s+(\d+)$/m.exec(result.stdout)?.[1])
      assert.equal(pages, descriptor.continue ? 2 : 1, `${descriptor.id} must contain only its intended content pages`)
      if (descriptor.continue) {
        const continuation = documentPage(ctx, brand.templates.find(template => template.id === descriptor.pages[1]))
        const heading = continuation.body.find(item => item.kind === 'field' && item.value.trim()).value
        const coverText = (await run('pdftotext', ['-f', '1', '-l', '1', pdf, '-'])).stdout
        const bodyText = (await run('pdftotext', ['-f', '2', '-l', '2', pdf, '-'])).stdout
        assert.ok(!coverText.includes(heading), `${descriptor.id} must keep its continuation heading off the cover`)
        assert.ok(bodyText.includes(heading), `${descriptor.id} must begin its continuation on page two even when a rule comes first`)
      }
    }
  } finally { await rm(work, { recursive: true, force: true }) }
})
