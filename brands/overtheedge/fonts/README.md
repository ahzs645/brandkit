# Fonts

The open-source files in the source table are under the SIL Open Font License 1.1, downloaded on 22 October 2026. Supplied Helvetica Neue and Salted files have their own source terms and notices, described below.

| Role | Face | Use |
| --- | --- | --- |
| `display` | Source Serif 4 Bold | Headlines |
| `displayRegular` | Source Serif 4 Regular | Long reading |
| `deck` | Source Serif 4 Italic | The one-sentence deck under a headline |
| `extra` | Anton Regular | Capitals only: cover lines, section fronts, page and day numbers |
| `body`, `bold` | Helvetica Neue Medium and Bold | Interface and body text; original files from the supplied staff-card package |
| `label` | IBM Plex Mono Medium | Datelines and labels, capitals, +0.08 em |
| `hand` | Salted Regular | Original handwritten face from the supplied offline compiler kit |

The September 2025 PDF identifies the cover faces as Decalotype Black, Salted, and Helvetica Neue. Anton remains the Decalotype substitute. Salted and Helvetica Neue now use the supplied original files; the older OFL files remain available as source assets.

| File | Source | SHA-256 |
| --- | --- | --- |
| `Anton-Regular.ttf` | https://raw.githubusercontent.com/google/fonts/main/ofl/anton/Anton-Regular.ttf | `a4ba3a92350ebb031da0cb47630ac49eb265082ca1bc0450442f4a83ab947cab` |
| `Anton-OFL.txt` | https://raw.githubusercontent.com/google/fonts/main/ofl/anton/OFL.txt | `ee67e6ee22790b7929f1a3769ca2801d565c64b5a9096942c1adf5596de9c9e4` |
| `IBMPlexMono-Medium.ttf` | https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexmono/IBMPlexMono-Medium.ttf | `a9b4c49bb299e05b5f6c481e7fb5e78943d2793249a0c8874ab574a2d1ea6755` |
| `IBMPlexMono-OFL.txt` | https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexmono/OFL.txt | `7e6b2818edbd8f6a01ae80641cc8f16a51080d08fb4e532be3a0b6f74adb07da` |
| `GochiHand-Regular.ttf` | https://raw.githubusercontent.com/google/fonts/main/ofl/gochihand/GochiHand-Regular.ttf | `c46b029ab4846b2935e301af0b2cf85a1d74d2858e6a33636a3e64cf3cc4696b` |
| `GochiHand-OFL.txt` | https://raw.githubusercontent.com/google/fonts/main/ofl/gochihand/OFL.txt | `b36cb03d6ddc163452d9935ce6f325741434272d3889acf42cc23584f31a85bf` |
| `SourceSerif4-Regular.ttf` | https://raw.githubusercontent.com/adobe-fonts/source-serif/release/TTF/SourceSerif4-Regular.ttf | `e5a4ee6a3d87bb9024796be390c6771e2a0eb1883dae25effaf57ca01668e24b` |
| `SourceSerif4-Bold.ttf` | https://raw.githubusercontent.com/adobe-fonts/source-serif/release/TTF/SourceSerif4-Bold.ttf | `7cf4f4e1ad74f45058d5bc61716b82560442fbdcd9d3654d2dea96bf6c683d86` |
| `SourceSerif4-It.ttf` | https://raw.githubusercontent.com/adobe-fonts/source-serif/release/TTF/SourceSerif4-It.ttf | `9d2950a8f1da66e21502c35d646a1d2148e79f9ea43fd2158cf02f5232e7f430` |
| `SourceSerif-OFL.md` | https://raw.githubusercontent.com/adobe-fonts/source-serif/release/LICENSE.md | `c21d7293d87b6d7ab1d0229a2f55b77f33a7613a6a4e66f6693d68d7d8d09464` |

`Inter-OFL.txt` and the Inter files are brandkit's shared copies (see `brands/ddcnorth/fonts/`).

## Original staff-card fonts

These are the original Helvetica Neue files supplied inside
[`templates/staff-card.zip`](../templates/staff-card.zip), used by the imported
staff card and by the brand’s body and bold roles. Their original source terms
are separate from the open-source faces and their OFL licences. Their source is the unchanged staff-card package recorded in the
[integration guide](../../../docs/template-printer.md).

| File | SHA-256 |
| --- | --- |
| `printer/staff-card/fonts/0-helveticaneue-bold.otf` | `14928444e337995a7fe9bae85e20b83139f6e0c78416df87feaf68613d41e02e` |
| `printer/staff-card/fonts/1-helveticaneue-medium.otf` | `38188783e8ad07d2de83d901d559354be45b355d5e360a22a82efd48fa4a6278` |

## Original Salted font

Salted Regular was found in `assets/fonts/` inside the [offline compiler kit](https://drive.google.com/file/d/1abrjwvpXLDdOS2yj8SANenXz8RQgxr-E/view), alongside the supplied [September issue recipe](https://drive.google.com/file/d/1QU3bZf7G4UcmYow5kpK2Zdfo5M6L9I_l/view). Its original `LICENSE-Salted.txt` says **Personal use only** and is preserved unchanged. It is not covered by the OFL notices above.

| File | SHA-256 |
| --- | --- |
| `Salted-Regular.otf` | `f7e039689dda7ba59357dbf22e255cdfd8690e4d5037a89d26672bc6f21d627c` |
| `LICENSE-Salted.txt` | `320ba11b35abb21ee9889f6d95c56990e5a133359f3b8f1c8c5d52df25be5ade` |
