# Over the Edge motion

Open `index.html` for the motion library: 13 studies of the logo, loading states and interface, each with its timing, where to use it, and a replay button.

## Use it in a site

Link `motion.css`. It defines the tokens and the palette as custom properties, and every study's keyframes:

```html
<link rel="stylesheet" href="motion.css">
<div class="play" data-study="o-fill"><!-- the O's SVG, copied from index.html --></div>
```

The redesigned site (`site/index.html` in the brand's folder in brandkit) is a worked example. An element animates only inside a `.play` container, and its resting style is its last frame, so it reads correctly before, after, and without motion. Add `.ote-paused` to any ancestor to pause; with `prefers-reduced-motion: reduce` nothing moves.

## Tokens

| Token | Value |
|---|---|
| `--ote-quick` | 160 ms |
| `--ote-base` | 240 ms |
| `--ote-slow` | 480 ms |
| `--ote-draw` | 1200 ms |
| `--ote-loop` | 1600 ms |
| `--ote-settle` | `cubic-bezier(.2, .6, .2, 1)` |
| `--ote-move` | `cubic-bezier(.6, 0, .2, 1)` |
| `--ote-linear` | `linear` |
| `--ote-stagger` | 80 ms |
| `--ote-distance` | 16 px |

`motion-tokens.json` holds the same values for code.

## Rules

- **Print, don’t perform.** The logo arrives word by word and then holds. It never bounces, spins, blurs, glows or changes colour, and every logo study ends on the exact still logo.
- **One thing at a time.** Stagger related parts by 80 ms, left to right and top to bottom, the order a reader takes in a page.
- **Loops are for waiting.** Only loaders loop, and only the O or a print device loops, never the full logo. Stop the loop as soon as the wait is over.
- **Still is a valid frame.** With reduced motion, show the final frame. Nothing should depend on the animation to be understood.

## Studies

| Study | Kind | Timing | Use |
|---|---|---|---|
| Press | Logo | slow, 80 ms stagger · settle | Site intro, video opener, issue launch |
| Stack | Logo | slow, 80 ms stagger · settle | Covers, posters, vertical video |
| Ink | Logo | draw · move | Longer moments: video, keynote, a new volume |
| Rolling rules | Loading | loop · linear | Lists and search results while they load |
| Page count | Loading | loop · settle | Opening an issue, the archive |
| O fill | Loading | loop · move | Page and app loading, 24 px and up |
| Paper airplane | Loading | loop · move | Sending a tip, submitting a story |
| Headline | Interface | slow, 80 ms stagger · settle | Article headers, hero headlines, title slides |
| Card pick | Interface | base · settle | Story cards on hover |
| Index | Interface | base, 80 ms stagger · settle | The issue index, tables of contents |
| Chip | Interface | quick · settle | Section filters |
| Turn page | Interface | slow · move | Page and slide transitions |
| Skeleton | Interface | 1400 ms loop · linear | Cards and lists before content arrives |
