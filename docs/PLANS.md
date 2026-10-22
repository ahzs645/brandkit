# Plans

## M1: ddcnorth v2.3, proposed (branch `ddcnorth-v2.3`)

Source requests (user, verbatim):

- 2026-10-22: "Add this as a new version for DDCNorth into this Git repo based on the current structure that the repo has, you can also add a section on a tab for motion library."
- 2026-10-22, later: "before you continue, there are some changes to the repo, pull the changes from the github first and add the new version with a motion library, like the one that exists in the firstform brranding in the updated repo"

"This" is the DDCNorth work reviewed in the website project:

- the redesigned site and its positioning ("Data · Design · Connection");
- the brand lab (pattern families, a data language, work templates, extra icons, voice);
- the motion library (18 studies).

The user chose to add it as a **proposed** revision beside the approved v2.1, like the existing 2.2 "rising symbol" proposal, and to keep these plan and audit records in this repository's `docs/`.

**Sources**, in the website repository `/Users/amiretminanrad/Documents/Github/website` at commit `4249136`:

- `docs/artifacts/src/brand-lab.html` (brand lab);
- `docs/artifacts/src/motion-library.html` (motion library);
- `index.html`, `404.html`, `assets/` and `docs/validation/screenshots/redesign-{1440,390}.jpg` (the site).

**Base.** The branch now holds the GitHub branch `origin/ddcnorth-v2.3-tgmas1` at `a2eeb09`. Four commits on top of `main` `93b7174` add First Form (`e5837a8`), the first version of these records (`979f16a`), First Form's motion library with a Motion tab for brands that have one (`457db39`), and First Form's site using it (`a2eeb09`). `git fetch` on 2026-10-22 showed nothing newer. The work below follows First Form's structure.

### How First Form is structured, and what ddcnorth v2.3 mirrors

| First Form | ddcnorth v2.3 |
| --- | --- |
| `scripts/brands/firstform-motion.mjs`: `TOKENS`, `RULES` and `STUDIES` as data, plus `motionPage()`, `motionCss()` and `motionReadme()` | `scripts/brands/ddcnorth-motion.mjs` with the same exports, plus `GUARDRAILS` and `GROUPS` |
| `brands/firstform/motion/{index.html, motion.css, motion-tokens.json, README.md}`, written by `npm run make:firstform` | `brands/ddcnorth/motion/` with the same four files, written by `npm run make:ddcnorth-v23` |
| `brand.motion = { page, css, tokens, rules, studies }`, with the four files in `files` | The same keys, plus `guardrails` and `groups`, in the v2.3 revision's `changes`, so they apply only while v2.3 is chosen |
| The Motion tab shows `motion.page` in a frame, only when `motionUrl(brand, source)` resolves; the share view offers it only when `brand.motion.page` is set | No change to that logic. The revised brand has `motion.page`; the approved brand and its shared view do not |
| `docs/brand-details.html`, shipped as `guidelines/brand-details.html` | `brands/ddcnorth/docs/brand-details.html`: the brand lab as a self-contained page, shipped through the revision's `files` |
| `site/` (index.html, assets, screenshots, README) | `brands/ddcnorth/site/`: the redesigned site from the website repository, its two screenshots, and a README naming the source commit |
| `test/firstform.test.js` | `test/ddcnorth-v23.test.js`, plus `test/regression.test.js` and `test/browser/ddcnorth-motion.check.mjs` |

### Scope and decisions

- **Git.** Work stays on branch `ddcnorth-v2.3` (local), based on `a2eeb09`.
  - Nothing is committed, pushed or merged without the user's approval.
  - Pushing `main` redeploys GitHub Pages (`.github/workflows/pages.yml`).
  - The shared ddcnorth link shows only the approved identity.
- **A proposal, not an approval.** There is one revision, written by `scripts/brands/ddcnorth-v23.mjs` (`npm run make:ddcnorth-v23`), which replaces only its own entry and its own files. The revision is:

  ```json
  { "id": "data-design-connection", "title": "Data, design, connection",
    "version": "2.3-data-design-connection", "displayVersion": "2.3",
    "status": "proposed", "date": "2026-10-22" }
  ```

  It goes after `rising` in `revisions`. It is a sibling proposal over v2.1, not over 2.2.
