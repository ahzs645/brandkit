# Brand packs

brandkit is an engine; brands are data it opens. A **brand pack** is one zip holding a brand and
everything it needs, so a brand can be kept, versioned and hosted apart from the engine and opened
in any copy of brandkit by a link.

## What a pack holds

```
brandkit-pack.json   the manifest (below)
brand.json           the definition (docs/brand-schema.md)
…                    every other file in the brand's folder, at the same paths
```

A pack is still a brand folder zipped: anything that opens one of those (**Open…**, `brandkit
build`) opens a pack. The manifest adds what a folder cannot say:

| Field | |
| --- | --- |
| `format`, `version` | `"brandkit-pack"`, `1`. A brandkit that reads an older version refuses a newer pack instead of half-reading it. |
| `id`, `name`, `brandVersion` | From `brand.json`; `id` must match it. |
| `extension` | A brand extension the app provides by name (`src/extensions/`). Packs carry no code. |
| `menuLogo` | The brand menu's logo, a path in the pack (`logo-menu.svg`, from `scripts/menu-logos.mjs`). |
| `files` | `{ count, bytes }` of the brand's folder before packing. |
| `aliases` | `{ path: "other/path" }` for a file the brand keeps at several paths: zipped once, read at every path. `"library:fonts/…"` names a file in brandkit's `library/` with the same bytes. |
| `library` | `{ path: sha256 }` for files left out because brandkit's `library/` has them, byte for byte, at the same path. |
| `pages` | `{ "book/page": [[kind, id, label], …] }`: the manual pages the brand's templates, signatures and guide pages cite, so the manual library can link to the brand before it is installed. |

## Making packs

```sh
node scripts/pack.mjs <brand folder or folder of brands>… --out dist/packs [--name "Catalog name"] [--base-url https://host/path/]
```

For each brand it writes `<id>.zip` and `<id>.logo.svg`, then `catalog.json`. The command imports
only fflate and Node (`src/pack/build.js`, `src/pack/cli.js`), so a host can pack brands without
installing the rest of brandkit's dependencies.

What a pack leaves out, so it is no bigger than it has to be:

- **Library files.** A file byte for byte the same as one in `library/` (the open-licence Inter
  and Space Mono the starter uses) is served from the app, which every visitor already has.
- **Duplicates.** A file the brand keeps at several paths is zipped once (`aliases`).
- **History and repository clutter.** `history/`, dotfiles and `node_modules/`.

Images, fonts, PDFs and other compressed formats are stored as they are; text, SVG and JSON are
deflated at the highest level. Entries are sorted and dated 1980-01-01, so the same folder always
makes the same bytes and the same SHA-256: an unchanged brand is never downloaded again.

## Catalogs

```json
{
  "format": "brandkit-catalog",
  "version": 1,
  "name": "Our brands",
  "packs": [
    { "id": "harbour", "name": "Harbour & Co", "url": "harbour.zip", "sha256": "…", "bytes": 1234567,
      "brandVersion": "1.0", "description": "…", "menuLogo": "harbour.logo.svg", "pages": {} }
  ]
}
```

`url` and `menuLogo` resolve against the catalog's own address, so a folder of packs can be served
from anywhere. `sha256` is how the app knows a pack has changed.

The app reads the catalogs in `VITE_BRANDKIT_CATALOGS` (space- or comma-separated URLs, set when
the site is built) and any added in the browser (`?catalog=<url>`, or **Brands → Catalogs**). Their
brands appear in the brand menu under **Available to add**; choosing one, or arriving with
`?brand=<id>`, downloads and installs it. The last copy of each catalog is kept, so the menu still
lists its brands offline.

## In the browser

`src/app/pack-store.js` keeps installed packs in IndexedDB (`brandkit-packs`):

- `blobs`: one record per distinct file, keyed by its SHA-256. Two brands that ship the same font,
  or two versions of one brand, share it.
- `packs`: one record per brand: where it came from (`url`, `catalog`, the response's `etag`), its
  pack's SHA-256 and size, its menu logo, its manual-page index, and `files`: path → SHA-256.

Installing stores only the files not already there. Updating replaces the record, then deletes
files no record names; removing does the same. **Brands** shows what the brands take, what sharing
files saves, and offers to ask the browser to keep the brands when it is short of space
(`navigator.storage.persist()`).

Files are read when they are drawn or downloaded: IndexedDB returns Blobs backed by disk, and each
is given a URL typed by its extension.

### Pages at real addresses

A pack's pages (a brand-details page, a website, a motion library) lean on what is around them:
images beside them, stylesheets and scripts, fonts in `../fonts/`, other pages. So pages are not
given `blob:` URLs, which have no folder around them, but real addresses:

```
<base>packs/<brand id>/<path in the pack>
```

`public/pack-sw.js`, a service worker scoped to `<base>packs/`, answers them from the same
IndexedDB store, typed by extension. A path the pack does not hold is looked for in brandkit's
library (served by path at `<base>library/`, listed in `<base>library/index.json`); anything else
is a 404. The worker's scope keeps it out of the app's own requests, so it only serves documents
opened there (a link, the Motion stage's frame) and what they load. Where a service worker cannot
run (a private window that refuses them, an insecure origin), pages fall back to `blob:` URLs.

Pages from a pack run at the app's origin, as they did from `blob:` URLs: install packs from
catalogs and links you trust.

## Hosting

Any static host works. A pack on another origin needs `Access-Control-Allow-Origin` (GitHub Pages
sends `*`). Send an `ETag`: a revisit to a `?url=` link revalidates through the browser's cache and
skips an unchanged pack. Packs are limited to 160 MB.

A link that opens a pack: `https://brandkit.example/?url=https%3A%2F%2Fhost%2Fbrands%2Fharbour.zip`.
A shared link (`&share=1`) keeps naming its pack, so it works in a browser that cannot store it.
