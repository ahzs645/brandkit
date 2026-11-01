// Loading a brand's files from disk, for the CLI and tests.
//
// A brand's `file` and `files` paths are relative to its folder. A brand made with the starter
// names the open-licence faces brandkit ships (library/) rather than carrying its own copies, so a
// path that is not in the brand's folder is looked for in the library, then in the other brand
// folders: the built-in ones, and those in BRANDKIT_BRANDS (a folder of brands kept outside
// brandkit, or several separated by the platform's path delimiter).

import { existsSync, readdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { delimiter, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadBrandFonts } from './provider.js'

const LIBRARY = fileURLToPath(new URL('../../library/', import.meta.url))
const BUILT_IN = fileURLToPath(new URL('../../brands/', import.meta.url))
/** Every folder of brands this process knows: BRANDKIT_BRANDS first, then brandkit's own. */
export const brandRoots = () => [...(process.env.BRANDKIT_BRANDS ?? '').split(delimiter).filter(Boolean), BUILT_IN].filter((root) => existsSync(root))

export const toArrayBuffer = (buffer) => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)

/** Where a brand file is: in the brand's folder, or else in a built-in brand's. */
export const findAsset = (folder, relative) => {
  const own = join(folder, relative)
  if (existsSync(own)) return own
  const shared = join(LIBRARY, relative)
  if (existsSync(shared)) return shared
  for (const root of brandRoots()) {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      const candidate = join(root, entry.name, relative)
      if (entry.isDirectory() && existsSync(candidate)) return candidate
    }
  }
  return own
}

export const readAssetFromDisk = async (folder, relative) => toArrayBuffer(await readFile(findAsset(folder, relative)))

/** The faces a brand names, read relative to its folder. */
export const loadBrandFontsFromDisk = (brand, folder) => loadBrandFonts(brand, (file) => readAssetFromDisk(folder, file))
