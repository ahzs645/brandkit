# Included brand fonts

This package includes the Inter and Space Mono families specified in the original ddcnorth brand kit. The five Inter files are **Version 4.001;git-9221beed3**, the same release identified by the original kit. Space Mono Regular is **Version 1.003**.

The production wordmark remains the original kit's outlined artwork. Its custom `ddc` letterforms and outlined `north` do not require font installation. Installing the fonts supports editable templates, web typography, and guide regeneration.

## Files and roles

| Brand role | Desktop file | Web file |
|---|---|---|
| Body and UI, Inter Regular 400 | `desktop/Inter-Regular.ttf` | `web/Inter-Regular.woff2` |
| Supporting emphasis, Inter SemiBold 600 | `desktop/Inter-SemiBold.ttf` | `web/Inter-SemiBold.woff2` |
| Display Regular 400; editable `north` approximation | `desktop/InterDisplay-Regular.ttf` | `web/InterDisplay-Regular.woff2` |
| Headings, Inter Display Medium 500 | `desktop/InterDisplay-Medium.ttf` | `web/InterDisplay-Medium.woff2` |
| Editable `ddc` approximation, Inter Display ExtraBold 800 | `desktop/InterDisplay-ExtraBold.ttf` | `web/InterDisplay-ExtraBold.woff2` |
| Labels and technical captions, Space Mono Regular 400 | `SpaceMono-Regular.ttf` | `SpaceMono-Regular.ttf` |

The live-text `ddc` remains an approximation. Use the outlined logo for production rather than retypesetting the wordmark.

## Install

Install the five `.ttf` files in `desktop/` and `SpaceMono-Regular.ttf` using your operating system's font installer, then reopen applications that were already running. Use the WOFF2 files for web delivery; Space Mono's supplied TTF can also be loaded directly with `@font-face`.

## Provenance and licences

Retrieved from the official projects on **10 October 2026 (UTC)**:

- Inter: [rsms/inter, docs/font-files](https://github.com/rsms/inter/tree/master/docs/font-files). The exact source URL for each binary is recorded in `font-manifest.json`.
- Inter licence: [rsms/inter LICENSE.txt](https://github.com/rsms/inter/blob/master/LICENSE.txt), included as `Inter-OFL.txt`.
- Space Mono: [Google Fonts, SpaceMono-Regular.ttf](https://github.com/google/fonts/blob/main/ofl/spacemono/SpaceMono-Regular.ttf).
- Space Mono licence: [Google Fonts, OFL.txt](https://github.com/google/fonts/blob/main/ofl/spacemono/OFL.txt), included as `SpaceMono-OFL.txt`.

Both families are supplied with their official SIL Open Font License text. Preserve those licence files when redistributing the font files. The complete terms are in the included licences.

## Format conversion and verification

The Inter WOFF2 files are the unmodified downloaded originals. Their desktop TTF counterparts were decoded to sfnt/TrueType with fontTools and the local native Brotli decoder. This is a lossless font-format conversion: the glyph-outline (`glyf`), horizontal-metric (`hmtx`), and character-map (`cmap`) table bytes were checked for equality before and after conversion. There were no changes to the font's letterforms, spacing, names, or version metadata.

`font-manifest.json` records the source URLs, font versions, glyph counts, and SHA-256 checksums for both the downloaded files and converted TTF files. The Space Mono TTF is the unmodified downloaded original.
