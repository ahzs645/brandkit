# Documents from a brand

The documentation system applies each brand's own artwork, colours and font roles to editable
publications. It adds document applications without modifying `brand.templates`, `brand.json`,
logo geometry or the existing identity exports.

Every built-in brand has US Letter and A4 profiles and six reusable layouts. Product overviews,
project reports, decision briefs and brand portfolios use the same content model for Word and printable HTML.
The examples contain instructional text and a labelled screenshot placeholder; they do not
claim that a fictional product exists or that work has been delivered to a client.

## Start with the selected brand

The source-facing `brands/<id>/USE.md` guide names the preferred artwork, explains its provenance,
lists the actual template dimensions, and describes the correct edit path. It links directly to
the selected brand rather than the general brand selector.

The existing kit already supplies SVG, PNG and PDF logo exports, font files and their licences.
The document system selects from those assets. It does not trace a new logo or retype a wordmark.
`documentationGuide(brand)` provides the same usage guidance as structured data.

## Profiles and content are separate

```js
import {
  documentProfile,
  publicationModel,
  publicationLayouts,
  documentationGuide,
  validatePublication
} from './src/engine/documentation.js'

const profile = documentProfile(brand, { paper: 'letter' })
const publication = publicationModel(brand, {
  paper: 'letter',
  purpose: 'product',
  values: {
    title: 'Digital forms and document workflows',
    subtitle: 'Product capabilities and supported scope',
    edition: 'October 2026',
    introduction: 'Use verified product copy here.',
    productName: 'PDF Forms',
    detail: 'Describe the actual supported workflow here.',
    scope: 'Record supported inputs, outputs and environment requirements.',
    figure: {
      src: 'data:image/png;base64,...',
      alt: 'Describe the interface and visible action.',
      caption: 'Explain what this capture demonstrates.',
      provenance: 'Application capture, version and capture date'
    }
  }
})

const problems = validatePublication(publication)
if (problems.length) throw new Error(problems.join('\n'))
```

The abbreviated image data above must be replaced with actual PNG or JPEG bytes. Omit `figure`
to retain a visibly labelled placeholder. Neither the model nor its exporter fetches screenshots
from an external URL.

`publicationLayouts()` returns metadata for `cover`, `content`, `product`, `screenshot`,
`comparison` and `closing`. Page kinds are layout roles: a report's `product` page is a
workstream detail, and a brief's is a proposed approach. They do not turn every publication into
a product advertisement.

### Document profile

`documentProfile(brand, { paper: 'letter' | 'a4' })` is pure and returns:

| Property | Meaning |
| --- | --- |
| `paper` | `{ id, label, widthMm, heightMm }` in physical units |
| `margins` | `topMm`, `rightMm`, `bottomMm`, `leftMm` |
| `typography` | Title, subtitle, heading1, heading2, body, caption, table, label and footer styles |
| `colours` | Resolved ink, muted, accent, paper, light, line and reverse colours |
| `header`, `footer` | Default running text; historical labels remain explicit |
| `affiliation` | Department and subdepartment type sizes, wrapping, spacing and source-status note |
| `logo` | Supplied logo options, asset paths, width, minimum width, clear-space rule and provenance |
| `status` | Identity version, source, reconstruction status and document-extension label |
| `rules` | Print, screenshot, caption, copy, contact and editing guidance |

