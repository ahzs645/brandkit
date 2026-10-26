# Use Brandkit from another repository

Use a generated consumer profile when an application needs logos, colours and source font
metadata. Use the engine or document exporter when it needs to build new branded artifacts.
These two routes apply to all seven built-in brands and avoid assumptions about one brand's
symbol geometry.

## Portable profile

The Documents view has **Export for another app**. The complete, document and website
packs also contain `source/consumer-profile.json`. To generate one in Node, load the fonts
before rendering:

```js
import { readFile } from 'node:fs/promises'
import { consumerProfile } from 'brandkit/consumer'
import { loadBrandFontsFromDisk } from 'brandkit/fonts/node'

const folder = './vendor/brandkit/brands/firstform'
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
| `typography` | Source `body`, `heading`, `label` family, weight, style and fallback stack |
| `logos` | `primary`, `black`, `reverse`, each with standalone outlined SVG and numeric `viewBox` |
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

The font fields describe the source identity; they do not guarantee that a host renderer has
those fonts. Bundle permitted brand fonts or show the actual fallback to the user. Logo
outlines remain faithful even when body text uses a fallback. Societyer's companion importer
uses its bundled document fonts and reports such substitutions explicitly.

Keep imported presentation data separate from company/legal records. A brand import should
not replace an organization's name, address, tax registration or contact information. Store
the profile with issued document snapshots so later brand changes do not restyle past output.

## Full document exports

```js
import { publicationModel } from 'brandkit/documentation'
import { publicationDocx, publicationHtml } from 'brandkit/documents'
import { createNodeRenderer, pdfFromDocx } from 'brandkit/documents/node'

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
