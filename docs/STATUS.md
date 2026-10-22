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