- **Appending in a revision.** Revisions replace arrays whole. `mergePatch` gains one operator, `{ "$append": [ … ] }`, which appends to the array it patches, or creates it.
  - An object with `$append` and another key throws. So does a non-array `$append`.
  - A nested `$append` inside appended items is kept literally.
  - Other patches behave as before.
  - `mergePatch` is a public export, so `docs/brand-schema.md` documents the change.
  - The revision appends to `patterns`, `templates`, `sets`, `icons.items`, `guide.pages` and `files`.
- **Colours.** The allowed set for v2.3 artwork is:
  - the six palette colours: `#000000`, `#F7F6F3`, `#4B4F56`, `#0B2B4A`, `#C8D7E8`, `#FFFFFF`;
  - the two role literals: `#D9DCDF` and `#CFD2D4`;
  - `none`;
  - `currentColor`, for icons only.

  This covers patterns, templates, icons, guide pages, the motion page and its CSS, and the brand-details page's artwork. Transparency is written only as `opacity`, `fill-opacity` or `stroke-opacity`, or as `color-mix`/`rgba` in the HTML pages' CSS. Each colour inside a `color-mix` or `rgba` must itself be a palette colour. One shared helper scans SVG `fill`, `stroke`, `stop-color` and `color` attributes, `style` declarations, and CSS colour values. Its own test proves it rejects an off-palette hex, an 8-digit hex and a named colour keyword.
- **Clear zones.** Complete marks are the logo and any complete six-dot symbol that is not a repeat or a crop. A complete mark's clear box is its visible artwork plus one dot diameter on every side. The box follows how the mark was placed:
  - **Template `logo`.** `placeLogo` scales `width` to the visible width. A logo of width w at (x, y) has visible artwork [x, x + w] × [y, y + w·120/767.142]. Its dot is 37.5·w/767.142.
  - **Guide `logo`.** The guide scales the padded lockup. With s = w/799.142, the artwork is [x + 16s, x + 783.142s] × [y + 16s, y + 136s], and the dot is 37.5s.
  - **`symbol` placed at height h, or a pattern `place` with scale s.** The artwork is the 256-unit box at that scale, and the dot is 80 units at that scale. A template `symbol` of height h has scale h/256.
  - **Motion page logo (the Settle study).** An inline `<svg viewBox="0 0 799.142 152">`. Its artwork is the element's box, inset by 16/799.142 of the width and 16/152 of the height. The dot is 37.5/799.142 of the width. This is checked in the browser.

  Intrusions:
  - Dots intrude when centre ± r overlaps the box.
  - Lines, polylines and path strokes intrude when they are sampled at most 1 unit apart and a sample falls inside.
  - Rects intrude when their boxes overlap.
  - Text intrudes when its box overlaps. The box is measured with the brand's fonts loaded from disk, through the engine's `measure` with tracking and anchor, from the face's ascent to its descent.

  Exempt: `motif` elements, `repeat`ed symbols, `place`d symbols that run past the canvas, and backgrounds. There is one negative fixture per placement path (template logo, guide logo, symbol, motion-page logo) in which a shape intrudes just outside the artwork. There is also a Space Mono label whose measured extent intrudes, although a 0.62 em estimate would not. Each must be reported.
- **Logo size.** This applies to every logo v2.3 adds. The guide's running frame logo (165 wide) is the approved v2.1 frame, inherited unchanged. At least 220 px of visible artwork:
  - for a template `logo`, its `width`;
  - for a guide `logo`, at least `width` ≥ 229.2;
  - for the motion page's Settle logo, at the study's 1920 px native width.
