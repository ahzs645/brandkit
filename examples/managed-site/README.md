# Managed website handover examples

These records demonstrate a reusable client package for a website managed by First Form.
The operational record is separate from the provider and client brand definitions, so another
client can use the same document workflow with its own identity and service arrangements.

| File | Use |
| --- | --- |
| [`template.json`](template.json) | A blank record with `kind: "template"`, `status: "draft"` and unconfirmed access. Copy it for a new client. |
| [`ddc-north.json`](ddc-north.json) | An illustrative First Form provider / DDC North client example, with `kind: "example"` and `status: "draft"`. |

The DDC North record uses `.example` URLs and email addresses. They are not working login or
support destinations. Costs, account ownership, service hours, response commitments, care,
rights and review details remain empty where they have not been confirmed. The example does
not claim that First Form offers a particular authentication method or has completed this
client delivery.

## Build the example

Obtain the published First Form and DDC North packs from the
[builds catalog](https://projects.ahmadjalil.com/builds/configs/brandkit/catalog.json). Keep their
definitions and assets together. The main [handover documentation](../../docs/managed-site-handover.md#sources-for-the-supplied-example)
records the exact input versions and hashes used for this example.

From the repository root, replace the input paths below with the extracted pack locations:

```sh
node bin/brandkit.mjs handover examples/managed-site/ddc-north.json \
  --provider /path/to/firstform/brand.json \
  --client /path/to/ddcnorth/brand.json \
  --out .handover/ddc-north \
  --paper letter \
  --pdf \
  --provider-logo /path/to/firstform/docs/brand-details-assets/logo-black.png
```

The three publications are `welcome-guide`, `quick-start` and `brand-reference`. Each is
exported as a `.publication.json` source model, printable `.html` and editable `.docx`.
`--pdf` adds corresponding PDFs. The output also contains `index.html`, source snapshots and
`manifest.json`.

First Form styles the welcome guide and quick-start sheet. DDC North styles the client brand
reference. The supplied original First Form PNG is used because the published pack labels its
vector wordmark as an approximation. This does not alter the provider's `brand.json` or redraw
either logo.

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
