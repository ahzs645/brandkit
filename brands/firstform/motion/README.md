# First Form motion

Open `index.html` for the motion library: 16 studies of the logo, loading states and interface, each with its timing, where to use it, and a replay button.

## Use it in a site

Link `motion.css`. It defines the tokens as custom properties and every study's keyframes:

```html
<link rel="stylesheet" href="motion.css">
<div class="play" data-study="blocks"><!-- the mark's SVG, copied from index.html --></div>
```

The First Form site (`site/index.html`) is a worked example: its intro, header logo and scroll reveals use this file. An element animates only inside a `.play` container, and its resting style is its last frame, so it reads correctly before, after, and without motion. Add `.ff-paused` to any ancestor to pause; with `prefers-reduced-motion: reduce` nothing moves.

## Tokens

| Token | Value |
|---|---|
| `--ff-quick` | 160 ms |
| `--ff-base` | 320 ms |
| `--ff-slow` | 640 ms |
| `--ff-draw` | 1200 ms |
| `--ff-loop` | 1200 ms |
| `--ff-settle` | `cubic-bezier(.2, .7, .2, 1)` |
| `--ff-move` | `cubic-bezier(.6, 0, .2, 1)` |
| `--ff-linear` | `linear` |
| `--ff-stagger` | 80 ms |
| `--ff-distance` | 24 px |

`motion-tokens.json` holds the same values for code.

## Rules

- **Assemble, don’t decorate.** Motion shows parts fitting together. Every logo animation ends on the exact still logo: no bounce, blur, glow or colour change.
- **One thing at a time.** Stagger related parts by 80 ms. Move along the mark’s own axes: vertical, or the 3 : 5 isometric slope.
- **Loops are for waiting.** Only loaders loop, and only the mark loops, never the full logo. Stop the loop as soon as the wait is over.
- **Still is a valid frame.** With reduced motion, show the final frame. Nothing should depend on the animation to be understood.

## Studies

| Study | Kind | Timing | Use |
|---|---|---|---|
| Assemble | Logo | slow + base · settle | Site intro, video opener, app launch |
| Build | Logo | base, 80 ms stagger · settle | Title slides, case study openers |
| Draw | Logo | draw + base · move | Longer moments: video, keynote, reveal |
| Turn | Logo | 900 ms · move | Explaining the mark; loading handing over to ready |
| Block loader | Loading | loop · move | Page and app loading, 24 px and up |
| Stack | Loading | 1600 ms loop · settle | Building, exporting, generating |
| Module | Loading | loop · steps | Panels and lists while content loads |
| Overlap | Loading | loop · move | Connecting, sending, matching |
| Focus | Loading | slow · settle | Image loading, uploads, capture |
| Progress | Loading | 2400 ms · settle | Multi-step forms, uploads |
| Skeleton | Interface | 1400 ms loop · linear | Cards and lists before data arrives |
| Cards | Interface | base, 80 ms stagger · settle | Section entrances |
| Headline | Interface | slow, 80 ms stagger · settle | Hero headlines, title slides |
| Field | Interface | 2400 ms · settle | Contact and intake forms |
| Press | Interface | quick · settle | Buttons and pills |
| Wipe | Interface | slow · move | Page and slide transitions |