- **Typography and copy.** Headlines are Inter Display at −0.04 em and labels Space Mono at +0.12 em. New v2.3 text has no em dashes. The approved file's 13 existing em dashes are left alone.
- **Motion rules for ddcnorth.** These are the source's rules, and they differ from First Form's, whose logo studies assemble the mark. In ddcnorth:
  - motion lives in fields, paths and loaders;
  - the logo and the complete six-dot symbol never move, fade or pulse;
  - reduced motion shows the final frame.

  The motion page keeps the source's Web Animations implementation, and adds a `motion.css` in First Form's shape. The CSS holds tokens as custom properties, keyframes for the CSS-expressible moves (reveal, draw, loader), the classes the page uses, and a `prefers-reduced-motion: reduce` block.
- **Recorded decisions on the source.**
  - The brand lab's interactive pattern generator is not ported as a brandkit feature. The four families ship as fixed patterns in their source plates' colourways. The interactive generator still works inside `brand-details.html`, which is the brand lab page itself.
  - The five new icons use the kit's `icons.attrs` (2-unit stroke, butt caps, mitre joins, 64 grid), to match the existing five.
  - Charts in the guide and the brand-details page use illustrative values marked "Illustrative data".
  - The motion page keeps the source's five filters.
  - `brands/ddcnorth/site/` is a copy of the website at `4249136`, for reference, as First Form's `site/` is. The website repository remains its source.
  - The site is not shipped in the kit, because First Form's `site/` is not in its `files` either.
- **The kit.**
  - The approved kit stays as it is, apart from the allowed differences in BK-010.
  - The revision's `files` add the motion files and `guidelines/brand-details.html`.
  - `GROUP_BY_FOLDER` gains `motion: 'Motion'`, which also groups First Form's motion files.
  - For a revision whose `changes` touch none of `symbol`, `wordmark`, `families`, `lockup`, `colours`, `roles` or `logoColours`, the approved kit's `revisions/<id>/` carries no duplicate logos or symbols. Instead it carries:
    - the artwork the revision adds, as vector files: `patterns/`, `templates/` and `icons/`;
    - its added files, such as `motion/` and `guidelines/brand-details.html`;
    - its resolved `brand.json` (no `$append`);
    - a README.

    The README lists `comparison.svg` only when a `revisions` sheet has a path there. It lists `logos/` and `symbol/` only when they are written. It lists what the revision adds, by count and id. It explains approval as "append these items to these lists".
  - Rising's folder and README are unchanged.
- **Generator inputs (in this repository only).** The page sources are vendored as templates beside the scripts:
  - `scripts/brands/ddcnorth-v23/motion-library.template.html`, adapted from the website's `docs/artifacts/src/motion-library.html`;
  - `scripts/brands/ddcnorth-v23/brand-details.template.html`, adapted from `docs/artifacts/src/brand-lab.html`.

  The adaptations: a full document head; study metadata, tokens, rules, guardrails and filters read from injected JSON; alpha-hex colours replaced by palette colours with opacity; a `window.__ddcMotionLoops` counter in the loop scheduler; and font licence comments.

  The scripts fill exactly these placeholders:
  - `{{FONTS}}`: three `@font-face` rules with `data:` URIs read from `brands/ddcnorth/fonts/`;
  - `{{LOGO}}`: the engine's horizontal lockup in `currentColor`;
  - `{{LOGO_INNER}}`: the same lockup's inner markup;
  - `{{MOTION_JSON}}`: the motion data;
  - `{{LAB_JSON}}`: the brand-details data.

  Leftover `{{` fails the run. The scripts read nothing outside this repository. A missing input makes them exit with code 1 and a message naming the file.
- **`site/`.** `brands/ddcnorth/site/` is copied once from the website at `4249136` and is not written by any script. It holds:
  - `index.html`, `404.html` and `assets/`;
  - the two screenshots;
  - `licenses/`, the OFL texts the site's embedded fonts need;
  - a README recording each copied file's SHA-256.

  A test checks the files against those hashes. `site/` is exempt from the em-dash rule, because `404.html` is a byte copy and has one em dash.
