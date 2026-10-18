// The BC manual pack is the rebuilt pages and nothing else: every page listed is on disk with its
// thumbnail, no page carries a piece of a reference scan, and the text has no em dashes.
// (Moved here from PofBC with the pages themselves.)

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { BC_BOOKS, BC_FAMILIES } from '../manuals/bc/index.js'

const file = (book, page, ext) => new URL(`../manuals/bc/pages/${book}/${page}.${ext}`, import.meta.url)
const pages = BC_BOOKS.flatMap((book) => book.pages.map((page) => ({ book, page })))

test('every book is in exactly one family, and every family names books that exist', () => {
  const listed = BC_FAMILIES.flatMap((family) => family.books)
  assert.equal(new Set(listed).size, listed.length)
  assert.deepEqual([...listed].sort(), BC_BOOKS.map(({ id }) => id).sort())
})

test('every page has its drawing and its thumbnail, and ids are unique', () => {
  assert.equal(pages.length, 156)
  assert.equal(new Set(pages.map(({ page }) => page.id)).size, pages.length)
  for (const { book, page } of pages) {
    assert.ok(existsSync(file(book.id, page.id, 'svg')), `${page.id}.svg`)
    assert.ok(existsSync(file(book.id, page.id, 'webp')), `${page.id}.webp`)
    assert.ok(page.width > 0 && page.height > 0, `${page.id}: size`)
  }
})

test('no page embeds an image: nothing in the pack is a piece of a reference scan', () => {
  for (const { book, page } of pages) {
    const svg = readFileSync(file(book.id, page.id, 'svg'), 'utf8')
    assert.ok(!/<image\b/.test(svg), `${page.id} embeds an image`)
    assert.ok(!/href="data:image/.test(svg), `${page.id} embeds image data`)
  }
})

test('the licences of the embedded font subsets travel with the pages', () => {
  for (const name of ['FONT-NOTICE.txt', 'GUST-FONT-LICENSE.txt', 'NOTO-FONT-LICENSE.txt']) {
    assert.ok(existsSync(new URL(`../manuals/bc/pages/font-licences/${name}`, import.meta.url)), name)
  }
})

test('titles and notes are set without em dashes', () => {
  for (const book of BC_BOOKS) {
    assert.ok(!book.title.includes('—') && !book.edition.includes('—'), book.id)
    for (const page of book.pages) {
      assert.ok(!page.title.includes('—'), `${page.id}: ${page.title}`)
      for (const note of page.notes) assert.ok(!note.includes('—'), `${page.id}: ${note}`)
    }
  }
  for (const family of BC_FAMILIES) for (const text of [family.title, family.kind]) assert.ok(!text.includes('—'), text)
})
