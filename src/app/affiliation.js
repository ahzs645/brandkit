// One unit selection shared by document starters and native template fields.
export const readAffiliation = (brandId, storage = globalThis.localStorage) => {
  try {
    const readRecord = key => {
      try {
        const record = JSON.parse(storage?.getItem(key) ?? 'null')
        return record && typeof record === 'object' && !Array.isArray(record) ? record : null
      } catch { return null }
    }
    // A saved native record also represents deliberate clearing of its fields.
    const value = readRecord(`brandkit:fields:${brandId}`) ?? readRecord(`brandkit:affiliation:${brandId}`)
    return { department: typeof value?.department === 'string' ? value.department : '', subdepartment: typeof value?.subdepartment === 'string' ? value.subdepartment : '' }
  } catch { return { department: '', subdepartment: '' } }
}

export const writeAffiliation = (brandId, affiliation, storage = globalThis.localStorage) => {
  const normalize = value => String(value ?? '').replace(/\s+/g, ' ').trim()
  const value = { department: normalize(affiliation?.department), subdepartment: normalize(affiliation?.subdepartment) }
  if (Object.values(value).some(name => name.length > 180)) throw new Error('Keep each unit name to 180 characters or fewer.')
  if (value.subdepartment && !value.department) throw new Error('Add the parent department before a subdepartment.')
  try {
    let fields
    try { fields = JSON.parse(storage?.getItem(`brandkit:fields:${brandId}`) ?? '{}') } catch { fields = {} }
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) fields = {}
    storage.setItem(`brandkit:fields:${brandId}`, JSON.stringify({ ...fields, ...value }))
    storage.setItem(`brandkit:affiliation:${brandId}`, JSON.stringify(value))
  } catch (error) {
    throw new Error('The unit names could not be saved in this browser. Download the document source to keep your work.', { cause: error })
  }
  return value
}

/** Whether a brand composes department sub-logos: departmental signatures and a department list. */
export const hasSubLogos = (brand) => Boolean(brand?.departments?.field && brand.signatures?.some((entry) => entry.departmental))

/** The Departments view is for a brand that names its units in documents or sets sub-logos for them. */
export const hasDepartments = (brand) => Boolean(brand?.organization) || hasSubLogos(brand)
