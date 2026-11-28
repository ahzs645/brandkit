import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { recipeDocx, diagramConfig, diagramSource } from './index.js'
import { createNodeRenderer, layoutPdf } from '../export/node.js'

/**
 * Reads the job's spreadsheets given as `{"path": …}` (relative to `baseDir`, the job file's folder) into bytes.
 * The caller's job is left as it was.
 */
export async function readJobFiles(job, baseDir = process.cwd()) {
  const entries = Object.entries(job.spreadsheets ?? {})
  if (!entries.some(([, asset]) => typeof asset?.path === 'string')) return job
  const spreadsheets = {}
  for (const [id, asset] of entries) {
    spreadsheets[id] = typeof asset?.path === 'string'
      ? { bytes: new Uint8Array(await readFile(resolve(baseDir, asset.path))) }
      : asset
  }
  return { ...job, spreadsheets }
}

/**
 * Export a portable job to a Word master, its PDF (the Word master laid out by document-kit, in the
 * brand's faces) when `pdf` is set, and editable diagram sources.
 */
export async function exportRecipe(ctx, source, { outDir, pdf = false, logo, diagrams = [], baseDir } = {}) {
  const job = await readJobFiles(source, baseDir)
  const renderer = await createNodeRenderer()
  let browser, page
  async function mermaid(source, profile) {
    if (!page) {
      const { chromium } = await import('playwright')
      browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {})
      page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1300, height: 1000 } })
      await page.route(/^https?:/, route => route.abort())
      await page.setContent('<style>body{margin:0}main{display:inline-block}svg{display:block}</style><main></main>')
      const fontBytes = ctx.fonts.faces?.body?.bytes
      if (fontBytes) await page.evaluate(async ({ family, bytes }) => {
        document.fonts.add(await new FontFace(family, 'url(data:font/ttf;base64,' + bytes + ')').load())
      }, { family: profile.typography.body.family, bytes: Buffer.from(fontBytes).toString('base64') })
      await page.addScriptTag({ path: createRequire(import.meta.url).resolve('mermaid/dist/mermaid.min.js') })
      await page.evaluate(config => window.mermaid.initialize(config), diagramConfig(profile))
    }
    await page.evaluate(async source => {
      document.querySelector('main').replaceChildren()
      const { svg } = await window.mermaid.render('diagram', source)
      document.querySelector('main').innerHTML = svg
      const root = document.querySelector('main svg')
      const { width, height } = root.viewBox.baseVal
      root.style.maxWidth = 'none'
      root.setAttribute('width', width)
      root.setAttribute('height', height)
    }, source)
    return page.locator('main svg').first().screenshot({ animations: 'disabled' })
  }
  const sources = Object.entries(job.images ?? {}).map(([key, asset]) => [key, diagramSource(asset)]).filter(([, spec]) => spec)
  for (const [id] of sources) {
    if (!/^[a-z0-9][a-z0-9._-]*$/i.test(id)) throw new Error('Invalid diagram filename: ' + id)
  }
  let bytes
  try {
    bytes = await recipeDocx(ctx, job, { ...renderer, mermaid, logo, diagrams })
  } finally {
    await browser?.close()
  }
  await mkdir(outDir, { recursive: true })
  const stage = await mkdtemp(join(outDir, '.recipe-'))
  const names = ['proposal.docx']
  try {
    const master = join(stage, names[0])
    await writeFile(master, bytes)
    if (pdf) {
      await writeFile(join(stage, 'proposal.pdf'), (await layoutPdf(bytes, { ctx })).bytes)
      names.push('proposal.pdf')
    }
    for (const [id, image] of sources) {
      const mermaidText = image.renderer === 'mermaid'
      const name = id + (mermaidText ? '.mmd' : '.' + image.renderer + '.json')
      await writeFile(join(stage, name), (mermaidText ? image.source.trimEnd() : JSON.stringify(image, null, 2)) + '\n')
      names.push(name)
    }
    for (const name of names) await rename(join(stage, name), join(outDir, name))
    return names
  } finally {
    await rm(stage, { recursive: true, force: true })
  }
}
