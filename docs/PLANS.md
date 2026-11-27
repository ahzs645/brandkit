# Plans

## M2: Over the Edge, "Forest press" (branch `overtheedge-brand`, from `3a7cd38`)

Source requests (user, verbatim):

- 2026-10-22: "Can you help us go through this website https://overtheedge.unbc.ca This is the independent newspaper at university, can you help us come up with a design system for this brand?"
- 2026-10-22, later: "can you help to make the branding more Aesthetics, if you need to change something. use firstform brandkit from this repo "/Users/amiretminanrad/Documents/Github/brandkit", as an example to follow what you need to make."

Decisions the user made on 2026-10-22, when asked:

- **Where:** a new brand in brandkit, `brands/overtheedge`, built like First Form, on a new branch `overtheedge-brand`. Downloading OFL font files into the brand's `fonts/` was part of that option.
- **Direction:** "Forest press". An evolution of the paper's current look, not a break: deep forest green and newsprint, a heavy condensed display face beside the logo, Source Serif headlines, the print issue's dashed index rules and page numbers, one hand-written note, square print geometry. The logo itself stays exactly as it is.
- **Audits:** no `plan_guardian` agent exists in this session. A general-purpose agent briefed with the Plan Guardian role and the AGENTS.md protocol stands in, and every verdict is recorded in docs/STATUS.md.

M2 is the identity and the kit (logo, fonts, palette, templates, icons, patterns, guide, docs, tests). M3 is the motion library, the brand details page and the site, as First Form has them.

### Sources

