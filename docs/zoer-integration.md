# Calling brandkit from Zoer and other hosts

Brandkit owns the pack/catalog formats, packaging tools and shared interpretation
of brand data. A host such as Zoer owns its users, storage, network connections,
chat references and delivery of assets to a computer. No additional brand-library
repository is required: users can upload a pack or load a repository they already
have. Brands continue to live outside this engine repository.

## Data-only host API

```js
import { readPackFiles } from 'brandkit/pack/host-node'
import {
  brandDefinitions, inspectBrandFiles, brandReferenceSummary,
  catalogEntriesForPath, verifyCatalogEntry
} from 'brandkit/pack/host'

const members = readPackFiles(zipBytes) // bounded ZIP directory, size and CRC checks
const definitions = brandDefinitions(members)
// Offer these definitions to the user; never silently choose another identity.
const selected = inspectBrandFiles(members, { definitionPath: definitions[0] })
const summary = brandReferenceSummary(selected.brand)
```

`brandkit/pack/host` works with byte maps and JSON only. It does not read files,
fetch URLs, load fonts, render SVG, execute extensions or modify application state.
TypeScript declarations ship with both host entry points. `brandReferenceSummary`
preserves source fields; it does not create the rendered `consumer-profile` or
make a missing font available. Use [the consumer profile](consuming-brandkit.md)
when an application needs rendered logo geometry.

`inspectBrandFiles` returns `brand`, `manifest`, `root`, `assetRoot`, `files`,
`archiveFiles`, `library`, `warnings` and `exportOriginal`:

- `files` includes resolved local aliases and a normalized `brand.json`.
- `archiveFiles` distinguishes original portable members from aliases. Use it
  when exporting a selected folder, keeping the manifest to resolve aliases.
- `library` and `warnings` report omitted engine-library dependencies. No URLs
  are fetched automatically. The host may supply its own reviewed resolver.
- Child brand folders are excluded. Hosts discovering nested pack ZIPs must
  exclude those ZIPs from any parent brand before exporting. Zoer does this
  during library discovery. A source repository archive is provenance, not a
  selected brand's export.

The Node/Bun archive helper defaults to 32 MiB compressed, 128 MiB expanded,
16 MiB per member, 4,000 entries, a 4 MiB directory and a 1,000 compression ratio.
Hosts may supply positive integer limits. It rejects traversal, duplicate paths,
links, special files, encryption, ZIP64, conflicting headers and CRC/size errors
before returning members; it never extracts to disk. These are host-intake
defaults, separate from the browser application's existing 160 MB pack limit.

Catalog helpers validate metadata and identify matching local archive members.
`verifyCatalogEntry(entry, {sha256, bytes, id})` checks the host-computed digest,
size and identity. Checksums/sizes remain optional in the upstream v1 format;
when supplied they must match. The host still chooses permitted download origins,
credentials, byte budgets and pinned revisions. These functions never fetch an
imported URL merely because it appears in metadata.

## Index packs which already exist

Source folders already use `brandkit pack`. For existing pack ZIPs, use:

```sh
node scripts/catalog.mjs path/to/packs --out catalog.json --name "Our brands"
node scripts/catalog.mjs path/to/packs --out catalog.json --name "Our brands" --check
# An installed engine exposes the same command as brandkit catalog.
```

This reads bounded archives, validates their manifests/CRC, writes relative pack
URLs and exact original SHA-256 / byte sizes, and refuses duplicate brand IDs.
`--check` exits nonzero on drift and changes no files. Originals are never
recompressed. It does not invent public menu-logo URLs for images kept inside ZIPs.
This replaces application-specific reimplementations of catalog generation.

## Zoer adapter responsibilities

Zoer keeps ZIP/GitHub intake, authentication, per-user inventory, import previews,
version pinning, safe download headers and scoped computer transfer in its plugin.
It calls the shared host API for interpretation and catalog checks. Its pin is an
audited source snapshot from an exact brandkit commit, with per-file SHA-256
verification, so startup does not fetch code or depend on a sibling checkout.

In chat, `@brandkit` selects identities already loaded in the user's library.
Only user-authored references scope the read/copy tools. Brand definitions,
`USE.md`, provenance and all imported text remain untrusted reference material;
they do not grant tools, rights, credentials, execution or publishing permission.
Apply identity rules to the requested artifact while preserving font licences
and supplied logo geometry. Several selected brands remain separate identities.

The general authoring/packaging skill is
[brand-packs](../.claude/skills/brand-packs/SKILL.md) in this repository. Zoer's
skill documents only its picker, scoped tools, permissions and workflow. The
plugin currently ships with Zoer; independent native-plugin packaging can happen
later without moving the engine or requiring a new assets repository.
