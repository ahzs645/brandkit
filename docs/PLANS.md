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

## M2: Over the Edge, "Forest press" (branch `overtheedge-brand`, from `ddcnorth-v2.3` at `3a7cd38`)

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
    - `test/regression.test.js` (ddcnorth) passes unchanged;
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
- **OTE-008 Guide.** Eight framed pages:
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
  - the ddcnorth and First Form brand files are unchanged (`git diff --exit-code -- brands/ddcnorth brands/firstform`);
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
- **Brand details page.** `docs/brand-details.html` is one self-contained page in First Form's shape, shipped as `guidelines/brand-details.html`. It covers positioning and voice, logo rules, colour with contrast, type, icons, print devices, templates, motion and where the brand can go next. The faces it uses are embedded from the brand's own files as `data:` URIs, as ddcnorth v2.3's pages are, so it needs no network and the "no console errors" check does not depend on Google Fonts. The logo is inline SVG drawn by the script. The site and the motion page do the same.
- **Site.** `brands/overtheedge/site/` holds a redesigned homepage for the paper in "Forest press":
  - masthead header;
  - a hero with the latest issue and its dashed index;
  - top stories as square-cornered cards;
  - a calendar strip and "Get involved".

  It uses `assets/motion.css` (the same file as `motion/motion.css`), and an inline header logo and loader between `<!-- ote:logo -->` and `<!-- ote:loader -->` markers that the script rewrites. Story text on the page is bracketed placeholders apart from the sourced lines. Screenshots at 1440 and 390 px are in `site/screenshots/`. The site is not shipped in the kit, as First Form's is not.

### Requirements (M3)

- **OTE-012 Motion library.** Pass when unit tests show:
  - unique study ids, and every study has `name`, `kind`, `timing`, `use` and `description`;
  - the page has `data-study="<id>"` for all thirteen;
  - the CSS defines `--ote-<token>` for every duration, easing and `stagger`, and has a `prefers-reduced-motion: reduce` block;
  - no `NaN` or `undefined`;
  - only palette colours, with transparency as `opacity` or `color-mix` of palette colours;
  - `planKit` includes the four motion files.

  A Playwright check (`test/browser/overtheedge.check.mjs`, local only, as M1's) loads the page at 1440 and 390 px. It confirms that:
  - every study tile is present;
  - nothing overflows horizontally;
  - with reduced motion, no animation runs and the logo study shows the still logo.
- **OTE-013 Guide Motion page.** Nine pages render without `NaN` or `undefined`, and the Motion page's frames use palette colours.
- **OTE-014 Brand details.** Pass when:
  - the file is in `files` as `guidelines/brand-details.html`;
  - it has no `NaN` or `undefined`, and has the inline logo;
  - its colours are palette only;
  - the browser check finds no horizontal overflow at 390 px and no console errors.
- **OTE-015 Site.** Pass when:
  - `site/assets/motion.css` equals `motion/motion.css`;
  - the `ote:logo` and `ote:loader` markers hold inline SVG;
  - every local `src` and `href` exists;
  - the browser check at 1440 and 390 px shows no horizontal overflow and no console errors;
  - the screenshots exist, and `site/README.md` describes the page and its motion.
- **OTE-016 Docs and changelog.** The brand README lists `motion/` and `guidelines/brand-details.html`; CHANGELOG has a "## 1.0 - motion" entry.
- **PROCESS-003 M3 audits.** Readiness and completion audits PASS, recorded in STATUS.

### Out of the repository

After M3, the claude.ai design system published earlier in this conversation (https://claude.ai/artifact/43QHw3wkAjSsNicCSbsfxL) is updated to the same palette, type and devices. It is not part of these milestones' evidence.

### Validation (M2 and M3)

```sh
npm ci
npm test
npm run make:overtheedge && git diff --exit-code -- brands/overtheedge brands/index.json
node bin/brandkit.mjs check brands/overtheedge/brand.json
git diff --exit-code -- brands/ddcnorth brands/firstform
npm run build
npx playwright install chromium && node test/browser/overtheedge.check.mjs   # M3
git diff --check
```
