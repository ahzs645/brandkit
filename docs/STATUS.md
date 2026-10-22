# Status

## M1: ddcnorth v2.3, proposed (branch `ddcnorth-v2.3`, from `main` at `93b7174`)

Started 2026-10-22. The user chose a proposed revision beside approved v2.1 and these records in this repository.

Baseline on `main` (93b7174): `npm test` 28 passed, 2 skipped (the parity tests, which need `DDCNORTH_KIT`), 0 failed.

## Independent audit record (M1)

1. M1 readiness audit: FAIL. Findings, all addressed in docs/PLANS.md and docs/TRACEABILITY.md:
   - F1: "identical to main" was unsatisfiable (source/brand.json and revisions/rising/brand.json necessarily change) and had no CI-safe baseline. Now a committed golden manifest from main 93b7174 with exact allowed differences and a comparator negative test.
   - F2: the approved kit's revision folder and README would have been wrong for an appending revision. New BK-007a fixes its contents and README wording; rising's folder is held to the manifest.
   - F3: unnamed engine extension points. Now specified: template `dots` and `polyline` elements, pattern `dots`/`lines`, guide source `motion/<id>`, the kit group "Motion", and validateBrand rules with negative tests.
   - F4: contradictory colour rules. Now one allowed set (six palette colours, two role literals, none, currentColor for icons), transparency only as opacity attributes, and one shared scanning helper with its own negative test.
   - F5: weak clear-box geometry. Now exact symbol and logo box formulas, circle, segment (sampled at 1 unit), rect and text tests, and a negative fixture.
   - F6: source content left out. Now mapped: "Reading the name" page; full data language (dot plot, numerals, rules); guardrails; Replay all and Resume; exact tokens including staggers; five filter groups with counts. Recorded decisions: no generator UI (one colourway per family as in the source plates); kit icon stroke attributes.
   - F7: descriptor and footer untested. Now exact footer text, where the descriptor renders, and its absence from v2.1.
   - F8: Motion tab edge cases. Now `viewsFor()` pure function with unit tests, URL fallbacks, shared-view rule, unknown study type, cleanup, accessibility and keyboard, and a negative control.
   - F9: browser tooling. Now `.gitignore` entry, pinned Playwright with lockfile, and a recorded decision that CI runs `npm test` but not the browser test.
   - F10: invented facts. Now an automated literal-text scan with an allowlist, plus a recorded manual review.
   - Non-blocking items adopted: BK-002 edge cases and documentation; BK-001 idempotency command and make:ddcnorth check; BK-004 outlined-text, NaN and set-PDF checks; BK-007 final frames, CSS variable names and README contents; BK-009 exact strings.
2. M1 readiness re-audit: FAIL. G1: the logo clear-box formula was right for templates but wrong for guide pages and undefined for the Settle frame. G2: the 0.62 em text-width estimate under-measured Space Mono labels. Non-blocking: name the revision validation checks, record asset entries in the manifest, allow a no-.git copy instead of a shallow clone, define which width the 220 px minimum means, and wrap only the motion module's loop scheduler.

## Change of base and direction (2026-10-22)

The user asked: "before you continue, there are some changes to the repo, pull the changes from the github first and add the new version with a motion library, like the one that exists in the firstform brranding in the updated repo". `git fetch` showed the local branch already fast-forwarded to `origin/ddcnorth-v2.3-tgmas1` (`a2eeb09`). The four commits on top of `main` `93b7174` add First Form (`e5837a8`), the first version of these records (`979f16a`), First Form's motion library with a Motion tab (`457db39`) and First Form's site (`a2eeb09`). Nothing newer was on GitHub.

docs/PLANS.md was rewritten to follow First Form's structure: a motion data script writing `brands/ddcnorth/motion/` and a revision `motion` entry for the existing Motion tab (in place of a new engine motion module and tab); a brand-details page and a `site/` folder; the golden baseline moved to `a2eeb09`. G1 and G2 and the non-blocking items are addressed in the rewrite: logo boxes per placement path with negative fixtures; text boxes measured with the brand's fonts and a Space Mono negative fixture; named validation checks; asset entries in the manifest; a no-.git copy check; the 220 px minimum per placement path; a loop counter exposed by the motion page's own scheduler.
3. M1 readiness re-audit of the rewritten plan: not completed. The auditor stopped on a usage limit (resets 2:30 am America/Vancouver). Implementation has not started and waits for this audit, as AGENTS.md requires. Prepared outside the repository meanwhile: a golden-manifest generator, run twice against an export of `a2eeb09` with identical output (deterministic), and identical to the current working tree's renders.
   - Plan amendment during the interrupted audit: the motion and brand-details pages embed their three fonts as `data:` URIs instead of linking `../fonts/web/`. The app serves brand files through Vite `?url` asset URLs, which are hashed and flattened in a production build, so relative font links would break there.
