# ddcnorth motion (proposed v2.3)

The motion library for the proposed v2.3 identity. Open `index.html` in a browser to play every study;
`motion.css` carries the tokens and the moves CSS can play on its own, and `motion-tokens.json`
the same tokens as data.

## Rules

1. **Fields, paths and loaders move.** Motion belongs to the supporting dots: grids, data paths, progress and loading states.
2. **The logo never moves.** The logo and the complete six-dot symbol never fade, scale, pulse or travel. They are on screen from the first frame.
3. **Reduced motion shows the end.** When a device asks for less motion, every study shows its final frame and nothing loops.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| Quick | 200 ms | Feedback, a dot lighting up |
| Base | 600 ms | Reveals and single moves |
| Slow | 1200 ms | Dots travelling, loader cycles |
| Draw | 1800 ms | Paths and lines |
| Stagger | 20–30 ms | Between dots in a field |
| Loader step | 200 ms | Between loader dots |

Easings: settle `cubic-bezier(.2,.7,.2,1)`, move `cubic-bezier(.6,0,.2,1)`, linear for loops only.

## Studies

- **Reveal** (Field): A field of dots arrives on a diagonal, smallest first. *600 ms · settle · 30 ms stagger.* Use: Section intros, pattern backgrounds, slide openers.
- **Connect** (Path): A line draws through the field, lighting each point it reaches. *1800 ms · settle · nodes on arrival.* Use: Hero moments, “how it fits together” slides.
- **Think** (Loader, loop): Three dots take turns. The loader is never the symbol. *1200 ms loop · 200 ms between dots.* Use: Loading and processing states.
- **Fill** (Progress, loop): A row of ten dots fills one at a time, then holds before resetting. *300 ms per step · 1000 ms hold · loop.* Use: Uploads, multi-step forms, video chapters.
- **Sort** (Field): Scattered dots travel into ordered rows: messy data becoming structure. *1200 ms · move · 20 ms stagger.* Use: Data sections, explainer videos, “before and after” slides.
- **Count** (Numerals): Dot-matrix numerals step up to their value. Unlit dots stay visible. *350 ms per step · lit dots 200 ms settle.* Use: Stat callouts, slide numbers, chapter markers.
- **Signal** (Field, loop): A slow wave of dot sizes travels across the grid, like a live data surface. *4 s wave · linear · loop.* Use: Ambient video backgrounds, event screens, hero areas without text.
- **Focus** (Field): Everything else steps back so one cluster stands out, then corner marks frame it. *1200 ms · settle · marks 600 ms.* Use: Highlighting a finding in a chart or slide.
- **Cover** (Transition): Dots grow until they cover the frame, carrying you to the next scene. Replay to go back. *600 ms · move · 25 ms diagonal stagger.* Use: Slide and video scene changes.
- **Settle** (End card): The logo is there from the first frame. Only the field arrives, from the edges inward, and stops one dot diameter short. *600 ms · settle · edge-first stagger.* Use: Video end cards, event screens, closing slides.
- **Scan** (Field, loop): A line sweeps across the grid and each dot swells as it passes, like data being read. *2400 ms sweep · linear · loop.* Use: Search, “analysing” and import screens.
- **Gather** (Field): Two separate clusters drift together and interleave into one grid: two sources becoming one picture. *1200 ms · move · 25 ms stagger.* Use: Partnerships, merged data sources, “bringing it together” slides.
- **Branch** (Path): One line splits into three options; the recommended one fills in last. *600 ms stem · 900 ms branches · settle.* Use: Decision support, roadmap options, scenario slides.
- **Stack** (Chart): Dots drop into columns one at a time, building a unit chart where one dot is one item. *600 ms per dot · move · 60 ms stagger.* Use: Chart intros, survey results, “how many” slides.
- **Relay** (Loader, loop): A light passes along a row of dots, for waits longer than a moment. *1050 ms loop · 150 ms hand-off.* Use: Syncing, exports, background work.
- **Ripple** (Field, loop): Rings of dots light up outward from one point, like news spreading. *1800 ms loop · 200 ms between rings.* Use: New-insight moments, live updates, map pings.
- **Confirm** (State): A loose row of dots gathers into a tick. *1200 ms · move · 40 ms stagger.* Use: Sent, saved and completed states.
- **Timeline** (Path): A line runs through three stages, filling each one as it arrives. *1800 ms draw · settle · stages on arrival.* Use: Process sections like “How we work”, project timelines.

## Guardrails

Do:
- Use one move per screen or slide
- Let loops run only where nothing needs reading
- Offer a pause for anything that loops longer than five seconds
- Finish transitions in under two seconds

Don’t:
- Fade, scale, spin or bounce the logo or the full symbol
- Animate dots behind body text
- Mix easings within one move
- Use colours outside the kit for states

Fonts are embedded in `index.html`: Inter and Inter Display (SIL Open Font License 1.1,
`fonts/Inter-OFL.txt`) and Space Mono (SIL Open Font License 1.1, `fonts/SpaceMono-OFL.txt`).
Generated by `scripts/brands/ddcnorth-motion.mjs`.
