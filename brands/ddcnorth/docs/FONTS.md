# Typography retained from the original kit

The user requested the new icon with the fonts already specified in the brand kit. The reference image's lettering was therefore not adopted.

| Role | Retained specification |
|---|---|
| Production ddc | Original custom vector outlines |
| Production north | Original outlined Inter Display Regular 4.001;git-9221beed3, -0.016 em tracking |
| Display headlines | Inter Display Medium 500, -0.04 em tracking |
| Body / UI | Inter Regular 400 |
| Technical labels | Space Mono Regular 400, +0.12 em tracking |
| Fully live-text logo | Inter Display ExtraBold 800 ddc + Regular 400 north; approximate editing alternative |

The complete original wordmark JSON, including all paths, positions and font metadata, is unchanged. The production ddc artwork is custom geometry rather than a font. The original raster board named Inter and Space Mono with “or similar” qualifiers; v2 preserves the supplied kit's implementation choices without claiming to identify a different original typeface.

## Included files

The five Inter weights/styles in `../fonts/desktop/` are desktop TTF files matching the kit's exact recorded release, 4.001;git-9221beed3. The corresponding original WOFF2 files are in `../fonts/web/`. The TTF files were losslessly repackaged from the official WOFF2s without changes to glyph geometry, metrics, mapping or naming. The font manifest records verification and hashes.

`../fonts/SpaceMono-Regular.ttf` is version 1.003. Both official SIL Open Font License files are included beside the fonts. Install the desktop fonts and Space Mono before editing live SVG content. The web CSS already loads its copies locally.

Production logo SVGs need no font installation. All current guide text is outlined using these same fonts. Template text remains editable and font-dependent. When editing the hybrid suffix, allow for width changes and use the outline master for fixed production branding.

## Official source references

- Inter: https://rsms.me/inter/
- Inter official source: https://github.com/rsms/inter
- Inter font files: https://github.com/rsms/inter/tree/master/docs/font-files
- Space Mono: https://fonts.google.com/specimen/Space+Mono
- Space Mono source: https://github.com/googlefonts/spacemono
- Official Google Fonts distribution: https://github.com/google/fonts/tree/main/ofl/spacemono

Font files and licences were retrieved on 10 October 2026. Exact URLs and SHA-256 hashes are in `../fonts/font-manifest.json`. The former v1 font comparison is preserved in `../reference/legacy-v1/font-comparison.png`. The current `font-comparison.png` presents the retained typography and wordmark.
