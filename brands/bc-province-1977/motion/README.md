# Province of British Columbia motion (example)

5 studies on one set of timings, all drawn from the brand's own artwork with
the type outlined. Open `index.html` to play them; `motion.css` holds the tokens and keyframes,
and `motion-tokens.json` the same values for code. brandkit's Motion tab plays them too, and
exports the logo and loader studies as video and GIF.

## Rules

- **The symbol is never altered.** It may arrive, but its proportions, its colour and the arms within the band never change. Every logo study ends on the official signature.
- **Ceremony, not effects.** Measured timings and plain eases, as befits the Province’s seal: no bounces, spins, blurs or glows.
- **Loops are for waiting.** Only the band loops, never the full signature, and only while something loads.
- **Still is a valid frame.** With reduced motion, every study shows its final frame. Nothing depends on the animation to be understood.

## Studies

| Study | Kind | Timing | Use |
| --- | --- | --- | --- |
| Seal: The band is pressed into place like a seal, the arms come up inside it, then the Province’s name rises beneath. | Logo | slow, then base and slow · settle | Video openers, ceremonies, official announcements |
| Arms: With the band in place, the arms are assembled part by part, top to bottom: crown, lion, shield, supporters. | Logo | base, 30 ms stagger · settle | Explaining the symbol, longer title sequences |
| Unveil: The signature is uncovered from the top down, the way a sign’s cover comes away. | Logo | draw · move | Openings, new programmes, sign launches |
| Band: The band pulses slowly while the arms hold still. Symbol only; stops when loading ends. | Loading | 1800 ms loop · move | Page and app loading, 32 px and up |
| Sign: A brown panel rises into the frame like a highway sign, and the signature appears on it in white. | Interface | slow + slow · move, settle | Video end cards, slide transitions, kiosk screens |

## Using the CSS

Every element's resting style is its final frame. An element plays only inside a container with
the `play` class, and with `prefers-reduced-motion: reduce` nothing plays. To replay, remove
`play`, force a reflow, and add it again.
