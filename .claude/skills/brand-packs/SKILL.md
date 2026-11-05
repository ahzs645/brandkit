---
name: brand-packs
description: How brandkit opens, stores and shares brands as brand packs (one zip per brand), and how packs and catalogs are made and hosted. Use when working on brand loading (drag and drop, Open…, ?url=, catalogs, ?brand=), the pack format or manifest, src/pack, src/app/pack-store.js, the pack service worker, .packignore, the pack CLI, or when someone asks how to add, share or host a brand in brandkit.
---

# Brand packs

brandkit is a generic engine. It ships one brand, **northwind** (`brands/northwind`). Every other
brand is a **brand pack**: one zip with the brand's `brand.json`, every file it uses and a
`brandkit-pack.json` manifest. The full reference is `docs/brand-packs.md`; read it before
changing the format or the loading flow.

Do not add brands to this repository. Brands are made, tested and published elsewhere (the
author's are in ahzs645/builds, `brandkit/`) and reach the app as packs.

## Every way a brand gets in

| Route | How | Kept? |
| --- | --- | --- |
| Drag and drop | Drop a file anywhere on the page (overlay "Drop to add a brand"). Off in Template Printer and shared views; drops onto file inputs and images are left alone. `src/app/drop.js` | zip: yes |
| File picker | **Open…** in the header (phone: **⋯ → Open a brand…**), or **Brands → choose a file** | zip: yes |
| Link | `?url=<pack address>`, or **Brands → Add from link**. `url` is removed from the address after install (kept in shared views). | yes |
| Catalog | Brands from `VITE_BRANDKIT_CATALOGS` (set at build; CI uses repo variable `BRANDKIT_CATALOGS`, default the builds catalog) or `?catalog=<url>` / **Brands → Catalogs**. Listed under **Available to add**; `?brand=<id>` installs on arrival. | yes |
| Share link | **Share** → `?brand=<id>&share=1`, plus `&url=` when the brand is not in the site's catalog | yes |

Accepted files: a pack, any zip with a `brand.json` (shallowest wins), a downloaded kit
(`source/brand.json`), or a bare `brand.json` (opened for the visit only; **Edit brand → Save**
keeps its definition). An id equal to a built-in brand's is refused; an id already installed is
replaced (that is how an update from a file works).

## After it is in

- Stored in IndexedDB `brandkit-packs`: `blobs` (one per distinct file, keyed by SHA-256, shared
  across brands and versions) and `packs` (one record per brand: origin, pack hash, etag, menu
  logo SVG, manual-page index, path → hash). `src/app/pack-store.js`.
- Opens offline after a reload. A catalog brand whose `sha256` changed is updated on open or with
  **Brands → Update**; a revisited `?url=` revalidates by ETag.
- **Brands** view (`src/app/views/BrandLibrary.jsx`): usage and dedupe savings, persist request,
  update, remove (frees only unshared files), catalogs, built-in brands.
- Pack pages (`.html`) open at `<base>packs/<id>/<path>`, served by `public/pack-sw.js` from
  IndexedDB with library fallback, so their relative links work. Other files use typed `blob:`
  URLs. The library is served by path at `<base>library/` with `index.json` (`brandkitLibrary()` in
  `src/vite.js`).

## Making packs

```sh
node scripts/pack.mjs <brand folder | folder of brands>… --out dist/packs [--name "Catalog"] [--base-url https://host/path/]
```

Writes `<id>.zip`, `<id>.logo.svg` and `catalog.json`. Imports only fflate and Node. Packs leave
out: files identical to `library/` (aliased as `library:<path>` when at another path), duplicate
copies (aliases), `history/`, dotfiles, `node_modules/`, and paths in the brand's `.packignore`
(`folder/`, `name` anywhere, `dir/*.ext`, `**`). A `.packignore` entry that the kit lists in
`brand.json` `files` makes packing fail. Output is deterministic (sorted entries, fixed dates).
Draw `logo-menu.svg` first with `node scripts/menu-logos.mjs`.

## Hosting

Any static host. Cross-origin hosts must send `Access-Control-Allow-Origin` (GitHub Pages does).
ETags make revisits cheap. Limit 160 MB per pack. Pack pages run at the app's origin: only open
packs from trusted catalogs and links.

## Code

- `src/pack/format.js` (browser + Node): `readPack`, `readCatalog`, `manifestProblems`,
  `pageIndex`, `PACK_VERSION` (bump only with a reader for the old version).
- `src/pack/build.js` (Node): `buildPack`, `buildCatalog`, `packIgnore`, `libraryIndex`.
- Exported as `brandkit/pack` and `brandkit/pack/node`.

## Checks

- `npm test` (engine and pack unit tests, on northwind).
- `npm run build && npm run test:packs:browser` (Chromium; `CHROMIUM_PATH` to reuse one): link,
  reload, pack pages, revisit, file picker, drag and drop, catalog, dedupe, share, update, remove,
  phone width.
- When changing loading or the format, update `docs/brand-packs.md` (including its error-message
  table) and this skill.
