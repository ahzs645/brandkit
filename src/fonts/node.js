// Loading a brand's files from disk, for the CLI and tests.
//
// A brand's `file` and `files` paths are relative to its folder. A brand made with the starter
// names the open-licence faces brandkit ships rather than carrying its own copies, so a path that
// is not in the brand's folder is looked for in the built-in brands' folders too.

import { existsSync, readdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadBrandFonts } from './provider.js'

const BRANDS = fileURLToPath(new URL('../../brands/', import.meta.url))

export const toArrayBuffer = (buffer) => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)

/** Where a brand file is: in the brand's folder, or else in a built-in brand's. */
export const findAsset = (folder, relative) => {
  const own = join(folder, relative)
  if (existsSync(own)) return own
  for (const entry of readdirSync(BRANDS, { withFileTypes: true })) {
    const candidate = join(BRANDS, entry.name, relative)
    if (entry.isDirectory() && existsSync(candidate)) return candidate
  }
  return own
}

export const readAssetFromDisk = async (folder, relative) => toArrayBuffer(await readFile(findAsset(folder, relative)))

/** The faces a brand names, read relative to its folder. */
export const loadBrandFontsFromDisk = (brand, folder) => loadBrandFonts(brand, (file) => readAssetFromDisk(folder, file))