- **The logo.** The inline SVG the site serves in its header (`svg.ote-logo-full`, viewBox `0 0 690.73 118.6`), read on 2026-10-22 from https://overtheedge.unbc.ca/. It is vendored once, in two copies:
  - `brands/overtheedge/reference/logo-site.svg`, with the site's light-theme values (`--ote-logo-main-color` #155329, `--ote-logo-subtext-color` #262626);
  - `logo-site-dark.svg`, with the dark-theme values (#E3EFCF, #F7F7F7).

  The normalisations, which are the only changes:
  - the per-request random `id` (`ote-logo-…`) is removed;
  - the `width`, `height` and `class` attributes on the root are removed;
  - each `var(--ote-logo-…)` fill is replaced by its hex value;
  - an XML declaration is added.

  Path data and group structure are untouched. `reference/PROVENANCE.json` records the URL, the date, the normalisations and each copy's SHA-256.

  The source names no word groups. Inside `Main_Logo` ("Main Logo") are three unnamed `<g>`, identified by position: first THE, second EDGE, third OVER. The 21 paths of `#Subtext` are the subtext. The apostrophe of UNBC'S is one path outside `#Subtext`, filled with the main colour; it becomes its own glyph `apostrophe`, drawn in the logo's one colour like the rest.
- **The site's theme**, child theme `twentytwentyfive-ote-child`, `assets/css/index.css` and `design-system.css`, read 2026-10-22: the colours (oklch values converted to hex), the 160 ms and 240 ms transitions with `cubic-bezier(.2,.6,.2,1)`, the radii, Inter and Source Serif 4.
- **Two print covers** from the homepage: `wp-content/uploads/2025/12/frontpage-1.png` (the April 10, 2025 issue) and `frontpage-3.png` (October 16, 2025).
  - They are **not vendored**. Everything under `brands/` is bundled into the app build and published by GitHub Pages, and the covers carry photographs.
  - PROVENANCE.json records each URL, its SHA-256 (e429409d…e3aa and 8a2a2de2…75a8, given in full there), its size (756 × 792), and the pixels sampled: sage #6AA380 at (380, 690) and moss #466855 at (60, 100) of frontpage-1.png.
- **Copy** comes only from the site or the covers. The hero line is an excerpt: the site's sentence continues "…calendar, beautifully in one place", and the full stop is ours.
  Sourced: "UNBC's Independent Student Newspaper", "UNBC's Student Newspaper", "Over the Edge is here!", the hero line "Breaking news, vibrant clubs, can't-miss events, and a shared university calendar", the navigation names (Calendar, Clubs, News, Get Involved, About Us, Archive) and the domain `overtheedge.unbc.ca`.

### Design decisions ("Forest press")

- **Logo, unchanged.** The site's lockup is the primary logo. The engine draws it from glyphs that are the source's path strings, grouped per word:
  - `over`, `the`, `edge`: the three words;
  - `subtext`: "UNBC'S STUDENT NEWSPAPER" (the 21 paths of `#Subtext`);
  - `apostrophe`: the apostrophe of UNBC'S, the one path outside `#Subtext` and `Main_Logo`.

  Each glyph is the concatenation, in source order, of that group's `d` attributes, in the source's own coordinates.
- **Three wordmark variants**:
  - `full`: all four glyphs as in the source, 690.73 × 118.6;
  - `words`: OVER THE EDGE without the subtext, 690.73 × 85.57;
  - `stacked`: OVER / THE / EDGE left-aligned on three lines at a pitch of 100 units, as on the October 2025 cover. Each word is moved left by its own left edge.

  Each variant's `width` is the right edge of its artwork, measured by sampling every path segment (curves at 64 steps) and rounded up to 0.01. Every variant starts at x = 0, so the global `wordmark.left` is 0 and `stacked` aligns. `full`'s parts are `over`, `the`, `edge`, `subtext` and `apostrophe` at their source positions.
- **The symbol** is the logo's own O: the first path of the `over` group, unedited, in a viewBox from its measured bounds. It is used where the full logo cannot be read: favicon, app icon, avatars, patterns. No other mark is introduced.
- **Engine options**, so the logo is drawn without a symbol beside it. All default to today's behaviour, so other brands render the same:
  - `wordmark.variants.<id>.height` (optional): the variant's own height, used in place of `wordmark.height` when scaling it.
  - A family's `lockupSymbol: false`:
    - `horizontal` draws the family's wordmark alone at `typeHeight`;
    - `stacked` draws `stackedWordmark` (or else the family's wordmark) alone at `stackedTypeHeight`.

    `wordmark` and `symbol` layouts are unchanged.
  - `validateBrand` reports a `stackedWordmark` that names no variant, and a variant `height` that is not a positive number.
- **Families:**
  - `overtheedge` (label "Over the Edge"): wordmark `full`, `lockupSymbol: false`, `stackedWordmark: "stacked"`;
  - `words` (label "Over the Edge, without subtext"): wordmark `words`, `lockupSymbol: false`, `stackedWordmark: "stacked"`.
- **Palette** (keys are file names):

  | Key | Hex | Source |
  | --- | --- | --- |
  | forest | #155329 | logo green, site `--primary` |
  | pine | #0C3B1C | site `--brand-active` |
  | newsprint | #F5F1E6 | site `--background` |
  | ink | #262626 | logo subtext, site `--card-foreground` |
  | lichen | #E3EFCF | site dark-theme primary, logo on dark |
  | sage | #6AA380 | April 2025 cover |
  | moss | #466855 | April 2025 cover |
  | kraft | #D4C8AA | site `--accent` |
  | pulp | #DBD0BA | site `--border` |
  | bark | #7D6B56 | site `--muted-foreground` |
  | proof | #B54A35 | site `--destructive`, used only for "Breaking" and "Correction" |
  | white | #FFFFFF | |

  `roles`: ink ink, paper newsprint, muted bark, primary forest, light lichen, reverse white, line pulp, rule kraft.

  `logoColours`: forest, ink, white, lichen, currentColor. `rasterColours`: forest, ink, white, lichen.
- **Typefaces** (roles):

  | Role | Face | Files |
  | --- | --- | --- |
  | `display` | Source Serif 4 Bold | in `fonts/` |
  | `displayRegular` | Source Serif 4 Regular | in `fonts/` |
  | `deck` | Source Serif 4 Italic | in `fonts/` |
  | `extra` | Anton Regular | in `fonts/` |
  | `body` | Inter Regular | the repository's shared file, looked up as the starter does |
  | `bold` | Inter SemiBold | the repository's shared file |
  | `label` | IBM Plex Mono Medium | in `fonts/` |
  | `hand` | Gochi Hand Regular | in `fonts/` |

  Uses:
  - Anton (`extra`) is for uppercase cover lines, section fronts and page or day numbers only;
  - labels are Plex Mono, uppercase, +0.08 em;
  - Gochi Hand appears at most once per template, never for information.

  Anton and Gochi Hand stand in for the print covers' faces, which are not known. The brand README says so.
- **Font files**: six TTFs and four licence files, downloaded once from their upstream repositories and recorded in `fonts/README.md` with URL and SHA-256:
  - `google/fonts` `main`: `ofl/anton/Anton-Regular.ttf`, `ofl/ibmplexmono/IBMPlexMono-Medium.ttf`, `ofl/gochihand/GochiHand-Regular.ttf` and each folder's `OFL.txt`, renamed `<Family>-OFL.txt`;
  - `adobe-fonts/source-serif` `release`: `TTF/SourceSerif4-Regular.ttf`, `-Bold.ttf`, `-It.ttf` and `LICENSE.md`, renamed `SourceSerif-OFL.md`.
- **Contrast.** Every template text element has a ground: its template's background, or the fill named by an optional `ground` key on the element, for text on a panel. Pass needs at least 4.5 : 1 against the ground, or 3 : 1 for text 24 px and larger. Measured pairs, all passing:
  - ink on newsprint 13.4; bark on newsprint 4.53;
  - forest on newsprint 8.1; white on forest 9.1; lichen on forest 7.6;
  - white on pine 12.7; lichen on pine 10.6; white on moss 6.2; ink on sage 5.2;
  - proof on newsprint 4.7; white on proof 5.3.

  Sage on pine (4.3) and sage on forest (3.1) are allowed only for text 24 px and up.
- **Print devices**, as template elements:
  - dashed index rules: a template `path` with `dash`. The shared stroke helper in `src/engine/templates.js` already writes `stroke-dasharray` for `path` and `line`, but the element list at the top of that file and `docs/brand-schema.md` name `dash` only for `rect`. M2 documents it, with no code change;
  - zero-padded page numbers in Anton;
  - a volume and issue dateline in Plex Mono;
  - a photo well in a forest frame with a 4 px white keyline;
  - the masthead: a forest block holding the white full logo, beside a forest date box.
- **Clear space and minimum sizes.** Clear space is half the O's height (42.8 logo units) on every side. The subtext's capitals are 14.37/690.72 of the full logo's width.

  | | Screen (CSS px) | Print (mm) |
  | --- | --- | --- |
  | Full logo, width | 288 (subtext capitals 6 px) | 58 (subtext capitals 1.2 mm) |
  | `words`, width | 96 | 20 |
  | The O, height | 16 | 5 |

  Below the full logo's minimum, use `words`; below `words`, the O. `lockup` records `minimumHorizontalWidthPx` 288, `minimumHorizontalWidthMm` 58, `minimumSymbolHeightPx` 16 and `minimumSymbolHeightMm` 5.

  **How it is measured.** A logo's visible width in a template is converted:
  - for a template with `physical`, to mm: `width × physical width (mm) / template width`, checked against the print column;
  - for any other template, and every guide page and sheet (1440 px pages), as CSS px, checked against the screen column.

  The guide frame logo is `words` at 150 px.

  **Exception.** The app's own header (`src/app/ui.jsx`, `mastheadArt`) draws the first family's horizontal logo at app-chrome size. It is not a brand application, so it is not held to this, as for every brand.
- **Copy rule and scan.** The scan covers every human-readable string in `brand.json`:
  - template text and paragraph `text`;
  - guide page titles, subtitles and element text;
  - sheets;
  - `copy.*`, `web.intro.*` and `web.landing.*`;
  - plus `docs/README.md` and `docs/CHANGELOG.md`.

  Rules:
  - (a) No em dashes.
  - (b) A template string is one of:
    - a bracketed placeholder, or a string containing one (`VOLUME [00] | ISSUE [0]`);
    - a sourced line;
    - a fixed label on the test's list of locked labels (IN THIS ISSUE, PRESS, CALENDAR, WHERE, WHEN, HOST, OVERTHEEDGE.UNBC.CA, READ AT OVERTHEEDGE.UNBC.CA, READ IT AT OVERTHEEDGE.UNBC.CA, OVERTHEEDGE.UNBC.CA/CALENDAR, "[ROLE] · OVER THE EDGE", UNBC'S STUDENT NEWSPAPER).
  - (c) Digits outside brackets and `{placeholders}` appear only in these exempt categories:
    - template `title`s (canvas dimensions);
    - guide spec values (hex codes, contrast ratios, sizes in px and mm, logo units);
    - the folio and version, which the engine draws;
    - an allowlist of sourced facts kept in the test with their source: "VOLUME 32 · ISSUE 2 · OCTOBER 16, 2025" and "OCTOBER 16TH" (October 2025 cover), and the site headline "Bears Don’t Really Hibernate… Or Do They?".

  Page numbers in templates are bracketed placeholders (`[03]`). A manual review of every added sentence is recorded in STATUS.

  Amendment during implementation: numbered-list markers in the docs, and two names that contain a digit (the typeface "Source Serif 4", the paper size "A4"), are also exempt. The logo sheet is unnumbered, because there is one. Logos on a panel carry a `ground` key, as text does.

  Amendment after the completion audit (B2): the complete list of exemptions the test applies, and nothing broader:
  - hex codes;
  - measured sizes in px and mm, contrast ratios written "N : 1", and logo units;
  - canvas dimensions "W × H";
  - version numbers "vN.N", and the CHANGELOG's version headings;
  - the dates the sources were published or read: "22 October 2026", "April 2025", "October 2025";
  - the names "Source Serif 4" and "A4";
  - numbered-list markers in the docs.

  A negative test shows "3.5 million readers", "(12)", "10 May 2024", "March 2019", "since 1994", "RGB 1, 2, 3" and "40% of students" are still caught. Every ratio the guide states is written "N : 1".
- **`copy` and `web`.**
  - `copy`: `tagline` "UNBC's Independent Student Newspaper", `descriptor` "News · Clubs · Events · Calendar", `logoLabel` "Over the Edge logo", `motifLabel` "Over the Edge O", `svgDescription`, `templateDescription`.
  - `web`: `componentName` OverTheEdgeLogo, `symbolComponentName` OverTheEdgeO, `cssPrefix` ote, `appIcon` (white O on forest), `favicon` (forest, lichen in dark), and `intro` and `landing` written from the sourced lines and bracketed placeholders.
  - The descriptor is condensed from the site's navigation (News, Clubs, Calendar) and hero ("events"). It is on the allowlist with that source.
- **`files`** (the kit's copies), each verified with `findAsset` (`src/fonts/node.js`) so shared files resolve as the engine resolves them:
  - `README.md` and `CHANGELOG.md` from `docs/`;
  - `logos/source/overtheedge-site-light.svg` and `-dark.svg` from `reference/`;
  - `fonts/README.md`;
  - the six TTFs;
  - the four licences (`Anton-OFL.txt`, `IBMPlexMono-OFL.txt`, `GochiHand-OFL.txt`, `SourceSerif-OFL.md`);
  - the shared Inter files: `fonts/Inter-OFL.txt`, `fonts/desktop/Inter-Regular.ttf`, `fonts/desktop/Inter-SemiBold.ttf`, `fonts/web/Inter-Regular.woff2` and `fonts/web/Inter-SemiBold.woff2`.

  Every face has a `web` path; `deck` has `style: "italic"`.
- **Recorded decisions.**
  - First Form's editable-text wordmark and small-size (`micro`) symbol are omitted. The logo is the source's own outlines, not a font, so a live-text stand-in would misrepresent it; the O has no thin parts to thicken.
  - `overtheedge-stacked-*` and `words-stacked-*` are identical by design (both families stack OVER / THE / EDGE). Each family's horizontal and wordmark layouts differ only in scale.
  - The site's two-colour logo (forest words, ink subtext) is shipped unchanged in `logos/source/`. Every engine-drawn logo is one colour.

### Requirements (M2)

- **OTE-001 Fonts.** Pass when:
  - the six TTFs and four licence files are in `brands/overtheedge/fonts/`, with `fonts/README.md` listing each upstream URL and a SHA-256 that a test recomputes;
  - every `files` entry resolves with `findAsset`, and every face has a `web` path that resolves the same way;
  - `loadBrandFontsFromDisk(brand, folder)` reports no failures.
- **OTE-002 Logo from source.** Pass when a test, parsing `reference/logo-site.svg` independently of the script, finds:
  - `glyphs.over`, `the`, `edge` and `subtext` each equal the concatenation of that group's `d` attributes, and `glyphs.apostrophe` equals the single path outside `#Subtext` and `Main_Logo`;
  - the symbol's one path equals the first `over` path;
  - each vendored SVG's SHA-256 equals PROVENANCE.json's, and the two copies differ only in their fill values;
  - groups are found by position as described in Sources;
  - each variant's `width` and `height` are within 0.5 units of independently sampled bounds.
- **OTE-003 Engine options.** Pass when unit tests show:
  - a variant `height` changes only that variant's scale;
  - `lockupSymbol: false` gives a horizontal lockup with no `data-brand-symbol` and a stacked lockup drawing `stackedWordmark` with no symbol;
  - with the options absent, other brands render byte for byte as before:
    - `test/regression.test.js` passes unchanged;
    - a new golden manifest, `test/fixtures/base-3a7cd38-brands.json`, holds every vector and text render of First Form and northwind. `golden-base.mjs` gains an exported `computeBrandRenders(root, ids)` and a `--brands firstform,northwind` option. It hashes vector and text entries only (`assets: false`), because northwind's `files` resolve to other brands' folders; It is made **before** any engine file changes, from an export of `3a7cd38`: `git archive 3a7cd38 | tar -x -C <scratch>` and `node scripts/golden-base.mjs --brands firstform,northwind <scratch>`;
    - `test/brands-regression.test.js` asserts no changed, missing or added path for either brand;
    - the BC brands use `signatures`, which `lockup()` handles before the changed code (artwork.js:97), and their tests pass;
  - `validateBrand` reports a bad `stackedWordmark`, a bad variant `height` and a non-boolean `lockupSymbol` (negative fixtures);
  - a template `path` with `dash` has `stroke-dasharray`, and one without has none (the existing behaviour, now tested);
  - `docs/brand-schema.md` documents the four keys (variant `height`, `lockupSymbol`, `stackedWordmark`, and `dash` on template `path` and `line`); a docs test finds them.
- **OTE-004 Palette, roles, logos.** Pass when:
  - colours, roles, logo and raster colours are exactly as above;
  - every template and guide colour resolves into the palette, or is `none`;
  - `planKit` includes `logos/outlined/overtheedge-horizontal-forest.svg`, `-stacked-forest.svg`, `-wordmark-forest.svg` and `symbol/overtheedge-symbol-forest.svg`, with no path twice;
  - the horizontal logo file has no `data-brand-symbol`.
- **OTE-005 Templates.** Fourteen, each with a field and placeholders:
  - `business-card-front` and `business-card-back` (90 × 50 mm + 3 mm bleed, as First Form);
  - `press-pass` (54 × 86 mm);
  - `letterhead-a4`;
  - `issue-cover` (1080 × 1350: masthead, date box, photo well with keyline, three-entry dashed index, hand note "Over the Edge is here!");
  - `story-post` (1080 × 1350);
  - `issue-out` (1080 × 1080);
  - `event-post` (1080 × 1080);
  - `story-vertical` (1080 × 1920);
  - `share-image` (1200 × 630);
  - `social-banner` (1584 × 396);
  - `slide-title`, `slide-section` and `slide-close` (1920 × 1080).

  Pass when each:
  - renders outlined with fonts loaded, with no `<text`, `NaN` or `undefined`;
  - passes the contrast rule;
  - places every logo at or above its minimum, measured as in "How it is measured";
  - draws each logo in a colour with at least 3 : 1 contrast against its ground;
  - sets Anton (`extra`) text in capitals only (placeholders included);
  - has at most one `hand` element.

  The press pass uses `words` (40 mm) with "UNBC'S STUDENT NEWSPAPER" in Plex Mono beneath, because the full logo would be under its 58 mm print minimum there. That line is a label, as on the October 2025 cover, not a logo variant; the brand README says so.

  The scan in "Copy rule and scan" passes, and the manual review of every added sentence is recorded in STATUS.
- **OTE-006 Icons.** Ten on a 24 grid with the site's stroke attributes (2, round caps and joins, no fill):
  - the site's search, sun, moon, close and arrow-right paths, unedited;
  - newspaper, calendar, clubs, pen and archive, drawn new.

  Pass when:
  - they use only `currentColor` or `none`;
  - the five site icons' inner markup equals the markup in `reference/site-icons.json`, normalised for whitespace.

  `reference/site-icons.json` is vendored once, with its SHA-256 in PROVENANCE.json. It names each icon's source element:
  - the header search button's `<svg>` (search);
  - the theme toggle's two stroked `<svg>`s (sun, moon);
  - the search overlay's stroked close `<svg>` (`M18 6L6 18M6 6l12 12`), not the WordPress filled close glyph;
  - the arrow from `assets/css/button-animations.css`'s data URI.
- **OTE-007 Patterns.** Pass when each renders and passes the palette check:
  - `o-repeat`: newsprint ground, pulp O's;
  - `o-crop`: forest ground, pine O cropped large;
  - `o-field`: lichen ground, one forest O.
- **OTE-008 Guide.** (Amended in M3: nine pages, with Motion before Files. See OTE-008 under M3.) Eight framed pages:
  1. Primary logo
  2. Logo family
  3. Clear space and sizes
  4. Colour
  5. Typography
  6. Print devices and patterns
  7. Applications
  8. Files

  Plus one logo reference sheet. Frame header "{upperName} / BRAND GUIDE / V{displayVersion}", footer "{upperName} / UNBC'S INDEPENDENT STUDENT NEWSPAPER", frame logo `words` at 150 px. Pass when:
  - every page and the sheet render without `NaN` or `undefined`;
  - only palette colours appear;
  - every guide `logo` element and the frame logo meets the screen minimum. Nested template thumbnails are exempt, because each template is checked at full size under OTE-005;
  - the Colour page states every measured pair in the Contrast decision (eleven, plus the two for text 24 px and up). The test checks each stated value against the palette to its stated precision (bark on newsprint 4.53).
- **OTE-009 Brand definition and script.** Pass when:
  - `scripts/brands/overtheedge.mjs` writes `brands/overtheedge/brand.json` and updates `brands/index.json`;
  - `npm run make:overtheedge` exists, and running it twice leaves `git diff --exit-code -- brands/overtheedge brands/index.json` clean;
  - `validateBrand` returns no problems, and `node bin/brandkit.mjs check brands/overtheedge/brand.json` exits 0;
  - the script reads nothing outside the repository;
  - a missing input exits 1 naming the file. Procedure, recorded in STATUS: in a copy of the working tree without `.git` (`node_modules` linked), move `brands/overtheedge/reference/logo-site.svg` aside and run `npm run make:overtheedge`;
  - every path in `files` exists.
- **OTE-010 Docs.** Pass when a test finds:
  - `brands/overtheedge/docs/README.md` (start here, what it is built from, rules in brief, contents, the font stand-ins);
  - `docs/CHANGELOG.md` with "## 1.0 - 22 October 2026";
  - `reference/README.md` and `PROVENANCE.json` (with the cover records, the two logo copies and `site-icons.json`);
  - a row for `brands/overtheedge` and `npm run make:overtheedge` in the root README.
- **OTE-011 No regression.** Pass when:
  - `npm test` passes with only the 2 known skips;
  - `npm run build` succeeds, with its size recorded;
  - the existing brand files are unchanged (`git diff --exit-code -- brands/firstform`);
  - `git diff --check` is clean.
- **PROCESS-002 M2 audits.** Readiness and completion audits PASS, recorded in STATUS. Work stays on `overtheedge-brand`. Nothing is committed without the user's approval, nothing is pushed, and the untracked `sites/` stays out of every commit.

## M3: Over the Edge motion, brand details and site (same branch)

### Decisions

- **Motion data.** `scripts/brands/overtheedge-motion.mjs` follows `firstform-motion.mjs`: `TOKENS`, `RULES`, `STUDIES`, `motionPage()`, `motionCss()`, `motionReadme()`, `lockupMarkup()` and `markMarkup()`.
  - Tokens: durations quick 160, base 240 (the site's two), slow 480, draw 1200, loop 1600 ms; easings settle `cubic-bezier(.2,.6,.2,1)` (the site's), move `cubic-bezier(.6,0,.2,1)`, linear; stagger 80 ms; distance 16 px.
  - Rules: the logo only arrives and then holds (words print in one at a time, never bounce, spin, blur or change colour); one thing at a time; loops are for waiting, and the full logo never loops; still is a valid frame (reduced motion shows the final frame).
  - Thirteen studies:
    - logo: `press`, `stack`, `ink`;
    - loading: `rolling-rules`, `page-count`, `o-fill`, `airplane`;
    - interface: `headline`, `card-pick` (the site's −0.4° card tilt), `index`, `chip`, `turn-page`, `skeleton`.
- **Motion files.** `brands/overtheedge/motion/{index.html, motion.css, motion-tokens.json, README.md}`, written by `make:overtheedge`. `brand.motion = { page, css, tokens, rules, studies }`, and the four files are in `files`, so the Motion tab shows it as it does First Form's.
- **Guide.** A Motion page goes before Files, so the guide has nine pages. It shows four still frames of `press` and the token table.
- **Brand details page.** `docs/brand-details.html` is one self-contained page in First Form's shape, shipped as `guidelines/brand-details.html`. It covers positioning and voice, logo rules, colour with contrast, type, icons, print devices, templates, motion and where the brand can go next. The faces it uses are embedded from the brand's own files as `data:` URIs, so it needs no network and the "no console errors" check does not depend on Google Fonts. The logo is inline SVG drawn by the script. The site and the motion page do the same.
- **Site.** `brands/overtheedge/site/` holds a redesigned homepage for the paper in "Forest press":
  - masthead header;
  - a hero with the latest issue and its dashed index;
  - top stories as square-cornered cards;
  - a calendar strip and "Get involved".

  It uses `assets/motion.css` (the same file as `motion/motion.css`), and an inline header logo and loader between `<!-- ote:logo -->` and `<!-- ote:loader -->` markers that the script rewrites. Story text on the page is bracketed placeholders apart from the sourced lines. Screenshots at 1440 and 390 px are in `site/screenshots/`. The site is not shipped in the kit, as First Form's is not.

### M3 decisions added before its readiness audit (2026-10-22)

These were settled while drafting the three pages in the scratchpad, outside the repository, during the M2 audits. They add to the M3 decisions above, and replace them where they differ.

- **Files.**
  - New generator modules:
    - `scripts/brands/overtheedge-motion.mjs`: `TOKENS`, `RULES`, `STUDIES`, `motionCss()`, `motionPage()`, `motionReadme()`, `lockupMarkup()`, `markMarkup()`, `embeddedFonts()`;
    - `scripts/brands/overtheedge-details.mjs`: `detailsPage()`.
  - `make:overtheedge` writes:
    - `brands/overtheedge/motion/{index.html, motion.css, motion-tokens.json, README.md}`;
    - `brands/overtheedge/docs/brand-details.html`;
    - `brands/overtheedge/site/assets/motion.css`;
    - `brands/overtheedge/site/licenses/` (copies of the OFL texts of the faces the site embeds);
    - the site's marked regions.
  - `site/index.html` is written by hand once. The script rewrites only what lies between its markers.
- **Embedded fonts.** No page loads anything from the network.

  | Page | Faces embedded as `data:` URIs |
  | --- | --- |
  | Motion page | Source Serif 4 Bold, Inter Regular, IBM Plex Mono Medium, Anton |
  | Brand details | the motion page's faces, plus Gochi Hand |
  | Site | the brand details faces, plus Inter SemiBold |

  The site's `licenses/` holds `Anton-OFL.txt`, `IBMPlexMono-OFL.txt`, `GochiHand-OFL.txt`, `SourceSerif-OFL.md` and `Inter-OFL.txt`. They are byte copies, covered by `.gitattributes` as the brand's fonts are.
- **Site markers**, each rewritten on every run, so the script stays idempotent:
  - `<!-- ote:fonts -->`: the `@font-face` rules;
  - `<!-- ote:logo -->`: the header logo, animatable per word;
  - `<!-- ote:issue-logo -->`: the logo in the latest-issue panel;
  - `<!-- ote:loader -->`: the O for the first-visit intro.
- **Site motion.**
  - On the first visit in a session, the O fills while the page and fonts load (600 ms to 2.5 s); then the intro slides away.
  - On every load, the header logo plays the Press study and the hero headline rises.
  - Sections rise in as they come into view.
  - Story cards tilt on hover, as in Card pick.
  - Everything rests on its final frame, so the page reads the same without scripts or with reduced motion.
- **Guide Motion page** (page 8 of 9, before Files): four still frames of Press, from the first word dropping to the still logo, drawn as guide `path` elements. They are the glyphs with an element-level `transform` and `opacity`, which the guide already supports. The page also shows the token table and the four rules.
- **Copy in the M3 pages.**
  - No em dashes.
  - Site story text is bracketed placeholders.
  - Real headlines appear only from the site or the October 2025 cover. The allowlist:
    - "Bears Don’t Really Hibernate… Or Do They?" and "The Forgotten Crest";
    - "Bests of Home Echo at the Prince George Garba Night 2025", "Green So Far" and "So I Accidentally Became Someone’s Boss (And It Was Weird)";
    - the cover's page numbers 03, 05 and 10;
    - the site's labels "Top Stories", "View all", "Read News" and "Explore Events", and its navigation names.
  - A story shown with a real headline gets a bracketed section, because the site files these stories as "Uncategorized".
  - The visible-text scan (`document.body.innerText`, in the browser check) applies the M2 exempt categories. Measured values may also be in ms, %, and °. The rule against invented figures stands.
- **Browser check** (`test/browser/overtheedge.check.mjs`, local only, as M1's). It opens the motion page, the brand details page and the site at 1440 and 390 px, and checks:
  - no horizontal overflow, no console error and no failed request, on each page;
  - the motion page has 13 tiles with `data-study`;
  - with `reducedMotion: 'reduce'`, no animation is running in any `.play` element, and the Press tile's words are at rest (identity transform);
  - the site shows its marked logo, and the visible-text scan passes on all three pages.

  It writes the site's four screenshots (desktop and mobile, first screen and full page, as First Form's `site/screenshots/` are), and a report outside Git. A negative control (`OTE_BROKEN=1`) injects an off-palette colour and a running animation under reduced motion, and must exit 1.
- **Unit tests** (in `test/overtheedge.test.js`, under an M3 heading):
  - every study has its fields, ids are unique, and there are 13;
  - the CSS defines `--ote-<duration>`, `--ote-<easing>` and `--ote-stagger`, and has a `prefers-reduced-motion: reduce` block;
  - every hex colour in the CSS and the three pages is a palette colour, with transparency as `opacity` or `color-mix` of palette variables (the requirements below govern where this section differs);
  - no `NaN` or `undefined`;
  - the page has a `data-study` for every study, and the kit plan lists the four motion files and `guidelines/brand-details.html`;
  - the site's `assets/motion.css` equals `motion/motion.css`;
  - each site marker holds inline SVG (or `@font-face` rules);
  - every local `src` and `href` exists, and the licence files are present;
  - nine guide pages render.

### Requirements (M3)

These replace M3's earlier requirement text and fold in every check from "M3 decisions added before its readiness audit" (readiness audit finding C1).

- **OTE-012 Motion library.** Pass when unit tests show:
  - thirteen studies with unique ids, each with `name`, `kind`, `timing`, `use` and `description`, and kinds in the order logo ×3, loader ×4, interface ×6;
  - the page has `data-study="<id>"` for every study;
  - `motion.css` defines `--ote-<duration>`, `--ote-<easing>`, `--ote-stagger` and `--ote-distance`, and has a `prefers-reduced-motion: reduce` block;
  - `motion-tokens.json` matches `TOKENS`, and the README lists the rules, tokens and studies;
  - in the page and the CSS:
    - no `NaN` or `undefined`;
    - every hex colour is a palette colour;
    - transparency is only `opacity` or `color-mix()` of a palette variable (`var(--ote-<colour>)`) with `transparent`;
    - no `http(s)` URL in any `src`, `href`, `@import` or `url()`. The page is self-contained, because the app shows it through a hashed asset URL;
  - the page embeds exactly the faces in the M3 table (Source Serif 4 Bold, Inter Regular, IBM Plex Mono Medium, Anton) as `data:` URIs. Inter comes from the shared woff2; the others are the brand's TTFs;
  - the kit plan lists the four motion files.

  The browser check (`test/browser/overtheedge.check.mjs`) passes at 1440 and 390 px:
  - every study tile is present;
  - no horizontal overflow, no console error, no failed request and no request off the local server;
  - every computed colour is a palette colour (alpha allowed);
  - under `reducedMotion: 'reduce'`, no animation runs in a `.play` element, and the Press tile's words are at rest;
  - in the app (Vite dev server), `?brand=overtheedge&view=motion` shows the Motion tab's frame with the 13 tiles.

  `OTE_BROKEN=1` (an off-palette colour and an animation that ignores reduced motion) makes the check exit 1. The check writes `test/browser/overtheedge-report.json`, which is git-ignored.
- **OTE-013 Guide Motion page.** Nine pages render without `NaN` or `undefined`. The Motion page is page 8, before Files, with four Press frames (OVER in each), the token table and the rules, in palette colours only. OTE-008 is amended to nine pages to match (finding C2).
- **OTE-014 Brand details.** Pass when:
  - `docs/brand-details.html` is in `files` as `guidelines/brand-details.html`;
  - it has the inline logo, no `NaN` or `undefined`, only palette hex colours, and no em dashes;
  - it embeds exactly Source Serif 4 Bold, Inter Regular (woff2), IBM Plex Mono Medium, Anton and Gochi Hand as `data:` URIs, and makes no external request.

  The browser check at 1440 and 390 px finds no horizontal overflow, no console error, no failed or external request, palette colours only, and a visible-text scan that passes.
- **OTE-015 Site.** Pass when unit tests show:
  - `site/assets/motion.css` equals `motion/motion.css`;
  - the four markers hold their artwork:
    - `ote:fonts`: `@font-face` rules for Source Serif 4 Bold, Inter Regular and SemiBold (woff2), IBM Plex Mono Medium, Anton and Gochi Hand;
    - `ote:logo` and `ote:issue-logo`: `svg.ote-lockup`;
    - `ote:loader`: `svg.ote-o`;
  - every local `src` and `href` exists;
  - `site/licenses/` holds `Anton-OFL.txt`, `IBMPlexMono-OFL.txt`, `GochiHand-OFL.txt`, `SourceSerif-OFL.md` and `Inter-OFL.txt`, each with the same SHA-256 as its source: the brand's `fonts/` for the first four, and the library's `fonts/Inter-OFL.txt` (found by `findAsset`) for Inter's. `.gitattributes` covers `brands/overtheedge/site/licenses/*` as it covers the fonts;
  - only palette hex colours, and no em dashes;
  - `site/screenshots/` holds `desktop.jpg`, `desktop-full.jpg`, `mobile.jpg` and `mobile-full.jpg`;
  - `site/README.md` describes the page, its motion, its markers and the screenshots;
  - the site is not in the kit's `files`.

  The browser check at 1440 and 390 px shows no overflow, no console error, no failed or external request, palette colours only, a visible-text scan that passes, and the three marked artworks drawn. It writes the four screenshots.
- **OTE-016 Docs and size.** Pass when:
  - the brand README lists `motion/index.html` and `guidelines/brand-details.html`;
  - CHANGELOG has "## 1.0 - motion (22 October 2026)";
  - STATUS records the three pages' sizes and `npm run build` before and after M3, as OTE-011 did for M2.
- **OTE-008 (amended, finding C2).** The guide has nine framed pages (Motion is page 8, Files page 9). Its test changes from 8 to 9. OTE-008 returns to IMPLEMENTED and is re-verified in the M3 completion audit.
- **Copy scan (amended, finding C2).** The exemption list gains one category: durations in milliseconds ("N ms"), measured values like px and mm. They are used in the guide's Motion page and rules.
  - The negative test still catches "3.5 million readers", "(12)", "10 May 2024", "March 2019", "since 1994", "RGB 1, 2, 3" and "40% of students".
  - It also catches "12 issues".
  - The browser visible-text scan uses the same list, plus `%` and `°` for the motion study descriptions, the sourced headlines and page numbers above, bracketed placeholders, and token names and easing values.
  - "Latest News" is removed from the label allowlist: it is not on the homepage as served (finding C3).
- **PROCESS-003 M3 audits.** Readiness and completion audits PASS, recorded in STATUS. A pre-commit gate runs before any M3 commit, which needs the user's approval. Nothing is pushed, and `sites/` stays out.

### Out of the repository

After M3, the claude.ai design system published earlier in this conversation (https://claude.ai/artifact/43QHw3wkAjSsNicCSbsfxL) is updated to the same palette, type and devices. It is not part of these milestones' evidence.

### Validation (M2 and M3)

```sh
npm ci
npm test
npm run make:overtheedge && git diff --exit-code -- brands/overtheedge brands/index.json
node bin/brandkit.mjs check brands/overtheedge/brand.json
git diff --exit-code -- brands/firstform
npm run build
npx playwright install chromium && node test/browser/overtheedge.check.mjs   # M3
git diff --check
```
