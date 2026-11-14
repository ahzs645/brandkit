# Managed website handover

Generate a welcome guide, quick-start sheet and client brand reference from one operational
record and two existing brand definitions. The provider's identity belongs to the service
documents; the client's identity belongs to the brand reference. The record describes the
website, access arrangements and ongoing service without changing either identity.

This workflow uses the existing `brandkit/publication/1` model and its Word and printable HTML
exporters. It does not introduce a second document layout engine. See
[Documents from a brand](documentation.md) for profiles, editable blocks and image rules.

## Inputs

| Input | What belongs in it |
| --- | --- |
| Handover record | Client and provider names, website links, the confirmed access method, everyday tasks, service responsibilities, support, renewals, care, rights and review details. |
| Provider `brand.json` | The provider's existing logo, colours, fonts and document profile. |
| Client `brand.json` | The client's existing identity and its asset-use guidance. |
| Optional provider logo | A supplied original PNG or JPEG when a provider needs a specific artwork override. First Form 2.0 uses its master-derived definition without this option. |

The record schema is `brandkit/managed-site-handover/1`. Start with
[`examples/managed-site/template.json`](../examples/managed-site/template.json), or use
`createHandoverTemplate()` to obtain a fresh blank record. Empty values mean unconfirmed
information. They do not mean a service is free, included or available around the clock.

The [DDC North example](../examples/managed-site/README.md) demonstrates First Form as the
provider and DDC North as the client. Its `.example` addresses are deliberately non-operational.
The example does not establish a completed project, a contractual relationship or a working
First Form login service.

## Build a draft

Run from the repository root, replacing the brand paths with the extracted definitions you
intend to use:

```sh
node bin/brandkit.mjs handover examples/managed-site/ddc-north.json \
  --provider /path/to/firstform-2.0/brand.json \
  --client /path/to/ddcnorth/brand.json \
  --out .handover/ddc-north \
  --paper letter \
  --cover \
  --pdf
```

For the uploaded First Form design-system source, use `dist/brand.json` after building it,
or `brand.json` at the root of the extracted locally built `firstform.zip`. Keep its fonts and
assets beside the definition. Do not use `source/kit/brand.json`: that is the archived 1.0
identity, not the current 2.0 definition.

The installed CLI form is:

```text
brandkit handover <record.json> --provider <brand.json> --client <brand.json> --out <dir>
  [--paper letter|a4] [--cover] [--pdf] [--issue] [--provider-logo <original PNG>]
  [--cover-variant hero|blocks|grid|index]
  [--source-revision <revision>]
```

US Letter is the default. `--pdf` requests a PDF alongside the editable Word document and
printable HTML for each publication. Omit the logo option to use the provider brand's normal
artwork. First Form 2.0 no longer needs the old 1.0 PNG override: its current horizontal
artwork follows the supplied master. A supplied logo changes its placement in these service
documents; it does not replace
the logo in either source brand definition.
The designed cover always draws the provider's own vector artwork; an original-logo override
applies to the standard document layout.

## Optional designed cover

`--cover` adds a designed front cover to the welcome guide and exports the same cover as a
standalone `front-cover` publication. `--cover-variant <id>` chooses the design (and adds the
cover without `--cover`). Without either option, a record whose `cover.variant` names a design
gets that design; otherwise `--cover` alone takes `hero`. With no option and no record choice,
the standard document opening is used. The practical information from that opening remains in
the guide after a designed cover is added.

| Stable ID | Design | Status |
| --- | --- | --- |
| `hero` | The provider's website on paper: the Ash bar with the black logo, one rounded Black panel with a small label at its top and the headline at its foot over the large-crop mark in Hairline, and a closing Ash panel with the client's logo on its White plate. | Recommended |
| `blocks` | Full-bleed Ink; the logo on its Ash plate; a flight of stacked blocks on the mark's 30° axis running off the right edge and foot. | Proposed |
| `grid` | A construction drawing: Ash with the isometric grid in White and the complete mark set on it in Black. | Proposed |
| `index` | Type alone: the headline, then the document's contents as the website sets its services (a name and one sentence under a rule), between the Ash bar and a closing Ash panel. | Proposed |