4. M1 readiness re-audit (third): FAIL.
   - H1: the generator would have read the website repository by absolute path. Fixed: the page templates are vendored under `scripts/brands/ddcnorth-v23/`, with the placeholders listed, a missing-input error, and a check for leftover placeholders. `site/` is copied once and checked by recorded hashes.
   - H2: the brand-details page's runtime colours were not scanned. Fixed: a rendered-DOM colour scan at load and in every pattern-family and colourway state, with a negative control. Alpha hex is converted under the opacity rule.
   - Non-blocking items adopted:
     - `site/` is exempt from the em-dash rule;
     - OFL licences are copied with the site and named in the pages;
     - the build size is recorded;
     - the guide Motion frames use `path` arcs;
     - the App fallback is a pure, unit-tested helper.
5. M1 readiness re-audit (fourth): FAIL.
   - J1: the planned unit tests imported `motionUrl` and `viewOrOverview` from `Motion.jsx`, which Node cannot load. Fixed: both now live in the plain module `src/app/motion.js`, and `Motion.jsx` re-exports `motionUrl`.
   - Non-blocking: `licenses/` added to BK-009's list of `site/` contents.
   - Non-blocking: an untracked `sites/firstform-web-design/` (an empty nested repository, created 02:31) is recorded as not part of M1. It is left untouched and kept out of commits; the user is asked about it.
6. M1 readiness re-audit (fifth): PASS. Implementation may begin. TRACEABILITY BK-007 now also lists `src/app/motion.js`.

## Implementation (M1)

Baseline at `a2eeb09` before any change: `npm test` 35 tests, 33 passed, 2 skipped (parity), 0 failed.

Plan amendments found during implementation, recorded here and in docs/PLANS.md:
- The approved kit ships the brand's `CHANGELOG.md`, which now records the proposal (as it records 2.2), so `CHANGELOG.md` joins the allowed regression differences for the approved and rising kits.
- "Resolved" `brand.json` means no `$append` outside the `revisions` list. Like rising's, the revision's `brand.json` keeps that list so the app's switcher can go back, and the list holds the raw patches.
- The motion page builds its tiles at runtime, so `data-study` attributes are verified in the browser check; the unit test checks that the embedded data lists all 18 ids.
- The golden-manifest generator sorts its paths: adding a revision folder changes the order in which `planKit` lists entries, not what they contain.

Implementation evidence (working tree on `ddcnorth-v2.3` over `a2eeb09`, uncommitted):
- `npm test`: 55 tests, 53 passed, 2 skipped (parity, needs `DDCNORTH_KIT`), 0 failed. It includes `test/ddcnorth-v23.test.js` (16 tests), `test/regression.test.js` (2) and First Form's tests.
- `npm test` from a copy of the files without `.git` (scratchpad, `node_modules` linked): 53 passed, 2 skipped, 0 failed.
- `npm run test:browser`: 20/20 checks passed (report in `test/browser/report.json`, ignored by Git).
- Recorded failing run: `DDC_BROKEN=1 npm run test:browser` fades the masthead logo first. It exited 1 with 18/20, both "motion page marks" checks failing.
- `npm run make:ddcnorth-v23` twice: the hashes of every file under `brands/ddcnorth/` (except `site/`) are unchanged by the second run.
- `npm run make:ddcnorth` (run in the scratch copy) leaves `brand.json` byte-identical, with revisions `[rising, data-design-connection]`.
- `node bin/brandkit.mjs check brands/ddcnorth/brand.json`: "no problems found", exit 0.
- `git diff --check`: clean.
- `npm run build`: succeeds. `dist` size 39,160 KB at `a2eeb09` and 42,072 KB on the branch (+2.9 MB: the motion and brand-details pages with embedded fonts, and the `site/` copy with its screenshots).
- Golden manifest: `node scripts/golden-base.mjs <git archive a2eeb09 in the scratchpad> > test/fixtures/base-a2eeb09.json`. Its SHA-256 is d4fe3cb0c28d1ac8824f8d7eb30821ede7ae6c1c3976fd79b90e626574c76429, and a second run gives identical output.
- Bug the new checks found and fixed during implementation: the brand-details ramp built 8-digit alpha colours at runtime; it now uses `color-mix` with the palette colour.
- BK-004 manual review of every added sentence in the eight templates. The locked lines are:
  - labels: PROJECT BRIEF, CLIENT, QUESTION, PEOPLE INVOLVED, INFORMATION WE HAVE, DECISION IT INFORMS, THREE DISCIPLINES, the descriptor, and 01 / PEOPLE, 02 / INFORMATION and 03 / DECISIONS;
  - the workshop instruction "Place a sticky note on a dot. Draw a line wherever one thing depends on another.".

  Field defaults are bracketed placeholders or the brand's own lines. No client, figure, testimonial or other factual claim is added. The guide's charts are labelled "Illustrative data".
