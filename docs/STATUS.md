# Status

## M2: Over the Edge, "Forest press" (branch `overtheedge-brand`, from `3a7cd38`)

Started 2026-10-22. The user chose a new brand in brandkit built like First Form, the "Forest press" direction, and a stand-in auditor (no `plan_guardian` agent exists in this session): a general-purpose agent briefed with the Plan Guardian role and the AGENTS.md protocol. See docs/PLANS.md M2 and M3.

Baseline at `3a7cd38` before any change: `npm test` 56 tests, 54 passed, 2 skipped (parity, needs the original kit), 0 failed. The untracked `sites/` is still present and left untouched.

### Independent audit record (M2 and M3)

1. M2 readiness audit: FAIL. Findings:
   - A1 (blocking): the plan said seven font files where it downloads six TTFs, and never listed `files`. The kit would have shipped `@font-face` rules for files it lacks and Inter without its licence. "Every path in files exists" would fail for the shared Inter files if checked inside the brand folder.
   - A2 (blocking): "other brands byte-identical" had no test for First Form or northwind. `test/regression.test.js` covered one earlier brand only.
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
- `npm test`: 70 tests, 68 passed, 2 skipped (parity, needs the original kit), 0 failed. This includes `test/overtheedge.test.js` (13), `test/brands-regression.test.js` (1) and the unchanged regression and First Form tests.
- `npm test` in a copy of the working tree without `.git` (`node_modules` linked): 68 passed, 2 skipped, 0 failed.
- `npm run make:overtheedge` twice: the hashes of every file under `brands/overtheedge/` and of `brands/index.json` are unchanged by the second run. These files are untracked, so this hash comparison stands in for `git diff --exit-code`.
- `git diff --exit-code -- brands/firstform`: clean.
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
   - the existing brands are unchanged.
4. M2 completion re-audit: PASS.
   - B1 and B2 are resolved with no new contradictions.
   - The auditor's own mutation (an invented "3.5 million students" in a guide subtitle) made the copy test fail, as it should.
   - OTE-005, OTE-008 and PROCESS-002 are VERIFIED, and M2 is complete in these records.

   Nothing is committed or pushed. The milestone commit needs the user's approval, then a Plan Guardian pre-commit gate on the staged changes. Only M2 paths are staged; `sites/` stays out, and nothing is pushed.
5. On 2026-10-22 the user approved the M2 commit: "Yes, commit the first milestone (M2) to the overtheedge-brand branch. Leave sites/ out and don't push. Run the pre-commit audit first, then continue with M3." A Plan Guardian pre-commit gate runs on the staged changes first.
   Pre-commit finding (mine, while staging): `git diff --cached --check` flagged the Anton, IBM Plex Mono and Gochi Hand licence texts. They are upstream byte copies with CRLF line endings and trailing spaces, and their SHA-256 is recorded and tested. A new `.gitattributes` marks `brands/overtheedge/fonts/*-OFL.txt` as `-whitespace -text`, so they stay byte-exact and the check is clean. The earlier "clean" result in the evidence above was taken while these files were untracked.
6. M2 pre-commit gate: PASS. The staged set was exactly the M2 paths. The staged tree passed `npm test` (69 passed, 2 skipped), `check` and the idempotency check from an index export. `.gitattributes` affects only this brand's licences. No upstream is configured. Committed as `f9fee98` on `overtheedge-brand`; not pushed; `sites/` left out.

## M3: Over the Edge motion, brand details and site (branch `overtheedge-brand`, from `f9fee98`)

Started 2026-10-22, after the user's instruction to "continue with M3". The three pages were drafted in the scratchpad, outside the repository, during the M2 audits. What that taught is added to docs/PLANS.md as "M3 decisions added before its readiness audit". Nothing of M3 is in the repository yet.

### Independent audit record (M3)