Each follows First Form 2.0's own rules (`docs/DESIGN.md` in the design system): sections
divided by space rather than boxes, panels with rounded corners, the page opening and closing on
Ash, client logos on a 3:2 White plate, labels in small capitals tracked 8% and headlines
tracked −2%. A client logo is never set below its minimum width: its plate widens (to 2:1 at
most) or, if it still cannot fit, the logo is left to the brand reference.

### Cover wording and other documents

The cover's words come from the record. Add an optional `cover` object to change them and to
choose the design, for a pack with its own title or contents:

```json
"cover": {
  "variant": "index",
  "kicker": "Project proposal",
  "title": "A new site\nfor the North.",
  "subtitle": "Scope, timeline and cost for the 2027 rebuild.",
  "sections": [
    { "title": "Scope", "description": "What the work covers." },
    { "title": "Timeline", "description": "When each part is ready." }
  ]
}
```

Every field is optional; one left out keeps the welcome pack's wording. The pages after the
cover are still the welcome guide. To open another brandkit publication (a report or brief made
in Documents) with one of these covers, make it with `createWelcomeCover` from
`brandkit/handover/cover` and put it on the publication's first page as
`{ kind: 'cover', cover, blocks: [] }`: `publicationDocx` and `publicationHtml` draw it there. `sections` (one to
four) are used by `index` only. The client's name, the provider's name, the date and the
edition always come from the record, so a cover cannot claim a different client or an issued
status.

### How a cover is made

A cover is one page-sized image of everything but its words (grounds, panels, the supporting
graphic and both logos, drawn from the two brand definitions at 300 dpi) and a frame for each
piece of wording, placed on the page in millimetres. In Word the image floats behind the page
from the cover section's header and each frame is a positioned paragraph of native text in the
provider's faces; in HTML the image fills the page and the frames are positioned text that
scales with it. Long titles are measured in the provider's own fonts and set from the panel's
foot upward, so the last line keeps its place. Keep the provider's fonts available when
editing and recheck the page after changing its wording.

## Output package

| Output | Purpose |
| --- | --- |
| `welcome-guide.publication.json`, `.html`, `.docx` | The complete website handover, with the provider's document styling. |
| `quick-start.publication.json`, `.html`, `.docx` | A short reference for the main website links, access and support. |
| `brand-reference.publication.json`, `.html`, `.docx` | The client's identity, supplied artwork, colours, type and use guidance. |
| `front-cover.publication.json`, `.html`, `.docx` | The standalone designed cover, when a cover is requested; the same cover also opens the welcome guide. `assets/cover-artwork.svg` is its artwork as a vector. |
| Matching `.pdf` files | Shared print snapshots, when `--pdf` is requested. |
| `index.html` | A local entry page for the package's documents. |
| Source snapshots | The operational record and provider/client definitions used for this build. |
| `manifest.json` | The build record and output inventory, with the existing `cover` schema field and a separate `coverVariant` ID; both are `null` for a standard opening. |

Keep the record and source snapshots with the maintained document files so the next edition
can be rebuilt. Make operational changes in the handover record. Make identity changes in the
brand's supported source, then supply the updated definition. Editing a generated document
does not write its content back into the operational record.

The brand reference is a guide to the client's identity. Deliver the agreed asset kit as well;
a guide mentioning a logo file does not itself deliver every logo, font or editable template.

## Confirm the managed service arrangement

Record account ownership, day-to-day management and billing separately for each service. A
managed website can remain on the provider's platform while the client uses the role agreed
for their work. Domain registration, DNS and business email may have different owners and
operators. The handover should make those distinctions readable.

Choose the actual `access.method`: `invitation`, `password`, `sso`, `passwordless`,
`managed-only`, or `unconfirmed` while drafting. For `managed-only`, explain how the client
requests changes; do not invent a dashboard account. For other methods, document the permanent
login page, account label, role, setup steps and recovery route. Invitation expiry and sender
details must match the real account system. Only describe a forced first-login password change
or multifactor setup after verifying that it is supported and configured.