- **Untracked `sites/`.** An untracked `sites/firstform-web-design/` appeared in the working tree at 02:31 on 2026-10-22. It is an empty nested Git repository with no commits and no remote. It is not part of M1. It is left untouched (not deleted and not ignored) and is kept out of every M1 commit. The user is asked whether it is theirs and where it belongs before any milestone-completion commit.
- **Amendments made during implementation** (reviewed in the completion audit):
  - The approved kit ships the brand's `CHANGELOG.md`, which records the proposal, so it is an allowed regression difference for the approved and rising kits.
  - A "resolved" `brand.json` has no `$append` outside the `revisions` list, which it keeps so the switcher can go back, as rising's does.
  - The motion page builds its tiles at runtime, so `data-study` is verified in the browser.
  - The golden manifest sorts its paths.
  - A new object key in `mergePatch` merges into an empty object (documented and tested).
- **App.** The only app change is a fallback: when the view is `motion` and `motionUrl(brand, source)` is null, the app goes to Overview and drops `view` from the URL. This happens on arrival, on switching brand or revision, and on a shared link.
- **CI.** `npm test` runs in CI, as today. `npm run test:browser` is local only, because the workflow deploys and adding Chromium would slow every deploy. Its results are recorded in `docs/STATUS.md`.

### Requirements

- **BK-001 Revision entry.** Pass when:
  - `revisions` is `["rising", "data-design-connection"]`, and the entry has the fields above plus `summary` and `rationale` (three or more points, no em dashes);
  - `rising` and every other top-level key are unchanged. This is checked against SHA-256 hashes of canonical JSON in the golden manifest (BK-010);
  - running `npm run make:ddcnorth-v23` and then `git diff --exit-code -- brands/ddcnorth` exits 0;
  - `npm run make:ddcnorth` keeps the entry. This is verified manually and recorded;
  - `validateBrand` reports each of: a revision missing `id`, `status` or `changes`; duplicate revision ids; `$append` outside `changes`; and, prefixed with the revision id, any problem in a resolved revision. Each has a negative fixture;
  - the approved brand and the resolved revision both validate clean.
- **BK-002 Append operator.** Pass when unit tests cover:
  - appending to an existing array;
  - creating a missing array;
  - object merge, array replace, scalar replace and null delete;
  - the three throwing cases;
  - a literal nested `$append`.

  It is documented in `docs/brand-schema.md`.
- **BK-003 Patterns and template elements.**
  - `pattern()` also draws `dots: [{ cx, cy, r, colour, opacity? }]` and `lines: [{ points, colour, width, opacity? }]`, beneath any `place`d symbols.
  - Templates gain `{ type: 'dots', dots: [[cx, cy, r], …], fill, opacity?, id? }` and `{ type: 'polyline', points, stroke, strokeWidth?, opacity?, id? }`.
  - `validateBrand` reports non-numeric or negative dot values, and lines or polylines with fewer than two points. Each has a negative fixture.
  - The revision appends four patterns:
    - `dot-network`: midnight ground; ice grid at opacity 0.45; a white path and nodes stopping outside the clear box of a white symbol;
    - `dot-field`: paper ground; midnight grid at 0.45; a midnight symbol given room;
    - `dot-ramp`: ice ground; midnight dots growing left to right;
    - `dot-signal`: midnight ground; ice dots sized by a fixed wave.

  Pass when each renders, appears in the revision's kit plan, passes the colour helper, and (for network and field) passes the clear-zone check.
- **BK-004 Templates.** The revision appends eight templates, each with `extension: "v2.3"`:
  - `slide-title` and `slide-finding` (1920 × 1080);
  - `social-insight` and `social-divider` (1080 × 1080);
  - `brief-cover` (A4, 794 × 1123);
  - `workshop-canvas` (A3, 1587 × 1123);
  - `share-image` (1200 × 630);
  - `linkedin-banner` (1584 × 396).

  It also appends the set `insight-slides`.

  Pass when each template:
  - renders with and without outlining, and with fonts loaded has no `<text`, `NaN` or `undefined`;
  - has a field;
  - passes the colour helper;
  - has logos at 220 px or more;
  - passes the clear-zone check, text included.

  The revision's PDF plan must also include `templates/pdf/sets/insight-slides.pdf`.

  An invented-facts scan passes when:
  - no `%` appears;
  - digits appear only inside bracketed placeholders or in `01 / PEOPLE`, `02 / INFORMATION` and `03 / DECISIONS`;
  - field defaults are bracketed or one of these brand lines: "Built for what’s next.", "From insight to impact.", "Let’s connect the dots.", "Data · Design · Connection", "Connection map";
  - the finding slide's figure is "03" beside "THREE DISCIPLINES".

  A manual review of every added sentence is recorded in STATUS.
