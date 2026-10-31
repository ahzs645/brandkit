# love.fútbol fonts

The kit bundles four **original static font files** under the SIL Open Font License 1.1, with the upstream notices preserved byte for byte. Files were retrieved on 30 October 2026. Exact revision-pinned URLs, SHA-256 values, internal names, versions and embedding flags are recorded in [source-manifest.json](source-manifest.json).

## Roles and evidence

| Kit role | Bundled face | Basis |
| --- | --- | --- |
| Display | Bahianita Regular | Explicitly used on Projects and in headings across Home, About, Methodology, Governance, Donate and Contact. See the cross-page visual evidence record. |
| Body | Red Hat Text Regular | Observed website body and UI family. |
| Bold/supporting headings | Red Hat Text Bold | Observed website supporting headings and bold styles. |
| Document emphasis | Red Hat Text Italic | Authentic upstream italic supplied for document use; this does not assert that the captured Projects page uses italic text. |

The [sanitized website evidence](../reference/website-projects-brand-evidence.json) distinguishes observed CSS and HTML from official brand standards. The page's 88 px country headings and 60 px sponsorship display text are implementation observations, not a universal type scale.

The website child theme also declares **DK Brush Crush** for H1/blog H1 and **Acumin Pro Condensed** for H3. Those commercial families are **not bundled**: the public website is not a redistribution license. Bahianita is used for kit display layouts because it is directly observed in current project headings and has a verified open license. It should not be described as an exact visual replacement for DK Brush Crush. The remaining declared theme fonts, including Inter Tight, are not treated as mandatory brand fonts without evidence of actual element use.

## Sources

Red Hat Text's original static files come from Red Hat's official repository, linked by the Google Fonts upstream record. Bahianita's original file comes from the Google Fonts repository. No file was synthesized, renamed, subset, converted or instantiated.

| File | Exact upstream source | SHA-256 |
| --- | --- | --- |
| `RedHatText-Regular.ttf` | [RedHatOfficial/RedHatFont](https://raw.githubusercontent.com/RedHatOfficial/RedHatFont/6bb1048a6402b0076ea04f42951ec66263cd1437/fonts/Proportional/RedHatText/ttf/RedHatText-Regular.ttf) | `c0989952929fb6427d7b16999678418d52977aea764e66e51b76f9ca221b71b7` |
| `RedHatText-Bold.ttf` | [RedHatOfficial/RedHatFont](https://raw.githubusercontent.com/RedHatOfficial/RedHatFont/6bb1048a6402b0076ea04f42951ec66263cd1437/fonts/Proportional/RedHatText/ttf/RedHatText-Bold.ttf) | `a44ef4b6cfefb2e90d489247cdf3e269744673ebb68b48c89ce9e37041feccb4` |
| `RedHatText-Italic.ttf` | [RedHatOfficial/RedHatFont](https://raw.githubusercontent.com/RedHatOfficial/RedHatFont/6bb1048a6402b0076ea04f42951ec66263cd1437/fonts/Proportional/RedHatText/ttf/RedHatText-Italic.ttf) | `29c31b40239242174cfecea38bf9e0a6c032fb786fc238186334393d68a9c637` |
| `Bahianita-Regular.ttf` | [google/fonts](https://raw.githubusercontent.com/google/fonts/6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec/ofl/bahianita/Bahianita-Regular.ttf) | `325f21fc723c962e58f895961c77ed151520baaa56e366c4dcaf7c8fcb75130a` |
| `RedHatText-OFL.txt` | [RedHatOfficial/RedHatFont](https://raw.githubusercontent.com/RedHatOfficial/RedHatFont/6bb1048a6402b0076ea04f42951ec66263cd1437/OFL.txt) | `4f1417e27511207cd217656c964f1b0d8b0c4a30156a1a699cf16dc5eba0dff6` |
| `Bahianita-OFL.txt` | [google/fonts](https://raw.githubusercontent.com/google/fonts/6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec/ofl/bahianita/OFL.txt) | `d33d42f346e4c706291b3373b8120bfe5fa74377c6c858b0626e5dc4f5c29245` |

Both notices license their respective font software under OFL 1.1. Preserve the notices when redistributing these fonts. The original files report unrestricted embedding (`OS/2.fsType = 0`) and retain their original names; the font licenses, not the brand assets' rights, govern font redistribution.
