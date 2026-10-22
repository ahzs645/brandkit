// Revisions: proposed changes to an identity, kept beside the approved one rather than in place
// of it.
//
// A revision is a named patch over the brand definition:
//
//   { id: 'rising', title, version, displayVersion, status: 'proposed' | 'approved' | 'declined',
//     date, summary, rationale: [...], changes: { symbol: { centres: [...] }, ... } }
//
// `changes` is merged into the definition: objects merge key by key, anything else (arrays
// included) replaces what was there, and null removes a key. `{ "$append": [...] }` in place of a
// value appends to the array there (or creates it), so a revision can add templates, patterns or
// guide pages without copying the approved lists. withRevision() gives the brand as
// the revision would make it, so every generator (logos, templates, guide, kit) can draw it
// unchanged, and a kit can carry both the approved files and the proposal side by side.

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

const isAppend = (value) => isObject(value) && Object.hasOwn(value, '$append')

/** `{ $append: [...] }` applied to what is there: the items added to the end of the array. */
const appendTo = (target, value, key) => {
  if (Object.keys(value).length !== 1) throw new Error(`\`${key}\`: $append cannot sit beside other keys.`)
  if (!Array.isArray(value.$append)) throw new Error(`\`${key}\`: $append needs an array of items.`)
  if (target === undefined) return structuredClone(value.$append)
  if (!Array.isArray(target)) throw new Error(`\`${key}\`: $append can only add to an array.`)
  return [...structuredClone(target), ...structuredClone(value.$append)]
}

/** Deep-merges `patch` into `base`, without changing either. Appended items are kept as written. */
export const mergePatch = (base, patch) => {
  if (!isObject(patch) || !isObject(base)) return structuredClone(patch)
  const out = structuredClone(base)
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete out[key]
    else if (isAppend(value)) out[key] = appendTo(out[key], value, key)
    else out[key] = key in out ? mergePatch(out[key], value) : isObject(value) ? mergePatch({}, value) : structuredClone(value)
  }
  return out
}

/** Keys whose change redraws the logo or symbol; a revision touching none of them only adds. */
const ARTWORK_KEYS = ['symbol', 'wordmark', 'families', 'lockup', 'colours', 'roles', 'logoColours']
export const changesArtwork = (revision) => ARTWORK_KEYS.some((key) => key in (revision?.changes ?? {}))

/** What a revision appends: `{ patterns: [...], templates: [...], sets, icons, pages, files }`. */
export const additionsOf = (revision) => {
  const changes = revision?.changes ?? {}
  const list = (value) => (isAppend(value) ? value.$append : [])
  return {
    patterns: list(changes.patterns), templates: list(changes.templates), sets: list(changes.sets),
    icons: list(changes.icons?.items), pages: list(changes.guide?.pages), files: list(changes.files)
  }
}

export const revisionsOf = (brand) => brand?.revisions ?? []

export const findRevision = (brand, id) => revisionsOf(brand).find((revision) => revision.id === id) ?? null

/**
 * The brand as a revision would make it. It keeps the list of revisions (so an interface can
 * switch back), records which one it is in `revision`, and drops the sheets that compare the
 * revision with the approved identity, which only make sense in the approved kit.
 */
export const withRevision = (brand, id) => {
  if (!id) return brand
  const revision = findRevision(brand, id)
  if (!revision) throw new Error(`${brand.name} has no revision called ${id}`)
  const revised = mergePatch(brand, revision.changes ?? {})
  revised.version = revision.version ?? `${brand.version}+${revision.id}`
  revised.displayVersion = revision.displayVersion ?? revised.version.split('-')[0]
  revised.revision = { id: revision.id, title: revision.title, status: revision.status ?? 'proposed', date: revision.date, base: brand.version }
  if (revised.guide?.sheets) revised.guide.sheets = revised.guide.sheets.filter((sheet) => sheet.group !== 'revisions')
  return revised
}

/**
 * The approved identity alone: no revisions to choose from, and none of the sheets that compare
 * one with it. For showing a brand to the people who use it rather than the people deciding it.
 */
export const approvedOnly = (brand) => {
  if (!brand || (!brand.revisions?.length && !brand.revision)) return brand
  const approved = structuredClone(brand)
  delete approved.revisions
  delete approved.revision
  if (approved.guide?.sheets) approved.guide.sheets = approved.guide.sheets.filter((sheet) => sheet.group !== 'revisions')
  return approved
}