1. M3 readiness audit: FAIL. Feasible, and it covers First Form's motion, site and brand details.
   - C1 (blocking): the checks added in "M3 decisions added before its readiness audit" were missing from the M3 requirements and TRACEABILITY:
     - licence copies, the four markers, the network checks and the visible-text scan;
     - the negative control, the screenshots, the embedded faces and the page colours.

     OTE-012 also contradicted the new transparency rule.
   - C2 (blocking): M3 changed the already-VERIFIED OTE-008 (eight pages, now nine) and needed an "ms" copy-scan exemption that the recorded list did not allow, with no plan to re-verify.
   - Non-blocking:
     - C3: "Latest News" is not on the homepage.
     - C4: embedded fonts add about 4.2 MB and the size was unbounded; Inter should come from the shared woff2.
     - C5: `.gitattributes` must cover `site/licenses/`.
     - C6: check the app's Motion tab, and give the report its own git-ignored path.
     - C7 and C8: compliant.

   Amendments:
   - C1: the M3 requirements are rewritten with every check as a binary criterion, and the TRACEABILITY rows updated. The transparency rule is settled: `opacity`, or `color-mix()` of a palette variable with `transparent`.
   - C2: OTE-008 is amended to nine pages and returns to IMPLEMENTED for re-verification in the M3 completion audit. The copy-scan exemptions gain "N ms" only, with "12 issues" added to the negative test.
   - Non-blocking items adopted:
     - "Latest News" removed;
     - Inter embedded from woff2, with page and build sizes recorded (OTE-016);
     - `.gitattributes` extended to `site/licenses/`;
     - an app Motion tab check added;
     - the report written to `test/browser/overtheedge-report.json`, which is git-ignored.
2. M3 readiness re-audit: PASS. C1 and C2 are resolved. The non-blocking wording fixes are adopted: OTE-008's M2 text points to the M3 amendment; the requirements govern the transparency rule; the source of `Inter-OFL.txt` is named. Implementation of M3 begins.

### Implementation (M3)
Implementation evidence (working tree on `overtheedge-brand` over `f9fee98`, uncommitted):
- `npm test`: 76 tests, 74 passed, 2 skipped (parity), 0 failed. This includes five new M3 tests, the OTE-008 test amended to nine pages, and the copy-scan negative test with "160 ms" kept and "12 issues" caught.
- `node test/browser/overtheedge.check.mjs`: 10/10 checks passed. The report is written to `test/browser/overtheedge-report.json`, which is git-ignored.
- Negative control: `OTE_BROKEN=1 node test/browser/overtheedge.check.mjs` exited 1, with 7 of 10 failing (six page checks on the off-palette colour, and the reduced-motion check). The clean run was then repeated to regenerate the screenshots, which the broken run had overwritten.
- `npm run test:browser` (the existing browser checks): 20/20 checks passed, with Over the Edge now in the app.
- `npm run make:overtheedge` twice: every file under `brands/overtheedge/` (screenshots aside, which the browser check writes) and `brands/index.json` hash the same after the second run.
- `node bin/brandkit.mjs check brands/overtheedge/brand.json`: no problems. The kit build writes 110 files (104 before M3).
- `git diff --check`: clean. `git diff --exit-code -- brands/firstform`: clean. `git check-attr` sets `-whitespace -text` on `site/licenses/*-OFL.txt` and the brand's fonts only.
- Sizes (OTE-016):

  | | Size |
  | --- | --- |
  | `motion/index.html` | 980,002 bytes |
  | `docs/brand-details.html` | 1,233,839 bytes |
  | `site/index.html` | 1,151,318 bytes |
  | `dist` at `f9fee98` | 43,316 KB |
  | `dist` with M3 | 47,204 KB (+3.9 MB) |

  Inter is embedded from the shared woff2.