- Observation, not a requirement: the app's Overview lists v2.3 under "Logo revisions" beside rising, where its approved and proposed logos are identical, because v2.3 does not change the logo.
7. M1 completion audit: FAIL.
   - K1: the colour helper had no unit test of its own, and it missed `hsl()` and named colours outside a 20-name list. Fixed: a unit test now proves it reports an off-palette hex, an 8-digit hex, `red`, `tomato`, `hsl(...)`, an off-palette `rgba` and a disallowed `currentColor`, and passes the palette. The helper now covers all 148 CSS named colours and `hsl`/`hsla`.
   - Non-blocking items adopted:
     - replay-all now requires a new animation in every animated stage and new drawings for Fill and Signal;
     - each tile's kind is asserted;
     - Tab is used to reach the replay buttons;
     - the `mergePatch` null edge is documented and tested;
     - the guide frame logo is recorded as inherited;
     - the paragraph clear-zone check measures each line;
     - the implementation amendments are copied into PLANS.md.
   - After the fixes: `npm test` 56 tests, 54 passed, 2 skipped, 0 failed. `npm run test:browser` 20/20. `DDC_BROKEN=1` run exits 1 at 18/20 (both marks checks). `git diff --check` clean. Two first-run browser failures were test timing: Count starts its first animation at 350 ms (now within the same 500 ms window), and "All" is one Shift+Tab from "Fields".
8. M1 completion re-audit: PASS. BK-001 to BK-012, BK-007a and PROCESS-001 are VERIFIED. Nothing is committed or pushed. A milestone-completion commit needs the user's approval and a Plan Guardian pre-commit gate; it must stage only the M1 paths, leaving the untracked `sites/` out.
9. On 2026-10-22 the user approved committing the v2.3 work to `ddcnorth-v2.3` in brandkit, leaving `sites/` out and not pushing. A Plan Guardian pre-commit gate runs on the staged changes first.

## M2: Over the Edge, "Forest press" (branch `overtheedge-brand`, from `ddcnorth-v2.3` at `3a7cd38`)

Started 2026-10-22. The user chose a new brand in brandkit built like First Form, the "Forest press" direction, and a stand-in auditor (no `plan_guardian` agent exists in this session): a general-purpose agent briefed with the Plan Guardian role and the AGENTS.md protocol. See docs/PLANS.md M2 and M3.

Baseline at `3a7cd38` before any change: `npm test` 56 tests, 54 passed, 2 skipped (parity, needs `DDCNORTH_KIT`), 0 failed. The untracked `sites/` is still present and left untouched.

### Independent audit record (M2 and M3)

