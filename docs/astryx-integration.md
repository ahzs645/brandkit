# Brandkit and Astryx

Brandkit can export a theme for [Astryx](https://github.com/meta/astryx), while
continuing to own the brand definition, artwork, fonts, templates and portable
consumer profile. Astryx supplies the consuming application's React components.
There is no Astryx runtime dependency in Brandkit itself.

This adapter targets the published **Astryx 0.7.11** contract. Astryx requires
React/React DOM 19+ and `@stylexjs/stylex ^0.19.0`; its CLI requires Node 22.13+.
The source repository's main branch can be ahead of the published package.

## Export a brand

Every brand now has a **Web → Astryx theme** section, including brands without
their own `web.page` specification. It offers a theme module, theme JSON, setup
guide and compatibility report. Existing website components remain below it for
brands that provide them.

**Download kit → Website** and **Everything** include the same four files:

| Path | Purpose |
| --- | --- |
| `web/astryx/theme.js` | ES module calling Astryx's `defineTheme`; exports `brandTheme` and default |
| `web/astryx/theme.json` | JSON-safe input to `defineTheme`; suitable for a validated data import |
| `web/astryx/report.json` | Contract version, source colour, adjustments, contrast results, font notices and limits |
| `web/astryx/README.md` | Generated instructions accompanying that brand |

The kit also supplies the existing `web/brand.css`, fonts, logo assets and
`source/consumer-profile.json`. Downloading only `theme.js` does not include
font binaries or artwork. A programmatic export needs only the definition:

```js
import {
  astryxThemeConfig, astryxThemeModule, astryxThemeReport
} from 'brandkit/astryx'

const config = astryxThemeConfig({ brand })
const moduleSource = astryxThemeModule({ brand })
const report = astryxThemeReport({ brand })

// Optional light/dark input colours: palette keys, roles or six-digit hex.
const alternative = astryxThemeConfig({ brand }, {
  accent: { light: 'primary', dark: '#8BCDBE' }
})
```

Theme names include the brand ID and a deterministic fingerprint of the output.
An edited palette or typography therefore receives a new runtime identity even
when the brand ID is unchanged. Astryx caches registered theme CSS by name;
using the same name for two different configurations would silently mix them.

`web/tokens.json` is Brandkit's existing token format, and the consumer profile
contains artwork and brand metadata. Neither is an Astryx `defineTheme` input.
Use the new `theme.json` for that purpose; validate imported data in the host.

## Apply the exported theme

Install the pinned consumer packages in the React application:

```sh
npm install @astryxdesign/core@0.7.11 @stylexjs/stylex@^0.19.0
npm install -D @astryxdesign/cli@0.7.11
```

For Northwind, which has included web fonts matching its consumer font choices:

```jsx
import '@astryxdesign/core/reset.css'
import '@astryxdesign/core/astryx.css'
import './brand-kit/web/brand.css'
import { Theme } from '@astryxdesign/core/theme'
import { Button } from '@astryxdesign/core/Button'
import { brandTheme } from './brand-kit/web/astryx/theme.js'

export function App() {
  return <Theme theme={brandTheme} mode="system">
    <Button label="Continue" variant="primary" />
  </Theme>
}
```

Keep `web/` and `fonts/` at their relative paths or rewrite the font URLs.
Keep one copy of React and React DOM in the host. Prebuilt Astryx CSS does not
require a StyleX compiler in the host's build pipeline.

For production server rendering, compile the theme with the pinned Astryx CLI:

```sh
npx @astryxdesign/cli@0.7.11 theme build ./brand-kit/web/astryx/theme.js
```

Import both the resulting JavaScript and CSS outputs in the host. The generated
export name comes from the theme's name and can differ from `brandTheme`; use the
CLI's printed exports. A client provider imports that theme object and passes
it to `Theme`. Do not serialize a runtime theme through a React server/client
boundary or pass a string as `Theme`'s `theme` prop. Follow upstream's SSR setup
for initial HTML mode/theme attributes and hydration.

## Mapping decisions

| Brandkit input | Astryx output | Decision |
| --- | --- | --- |
| Resolved `primary` | Accent control fill in each mode | Keep the source if readable; adjust UI shade toward black/white when required |
| `primary` | Accent text, icons and focus | Derive separate values suitable for the normal surfaces; a fill colour is not always a readable link |
| `reverse`, `ink` | Text on accent controls | Prefer the first supplied foreground meeting the target, with white/black fallbacks |
| Derived accent tint | Selected background | Use an opaque tint that remains readable with both upstream primary and secondary text |
| Original `primary` | `localTokens.--brandkit-source-accent` | Preserve the original value without inventing an Astryx semantic token |
| Body/display consumer families | Body/heading font-family tokens | Use `consumerFamily` when declared, otherwise `family`; remove the artwork-only face from fallback candidates |
| Body/headline weights | Explicit weight tokens | Retain Astryx's type scale while mapping supported weights |
| Existing logo/profile assets | Host artwork | Use complete approved variants; theme tokens do not change their paints |

Simply assigning `--color-accent` leaves other accent tokens at Astryx's default
blue. Its `color: { accent }` generator also rebuilds neutral surfaces and other
colours. This adapter instead maps the explicit accent family and preserves the
upstream surfaces, status roles, spacing, sizes, radii, motion and code font.
Upstream aliases that reference an accent token can naturally follow that accent.

An inset selected-control shadow also references the generated accent. It stays
a scalar CSS string: a tuple of whole shadow values would create invalid
`light-dark()` CSS. Only colour tokens use light/dark tuples.

Typography sizes and tracking intended for print layouts are not transferred
into component sizing. Brandkit's label font is not assumed to be a code font.
Variable font-face weight ranges are not single UI text weights: unsupported
weights leave the upstream default and generate a notice.

Font families are serialized as CSS strings, including names with punctuation.
Explicit font-family tokens avoid Astryx's automatic family quoting and preserve
the same consumer font choice without changing its typography scale.

### Consumer fonts and artwork

`consumerFamily` has the same meaning here as in the
[consumer profile](consuming-brandkit.md). For example, a brand may carry a
restricted rendering font for artwork while declaring Arial for its web and
Office consumers. The adapter uses Arial and reports the distinction; it does
not reinterpret the rendering font's file as a supplied Arial font.

Check the report before importing the kit's font stylesheet. When consumer and
rendering families differ, load the permitted consumer face in the host or use
its actual fallback. The adapter does not download fonts or source URLs.

Use supplied outlined logos or the portable profile, preserving their full
viewBox, proportions, approved paints/background, minimum size and clear space.
An automatically derived dark UI accent is not a new approved logo colour.
Keep workspace display names and legal/company records separate from imported
brand presentation, as described in the existing consumer contract.

### Contrast and scope

The generated report uses WCAG 2 relative luminance and checks each mode against
the **0.7.11 default body, surface/card and popover backgrounds**, plus muted
surfaces composited over them. It checks 4.5:1 for ordinary accent text and text
on accent controls, 3:1 for control boundaries and focus, and 4.5:1 for primary
and secondary text on the selected background.

The report gives actual foreground/background values and ratios, and lists each
source-to-derived control/text adjustment. If the definition has no explicit
primary, it labels Brandkit's fallback as a fallback and asks for an approved
accent. These are bounded token checks, not an application accessibility audit.
Custom/inverted/media backgrounds, disabled and forced-colour states and every
component interaction still need host testing. Revalidate when upgrading Astryx.

## Runnable consumer and checks

The [standalone example](../examples/astryx/README.md) uses actual pinned Astryx
components, Northwind's generated theme and local fonts. It also shows a second
synthetic accent scope, a selector popup portal and a native top-layer dialog. It is an optional
consumer, not part of Brandkit's production dependency graph.

```sh
# Brandkit engine regression suite
npm test

# The Brandkit site and its export controls
npm run build
npm run test:astryx:browser

# Follow examples/astryx/README.md for its package-contract and browser checks.
```

Source-pack ZIP timestamps use fixed local DOS clock fields at January 1, 1980.
This fixes the previous UTC-Date conversion that became 1979 in Canadian timezones.
A regression verifies identical bytes and hashes in UTC, Vancouver, Tokyo and
Kiritimati; no timezone override is needed to run the test suite.

### Acceptance recorded for this change

The Pages workflow checks the main site's Astryx export downloads on every build.
When the adapter, brand inputs, consumer example or test contract changes, it also
installs the pinned consumer, verifies real package/compiled-theme compatibility,
builds it and runs its browser journeys. Manual workflow runs include those checks.
The browser-check artifact retains screenshots and failure reports for review.

The scripts cover direct/shared export routes, actual downloaded files, light/dark
components, local fonts, nested scope, popup/dialog behavior, keyboard focus and
phone layout. See the PR and workflow run for results on the candidate commit.

## Further integration choices

The current handoff supports generated brand themes in Astryx applications.
Converting Brandkit's own interface to Astryx is a separate application redesign.
Its templates, document outputs, logo engine and manual viewer remain reusable
with their existing APIs.

A reusable Astryx integration package can be a later distribution layer: add
`astryx.integration.mjs`, per-theme source and `.doc.mjs` descriptors, compiled
CSS/JS/type exports and separately licensed fonts. The present export does not
register themes in the Astryx sandbox or support its source discovery/ejection
workflow. Reverse import is also separate: Astryx component overrides and
functions cannot round-trip losslessly into Brandkit's identity schema.

## Primary sources

- [Published release v0.7.11](https://github.com/meta/astryx/releases/tag/v0.7.11)
- [Core package and peer requirements](https://github.com/meta/astryx/blob/v0.7.11/packages/core/package.json)
- [Theme input and definition](https://github.com/meta/astryx/blob/v0.7.11/packages/core/src/theme/defineTheme.ts)
- [Typography types](https://github.com/meta/astryx/blob/v0.7.11/packages/core/src/theme/types.ts)
- [Token defaults](https://github.com/meta/astryx/blob/v0.7.11/packages/core/src/theme/tokens.stylex.ts)
- [Theme value resolution](https://github.com/meta/astryx/blob/v0.7.11/packages/core/src/theme/resolveThemeValues.ts)
- [Generated colour scales](https://github.com/meta/astryx/blob/v0.7.11/packages/core/src/theme/expandColorScale.ts)
- [Theme provider](https://github.com/meta/astryx/blob/v0.7.11/packages/core/src/theme/Theme.tsx)
- [CLI theme build contract](https://github.com/meta/astryx/blob/v0.7.11/packages/cli/api/theme/themeBuild.doc.mjs)
