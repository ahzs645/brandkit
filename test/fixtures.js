import { readFileSync } from 'node:fs'

export const BRAND_DIR = new URL('../brands/ddcnorth/', import.meta.url).pathname
export const brand = JSON.parse(readFileSync(new URL('brand.json', `file://${BRAND_DIR}`), 'utf8'))
