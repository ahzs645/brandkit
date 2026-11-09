import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { astryxThemeConfig, astryxThemeModule, astryxThemeReport, astryxReadme, ASTRYX_VERSION } from '../src/engine/astryx.js'
import { planKit } from '../src/engine/kit.js'

const brand = JSON.parse(readFileSync(new URL('../brands/northwind/brand.json', import.meta.url)))
const ctx = { brand }
// Independent calculation: tests check actual output colours rather than trusting
// the exporter report's boolean, including difficult white/black/yellow seeds.
const luminance = (hex) => {
  const c = hex.slice(1).match(/../g).map((s) => parseInt(s, 16) / 255).map((s) => s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4)
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722
}
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05)

test('Astryx export preserves source data and gives changed configurations distinct runtime identities', () => {
  const before = JSON.stringify(brand)
  const base = astryxThemeConfig(ctx)
  assert.deepEqual(astryxThemeConfig(ctx), base)
  assert.match(base.name, /^brandkit-northwind-[a-f0-9]{16}$/)
  assert.equal(base.localTokens['--brandkit-source-accent'], '#1F4E46')
  assert.equal(base.tokens['--color-accent'][0], '#1F4E46', 'readable source colour remains exact')
  const changed = astryxThemeConfig(ctx, { accent: { dark: '#8BCDBE' } })
  assert.notEqual(changed.name, base.name, 'runtime registration must not share stale CSS')
  assert.equal(changed.tokens['--color-accent'][1], '#8BCDBE')
  const revised = structuredClone(brand)
  revised.typography.headlines.weight = 600
  assert.notEqual(astryxThemeConfig({ brand: revised }).name, base.name)
  assert.equal(JSON.stringify(brand), before, 'neither source palette nor logo rules are rewritten')
})

test('light/dark accent controls, text, selected backgrounds and focus meet their reported targets', () => {
  for (const seed of ['#FFFFFF', '#000000', '#FFFF00', '#FF0000', '#0000FF', '#00FF00', '#777777', '#FFD9E5', '#001122', '#1F4E46']) {
    const sample = structuredClone(brand)
    sample.colours.primary = seed
    const report = astryxThemeReport({ brand: sample })
    assert.ok(report.contrast.allPassed, seed)
    assert.equal(report.contrast.checks.length, 12)
    for (const check of report.contrast.checks) {
      for (const background of check.backgrounds) {
        assert.ok(contrast(check.foreground, background) >= check.minimum, `${seed}/${check.mode}/${check.purpose}/${background}`)
      }
    }
    for (const [index, surface] of ['#FFFFFF', '#28292C'].entries()) {
      const t = report.config.tokens
      assert.ok(contrast(t['--color-text-accent'][index], surface) >= 4.5)
      assert.ok(contrast(t['--color-accent'][index], surface) >= 3)
      assert.ok(contrast(t['--color-accent'][index], t['--color-on-accent'][index]) >= 4.5)
    }
  }
})

test('roles and optional dark references resolve without treating unknown strings as CSS', () => {
  const sample = structuredClone(brand)
  delete sample.colours.primary
  sample.roles.primary = 'accentAlias'
  sample.roles.accentAlias = '#174E64'
  const report = astryxThemeReport({ brand: sample }, { accent: { dark: 'light' } })
  assert.equal(report.sourceAccent, '#174E64')
  assert.equal(report.sourceAccentOrigin, 'brand-definition')
  assert.equal(report.accentInputs.dark, '#CFE4DC')
  assert.throws(() => astryxThemeConfig(ctx, { accent: { dark: 'not-a-colour' } }), /six-digit hex/)
  assert.throws(() => astryxThemeConfig(ctx, { accent: { dark: 'url(https://example.test)' } }), /six-digit hex/)
  assert.throws(() => astryxThemeConfig(ctx, { accent: { drak: '#FFFFFF' } }), /Unknown Astryx accent mode/)
  assert.throws(() => astryxThemeConfig(ctx, { tokens: {} }), /Unknown Astryx option/)
})

test('an undeclared primary is explicitly identified as an engine fallback', () => {
  const report = astryxThemeReport({ brand: { id: 'minimal', name: 'Minimal', colours: { red: '#FF0000' } } })
  assert.equal(report.sourceAccent, '#0B2B4A')
  assert.equal(report.sourceAccentOrigin, 'brandkit-default')
  assert.match(report.warnings.join('\n'), /fallback/)
  assert.ok(!report.config.typography)
})