- **BK-005 Icons.** The revision appends `dataset`, `layers`, `link`, `compass` and `lens` on the 64 grid. Pass when they use only `currentColor` or `none`. The existing five stay identical (BK-010).
- **BK-006 Copy and guide.** The revision sets:
  - `copy.descriptor` to "Data · Design · Connection";
  - `guide.frame.footer` to "SIX-DOT IDENTITY / DATA, DESIGN, CONNECTION / PROPOSED 22 OCTOBER 2026".

  It appends four guide pages:
  - **"Reading the name"**: D Data, D Design, C Connection with their definitions, and the symbol reading, as a proposal;
  - **"A data language"**: series order with a ≥3:1 contrast test, the ice rule, the opacity ramp at 100/85/70/55/40/25/10 %, the highlight, categories and big-numbers rules, a unit chart and a dot plot marked "Illustrative data", and the numerals 0–9;
  - **"Motion"**: the three rules, the token table, and four frames whose dots are guide `path` elements made of circle arcs, with no logo or symbol in them. A test checks the page for `NaN`;
  - **"Voice"**: the four lines with their uses, and the Say and Avoid lists.

  The descriptor renders on "Reading the name" and "Voice" through `{copy.descriptor}`, and as a literal in `social-insight` and `linkedin-banner`.

  Pass when:
  - the revision has 18 guide pages, and each renders without `NaN` or `undefined`;
  - the descriptor and the footer appear where stated;
  - no approved v2.1 output contains "Data · Design · Connection";
  - the new text has no em dashes;
  - the guide pages pass the colour helper and the clear-zone check.
- **BK-007 Motion library.** `scripts/brands/ddcnorth-motion.mjs` exports:
  - `TOKENS`, which are exact:
    - `durations`: quick 200, base 600, slow 1200, draw 1800;
    - `easings`: settle `cubic-bezier(.2,.7,.2,1)`, move `cubic-bezier(.6,0,.2,1)`, linear `linear`;
    - `stagger`: `{ field: [20, 30], loaderStep: 200 }`;
  - `RULES` (three, verbatim);
  - `GUARDRAILS` (`do` and `dont`, four each, verbatim);
  - `GROUPS`: fields (Field), paths (Path), states (Loader, Progress, State), data (Chart, Numerals), scenes (Transition, End card);
  - `STUDIES`: 18 entries `{ id, name, kind, group, timing, use, description, loop? }`, in source order, verbatim apart from em dashes;
  - `motionPage()`, `motionCss()`, `motionReadme()` and `motionTokens()`.

  `make:ddcnorth-v23` writes `brands/ddcnorth/motion/{index.html, motion.css, motion-tokens.json, README.md}`. The revision sets `motion = { page: "motion/index.html", css: "motion/motion.css", tokens, rules, guardrails, groups, studies }` and appends the four files to `files`.

  Pass when (unit tests):
  - study ids are unique, and every study has its fields;
  - the group counts are fields 7, paths 3, states 4, data 2 and scenes 2;
  - the page's embedded data lists all 18 ids, and its tiles carry `data-study="<id>"`, which only exist once the page has run, so the browser check verifies them;
  - the CSS defines `--ddc-quick`, `--ddc-base`, `--ddc-slow`, `--ddc-draw`, `--ddc-settle`, `--ddc-move`, `--ddc-linear`, `--ddc-stagger-field` and `--ddc-loader-step`, and has a `prefers-reduced-motion: reduce` block;
  - the page and CSS have no `NaN` or `undefined`, and pass the colour helper;
  - the page embeds the fonts it uses (Inter 400, Inter Display 500 and Space Mono 400) as `data:` URIs and loads nothing else. The app serves brand files at Vite asset URLs, so relative font paths would not survive a production build;
  - the README has the rules, the guardrails, the tokens and one line per study;
  - the revision's kit plan has the four motion files, grouped "Motion";
  - the approved plan has none of them outside `revisions/data-design-connection/`;
  - `motionUrl(withRevision(brand, …), source)` resolves, and `motionUrl(brand, source)` is null for the approved brand. These are tested with a stub `source`, importing `motionUrl` from the plain module `src/app/motion.js`.