Implementation amendments, recorded for the completion audit:
- The template rules (dashed index rules and the date rule) gain an explicit `fill: "none"`. They had stroke only, so their exported SVG carried the default black fill on a zero-area line. This changes M2 template output, so OTE-005 returns to IMPLEMENTED for re-verification (gate 6). Its tests pass unchanged.
- The browser colour check counts only colours actually painted, read at rest under reduced motion:
  - borders and outlines when drawn;
  - fill and stroke on drawn SVG shapes outside clip paths;
  - text colour where there is text.

  The first version read default values that are never painted (a table's undrawn border grey, the default black `fill` of HTML elements) and mid-animation blends. The negative control shows it still fails on a real off-palette colour.
- The scan patterns run dimensions first ("54 × 86 mm") and match "Source Serif 4" and "v1.0" regardless of case, because CSS capitalises some labels. The guide's token table names the easing ("Ease out, the site’s own curve") instead of writing its numbers.
- Logo minimums on the site, now checked in the browser at 1440 and 390 px:
  - the header logo is fixed at 300 px (it was 273 px at 390);
  - the latest-issue panel uses the logo without its subtext, because the panel is narrower than the full logo's 288 px minimum. `lockupMarkup` gains `{ subtext: false }`.
- The Turn page study shows "Top Stories" (on the homepage) in place of "Latest News".

Manual review of every added sentence (M3): the motion rules and study descriptions, the motion page intro, the brand details copy, and the site's labels. Rules and descriptions describe the brand's own motion. Sourced lines and headlines are the paper's own: site, homepage labels, October 2025 cover. Story, event and issue content is bracketed placeholders. The details page's "Where it can go next" is labelled "Proposals, not rules". No names, figures, dates or claims about the paper are invented.
3. M3 completion audit: PASS. The auditor re-ran every check in a scratch copy:
   - `npm test`: 74 passed, 2 skipped;
   - `check`: no problems;
   - `make:overtheedge` twice in a scratch git repo: clean;
   - the browser check: 10/10, and `OTE_BROKEN=1` exits 1;
   - `vite build`: 47,204 KB;
   - the licence copies, compared with `cmp`: byte-identical.

   OTE-005, OTE-008 and OTE-012 to 016 are VERIFIED, and with this record PROCESS-003 is too.

   Non-blocking items adopted after the audit:
   - D8, D9: `test/overtheedge.test.js` now also asserts:
     - no colour function other than palette `color-mix` (no `rgb`, `hsl`, `oklch`…) in the four page and CSS sources;
     - nothing fetched by `url()` or `@import`;
     - `--ote-distance`;
     - every token in `motion-tokens.json`;
     - every study and duration token in the motion README.

     `npm test` after: 76 tests, 74 passed, 2 skipped, 0 failed. The browser colour check still reads painted colours only. The source scan above covers pseudo-elements, shadows and gradients.
   - D10: the site's interface labels "Can’t-miss events" (from the hero line), "Full calendar" and "Details" are recorded here as labels, not factual claims.

   The M3 commit needs the user's approval and a pre-commit gate on the staged index:
   - only M3 paths staged, with the screenshots from the clean run;
   - `sites/` excluded;
   - nothing pushed.
4. On 2026-10-22 the user approved the M3 commit: "Yes, commit M3 to the overtheedge-brand branch. Leave sites/ out and don't push. Run the pre-commit gate and the final full-project audit first." The Plan Guardian pre-commit gate (AGENTS gate 5) and the final full-project audit (gates 7 and 8) run on the staged index first.
5. M3 pre-commit gate: PASS. The staged set was exactly the M3 paths. The screenshots were from the clean run (no injected colour, and they reproduce byte for byte). The staged tree passed `npm test`, `check`, idempotency, both browser checks and the build from an index export. No upstream is configured.
6. Final full-project audit (AGENTS gates 7 and 8): PASS for the Over the Edge work (M2 and M3):
   - every requirement (OTE-001 to OTE-016, PROCESS-002 and PROCESS-003) is VERIFIED;
   - every milestone has a PASS report;
   - validation passes from a clean index export;
   - no mandatory finding is open;
   - the implementation, documentation, tests and history agree.

   Committed as the M3 commit on `overtheedge-brand`; not pushed; `sites/` left out.

   The out-of-repository step in docs/PLANS.md was done during M3: the claude.ai design system (https://claude.ai/artifact/43QHw3wkAjSsNicCSbsfxL, version 6) was aligned with the brand kit. It is not evidence for these milestones.
