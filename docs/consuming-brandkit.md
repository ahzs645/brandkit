# Use Brandkit from another repository

Use a generated consumer profile when an application needs logos, colours and source font
metadata. Use the engine or document exporter when it needs to build new branded artifacts.
These two routes apply to all eight built-in brands and avoid assumptions about one brand's
symbol geometry.

## Portable profile

The Documents view has **Export for another app**. The complete, document and website
packs also contain `source/consumer-profile.json`. To generate one in Node, load the fonts
before rendering:

```js
import { readFile } from 'node:fs/promises'
import { consumerProfile } from 'brandkit/consumer'
import { loadBrandFontsFromDisk } from 'brandkit/fonts/node'

const folder = './vendor/brandkit/brands/unbc'
const brand = JSON.parse(await readFile(`${folder}/brand.json`, 'utf8'))
const fonts = await loadBrandFontsFromDisk(brand, folder)
if (fonts.failures.length) throw new Error('Load the required brand fonts before exporting.')
const profile = consumerProfile({ brand, fonts })
```

| Field | Contract |
| --- | --- |
| `schema` | `brandkit/consumer-profile/1`; reject unknown major schemas |
| `id`, `name`, `version`, `sourceUrl` | Identity metadata and public guidance URL |
| `colours` | Resolved six-digit hex `ink`, `paper`, `primary`, `muted`, `light`, `reverse`, `line`, `rule` |
| `typography` | `body`, `heading`, `label` family, weight, style and fallback stack; an explicit consumer family also supplies `renderingFamily`, `officialFamily` and a substitution `note` |
| `logos` | `primary`, `black`, `reverse`, each with standalone outlined SVG and numeric `viewBox` |
| `identity` | Optional logo policy, minimum width, source clear-space rule, organization, related brands and official-resource metadata |
| `affiliation` | Optional document-text layout defaults for department/subdepartment names; this contains no selected user names |
| `provenance` | Descriptive source and status; never an approval or rights grant |

All supplied logos use their real geometry. Do not read circle coordinates from a raw
`brand.json` to reconstruct a path-based mark or a composed signature. Do not recolour the
primary artwork to invent the black and reverse variants. A consumer should preserve the
viewBox, aspect ratio, compound-path holes, multicolour fills and strokes.

The current built-in exports use paths, circles, ellipses, polygons and groups, with numeric
transforms. Lettering is outlined; the profile carries no font binaries or remote images.
Applications accepting user-selected JSON should validate size, schema, colours and geometry,
reject active/external SVG content, and render a passive subset appropriate to their own HTML
and PDF renderers. Treat metadata as text. Do not fetch a URL merely because it appears in an
imported profile.

The font fields describe the intended host face and any separate rendering substitute; they
do not guarantee that a host renderer has those fonts. `fonts.*.consumerFamily`, when set in
the source brand, becomes the profile's `typography.*.family`; otherwise the existing family
is retained. The profile then records the bundled source face as `renderingFamily`, the
authoritative identity face as `officialFamily`, and the explanation as `note`. UNBC exports
Arial for consumers, Helvetica Neue as its official family, and Helvetica Neue LT Pro as the
bundled face that sets its artwork. Design tokens use the same consumer-family choice.

Bundle permitted brand fonts or show the actual fallback to the user. Logo
outlines remain faithful even when body text uses a fallback. Societyer's companion importer
uses its bundled document fonts and reports such substitutions explicitly.

Keep imported presentation data separate from company/legal records. A brand import should
not replace an organization's name, address, tax registration or contact information. Store
the profile with issued document snapshots so later brand changes do not restyle past output.

## Respect identity restrictions

Profiles for brands with an organization or logo policy include the following additive fields
without changing the `brandkit/consumer-profile/1` schema:

| Field | Consumer responsibility |
| --- | --- |
| `identity.logo.allowedColours` | Preserve the supplied variants and permitted palette; do not add colours or tints. These are source palette keys, with the generated logo variants providing the actual SVG paints. |
| `identity.logo.allowInheritedColour` | When false, do not replace fixed SVG paints with `currentColor`. |
| `identity.logo.standaloneSymbol` | When false, retain the complete logo; do not crop or extract a symbol, lettering, favicon or motif. |
| `identity.minimumLogoWidthMm` | Respect the minimum visible artwork width in printed output. |
| `identity.logo.clearSpaceRatio` | Reserve at least this proportion of logo width on every side; retain the accompanying source-rule wording in `identity.clearSpace`. |
| `identity.logo.note` | Read alongside the numeric values for background restrictions and source context that a number cannot express. |
| `identity.organization` | Organizational identity and document-text naming mode. It does not replace the user's legal or account records. |
| `identity.relationships` | Related brand IDs, labels, relationship descriptions and notes. Association does not imply organizational ownership or sub-logo approval. |
| `identity.officialResources` | Official guidance/download metadata, optionally including a supplied `localPath`. Treat remote URLs as source references; resolve local paths only against files actually present in the package. |
| `affiliation` | Type sizes, line height, spacing and notes for local document attribution. These defaults do not authorize a new departmental logo. |