- **BK-007a Revision folder in the approved kit.** Pass when the approved plan's `revisions/data-design-connection/` holds exactly:
  - `brand.json` (resolved: no `$append` outside the `revisions` list, which it keeps so the switcher can go back, as rising's does);
  - `README.md`;
  - the four `patterns/`, eight `templates/` and five `icons/` SVGs;
  - `motion/index.html`, `motion/motion.css`, `motion/motion-tokens.json` and `motion/README.md`;
  - `guidelines/brand-details.html`.

  It has no `logos/`, `symbol/` or `comparison.*`. The README:
  - names 4 patterns, 8 templates, 5 icons, 4 guide pages, 18 studies and the brand-details page;
  - says approval means appending these to `patterns`, `templates`, `sets`, `icons.items`, `guide.pages` and `files`, and adding `motion`, `copy.descriptor` and the footer;
  - does not contain `comparison.svg`, `logos/` or `$append`.

  Rising's folder matches the golden manifest, apart from its allowed `brand.json` difference.
- **BK-008 Motion tab and page in the browser.** `npm run test:browser` runs `test/browser/ddcnorth-motion.check.mjs`. It starts Vite on a free port, uses Chromium at 1280 and 390 px, and exits with code 1 on any failure. It writes `test/browser/report.json`.

  In the app:
  - The Motion tab shows for ddcnorth only while v2.3 is chosen, and for First Form, as before.
  - The tab shows the motion page's frame and the study count, "18 studies".
  - `?brand=ddcnorth&view=motion` without the revision lands on Overview without `view`. The rule is a pure helper, `viewOrOverview(view, motionUrl)`, in a plain module `src/app/motion.js`. `motionUrl` moves there too, and `Motion.jsx` re-exports it. `npm test` covers three cases: motion with a URL stays; motion without one becomes overview; other views are unchanged. Node cannot import `.jsx`, so no JSX loader is added for this.
  - Switching from v2.3 to v2.1, to rising, or to northwind while on Motion goes to Overview.
  - `share=1&view=motion` for ddcnorth lands on Overview.
  - Leaving the tab removes the frame.

  On the motion page, opened directly from `brands/ddcnorth/motion/index.html` through the dev server:
  - **Content.** It has the token table, three rules, the guardrails, five filters and 18 studies, each with a name, kind, timing, use and a button named "Replay <name>".
  - **Replay.**
    - Animations run on load.
    - Each replay starts a new animation in its stage, or changes the drawing for Fill and Signal, within 500 ms.
    - "Replay all" restarts them all.
  - **Pause.**
    - Pause stops every infinite animation and the page's frame loops. This is counted through the page's own loop scheduler, exposed as `window.__ddcMotionLoops`.
    - The pause button sets `aria-pressed="true"` and reads "Resume loops".
    - Replaying while paused keeps loops paused.
    - Resuming restarts them.
  - **Filters.**
    - The filters carry `aria-pressed`.
    - "Paths" shows exactly Connect, Branch and Timeline.
    - "All 18" restores all of them.
  - **Reduced motion.** No animation runs, the notice is visible, the controls are disabled, and every stage is drawn.
  - **Marks.** The logo never animates, and it keeps its clear box (motion-page formula above). A negative control, an animation injected on the Settle logo, must be reported.
  - **Keyboard.** Tab reaches the filters and the replay buttons, and Enter and Space activate them.
  - **Health.** There are no console errors, page errors, failed requests or external requests, and no horizontal overflow.
  - **Colours.** The page's rendered DOM passes the colour helper.
  - **Brand-details page colours.** At 1280 and 390 px, the colour helper scans the brand-details page's rendered DOM:
    - at load;
    - after selecting each of the six pattern families;
    - after selecting each of the four colourways.

    A negative control, an injected off-palette fill, must be reported. Source alpha-hex values are converted under the opacity rule before the page ships.
  - **Proof the check can fail.** A recorded run in which a deliberately broken assertion target is reported.
- **BK-009 Brand-details page and site.**
  - `brands/ddcnorth/docs/brand-details.html` is the brand lab as a full HTML page. It:
    - has its own doctype and head;
    - embeds the same three fonts as `data:` URIs, for the same reason, with a comment naming `fonts/Inter-OFL.txt` and `fonts/SpaceMono-OFL.txt`;
    - takes its logo from the brand's own artwork, generated by the script.
  - `brands/ddcnorth/site/` holds:
    - `index.html`, `404.html`, `assets/`, `licenses/` and `screenshots/{desktop,mobile}.jpg`, copied from the website at `4249136`;
    - a README naming that commit.

  Pass when:
  - every file the revision's `files` names exists;
  - the brand-details page passes the colour helper;
  - the brand-details page loads nothing from another origin, and in the browser has no console errors at 1280 and 390 px (in `npm run test:browser`);
  - every file in `site/` matches the SHA-256 recorded in `site/README.md`, and `site/index.html`'s recorded hash equals the website's `index.html` at `4249136`;
  - every `assets/` reference in it exists.
- **BK-010 No regression.** A golden manifest, `test/fixtures/base-a2eeb09.json`, is generated once with `node scripts/golden-base.mjs <export of a2eeb09>`. The export is a `git archive a2eeb09` outside the repository. The command and the output's SHA-256 are recorded in STATUS. The manifest records:
  - the SHA-256 of every `text` entry in `planKit(brand, { rasters: false, pdfs: false, assets: false })` for the approved brand and the rising revision;
  - `index` entries by path;
  - `asset` entries (from a plan with `assets: true`) by path and source-file SHA-256;
  - the canonical-JSON hash of each top-level key.

  Pass when:
  - `npm test` compares the branch with the manifest, and allows only these differences:
    - approved: `source/brand.json`, `revisions/rising/brand.json`, `CHANGELOG.md` (the brand's change log, shipped in the kit, which records the proposal as it records 2.2), and added paths under `revisions/data-design-connection/`;
    - rising: `source/brand.json` and `CHANGELOG.md`.

    Any other change, missing path or added path fails.
  - The comparator's tests show that a mutated render, a missing path and an extra path are each reported.
  - `npm test` passes from a copy of the tracked files without `.git`.
  - First Form's tests still pass.
  - `npm run build` succeeds.
  - `node bin/brandkit.mjs check brands/ddcnorth/brand.json` exits 0.
  - `git diff --check` is clean.
- **BK-011 Documentation.** Pass when a docs test finds:
  - in `docs/brand-schema.md`: `$append`, pattern `dots` and `lines`, template `dots` and `polyline`, and `motion.guardrails` and `motion.groups`;
  - in `brands/ddcnorth/docs/CHANGELOG.md`: a top entry "## Proposed: 2.3 - data, design, connection (22 October 2026)";
  - in `README.md`: the v2.3 proposal in the brands table, `npm run make:ddcnorth-v23` and `npm run test:browser`.
- **BK-012 Git and tooling.** `npm run build` output size is recorded in STATUS before and after, because the build bundles every brand file. Pass when:
  - the work is on `ddcnorth-v2.3`, nothing is pushed, and commits are made only with approval;
  - `playwright` is a pinned devDependency (`1.54.0`), with its lockfile;
  - `.gitignore` lists `test/browser/report.json`;
  - `git status` is unchanged by `npm run test:browser`.
- **PROCESS-001 Plan Guardian audits.** Pass when the readiness and completion audits for M1 return PASS and are recorded in STATUS.

### Validation

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
npm run build
node bin/brandkit.mjs check brands/ddcnorth/brand.json
npm run make:ddcnorth-v23 && git diff --exit-code -- brands/ddcnorth
git diff --check
```