/** A revision's README: what it changes and why, for the kit's revisions/<id>/ folder. */
export const revisionReadme = (brand, revision) => {
  const head = `# ${brand.name}: ${revision.title}

**Status:** ${revision.status ?? 'proposed'}${revision.date ? ` (${revision.date})` : ''}
**Revises:** v${brand.displayVersion ?? brand.version}, as **v${revision.displayVersion ?? revision.version ?? '?'}**

${revision.summary ?? ''}
${revision.rationale?.length ? `\n## Why\n\n${revision.rationale.map((line) => `- ${line}`).join('\n')}\n` : ''}`
  if (changesArtwork(revision)) {
    const comparison = (brand.guide?.sheets ?? []).some((sheet) => sheet.group === 'revisions' && sheet.path?.startsWith(`revisions/${revision.id}/`))
    return `${head}
## In this folder
${comparison ? '\n- \`comparison.svg\` / \`.png\`: the approved logo and the revision, side by side.' : ''}
- \`logos/\` and \`symbol/\`: the revised artwork, in every family, layout and colour.
- \`brand.json\`: the whole definition with this revision applied. Open it in brandkit to see or
  download a complete kit (templates, guide, web files) as the revision would make it.

Until it is approved, the files in the kit's own \`logos/\` and \`symbol/\` folders remain the
identity. Approving it means making these changes in brand.json itself:

\`\`\`json
${JSON.stringify(revision.changes ?? {}, null, 2)}
\`\`\`
`
  }
  // A revision that only adds: the logo and symbol stay as they are.
  const added = additionsOf(revision)
  const changes = revision.changes ?? {}
  const ids = (items) => items.map((item) => `\`${item.id ?? item.to ?? item}\``).join(', ')
  const count = (items, one, many) => `${items.length} ${items.length === 1 ? one : many}`
  const extraFiles = added.files.filter((file) => !String(file.to ?? file).startsWith('motion/'))
  const folder = [
    '- `brand.json`: the whole definition with this revision applied. Open it in brandkit to see or\n  download a complete kit (templates, guide, web files) as the revision would make it.',
    added.patterns.length && `- \`patterns/\`: the ${count(added.patterns, 'pattern', 'patterns')} it adds: ${ids(added.patterns)}.`,
    added.templates.length && `- \`templates/\`: the ${count(added.templates, 'template', 'templates')} it adds: ${ids(added.templates)}.`,
    added.icons.length && `- \`icons/\`: the ${count(added.icons, 'icon', 'icons')} it adds: ${ids(added.icons)}.`,
    changes.motion && `- \`motion/\`: its motion library of ${count(changes.motion.studies ?? [], 'study', 'studies')}: the page, the CSS, the tokens and a README.`,
    extraFiles.length && `- Also: ${ids(extraFiles)}.`
  ].filter(Boolean).join('\n')
  const lists = [
    added.patterns.length && `${count(added.patterns, 'pattern', 'patterns')} to \`patterns\``,
    added.templates.length && `${count(added.templates, 'template', 'templates')} to \`templates\``,
    added.sets.length && `${count(added.sets, 'set', 'sets')} to \`sets\``,
    added.icons.length && `${count(added.icons, 'icon', 'icons')} to \`icons.items\``,
    added.pages.length && `${count(added.pages, 'page', 'pages')} to \`guide.pages\``,
    added.files.length && `${count(added.files, 'file', 'files')} to \`files\``
  ].filter(Boolean)
  const settings = [
    changes.motion && 'add `motion`',
    changes.copy && `set ${Object.keys(changes.copy).map((key) => `\`copy.${key}\``).join(' and ')}`,
    changes.guide?.frame && `set ${Object.keys(changes.guide.frame).map((key) => `\`guide.frame.${key}\``).join(' and ')}`
  ].filter(Boolean)
  return `${head}
## In this folder

${folder}
${added.pages.length ? `\nIt also adds ${count(added.pages, 'guide page', 'guide pages')}: ${added.pages.map((page) => page.name ?? page.title).join(', ')}.\n` : ''}
The logo and symbol do not change, so the approved logo and symbol files remain the identity
whether or not this is approved.

## Approving it

Approving it means adding these to brand.json: append ${lists.join(', ')}${settings.length ? `; and ${settings.join(', ')}` : ''}.
The resolved definition is \`brand.json\` in this folder.
`
}