A type style contains `font` (the brand's font-role key), `family`, optional `office`, `weight`,
`italic`, `sizePt`, `lineHeight`, `spaceAfterPt` and `trackingEm`. The actual font weight comes
from the selected brand face. First Form therefore retains Sora SemiBold, Over the Edge retains
its serif display face and mono labels, and SPARK Lab retains Outfit with Source Serif 4.

The light document palette resolves semantic roles explicitly. A colour named **Ink** in a
palette is not necessarily the same as the semantic `ink` text role. Colours are not replaced
with another brand's default styling.

Logo `clearSpaceMm` is additional layout spacing. It does not redefine the brand's existing
clear-space rule. The complete supplied artwork and minimum size remain authoritative. A full
logo belongs on the cover; a running text header avoids shrinking a detailed logo below its
minimum width.

### Department and subdepartment naming

Publication values accept `affiliation: { department, subdepartment }`. The same names can be
supplied with flat `department` and `subdepartment` values when sharing values with ordinary
templates. Names are stored separately in the publication source, rendered as editable text
below the cover logo, and retained in Word custom properties. The supplied logo does not change.
A subdepartment requires its parent department; empty names are omitted. Each name is limited
to 180 characters. Whitespace is normalized, and text wraps at the available page width without
being condensed, clipped or reduced in size.

The default naming block uses 12 pt department text, 10.5 pt subdepartment text, 1.3 line height
and a 5 mm gap after the block. These are document application defaults. A brand may override
them through `documentation.affiliation` with `departmentSizePt`, `subdepartmentSizePt`,
`lineHeight`, `gapAfterMm` and a source-aware `note`. Type must be 8–24 pt; subdepartment text
cannot be larger than department text. Word carries reusable `AffiliationDepartment` and
`AffiliationSubdepartment` paragraph styles. Formal unit identifiers still require the approved
supplied artwork. UNBC's Communications and Marketing office supplies its departmental logos.

The Documents view shares the selected names with the Organization view and native template
fields. A downloaded publication source keeps its own names; importing it restores that
affiliation without rewriting the logo or the other document content.

### Optional brand overrides

Existing brands need no changes. An optional `brand.documentation` object can adjust document
applications while leaving identity geometry and existing templates alone:

```json
{
  "documentation": {
    "margins": { "topMm": 20, "rightMm": 18, "bottomMm": 18, "leftMm": 20 },
    "typography": {
      "title": { "font": "display", "sizePt": 32, "lineHeight": 1.12 },
      "body": { "font": "body", "sizePt": 10.5, "lineHeight": 1.45 }
    },
    "colours": { "paper": "white", "ink": "ink" },
    "logo": { "widthMm": 60, "clearSpaceMm": 8 },
    "header": { "text": "Document series" }
  }
}
```

Use only font roles and logo variants that belong to the brand. Colour references may be a
brand colour, semantic role or a six-digit hex value. Logo overrides use an `options` object
with the same supplied family/layout or signature/colourway identifiers as `logoDocument`.
Invalid font roles, missing logo variants, below-minimum logo sizes and unusable page margins
are rejected. Historical brands cannot remove their historical status through an override.

These overrides belong in the source generator for a built-in brand. They are ordinary editable
definition data in an exported standalone kit. Product descriptions, evidence and contact
details belong in a publication's source model, not the central identity definition.

## Editable publication model

`publicationModel(brand, { paper, purpose, values })` returns `schema: 'brandkit/publication/1'`,
metadata, the resolved profile, status, and six example pages. Each page has `id`, `kind`,
`title` and `blocks`. Page titles are also included as heading blocks; exporters should not
print the metadata title a second time.

| Block | Fields |
| --- | --- |
| `heading` | `text`, optional `level` 1–3, optional style such as `title` |
| `paragraph` | `text`, optional style such as `subtitle`, `label` or `caption` |
| `list` | `items` as text, optional `ordered` boolean |
| `table` | `headers`, rectangular `rows`, optional positive relative `widths`, optional `caption` |
| `figure` | Embedded PNG/JPEG `src` or `placeholder: true`, `alt`, `caption`, optional `provenance`, `widthMm`, `heightMm` |

Source models may add, remove or reorder pages using these six page kinds. The six-page example
is not a page-count limit. The Word and HTML exporters consume this shared model rather than
independently rewriting its content.

### Supported content values

Common values are `title`, `subtitle`, `edition` and `introduction`. More detailed values are:

- Summary: `summaryTitle`, `summary`, `summaryItems`.
- Detail: `detailTitle`, `productName`, `detail`, `scope`, `steps`.
- Evidence: `evidenceTitle`, `evidenceIntroduction`, `evidenceExplanation`, `figure`.
- Comparison: `comparisonTitle`, `comparisonIntroduction`, `comparison`, `comparisonConclusion`.
- Closing: `closingTitle`, `closing`, `nextSteps`, `notes`, `contact`.

List values are arrays of strings. `comparison` holds `headers`, `rows` and optional `widths`
and `caption`. `figure` holds the image fields above; supplied provenance is retained and added
to the generated caption. `contact` accepts name, role, organization, email, telephone, website
and address. Omitted values do not create a contact block. Bracketed contact placeholders are
not presented as real contact information. There is no default recipient or “Prepared for
[Client]” claim in a product overview.

The model carries `example: true` because the builder starts from an editable example. A custom
source model may remove that metadata after its content has been reviewed; it is not a
certification or an automated claim-verification mechanism.

### Purpose and claim language

`product` describes an offering and its supported scope. It must not imply previous delivery,
endorsement, compatibility or measured results without evidence. `report` explains actual
findings and distinguishes observation from interpretation. `brief` explains a proposed
decision and uses future or conditional language for work that has not occurred.
`portfolio` records the brand architecture, supplied identity assets, naming hierarchy and
document applications. Its examples explicitly separate official identity requirements from
layout defaults and do not claim that a generated departmental identifier is approved.

A brand may supply purpose-specific instructional defaults at
`documentation.examples.report`, `documentation.examples.portfolio`, and so on. Caller values
override those defaults. `documentation.defaultPurpose` chooses the initial purpose in the
Documents view; it does not silently change an API caller's requested purpose.

New purposes can be added deliberately in the shared model, with copy defaults and validation.
They should not be inferred from a brand name or silently substituted for an existing purpose.

### Validation and safe images

`validatePublication(model)` returns an array of readable problems. It does not throw when a
JSON editor contains an invalid structure. Keep the last working model until the new value
passes validation. It checks paper dimensions, profile values, page and block kinds, table
shape and relative widths, image bounds and retained historical status.

Figure sources are embedded `data:image/png;base64,...` or `data:image/jpeg;base64,...` strings
up to 25 MB, with matching file signatures. External URLs, file paths and SVG figure sources
are rejected. The kit's own logo is generated separately from its trusted brand definition.
Syntax validation does not replace reviewing the image or checking that its content supports
the claim in the caption.

## Existing templates and virtual documents

`templateCatalogMetadata(brand)` reads the actual template dimensions and print trim/bleed
values. The source use guides and First Form reference metadata use this output rather than
maintaining separate size lists.

`documentationDocumentsFor(brand)` returns additions to the existing `brand.documents` list:

- Eight virtual DOCX descriptors for product/report/brief/portfolio in Letter/A4. Each has
  `publication: true`, `purpose` and `paper`, and no template `pages`.
- DOCX mappings for existing letterhead templates that do not already have a document mapping.

The exporter dispatches a publication descriptor before looking up ordinary template pages.
This keeps the existing template and Office pipelines available without inserting six new
page layouts into every brand's identity definition.

## Historical brands

The Province of British Columbia 1977 and B.C.Hydro 1983 profiles retain their explicit
historical-reconstruction notices. The generated publications identify the page design as a
**modern document layout extension using a historical reconstruction**. They are not presented
as current official material or as reproductions of a historical report layout.

The logos, palette, font substitutions and identity notes remain those of their source
definitions. Generic example copy does not invent government decisions, utility products or
official contact details.

## Source maintenance and verification

```sh
node scripts/brands/documentation.mjs
node scripts/brands/documentation.mjs --check
```

The first command updates `brands/<id>/USE.md` for the registered brands and the marked
factual sections of First Form's reference HTML. The second checks that these generated
documents are current without writing. Pass one or more brand ids to limit the operation.
Neither command writes `brand.json` or changes identity artwork.

First Form's original-kit raster references remain preserved. Its reference page now
distinguishes those PNG inputs from the current SVG/PNG/PDF outputs, and card dimensions are
derived from the template trim and bleed data. Identity version and document-application
version are separately labelled.

After editing a publication, check the rendered result in both delivery formats. Confirm that
logos are complete, page titles fit, tables have readable columns, screenshots are legible,
captions stay with their images, and page breaks remain sensible. The editable Word document
is the maintained master; the PDF is the shared snapshot.

### Published document starters

The versioned publisher uses `documentation.publishedPurposes` when supplied; its default is
`["report"]`. UNBC publishes `["report", "portfolio", "brief"]` in both Letter and A4,
with a Word master, matching PDF, print preview and editable source for each. Release paths
record the identity version, document application version and source commit. Source changes
must be committed before the publisher runs, so a release cannot claim a stale revision.

For a working draft, the CLI accepts one purpose or a comma-separated selection:

```sh
node bin/brandkit.mjs documents brands/unbc/brand.json --paper both --purpose report,portfolio,brief --pdf --out .documentation/unbc-review
```

Use `--values` to supply the affiliation and report content, or `--content` to regenerate an
edited publication JSON. Export the current Word master again after making edits in Word.
