# First Form website

A redesign of the First Form site, built on this brand. One static page, no build step.

- `index.html`: the page. It keeps the existing header (Ash bar, logo, Home link, three black pills) and simplifies everything under it: hero, approach, projects, services, contact.
- `assets/motion.css`: the brand's motion tokens and keyframes, the same file as `../motion/motion.css`.
- `assets/logo-white.png`: the footer logo, from the kit.

## Motion

- **Intro**, on the first visit in a session: the block loader holds while the page and fonts load (600 ms to 2.5 s), then wipes away along the mark's 3 : 5 slope.
- **Every load**: the header logo assembles (the Assemble study) and the headline rises line by line.
- **Scrolling**: the approach cards, projects, services and contact rise in as they come into view, 80 ms apart.
- **Buttons** press in to 96%; the project frames' brackets close in on hover (the Focus study).

Every element rests on its final frame, so without JavaScript, or with reduced motion, the page simply shows. The header logo and the loader are inline SVG written by `npm run make:firstform` between the `<!-- ff:logo -->` and `<!-- ff:loader -->` markers; edit around them, not inside.
- `screenshots/`: the page at 1440 px (desktop) and 390 px (mobile), first screen and full page, at rest.

The project tiles are placeholders until photos of the real parts exist.
