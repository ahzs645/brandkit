// Node-only helpers. Browser consumers never load the native renderer or child_process.
import { execFile } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { officeFont } from '../engine/office.js'

const exec = promisify(execFile)
const xml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

/** SVGs supplied by the engine are outlined; no installed fonts or network are required. */
export const createNodeRenderer = async () => {
  const { Resvg } = await import('@resvg/resvg-js')
  return {
    png: async (svg, width) => {
      if (typeof svg !== 'string' || !Number.isFinite(width) || width <= 0 || width > 16384) throw new Error('SVG rendering needs markup and a width between 1 and 16384 pixels.')
      if (/\b(?:href|xlink:href)\s*=\s*["'](?!data:image\/(?:png|jpeg);base64,|#)/i.test(svg)) throw new Error('Document artwork cannot load external image resources.')
      return new Uint8Array(new Resvg(svg, { fitTo: { mode: 'width', value: Math.round(width) }, font: { loadSystemFonts: false } }).render().asPng())
    }
  }
}

/**
 * Export the actual Word master to a tagged PDF. Use a new LibreOffice profile and output
 * directory for every conversion: an earlier PDF cannot be mistaken for a successful export.
 * ctx is optional when re-exporting an edited Word master. Supply it to use the kit fonts.
 */
export const pdfFromDocx = async (input, { outDir = dirname(resolve(input)), ctx, soffice = process.env.SOFFICE_PATH ?? 'soffice' } = {}) => {
  const inputPath = resolve(input)
  if (extname(inputPath).toLowerCase() !== '.docx') throw new Error('PDF export needs an editable .docx master.')
  if (ctx?.fonts?.failures?.length) throw new Error(`Required brand fonts could not be loaded: ${ctx.fonts.failures.map(({ key, error }) => `${key}: ${error?.message ?? String(error ?? 'Font could not be loaded.')}`).join('; ')}`)
  await stat(inputPath)
  const work = await mkdtemp(join(tmpdir(), 'brandkit-document-'))
  const output = join(work, 'converted')
  await mkdir(output)
  try {
    const env = { ...process.env }
    if (ctx?.fonts?.faces) {
      const fontDir = join(work, 'fonts')
      await mkdir(fontDir)
      const aliases = new Map()
      for (const [key, face] of Object.entries(ctx.fonts.faces)) {
        if (!face.bytes) continue
        const spec = ctx.brand.fonts[key]
        const extension = String(spec.file ?? '').toLowerCase().endsWith('.otf') ? 'otf' : 'ttf'
        await writeFile(join(fontDir, `${key.replace(/[^a-z0-9_-]/gi, '_')}.${extension}`), face.bytes)
        const requested = officeFont(ctx.brand, key).name
        const names = face.font?.names ?? {}
        const actual = names.fontFamily?.en ?? Object.values(names.fontFamily ?? {})[0] ?? spec.family
        if (requested && actual && requested !== actual && !aliases.has(requested)) aliases.set(requested, actual)
      }
      const fontConfig = join(work, 'fonts.conf')
      await writeFile(fontConfig, `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd"><fontconfig><include ignore_missing="yes">/etc/fonts/fonts.conf</include><dir>${xml(fontDir)}</dir><cachedir>${xml(join(work, 'font-cache'))}</cachedir>${[...aliases].map(([from, to]) => `<match target="pattern"><test name="family" compare="eq"><string>${xml(from)}</string></test><edit name="family" mode="assign" binding="strong"><string>${xml(to)}</string></edit></match>`).join('')}</fontconfig>`)
      env.FONTCONFIG_FILE = fontConfig
    }
    const filter = 'pdf:writer_pdf_Export:{"UseTaggedPDF":{"type":"boolean","value":"true"},"ExportBookmarks":{"type":"boolean","value":"true"}}'
    try {
      await exec(soffice, [`-env:UserInstallation=${pathToFileURL(join(work, 'profile')).href}`, '--headless', '--convert-to', filter, '--outdir', output, inputPath], { env, timeout: 120000, maxBuffer: 2 * 1024 * 1024 })
    } catch (error) {
      if (error.code === 'ENOENT') throw new Error('Install LibreOffice (soffice) to export the Word master as PDF, or set SOFFICE_PATH.', { cause: error })
      throw new Error(`Word-to-PDF export failed: ${error.stderr || error.message}`, { cause: error })
    }
    const generated = join(output, `${basename(inputPath, extname(inputPath))}.pdf`)
    const bytes = await readFile(generated).catch(() => { throw new Error('LibreOffice did not produce a PDF. The Word master remains available.') })
    if (bytes.length < 100 || bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error('The converter did not produce a valid PDF header.')
    await mkdir(outDir, { recursive: true })
    const target = join(resolve(outDir), basename(generated))
    await copyFile(generated, target)
    return target
  } finally {
    await rm(work, { recursive: true, force: true })
  }
}
