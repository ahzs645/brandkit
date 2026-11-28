// Build the vendored document-kit submodule.
//
// document-kit gitignores its dist/, and every one of its package `exports` points there (fonts
// excepted), so the `file:vendor/document-kit` dependency resolves to missing or stale files until it
// is built. This runs in pretest, predev and prebuild, and in the Pages workflow. It is a no-op when
// dist/ is newer than everything it is built from, so the common loop pays nothing. The kit's own guide
// is vendor/document-kit/README.md; brandkit's is docs/document-kit.md.
import { existsSync, readdirSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'vendor', 'document-kit')

if (!existsSync(join(pkgDir, 'package.json'))) {
  console.warn('[vendor:document-kit] vendor/document-kit is not checked out — run `git submodule update --init vendor/document-kit`. Skipping build.')
  process.exit(0)
}

/** Newest mtime across a tree (or of one file), so the kit is rebuilt only when a source is newer than dist/. */
function newestMtime(path) {
  if (!existsSync(path)) return 0
  const stat = statSync(path)
  if (!stat.isDirectory()) return stat.mtimeMs
  let newest = 0
  for (const entry of readdirSync(path, { withFileTypes: true })) newest = Math.max(newest, newestMtime(join(path, entry.name)))
  return newest
}

// The entries brandkit imports. The oldest of them has to be newer than every input of the kit's build.
const outputs = ['index.js', 'docx.js', 'html.js', 'layout.js', 'pdf-preview.js', 'recipe.js', 'diagrams.js', 'diagrams-d3.js']
  .map((file) => join(pkgDir, 'dist', file))
const inputs = ['src', 'package.json', 'package-lock.json', 'vite.config.ts', 'tsconfig.json', 'tsconfig.build.json'].map((file) => join(pkgDir, file))
const oldestOutput = outputs.every((file) => existsSync(file)) ? Math.min(...outputs.map((file) => statSync(file).mtimeMs)) : 0
if (oldestOutput > 0 && oldestOutput >= Math.max(...inputs.map(newestMtime))) {
  console.log('[vendor:document-kit] dist is up to date — skipping build.')
  process.exit(0)
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const run = (args) => execFileSync(npm, args, { cwd: pkgDir, stdio: 'inherit' })
// The kit's build tools (vite, typescript) are its devDependencies, installed from its own lockfile.
if (!existsSync(join(pkgDir, 'node_modules', '.bin', 'vite'))) {
  console.log('[vendor:document-kit] installing build dependencies…')
  run(['ci', '--ignore-scripts'])
}
console.log('[vendor:document-kit] building…')
run(['run', 'build'])
