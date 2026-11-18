// Product family templates kept in this browser, beside the ones built into brandkit. A template
// is a small JSON file (see src/engine/product-templates.js); saving one here makes it available
// to every brand opened in this browser, and exporting it shares it with anyone else.

import { BUILT_IN_PRODUCT_TEMPLATES, validateProductTemplate } from '../engine/product-templates.js'

const STORE = 'brandkit:product-templates'

export const savedProductTemplates = () => {
  try {
    const list = JSON.parse(localStorage.getItem(STORE) ?? '[]')
    return Array.isArray(list) ? list.filter((entry) => !validateProductTemplate(entry).length) : []
  } catch { return [] }
}

const write = (list) => {
  try { localStorage.setItem(STORE, JSON.stringify(list)) } catch (error) {
    throw new Error('The template could not be kept in browser storage. Export it as a file instead.', { cause: error })
  }
}

/** Keeps a template here, replacing one with the same id. Built-in ids are taken. */
export const saveProductTemplate = (template) => {
  const problems = validateProductTemplate(template)
  if (problems.length) throw new Error(problems.join(' '))
  if (BUILT_IN_PRODUCT_TEMPLATES.some((entry) => entry.id === template.id)) throw new Error(`${template.id} is a built-in template; give yours an id of its own.`)
  write([...savedProductTemplates().filter((entry) => entry.id !== template.id), { ...template, saved: new Date().toISOString() }])
}

export const forgetProductTemplate = (id) => write(savedProductTemplates().filter((entry) => entry.id !== id))

/** Every template on offer: built in first, then those kept here. */
export const productTemplates = () => [
  ...BUILT_IN_PRODUCT_TEMPLATES.map((entry) => ({ ...entry, builtIn: true })),
  ...savedProductTemplates()
]

/** Reads a template from a chosen file, checking it. */
export const readProductTemplateFile = async (file) => {
  let template
  try { template = JSON.parse(await file.text()) } catch { throw new Error(`${file.name} is not JSON.`) }
  const problems = validateProductTemplate(template)
  if (problems.length) throw new Error(`${file.name} is not a product family template: ${problems.join(' ')}`)
  return template
}