UNBC's full-logo minimum is 38.1 mm. Its source rule defines clear space as the difference
between the tops of B and N; the profile's ratio is a conservative measurement of the supplied
artwork. UNBC's 55 mm report logo and 8 mm reserved space are local layout defaults. Green
artwork is used on white, black is for black-only reproduction on white/light ground, and
white is preferably used on UNBC Green. Gold is an accent and is never a logo paint. These
rules and the source discrepancies are recorded in the included
`reference/identity-rules.json` and `reference/PROVENANCE.json`.

The complete engine checks logo paint, rejects disabled standalone-symbol calls and validates
minimum logo widths in native templates. Generated UNBC React artwork offers explicit
`colourway` choices and a numeric CSS-pixel `width`; it preserves proportions and clear space.
Its 144 px minimum maps 1.5 inches at 96 CSS px/in and is an implementation mapping, not a
separate university pixel specification. `web.icons: false` prevents generated favicon and
app-icon assets. Applications consuming only a JSON profile must implement equivalent layout
checks when they place the supplied SVGs.

With asset inclusion enabled, task packs retain the source identity/provenance notes. For a
brand with `logoPolicy`, its supplied `reference/` and `official-templates/` files also travel
with the pack. Original UNBC templates are separate from locally generated report, portfolio,
brief and slide applications. A checksum identifies the original bytes; it does not approve
new document content.

## Full document exports

```js
import { publicationModel } from 'brandkit/documentation'
import { publicationDocx, publicationHtml } from 'brandkit/documents'
import { createNodeRenderer, pdfFromDocx } from 'brandkit/documents/node'

const values = {
  title: 'Research report',
  affiliation: {
    department: 'Faculty of Environment',
    subdepartment: 'Department of Geography, Earth and Environmental Sciences'
  }
}
const model = publicationModel(brand, { paper: 'letter', purpose: 'report', values })
const renderer = await createNodeRenderer()
const word = await publicationDocx({ brand, fonts }, model, renderer)
const html = publicationHtml({ brand, fonts }, model)
// Save word bytes as the maintained .docx before calling pdfFromDocx(path, { ctx: { brand, fonts } }).
```

Pin a reviewed Brandkit commit when using a submodule. Install its declared dependencies;
the document package uses native Resvg only through the Node-specific export. Browser hosts
should provide the browser rasterizer to `publicationDocx` and never import `documents/node`.
The app and CLI are reference workflows for the same content model.

The four purposes are `product`, `report`, `brief` and `portfolio`. The portfolio starter
describes an identity, organizational relationships, source artwork and applications.
Affiliation is stored in `model.affiliation`, outside the logo, and stays editable in Word,
HTML and publication JSON. Omit unused names; a subdepartment requires a parent department.
Each name is normalized to a single source line, limited to 180 characters and wrapped at the
available width without condensing or truncating. Flat `values.department` and
`values.subdepartment` aliases are also supported. These are document names, not instructions
to rebuild the logo as a unit identifier.

In the app, **Departments**, **Documents** and native **Templates** share the selected names
for the current brand. Publication JSON retains the names when transferred to another
workflow; consumer-profile JSON carries the naming rules but deliberately contains no
personal selection. The Departments width calculator explains geometry without changing the
saved document print profile. See [the schema](brand-schema.md#organizational-names-and-relationships)
for related-brand metadata and [document naming](documentation.md#department-and-subdepartment-naming)
for the complete editing workflow.

Every output pack includes an asset catalog. Catalog v2 records path, MIME type, byte size,
checksum and identity version; publication records also carry purpose, paper and layout
version. CLI PDF records name their `.docx` master in `derivedFrom`. `sourceRevision` records
the generating code revision when supplied. Checksums identify bytes, not approval.

See [documentation.md](documentation.md) for editable blocks, image validation and the
one-way Word-to-PDF workflow. See the selected brand's `USE.md` for its own source notes.

## Pattern libraries and applications

`patternLibrary(brand)` from `brandkit/patterns` provides the same read-only catalog as the
app's Patterns section. It lists every registered pattern, composition groups, source motifs,
related application templates and existing explorer/guide resources. Each entry retains its
original `spec` for the engine's `pattern({ brand }, spec)` renderer.

Application relationships distinguish an explicit pattern reference from a shared graphic
family. For example, SPARK's expanded native artwork belongs to named graphic directions;
that does not establish that every tile in a family appears unchanged in each application.
Resource paths refer to supplied brand files and should be resolved through the host's asset
provider. This catalog adds navigation and relationships without rewriting artwork.
