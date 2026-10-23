# Change log

## Wordmarks and source typography

- Extract the stacked masthead and its subtext from the September cover. Export full and words-only wordmarks in both arrangements.
- Use supplied Helvetica Neue Medium/Bold and Salted Regular, preserving the supplied font notices.
- Replace the mobile layout buttons with a dropdown. Toggle the small wordmark independently and choose its colour for previews and exports. Add live type samples and font downloads.

## Staff card integration

- Added the original Staff Card as a front/back template set, with editable name
  and position fields and its original Helvetica Neue fonts.
- Added direct editing and printing in Template Printer and portable package
  downloads, with edited packages importable back into the brand.
- Kept the original archive in `templates/staff-card.zip`; the imported design
  keeps its own artwork and typography alongside Forest press.

## 1.0 - motion (22 October 2026)

- Added a motion library: thirteen studies of the logo (press, stack, ink), loading (rolling rules, page count, O fill, paper airplane) and the interface (headline, card pick, index, chip, turn page, skeleton).
- Timing tokens: quick and base are the site's own transitions; slow, draw and loop are added, with settle and move easings and an 80 ms stagger. They are in `motion/motion.css` and `motion/motion-tokens.json`.
- Every study rests on its final frame. Nothing moves with reduced motion, and every logo study ends on the still logo.
- A ninth guide page, Motion, with four frames of the Press study.
- A brand details page, `guidelines/brand-details.html`, and a redesigned homepage in brandkit's `brands/overtheedge/site/`, using the same motion.
- The pages embed the brand's own fonts, so they need no network.

## 1.0 - 22 October 2026

- Added Over the Edge to brandkit in a "Forest press" identity: an evolution of the paper's look, not a change of name or logo.
- The logo is the site's own SVG, path for path: the full logo, the logo without its subtext, OVER / THE / EDGE stacked, and the O as the symbol. The site's two-colour original is kept in `logos/source/`.
- Twelve colours from the site's theme and the April 2025 cover: Forest, Pine, Newsprint, Ink, Lichen, Sage, Moss, Kraft, Pulp, Bark, Proof and White.
- Source Serif 4, Anton, Inter, IBM Plex Mono and Gochi Hand, under the SIL Open Font License.
- Fourteen templates: business card front and back, press pass, A4 letterhead, issue cover, story post, new-issue post, event post, vertical story, link preview, social banner, and title, section and closing slides.
- Ten icons, the site's five and five more, three patterns from the O, an eight-page guide and a logo reference sheet.