test('consumer fonts override artwork fonts and do not accidentally include them as fallbacks', () => {
  const sample = structuredClone(brand)
  sample.fonts.body = { family: 'Helvetica Neue LT Pro', consumerFamily: 'Arial', officialFamily: 'Helvetica Neue', stack: 'Helvetica Neue LT Pro, Arial, sans-serif', weight: 400, web: 'fonts/artwork-only.woff2' }
  const report = astryxThemeReport({ brand: sample })
  assert.equal(report.config.typography.body.family, 'Arial')
  assert.equal(report.config.typography.body.fallbacks, 'sans-serif')
  assert.match(report.warnings.join('\n'), /not the bundled Helvetica Neue LT Pro artwork font/)
  assert.equal(report.config.typography.heading.family, 'Inter Display')
  assert.equal(report.config.tokens['--text-body-weight'], '400')
  assert.equal(report.config.tokens['--text-heading-6-weight'], '500')
})

test('unrelated surfaces/status/layout and code typography are inherited', () => {
  const config = astryxThemeConfig(ctx)
  assert.equal(config.color, undefined, 'upstream color generator would change neutral surfaces')
  assert.equal(config.typography.scale, undefined, 'print sizes do not become UI component sizes')
  assert.equal(config.typography.code, undefined, 'a label face is not necessarily a code face')
  assert.ok(Object.keys(config.tokens).every((key) => !/success|warning|error|info|background|spacing|radius|motion/.test(key)))
  assert.equal(typeof config.tokens['--shadow-inset-selected'], 'string', 'whole shadow tuples do not form valid light-dark CSS')
})

test('font family and fallback CSS cannot break out of the generated declaration', () => {
  for (const key of ['family', 'consumerFamily', 'stack']) {
    const sample = structuredClone(brand)
    sample.fonts.body[key] = 'Fake; color:red; } body {'
    assert.throws(() => astryxThemeConfig({ brand: sample }), /font (?:family|fallback)/)
  }
  const sample = structuredClone(brand)
  delete sample.typography.body.weight
  sample.fonts.body.weight = '100 900'
  const report = astryxThemeReport({ brand: sample })
  assert.equal(report.config.tokens['--text-body-weight'], undefined)
  assert.match(report.warnings.join('\n'), /not a single CSS font weight/)
})

test('module and JSON handoffs encode the same configuration without executing brand text', () => {
  const sample = structuredClone(brand)
  sample.name = 'Name\n"; globalThis.injected = true; //'
  const module = astryxThemeModule({ brand: sample })
  const literal = module.match(/defineTheme\(([\s\S]*)\);\nexport default brandTheme;/)[1]
  assert.deepEqual(JSON.parse(literal), astryxThemeConfig({ brand: sample }))
  assert.doesNotMatch(module, /globalThis.injected/)
  assert.match(module, /@astryxdesign\/core\/theme/)
  assert.match(astryxReadme(ctx), /label="Continue"/)
  assert.match(astryxReadme(ctx), new RegExp(`@astryxdesign/core@${ASTRYX_VERSION.replaceAll('.', '\\.')}`))
})

test('Website and Everything kits include the same complete handoff; other focused kits do not', () => {
  const expected = ['web/astryx/theme.js', 'web/astryx/theme.json', 'web/astryx/report.json', 'web/astryx/README.md']
  for (const pack of ['web', 'complete', 'logos', 'print', 'documents']) {
    const entries = planKit(brand, { pack, rasters: false, pdfs: false, office: false }).filter((entry) => entry.path.startsWith('web/astryx/'))
    if (!['web', 'complete'].includes(pack)) { assert.equal(entries.length, 0, pack); continue }
    assert.deepEqual(entries.map((entry) => entry.path).sort(), [...expected].sort())
    const files = Object.fromEntries(entries.map((entry) => [entry.path, entry.make(ctx)]))
    assert.deepEqual(JSON.parse(files['web/astryx/theme.json']), astryxThemeConfig(ctx))
    assert.deepEqual(JSON.parse(files['web/astryx/report.json']), astryxThemeReport(ctx))
    assert.equal(files['web/astryx/theme.js'], astryxThemeModule(ctx))
    assert.equal(files['web/astryx/README.md'], astryxReadme(ctx))
  }
})