1. M2 readiness audit: FAIL. Findings:
   - A1 (blocking): the plan said seven font files where it downloads six TTFs, and never listed `files`. The kit would have shipped `@font-face` rules for files it lacks and Inter without its licence. "Every path in files exists" would fail for the shared Inter files if checked inside the brand folder.
   - A2 (blocking): "other brands byte-identical" had no test for First Form or northwind. `test/regression.test.js` covers ddcnorth only.
   - A3 (blocking): the 288 px logo minimum had no unit for templates in millimetres, and did not cover guide pages, sheets or the guide frame logo.
   - A4 (blocking): the invented-facts scan's scope was inconsistent. "Digits only in brackets" clashed with template titles' dimensions, folios, the version, measured ratios and sizes. It missed guide copy, `copy.*`, `web.intro` and `web.landing`, which were not specified.
   - A5 (blocking): the print covers in `reference/` would be published, because the app build bundles every brand file (`src/app/brands.js:11`) and GitHub Pages deploys it.
   - Non-blocking A6 to A15: the source SVG's groups are positional, with the apostrophe outside `#Subtext` and a random id; `wordmark.left` is global; duplicate stacked files are intended; Anton-uppercase, one-hand-note, logo-contrast and `lockupSymbol`-boolean checks should be added; the icon check was circular; the missing-input mechanism was undefined; the omitted editable wordmark and micro symbol were unrecorded; the app header draws the full logo small; two M3 items; process compliant.
   Amendments to docs/PLANS.md and docs/TRACEABILITY.md for A1 to A5:
   - A1: six TTFs; `files` listed in full, including the shared Inter files and `fonts/Inter-OFL.txt`; checked with `findAsset`; every face has a `web` path.
   - A2: a First Form and northwind golden manifest made from an export of `3a7cd38` before any engine change, with `test/brands-regression.test.js`.
   - A3: minimums in a screen column (px) and a print column (mm), with the conversion through `physical`. Guide pages and sheets are covered, and the frame logo is `words` at 150 px. The press pass uses `words`, and the app header is a recorded exception.
   - A4: `copy` and `web` specified. The scan covers every human-readable string, with exempt categories and an allowlist of sourced facts. Page numbers are bracketed.
   - A5: the covers are not vendored. PROVENANCE.json records their URLs, hashes, size and sampled pixels.

   Non-blocking items adopted:
   - positional groups, the apostrophe glyph and the logo normalisations;
   - every variant starts at x = 0;
   - duplicate stacked files recorded as intended;
   - Anton-capitals, one-hand-note, logo-contrast and `lockupSymbol`-boolean checks;
   - a vendored `site-icons.json` with its hash;
   - the missing-input procedure;
   - the omitted editable wordmark and micro symbol recorded;
   - the app header exception;
   - M3 pages embed their fonts (no network), and the site path is `brands/overtheedge/site/`.
2. M2 readiness re-audit: PASS. A1 to A5 resolved. Non-blocking items adopted into docs/PLANS.md:
   - the apostrophe is its own glyph, checked in OTE-002;
   - OTE-005 points to the full copy scan;
   - nested guide thumbnails are exempt from the screen minimum (templates are checked at full size);
   - the brands golden manifest hashes vector and text entries only;
   - the missing-input procedure removes `reference/logo-site.svg` in a working-tree copy;
   - the press pass label is documented as a label.

   Implementation of M2 begins.

### Implementation (M2)

Implementation evidence (working tree on `overtheedge-brand` over `3a7cd38`, uncommitted):
- The First Form and northwind golden manifest was made **before** any engine change, from `git archive 3a7cd38` in the scratchpad: `node scripts/golden-base.mjs --brands firstform,northwind <export>`. Two runs were identical (SHA-256 c26bc7da3376c771e345d8f7712561bdd0bf2dec7bbd2f84f4fd2149e7658cfd). It holds 58 First Form and 60 northwind renders.
- `npm test`: 70 tests, 68 passed, 2 skipped (parity, needs `DDCNORTH_KIT`), 0 failed. This includes `test/overtheedge.test.js` (13), `test/brands-regression.test.js` (1) and the unchanged ddcnorth regression and First Form tests.
- `npm test` in a copy of the working tree without `.git` (`node_modules` linked): 68 passed, 2 skipped, 0 failed.
- `npm run make:overtheedge` twice: the hashes of every file under `brands/overtheedge/` and of `brands/index.json` are unchanged by the second run. These files are untracked, so this hash comparison stands in for `git diff --exit-code`.
- `git diff --exit-code -- brands/ddcnorth brands/firstform`: clean.
- `node bin/brandkit.mjs check brands/overtheedge/brand.json`: "no problems found", exit 0.
- `node bin/brandkit.mjs build brands/overtheedge/brand.json --out <scratch>`: 104 files.
- `git diff --check`: clean.
- `npm run build`: succeeds. `dist` is 42,072 KB at `3a7cd38` and 43,316 KB on the branch (+1.2 MB, mostly the six font files).
- Missing input (OTE-009 procedure): in the working-tree copy, with `reference/logo-site.svg` moved aside, `node scripts/brands/overtheedge.mjs` printed "Missing input: brands/overtheedge/reference/logo-site.svg" and exited 1.
- Visual review: every template, guide page and the sheet were rendered outlined and screenshotted in Chromium (scratchpad, not committed). Fixes from that review:
  - the story post's section, headline and deck became a `flow`, so the deck follows the headline;
  - the Applications page became two aligned rows, with light-ground templates framed;
  - the Logo family page's full logo is drawn in Forest.