Use the existing agreement when filling in included work, costs, renewal responsibility,
support hours, first-response targets, urgent contact arrangements, backups, restoration,
export options and ownership or licence rights. A response target and a resolution commitment
are different facts. Record a service that is not included explicitly instead of leaving the
client to infer its status.

## Review and issue readiness

A normal build is always a draft, including when the input record has `status: "ready"`.
Use `--issue` only after checking the real client details and the rendered package.

Issue validation requires:

- `kind: "client"` and `status: "ready"`.
- The required operational information, including a confirmed access method and service terms.
- Completed task, service and asset entries.
- A reviewer and review date in `review.checkedBy` and `review.checkedOn`.
- Removal of placeholder text, demonstration addresses and incomplete required values.

The checked fields vary with the access method. For example, a managed-only service does not
need a client login URL, while an invitation-based account needs its invitation details.

`handoverProblems(record, { forIssue: true })` reports missing or invalid information.
Validation checks structure, link formats and completeness. It cannot establish that an
agreement is accurate, a person can sign in, a support channel is staffed, or a backup can be
restored. Check those facts before marking the record ready. The `--issue` flag builds a
package; it does not send it to the client or publish a website.

Review the final HTML, Word and PDF outputs at their delivery sizes. Check logo proportions,
page breaks, table columns, long URLs and every screenshot. Test the actual client workflow
and verify that the delivered links can be opened using the intended client access.

## Credentials and sharing

Keep passwords, recovery codes, API keys, private keys, one-time invitations, reset links and
other account secrets out of the record, source snapshots and exported publications. A
permanent login URL and account label are sufficient for the guide. Deliver an invitation or
temporary credential through the account system or the separately agreed secure route.

The record validator rejects unsupported fields, recognizable credential material and secret
data in links. These checks cannot recognize every secret hidden in free text. Review the
content before distributing the complete output folder, especially its source snapshots.

Brandkit's public `?share=1` view is a presentation mode, **not access control**. The generated
`index.html` is also a static entry page. If the package contains client-only contacts or
operational information, place it in the client's approved private delivery location. A public
brand-asset viewer can still be linked separately when those assets are intended for public use.

## JavaScript interfaces

The `brandkit/handover` package subpath exports the record helpers and the publication builder:

```js
import {
  HANDOVER_SCHEMA,
  createHandoverTemplate,
  handoverProblems,
  assertHandover,
  handoverPublications
} from 'brandkit/handover'

const record = createHandoverTemplate()
// Fill this record with the client information and load the two brand definitions.
const problems = handoverProblems(record)
assertHandover(record)

const publications = handoverPublications(record, {
  providerBrand,
  clientBrand,
  paper: 'letter',
  forIssue: false
})
```

`handoverProblems()` returns an array of readable problems. `assertHandover()` returns the
record or throws. `handoverPublications()` returns `{ welcome, quickStart, brandGuide }`;
each value uses `brandkit/publication/1`. Its optional `providerLogo` is an embedded PNG/JPEG
figure. Optional `brandFigures.logoVariants` and `brandFigures.palette` supply corresponding
figures for the client brand reference. The optional `welcomeCover` value uses
`brandkit/welcome-cover/2`: its `variant` (one of the stable IDs above) and `paper`, the page
`artwork` as an embedded PNG in the page's proportions, the wording fields (`kicker`, `title`,
`subtitle`, `clientName`, `preparedBy`, `dateText`, `status`, and `sections` for `index`) and
the `frames` that place them. Frames name fields rather than holding text, so the fields stay
the source of the wording. `WELCOME_COVER_VARIANTS`, `DEFAULT_COVER_VARIANT` and
`welcomeCoverVariant(id)` are exported from `brandkit/handover` for catalog access and exact
ID validation; omitted selection resolves to `hero`.

The Node build interface is available from `brandkit/handover/node`:

