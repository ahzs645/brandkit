# Brandkit → Astryx consumer example

A small React application using **real `@astryxdesign/core` 0.7.11 components** with
the theme produced from Brandkit’s built-in Northwind brand. Astryx is a dependency
of this example only; Brandkit’s generator does not depend on Astryx or React.

## Run

From the Brandkit repository, install its normal dependencies first (`npm ci`).
Then, using Node 22.13 or later:

```sh
cd examples/astryx
npm ci
npm run dev
```

Open the localhost address Vite prints. `npm run build` makes a production build;
`npm run preview` serves it. The preparation step reruns for `dev` and `build`, so
editing the source brand or adapter produces a fresh theme.

`npm run verify` checks the adapter against the installed published Astryx token
registry, resolves light and dark colours for seven contrasting sample palettes,
checks inherited defaults and CSS generation, server-renders the real components,
then runs the pinned CLI’s production theme compiler and `--check` gate for both
theme scopes. Its output is `generated/verification.json`. This verifies the
package contract; the separate browser check covers rendered behaviour.

## What this demonstrates

- The generated theme module goes directly into Astryx’s `Theme` provider.
- Astryx’s prebuilt `reset.css` and `astryx.css` need no StyleX build plugin.
- The source brand’s local web fonts load through the generated `brand.css`.
- Primary buttons, accent text, a text input and a selector use actual Astryx components.
- Light and dark modes use their own exported token values.
- A nested synthetic orange theme remains separate from the surrounding Northwind
  theme, including its dialog. The orange scope is a technical demonstration, not
  an approved Northwind palette change.
- The logo uses the supplied outlined primary/reverse SVGs without recolouring,
  cropping or rebuilding the artwork.

`prepare.mjs` creates `generated/` and `public/brand/`; those files are ignored by
git and reproduced from `brands/northwind/brand.json`. Copying a downloaded Website
kit’s `web/astryx/theme.js` into your own app is the equivalent consumer workflow.
Keep the kit’s `web/brand.css` and `fonts/` relative locations when loading its fonts.

This example uses runtime theme generation in a client-rendered Vite application.
For server rendering, strict Content Security Policy or production theme
precompilation, follow [the Astryx integration guide](../../docs/astryx-integration.md)
and Astryx’s `theme build` workflow.

## Browser check

After the production build, from this directory:

```sh
npm run build
npm run test:browser
```

The check uses Brandkit’s existing Playwright installation. Install Chromium with
`npx playwright install chromium` from the repository root if it is not already
available, or set `CHROMIUM_PATH` to an installed Chromium executable.

It verifies computed component colours against both generated themes, loaded font
families, nested modal colours, focus return, input/selection/save interactions,
mobile overflow and dialog bounds, and browser resource/runtime errors. Screenshots
and the result are written under `.documentation/astryx-example/` (override with
`SCREENSHOT_DIR`). These checks cover this example and Astryx version, not every
component or every possible brand.
