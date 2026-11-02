# Brand packs

brandkit is an engine; brands are data it opens. A **brand pack** is the portable form of a brand:
one zip holding its definition and every file it uses, so a brand can be kept, versioned and hosted
apart from brandkit and opened in any copy of it. One brand, northwind, is built in; every other
brand arrives as a pack.

- [Opening a brand](#opening-a-brand): drag and drop, choose a file, a link, a catalog
- [What happens to it](#what-happens-to-it): kept, reopened, updated, shared, removed
- [The format](#the-format): what a pack holds, the manifest, the rules a reader applies
- [Making packs](#making-packs): the command, what it leaves out, `.packignore`
- [Catalogs](#catalogs) and [hosting](#hosting)
- [In the browser](#in-the-browser): storage, and pack pages at real addresses
- [When something goes wrong](#when-something-goes-wrong)
- [From code](#from-code)

## Opening a brand

Every way in takes the same files:

| You have | It opens as |
| --- | --- |
| A **brand pack** (`<id>.zip`, made by `brandkit pack`) | The brand, with every file. Kept in this browser. |
| A **brand folder, zipped** (any zip with a `brand.json`; the shallowest one wins) | The brand, with the files in that folder. Kept in this browser. |
| A **downloaded kit** (the zip from **Download kit**, whose definition is `source/brand.json`) | The brand, with the kit's files. Kept in this browser. |
| A **`brand.json`** on its own | The brand, for this visit, with brandkit's own fonts for any it does not carry. **Edit brand → Save** keeps its definition. |

A brand whose id is northwind's is refused (give it an id of its own). Opening a brand whose id is
already kept here replaces the kept copy: that is how a newer version is taken.

### Drag and drop

Drag the file from your desktop or file manager anywhere onto brandkit. While it is over the page,
**Drop to add a brand** shows where it will go; let go and the brand opens, on its Overview.

The page-wide drop stands aside where other parts of the app take files: a file dropped onto a file
field (a document's screenshot, a template's photo) goes to that field, images are never taken as
brands, and it is off in **Template Printer** (whose zips are card packages, not brands) and in a
shared view. Dropping something that is not a brand says so and changes nothing.

### Choose a file

**Open…** in the header (on a phone, **⋯ → Open a brand…**), or **Brands → choose a file**, opens
the system file picker for a `.zip` or `.json`. It is the same as dropping the file.

### A link

Put the pack's address after `?url=`:

```
https://projects.ahmadjalil.com/brandkit/?url=https://projects.ahmadjalil.com/builds/configs/brandkit/unbc.zip
```

brandkit downloads it (showing progress), keeps it and opens it, then takes `url` out of the
address so a reload does not fetch it again. Following the same link later opens the kept copy
after asking the host whether the pack has changed: a host that sends an ETag (see
[Hosting](#hosting)) answers without the pack being downloaded or stored again. **Brands → Add from link** does the same for
an address you paste. The address must be `http(s)`, and a pack on another site has to allow
cross-origin requests (see [Hosting](#hosting)).

### A catalog

A catalog is a list of packs a site hosts. The brandkit site offers its catalog's brands in the
brand menu, under **Available to add**, and in **Brands**: choosing one downloads and opens it.
`?brand=<id>` does the same on arrival, so a link to `?brand=unbc` opens UNBC for anyone. Add
another catalog with `?catalog=<address>` or **Brands → Catalogs**; it is remembered in that
browser. See [Catalogs](#catalogs).

## What happens to it

- **Kept.** A brand opened from a zip is stored in the browser (IndexedDB). It is listed under
  **In this browser** in the brand menu and opens after a reload, offline, without a download.
  The browser may clear site storage when it is short of space; **Brands → Ask to keep these
  brands** asks it not to.
- **Shared files are stored once.** Two brands that use the same font, or two versions of one
  brand, keep one copy. **Brands** shows what the brands take and what that saves.
- **Updated.** A brand from a catalog whose pack has changed is marked **update** and is updated
  when you open it, or with **Brands → Update**. If the update cannot be downloaded, the kept copy
  opens and says so.
- **Shared.** **Share** gives a link for the brand's users. A brand from the site's catalog shares
  as `?brand=<id>&share=1`; any other pack brand also carries its pack's address (`&url=`), so the
  link opens it in a browser that has never seen it. A brand opened from a file has no address to
  share: host the pack first.
- **Removed.** **Brands → Remove** (or **Edit brand → Remove … from this browser**) deletes the
  brand and any edits saved to it, and frees the files no other kept brand uses.

## The format

A pack is a zip:

```
brandkit-pack.json   the manifest
brand.json           the definition (see brand-schema.md)
…                    every other file the brand uses, at the same paths as in its folder
```

It is still a brand folder zipped, so anything that opens one of those opens a pack, and a pack
unzipped is a brand folder `brandkit build` can work from. The manifest adds what a folder cannot
say about itself:

| Field | |
| --- | --- |
| `format`, `version` | `"brandkit-pack"` and `1`. A brandkit reading a pack of a newer version refuses it rather than half-read it. |
| `id`, `name` | The brand's id and name, as in `brand.json`; `id` must match it. |
| `brandVersion` | The brand's own version (`displayVersion`, or `version`), for lists. |
| `createdAt` | Optional. Left out by `brandkit pack`, so packs stay byte for byte reproducible. |
| `extension` | A brand extension the app provides by this name (`src/extensions/`). Packs carry no code. |
| `menuLogo` | The brand menu's logo, a path in the pack (`logo-menu.svg`, drawn by `scripts/menu-logos.mjs`). |
| `files` | `{ count, bytes }`: the files the pack stands for, before the savings below. |
| `aliases` | `{ path: "other/path" }` for a file the brand keeps at several paths: zipped once, read at every path. `"library:<path>"` means the same bytes as that file in brandkit's `library/`. |
| `library` | `{ path: sha256 }` for files left out because brandkit's `library/` has them, byte for byte, at the same path. |
| `pages` | `{ "book/page": [[kind, id, label], …] }`: the manual pages its templates, signatures and guide pages cite, so the manual library can link to the brand before it is installed. |

A reader of a pack (`readPack` in `src/pack/format.js`):

- refuses a file over 160 MB, one that expands to more than twice that, and one that is not a zip;
- ignores entries that are folders, absolute, contain `..` or empty segments, or are `__MACOSX` or
  `.DS_Store` clutter;
- refuses a manifest with another `format`, a newer `version`, an id that is not lowercase
  letters, digits and dashes (up to 64), or an id its `brand.json` does not have;
- fills in every alias, so what it hands on is the brand's folder as it was, and reports the
  paths the pack left to the library, which are then read from brandkit's own copy;
- with no manifest, takes the shallowest `brand.json` in the zip as the brand, and the folder
  holding it (or, for `source/brand.json` in a kit, the folder above) as the brand's folder.

## Making packs

```sh
node scripts/pack.mjs <brand folder or folder of brands>… --out dist/packs [--name "Catalog name"] [--base-url https://host/path/]
```

(`brandkit pack` is the same command.) For each brand it writes `<id>.zip` and `<id>.logo.svg`,
then `catalog.json` listing them all, and prints what each pack saved. It imports only fflate and
Node (`src/pack/build.js`, `src/pack/cli.js`), so a host can pack brands without installing the
rest of brandkit. A brand's `logo-menu.svg` should be drawn first (`node scripts/menu-logos.mjs`).

A pack leaves out what its users do not need to download:

- **Library files.** A file byte for byte the same as one in `library/` (the open-licence Inter
  and Space Mono every starter brand uses) is served by the app, which every visitor already has.
- **Duplicates.** A file the brand keeps at several paths is zipped once.
- **History and repository clutter.** `history/`, dotfiles and `node_modules/`.
- **Source material** the brand lists in `.packignore` (below).

Images, fonts, PDFs and other compressed formats are stored as they are; text, SVG and JSON are
deflated at the highest level. Entries are sorted and dated 1980-01-01, so the same folder always
makes the same bytes and the same SHA-256, and an unchanged brand is never downloaded again.

### `.packignore`

A brand folder's `.packignore` lists files kept with the brand's source but left out of its pack:
scans, research and screenshots the brand was built from. One pattern per line, `#` for comments:

```
# The manual's page scans: the audit report is built from them and embeds every one.
reference/manual/
# Research photos nothing in the app or the kit shows.
reference/identity/*.jpg
*.psd
```

`reference/manual/` is a folder and everything in it; a pattern with a `/` matches from the brand's
folder; one without matches a file name anywhere; `*` stays within a folder and `**` crosses them.
A file the brand's kit lists in `brand.json` `files` is never left out: packing stops with an
error naming it, since a kit built from the pack would be missing it.

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

`url` and `menuLogo` resolve against the catalog's own address, so a folder of packs works from
wherever it is served (`--base-url` writes them absolute instead). `sha256` is how the app tells
that a pack has changed. Entries with a bad id or a non-`http(s)` address are skipped.

A site offers catalogs by building with `VITE_BRANDKIT_CATALOGS` (space- or comma-separated
addresses; the deploy workflow reads the repository variable `BRANDKIT_CATALOGS`). Catalogs added
in a browser are kept there. The last copy of each is kept too, so the menu still lists its
brands offline. When two catalogs list one id, the first wins.

## Hosting

Any static host works: upload the `--out` folder. Two things matter:

- **Cross-origin requests.** A pack on a different origin from brandkit needs
  `Access-Control-Allow-Origin` (GitHub Pages sends `*`). Without it the download fails with
  "Could not reach …".
- **ETags.** A revisit to a `?url=` link revalidates through the browser's cache, and a pack with
  the same ETag as the kept copy is not downloaded or stored again.

The brands made with brandkit are packed and published by the `builds` site
(`brandkit/` in that repository), at `https://projects.ahmadjalil.com/builds/configs/brandkit/`.

## In the browser

`src/app/pack-store.js` keeps packs in IndexedDB (`brandkit-packs`):

- `blobs`: one record per distinct file, keyed by its SHA-256.
- `packs`: one record per brand: where it came from (`url`, `catalog`, the response's `etag`), its
  pack's SHA-256 and size, its menu logo, its manual-page index, and `files`: path → SHA-256.

Installing stores only files not already there. Updating replaces the record, then deletes files
no record names; removing does the same. Files are read when drawn or downloaded: IndexedDB
returns Blobs backed by disk, and each is given a URL typed by its extension.

### Pack pages at real addresses

A pack's pages (a brand-details page, a website, a motion library) lean on what is around them:
images beside them, stylesheets and scripts, fonts in `../fonts/`, other pages. So they are opened
at real addresses:

```
<base>packs/<brand id>/<path in the pack>
```

`public/pack-sw.js`, a service worker scoped to `<base>packs/`, answers them from the same
IndexedDB store. A path the pack does not hold is looked for in brandkit's library (served at
`<base>library/`, listed in `<base>library/index.json`); anything else is a 404. The worker only
serves documents opened there (a link, the Motion stage's frame) and what they load, never the
app's own requests. Where a service worker cannot run (some private windows, an insecure origin),
pages fall back to `blob:` URLs and their relative links do not resolve.

Pages from a pack run at the app's origin. Open packs from catalogs and links you trust.

## When something goes wrong

| Message | Meaning |
| --- | --- |
| That file is not a zip brandkit can read. | Not a zip, or a damaged one. |
| There is no brand.json in this zip. | A zip, but not of a brand. |
| This pack is format 2; this brandkit reads up to 1. Update brandkit to open it. | Made by a newer brandkit. |
| The pack says it is *x*, but its brand.json is *y*. | The manifest and definition disagree; repack it. |
| That brand.json has problems: … | The definition fails validation; the list says where. |
| *x* is built into brandkit; give the brand you are opening an id of its own. | Its id is northwind's. |
| That file is larger than the 160 MB a brand pack may be. | Too big to open; leave source material out with `.packignore`. |
| Could not reach *host*. If the brand is on another site, that site has to allow cross-origin requests. | Offline, a wrong address, or no CORS header. |
| The brand could not be downloaded from *host* (404 Not Found). | The address is wrong, or the pack has moved. |
| *name* is open, but could not be kept in this browser (…); it will be gone after a reload. | Storage is full or blocked (often a private window). |
| *name*'s files are no longer in this browser's storage. Remove it and add it again. | The browser cleared part of its storage. |
| *file* is not a brand. Drop a brand pack (.zip), … | Something other than a zip or JSON was dropped. |

## From code

```js
import { readPack, readCatalog, PACK_FORMAT } from 'brandkit/pack'          // browser and Node
import { buildPack, buildCatalog, packIgnore } from 'brandkit/pack/node'   // Node

const { manifest, brand, files, library } = readPack(zipBytes)  // files: Map of path → bytes
const { bytes, manifest, sha256, stats } = buildPack('brands/harbour')
```

`readPack` also opens a brand folder or kit zipped (`manifest` is then `null`). `stats` reports
what a pack saved: `aliased`, `library` and `ignored` files and bytes, and `zipped`, its size.
