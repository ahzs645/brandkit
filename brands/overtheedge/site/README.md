# Over the Edge website

A redesign of the Over the Edge homepage in the "Forest press" identity. One static page, no build step, nothing loaded from the network.

- `index.html`: the page.
  - A forest masthead with the logo and the site's own navigation (Calendar, Clubs, News, Get Involved, About Us, Archive).
  - A hero with the paper's line and the latest issue, set as a cover: masthead, date box, photo frame, hand-written note, and the dashed index.
  - Top Stories as square-cornered cards, the calendar as dated rows, and Get Involved on forest.
- `assets/motion.css`: the brand's motion tokens and keyframes, the same file as `../motion/motion.css`.
- `licenses/`: the SIL Open Font License texts of the faces the page embeds.

Story, event and issue text is bracketed placeholders until it comes from the paper's own content.

## Motion

- **Intro**, on the first visit in a session: the O fills while the page and fonts load (600 ms to 2.5 s), then the forest panel slides away.
- **Every load**: the header logo prints in word by word (the Press study), and the hero headline rises line by line.
- **Scrolling**: the story cards, calendar rows and Get Involved rise in as they come into view, 80 ms apart.
- **Story cards** lift and turn 0.4° on hover, as in the Card pick study; buttons press in slightly.

Every element rests on its final frame, so without JavaScript, or with reduced motion, the page simply shows. The fonts, the header logo, the issue logo and the loader are written by `npm run make:overtheedge` between the `<!-- ote:fonts -->`, `<!-- ote:logo -->`, `<!-- ote:issue-logo -->` and `<!-- ote:loader -->` markers; edit around them, not inside.

- `screenshots/`: the page at 1440 px (desktop) and 390 px (mobile), first screen and full page, at rest. `node test/browser/overtheedge.check.mjs` writes them.
