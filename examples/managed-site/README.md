# Managed website handover examples

These records demonstrate a reusable client package for a website managed by First Form.
The operational record is separate from the provider and client brand definitions, so another
client can use the same document workflow with its own identity and service arrangements.

| File | Use |
| --- | --- |
| [`template.json`](template.json) | A blank record with `kind: "template"`, `status: "draft"` and unconfirmed access. Copy it for a new client. |
| [`ddc-north.json`](ddc-north.json) | Edition 2 of the illustrative First Form provider / DDC North client example, dated `2026-11-13` in the client's local date, with `kind: "example"` and `status: "draft"`. |

The DDC North record uses `.example` URLs and email addresses. They are not working login or
support destinations. Costs, account ownership, service hours, response commitments, care,
rights and review details remain empty where they have not been confirmed. The example does
not claim that First Form offers a particular authentication method or has completed this
client delivery.

## Build the example

Use the First Form 2.0 pack built locally from the uploaded `design-system-main.zip`, together
with the published DDC North 2.3 pack from the
[builds catalog](https://projects.ahmadjalil.com/builds/configs/brandkit/catalog.json). First Form
2.0 is the identity version; `0.5.0` is the design-system package version. Keep each definition
and its assets together.

For First Form, select either the uploaded source's built `dist/brand.json` or the root
`brand.json` in the extracted locally built `firstform.zip`. Do not select
`source/kit/brand.json`, which contains the archived 1.0 identity. The main
[handover documentation](../../docs/managed-site-handover.md#sources-for-the-supplied-example)
records the source-upload and local-pack hashes, the 21 passing source-package checks and
the DDC North pack provenance. The upload has no verified Git HEAD; its build records
`sourceCommit: "uncommitted"` and is not presented as a published GitHub release.

From the repository root, replace the input paths below with the extracted pack locations:

```sh
node bin/brandkit.mjs handover examples/managed-site/ddc-north.json \
  --provider /path/to/firstform-2.0/brand.json \
  --client /path/to/ddcnorth/brand.json \
  --out .handover/ddc-north \
  --paper letter \
  --cover \
  --pdf
```

The three publications are `welcome-guide`, `quick-start` and `brand-reference`. Each is
exported as a `.publication.json` source model, printable `.html` and editable `.docx`.
`--cover` adds a designed cover (the recommended `hero`) to the welcome guide and a standalone
`front-cover` publication in the same formats. `--pdf` adds corresponding PDFs, including
`front-cover.pdf`. The output also contains `index.html`, source snapshots and `manifest.json`.

To review a different cover, replace `--cover` with `--cover-variant <id>` and use a new output
directory. The variant option enables the cover itself; it can also be used with `--cover`.

| Stable ID | Design |
| --- | --- |
| `hero` | Recommended: the website's home page on paper. Ash bar, rounded Black panel with the large-crop mark, closing Ash panel with the client's plate. |
| `blocks` | Full-bleed Ink with a flight of stacked blocks on the 30° axis. |
| `grid` | Ash construction drawing: the complete mark on its isometric grid. |
| `index` | Type alone: the headline and the pack's contents as a ruled list. |

A record can choose its own with `cover.variant`, and change the cover's wording with
`cover.kicker`, `cover.title`, `cover.subtitle` and `cover.sections` (see
[docs/managed-site-handover.md](../../docs/managed-site-handover.md#cover-wording-and-other-documents)).
Each build records its choice in `manifest.coverVariant` and in the cover's publication model. Without either cover option,
the standard document opening remains in use and the manifest's cover fields are `null`.

First Form styles the welcome guide and quick-start sheet. DDC North styles the client brand
reference. The current First Form horizontal vector logo follows the supplied 2.0 master;
the original 1.0 PNG override is no longer needed.

The covers are full pages in First Form 2.0's own rules, with the DDC North logo on its White
plate (widened slightly to keep it above its 55 mm minimum). They are document compositions
for review, not previously approved brand applications, and use neither the derived stacked
logo nor the micro mark. In Word every word on the cover is native editable text over one
image of the page's artwork. Keep Sora installed and check the page after editing.

Open the output `index.html` to review the package. Print the quick-start sheet separately if
the client would benefit from a desk reference. Check the Word and PDF pagination before
distributing the final version.

## Prepare a real client record

1. Copy `template.json` to a client-specific file and give it a stable `id`.
2. Fill in the provider and client names and the matching `brandId` values. Supply the
   corresponding brand definitions to the build command.
3. Confirm the website address, whether the client signs in, the account role, setup steps
   and recovery process. Use `managed-only` when the service provides change requests rather
   than a client dashboard.
4. Record the actual task instructions, service owners, managers, billing, renewal details,
   ongoing care, support and asset delivery links. Use the existing agreement for scope and
   rights; explicitly record services that are not included.
5. Build a draft and review the rendered documents. Check the actual client workflow and
   access to the delivered links.
6. After review, set `kind` to `client`, `status` to `ready`, and fill in `review.checkedBy`
   and `review.checkedOn`. Build with `--issue` to apply the completeness checks.

The included template and example intentionally fail `--issue`. A normal build remains a
draft even if its input says `ready`. Passing the issue checks confirms required fields and
formats, not the truth of the service promises or the availability of a live account.

Keep credentials, one-time activation links, recovery codes and account secrets outside the
record. The output includes source snapshots as well as the visible documents. Deliver any
access invitation separately through the agreed account process.

Brandkit's `?share=1` view and the generated static package page do not provide access control.
Use the client's approved private delivery location for client-only information. A public
brand-kit link can be shared separately where the underlying assets are intended to be public.

For the schema, API, output contract and input provenance, see
[Managed website handover](../../docs/managed-site-handover.md).
