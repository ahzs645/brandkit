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
| Optional provider logo | A supplied original PNG or JPEG when it should be used instead of the provider definition's reconstructed logo. |

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
  --provider /path/to/firstform/brand.json \
  --client /path/to/ddcnorth/brand.json \
  --out .handover/ddc-north \
  --paper letter \
  --pdf \
  --provider-logo /path/to/firstform/docs/brand-details-assets/logo-black.png
```

The installed CLI form is:

```text
brandkit handover <record.json> --provider <brand.json> --client <brand.json> --out <dir>
  [--paper letter|a4] [--pdf] [--issue] [--provider-logo <original PNG>]
```

US Letter is the default. `--pdf` requests a PDF alongside the editable Word document and
printable HTML for each publication. Omit the logo option to use the provider brand's normal
artwork. A supplied logo changes its placement in these service documents; it does not replace
the logo in either source brand definition.

## Output package

| Output | Purpose |
| --- | --- |
| `welcome-guide.publication.json`, `.html`, `.docx` | The complete website handover, with the provider's document styling. |
| `quick-start.publication.json`, `.html`, `.docx` | A short reference for the main website links, access and support. |
| `brand-reference.publication.json`, `.html`, `.docx` | The client's identity, supplied artwork, colours, type and use guidance. |
| Matching `.pdf` files | Shared print snapshots, when `--pdf` is requested. |
| `index.html` | A local entry page for the package's documents. |
| Source snapshots | The operational record and provider/client definitions used for this build. |
| `manifest.json` | The build record and output inventory. |

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
figures for the client brand reference. Existing publication image rules still apply.

The Node build interface is available from `brandkit/handover/node`:

```js
import { buildHandover } from 'brandkit/handover/node'

const manifest = await buildHandover({
  recordPath: 'examples/managed-site/ddc-north.json',
  providerPath: '/path/to/firstform/brand.json',
  clientPath: '/path/to/ddcnorth/brand.json',
  outDir: '.handover/ddc-north',
  paper: 'letter',
  pdf: true,
  issue: false,
  providerLogoPath: '/path/to/firstform/docs/brand-details-assets/logo-black.png'
})
```

`sourceRevision` may also identify the code revision used for the build. It must describe the
actual source being run; a published brand-pack hash does not establish a source repository's
current commit.

## Sources for the supplied example

The example's identities come from the published
[builds catalog](https://projects.ahmadjalil.com/builds/configs/brandkit/catalog.json), not from
an invented First Form style. The retrieved pack bytes matched the catalog:

| Identity | Published pack | Bytes | SHA256 |
| --- | --- | ---: | --- |
| First Form 1.0 | [firstform.zip](https://projects.ahmadjalil.com/builds/configs/brandkit/firstform.zip) | 1,256,812 | `33da87dce6b4989d31132a0dd7a681fb2caa7a5debe313633135a79aaf48e30f` |
| DDC North 2.3 | [ddcnorth.zip](https://projects.ahmadjalil.com/builds/configs/brandkit/ddcnorth.zip) | 3,361,894 | `6e2704d184707bac7f3e88b072fc76ddc24d8aed15cfd0044d9bea8a3e2a88e7` |

The retrieved catalog itself had SHA256
`3b8362dc55fd4dc8ec920293f02cbe36edcb992d06718b198ec78dbcb7448cda`. These hashes identify
the input snapshot; a later catalog or pack may legitimately differ.

Brandkit's source documentation identifies `1stform/design-system` as First Form's authoring
repository. Direct access to that repository was unavailable during preparation, so its
current `main` revision and instructions were not verified. The published pack is the source
used here.

First Form's pack explains that its generated vector wordmark uses Sora Bold as an
approximation of the original lettering. The example therefore supplies the original
`docs/brand-details-assets/logo-black.png` for the provider's logo placement. That 372 × 226 px
PNG has SHA256 `c5f73403ac5113e1ec03f1922311a82be59d265440a0dc4e50a16809a9fffd08`, matching
the pack's `reference/PROVENANCE.json`. Keep its displayed size appropriate for its resolution.
This choice preserves the supplied original appearance without silently claiming that the
reconstructed vector is the original master.

DDC North's current `brand.json` retains the supplied custom wordmark and the six-dot symbol.
Use that artwork and its current palette and typography. Its copied README retains older
version and guide-page counts; the example uses the current v2.3 definition. The separate
six-dot reference image is evidence for the symbol, not a replacement source for the lettering.
