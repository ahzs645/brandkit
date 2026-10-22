import { readFileSync } from 'node:fs'

// ddcnorth v2.1, the definition the original kit is reproduced from, kept as history since v2.3 was
// approved (brands/ddcnorth/history/2.1/brand.json). Its fonts and files are the brand folder's.
export const BRAND_DIR = new URL('../brands/ddcnorth/', import.meta.url).pathname
export const brand = JSON.parse(readFileSync(new URL('history/2.1/brand.json', `file://${BRAND_DIR}`), 'utf8'))
