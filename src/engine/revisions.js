// Revisions: proposed changes to an identity, kept beside the approved one rather than in place
// of it.
//
// A revision is a named patch over the brand definition:
//
//   { id: 'rising', title, version, displayVersion, status: 'proposed' | 'approved' | 'declined',
//     date, summary, rationale: [...], changes: { symbol: { centres: [...] }, ... } }
//
// `changes` is merged into the definition: objects merge key by key, anything else (arrays
// included) replaces what was there, and null removes a key. withRevision() gives the brand as
// the revision would make it, so every generator (logos, templates, guide, kit) can draw it
// unchanged, and a kit can carry both the approved files and the proposal side by side.

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

/** Deep-merges `patch` into `base`, without changing either. */
export const mergePatch = (base, patch) => {
  if (!isObject(patch) || !isObject(base)) return structuredClone(patch)
  const out = structuredClone(base)
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete out[key]
    else out[key] = key in out ? mergePatch(out[key], value) : structuredClone(value)
  }
  return out
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
export const revisionReadme = (brand, revision) => `# ${brand.name}: ${revision.title}

**Status:** ${revision.status ?? 'proposed'}${revision.date ? ` (${revision.date})` : ''}
**Revises:** v${brand.displayVersion ?? brand.version}, as **v${revision.displayVersion ?? revision.version ?? '?'}**

${revision.summary ?? ''}
${revision.rationale?.length ? `\n## Why\n\n${revision.rationale.map((line) => `- ${line}`).join('\n')}\n` : ''}
## In this folder

- \`comparison.svg\` / \`.png\`: the approved logo and the revision, side by side.
- \`logos/\` and \`symbol/\`: the revised artwork, in every family, layout and colour.
- \`brand.json\`: the whole definition with this revision applied. Open it in brandkit to see or
  download a complete kit (templates, guide, web files) as the revision would make it.

Until it is approved, the files in the kit's own \`logos/\` and \`symbol/\` folders remain the
identity. Approving it means making these changes in brand.json itself:

\`\`\`json
${JSON.stringify(revision.changes ?? {}, null, 2)}
\`\`\`
`