Plan amendments found during implementation (also in docs/PLANS.md):
- The copy scan exempts numbered-list markers in the docs, and two names that contain a digit: the typeface "Source Serif 4" and the paper size "A4".
- The logo sheet has no number ("{name} logo reference sheet", label "OVER THE EDGE / LOGO REFERENCE"), because the kit has one sheet.
- Logos placed on a panel carry a `ground` key (press pass, issue cover, title slide), like text on a panel, so the logo-contrast check measures against the panel.

Manual review of every added sentence (OTE-005):
- Template text is bracketed placeholders, the sourced lines, or the locked labels (IN THIS ISSUE, PRESS, CALENDAR, WHERE, WHEN, HOST, the domain lines, UNBC'S STUDENT NEWSPAPER, the descriptor).
- No name, figure, date, email, distribution claim or quotation is invented.
- Guide sentences state the brand's own rules or the measured values. The one sourced headline ("Bears Don’t Really Hibernate… Or Do They?") and the cover dateline ("VOLUME 32 · ISSUE 2 · OCTOBER 16, 2025") are the paper's own.

3. M2 completion audit: FAIL. Checked independently and passing:
   - the golden manifest, regenerated byte for byte; a 0.1% change to `variantHeight` fails both regression tests;
   - the tests and the build, the CLI and the kit;
   - the script runs twice cleanly, and reads only repository inputs;
   - the logo paths match the live site, and the font hashes match upstream;
   - the icons, provenance, contrast and logo minimums.

   OTE-001, 002, 003, 004, 006, 007, 009, 010 and 011 may be VERIFIED.

   Findings:
   - B1 (blocking, OTE-008): the Colour page stated 6 of the plan's 11 measured pairs, and gave bark on newsprint as 4.5 rather than 4.53. The test asserted only those 6.
   - B2 (blocking, copy scan): the test's `EXEMPT` also stripped any parenthesised number, any decimal, any date, "April|October YYYY" and "RGB …". The plan did not record these, and they would let invented figures through.
   - Non-blocking:
     - B3: the sourced hero line is an excerpt with a full stop added. Record it.
     - B4: the contrast test's 24 px threshold compares template units, not CSS px, in print templates; the logo-minimum check ignores a `height` box.
     - B5 and B6: records agree.
   Fixes for B1 to B4:
   - B1: the Colour page states all eleven measured pairs, plus the two for text 24 px and up, each as "N : 1", with bark on newsprint at 4.53. The test recomputes every stated value from the palette to its stated precision.
   - B2: `EXEMPT` narrowed to exactly the categories now listed in docs/PLANS.md:
     - date patterns became an allowlist of three dates;
     - decimals are allowed only as sizes, "N : 1" ratios, logo units or "vN.N" versions;
     - the parenthesised-number and RGB patterns were removed.

     A negative test shows invented figures are still caught.
   - B3: the hero line is recorded as an excerpt in docs/PLANS.md and the script.
   - B4: the contrast test converts print-template sizes to CSS px through `physical`, and the logo-minimum check accounts for a `height` box.

   After the fixes:
   - `npm test`: 71 tests, 69 passed, 2 skipped, 0 failed;
   - `make:overtheedge` is still idempotent;
   - `check` exits 0, and `git diff --check` is clean;
   - ddcnorth and firstform are unchanged.
4. M2 completion re-audit: PASS.
   - B1 and B2 are resolved with no new contradictions.
   - The auditor's own mutation (an invented "3.5 million students" in a guide subtitle) made the copy test fail, as it should.
   - OTE-005, OTE-008 and PROCESS-002 are VERIFIED, and M2 is complete in these records.

   Nothing is committed or pushed. The milestone commit needs the user's approval, then a Plan Guardian pre-commit gate on the staged changes. Only M2 paths are staged; `sites/` stays out, and nothing is pushed.
5. On 2026-10-22 the user approved the M2 commit: "Yes, commit the first milestone (M2) to the overtheedge-brand branch. Leave sites/ out and don't push. Run the pre-commit audit first, then continue with M3." A Plan Guardian pre-commit gate runs on the staged changes first.
   Pre-commit finding (mine, while staging): `git diff --cached --check` flagged the Anton, IBM Plex Mono and Gochi Hand licence texts. They are upstream byte copies with CRLF line endings and trailing spaces, and their SHA-256 is recorded and tested. A new `.gitattributes` marks `brands/overtheedge/fonts/*-OFL.txt` as `-whitespace -text`, so they stay byte-exact and the check is clean. The earlier "clean" result in the evidence above was taken while these files were untracked.
