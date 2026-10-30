# B.C.Hydro motion (example)

7 studies on one set of timings, all drawn from the brand's own artwork with
the type outlined. Open `index.html` to play them; `motion.css` holds the tokens and keyframes,
and `motion-tokens.json` the same values for code. brandkit's Motion tab plays them too, and
exports the logo and loader studies as video and GIF.

## Rules

- **The signature arrives whole.** Symbol and logotype are inseparable in the manual, so every logo study ends on the complete signature, its positions and proportions unchanged.
- **Colour stays in the symbol.** Green and blue move only inside the ring; the logotype stays black. No other colours, no glows, no gradients.
- **Loops are for waiting.** Only the symbol loops, never the full signature, and only while something loads.
- **Still is a valid frame.** With reduced motion, every study shows its final frame. Nothing depends on the animation to be understood.

## Studies

| Study | Kind | Timing | Use |
| --- | --- | --- | --- |
| Ring: The ring draws round, the two stars set inside it, then B.C.Hydro rises letter by letter. | Logo | draw + slow, 40 ms stagger · move, settle | Video openers, presentation title slides |
| Current: Blue rises and green falls into the ring and meet; then the logotype is uncovered left to right. | Logo | slow + draw · move | Site intro, annual report video |
| Typeset: The symbol is there from the first frame; the logotype sets one letter at a time, as on a 1983 phototypesetter. | Logo | 110 ms a letter · steps | Short openers, social posts |
| Alternating: The two stars take turns, green and blue, like alternating current. Symbol only; stops when loading ends. | Loading | 1200 ms loop · move | Page and app loading, 32 px and up |
| Charge: A quarter of the ring runs round it while the stars hold still. At rest the ring is whole. | Loading | 1200 ms loop · linear | Uploads, syncing, longer waits |
| Meter: A bar fills in three steps, corporate green on the light tint, with blue marks at each step. | Interface | 2400 ms loop · settle | Multi-step forms, account set-up |
| End card: Corporate blue sweeps across the frame, then the symbol sets in white in the middle. | Interface | slow + slow · move, settle | Video end cards, slide transitions |

## Using the CSS

Every element's resting style is its final frame. An element plays only inside a container with
the `play` class, and with `prefers-reduced-motion: reduce` nothing plays. To replay, remove
`play`, force a reflow, and add it again.
