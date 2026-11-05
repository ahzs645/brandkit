# Inter and Space Mono

brandkit ships these open-licence faces for brands that do not carry their own. The starter
(**New brand**) sets every brand in them, and a brand that names one of these paths without
holding the file itself is given brandkit's copy.

| Face | Desktop file | Web file |
|---|---|---|
| Inter Regular 400 | `desktop/Inter-Regular.ttf` | `web/Inter-Regular.woff2` |
| Inter SemiBold 600 | `desktop/Inter-SemiBold.ttf` | `web/Inter-SemiBold.woff2` |
| Inter Display Regular 400 | `desktop/InterDisplay-Regular.ttf` | `web/InterDisplay-Regular.woff2` |
| Inter Display Medium 500 | `desktop/InterDisplay-Medium.ttf` | `web/InterDisplay-Medium.woff2` |
| Inter Display ExtraBold 800 | `desktop/InterDisplay-ExtraBold.ttf` | `web/InterDisplay-ExtraBold.woff2` |
| Space Mono Regular 400 | `SpaceMono-Regular.ttf` | `SpaceMono-Regular.ttf` |

The five Inter files are **Version 4.001;git-9221beed3**. Space Mono Regular is **Version 1.003**.

## Install

Install the five `.ttf` files in `desktop/` and `SpaceMono-Regular.ttf` using your operating
system's font installer, then reopen applications that were already running. Use the WOFF2 files
for web delivery; Space Mono's TTF can also be loaded directly with `@font-face`.

## Provenance and licences

- Inter: [rsms/inter, docs/font-files](https://github.com/rsms/inter/tree/master/docs/font-files).
  The source URL of each binary is recorded in `font-manifest.json`. Licence:
  [rsms/inter LICENSE.txt](https://github.com/rsms/inter/blob/master/LICENSE.txt), included as
  `Inter-OFL.txt`.
- Space Mono: [Google Fonts, SpaceMono-Regular.ttf](https://github.com/google/fonts/blob/main/ofl/spacemono/SpaceMono-Regular.ttf).
  Licence: [OFL.txt](https://github.com/google/fonts/blob/main/ofl/spacemono/OFL.txt), included as
  `SpaceMono-OFL.txt`.

Both are under the SIL Open Font License; keep the licence files with the fonts when you pass them
on. The Inter WOFF2 files are the unmodified downloads; the desktop TTFs were decoded from them
losslessly (the `glyf`, `hmtx` and `cmap` tables checked equal before and after).
`font-manifest.json` records the versions and SHA-256 checksums.