```js
import { buildHandover } from 'brandkit/handover/node'

const manifest = await buildHandover({
  recordPath: 'examples/managed-site/ddc-north.json',
  providerPath: '/path/to/firstform-2.0/brand.json',
  clientPath: '/path/to/ddcnorth/brand.json',
  outDir: '.handover/ddc-north',
  paper: 'letter',
  coverVariant: 'hero',
  pdf: true,
  issue: false
})
```

This example selects a design explicitly. `cover: true` without `coverVariant` takes the
record's `cover.variant`, or `hero`; `coverVariant` alone enables the selected cover. The returned manifest records
that choice separately from its cover schema version.

`sourceRevision` may also identify the code revision used for the build. It must describe the
actual source being run; a published brand-pack hash does not establish a source repository's
current commit.

## Sources for the supplied example

Edition 2 of the DDC North example is dated `2026-11-13`, the client's local preparation date.
Its provider identity comes from the uploaded `design-system-main.zip` source snapshot for
`1stform/design-system`. The upload supplies the current First Form 2.0 definition and its
master-artwork provenance. It supersedes the earlier 1.0 published-pack fallback used for the
first draft. The client's DDC North identity remains the published 2.3 pack.

| Input | Origin | Bytes | SHA256 |
| --- | --- | ---: | --- |
| First Form source snapshot | Uploaded `design-system-main.zip` | 4,223,586 | `023a26fd57414dd20cbd13b00c88d688865e88fa2bc9e24aa10f185347f4ab66` |
| First Form 2.0 asset pack | Locally built `release/firstform.zip` from that upload | 2,911,364 | `73d09a1561bf81f1fb7d78a6c0a3266db1d1bfb2a1d94cf0b7391a747508167a` |
| DDC North 2.3 asset pack | [Published ddcnorth.zip](https://projects.ahmadjalil.com/builds/configs/brandkit/ddcnorth.zip) | 3,361,894 | `6e2704d184707bac7f3e88b072fc76ddc24d8aed15cfd0044d9bea8a3e2a88e7` |

The DDC North pack matched its entry in the retrieved
[builds catalog](https://projects.ahmadjalil.com/builds/configs/brandkit/catalog.json). These
hashes identify the inputs used here; later source snapshots and packs may differ.

The uploaded source has no verified Git HEAD. Its local build correctly records
`sourceCommit: "uncommitted"`; that marker is not a commit SHA. This is a local build from the
upload, not a published GitHub release. The design-system package version is `0.5.0`, while
the canonical identity version in `brand.json` is `2.0`; those version numbers describe
different things. Do not use the upload hash or asset-pack hash as `--source-revision` for
Brandkit itself.

The local asset pack was built using the source's pinned dependencies and `npm run check`.
All 21 source-package tests passed, including master geometry, archive integrity, font and
licence hashes, local links, TypeScript consumer compilation and deterministic re-archiving.
The pack includes the First Form licence and Sora OFL notice. The non-release Illustrator
master and Gilroy font files are excluded. These source-package checks do not verify client
access or complete the handover's issue-readiness review.

First Form 2.0 uses the supplied cube-F mark and lowercase `first / form` wordmark outlined
from the master. The horizontal vector artwork is exact to that source; Sora remains the
document typeface. Use `dist/brand.json` or the extracted built pack's root `brand.json` with
its companion assets. The 1.0 two-block identity is retained only under the source kit and
release's `legacy/1.0/` archive. Do not select it for this example or apply its old logo override.

The source marks the stacked lockup and small-size mark as derived and awaiting approval.
Its supporting studies have their own review status. The covers use the primary
horizontal logo and the standard mark, never the derived stacked or micro artwork. `hero` uses
the source's large-crop pattern as the website's hero does; `grid` sets the complete mark on its
isometric grid; `blocks` draws the stacked blocks; `index` is type alone. These document
compositions do not change the source approval records.

DDC North's current `brand.json` retains the supplied custom wordmark and the six-dot symbol.
Use that artwork and its current palette and typography. Its copied README retains older
version and guide-page counts; the example uses the current v2.3 definition. The separate
six-dot reference image is evidence for the symbol, not a replacement source for the lettering.
