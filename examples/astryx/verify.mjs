// Contract check against the installed published package. No browser is required.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { defineTheme, generateThemeCSS, resolveThemeToken, tokenDefaults, Theme } from '@astryxdesign/core/theme'
import { Button } from '@astryxdesign/core/Button'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Selector } from '@astryxdesign/core/Selector'
import { astryxThemeConfig, astryxThemeReport, ASTRYX_VERSION } from '../../src/engine/astryx.js'

const here = fileURLToPath(new URL('.', import.meta.url))
const installed = JSON.parse(await readFile(resolve(here, 'node_modules/@astryxdesign/core/package.json'), 'utf8'))
assert.equal(installed.version, ASTRYX_VERSION, 'Contract check uses the version the exporter targets')
const brand = JSON.parse(await readFile(new URL('../../brands/northwind/brand.json', import.meta.url), 'utf8'))
const reference = defineTheme({ name: 'upstream-default-reference' })
const colourTokens = ['--color-background-body', '--color-background-surface', '--color-background-card', '--color-background-popover']
const cases = [
  ['northwind', '#1F4E46'], ['white', '#FFFFFF'], ['black', '#000000'],
  ['yellow', '#FFF200'], ['cyan', '#00FFFF'], ['blue', '#0033CC'], ['middle-gray', '#777777']
]
const luminance = (value) => {
  assert.match(value, /^#[0-9a-f]{6}$/i)
  const channels = value.slice(1).match(/../g).map((part) => parseInt(part, 16) / 255)
    .map((part) => part <= 0.04045 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4)
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}
const contrast = (a, b) => {
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}
const checks = []
for (const [id, seed] of cases) {
  const source = structuredClone(brand)
  source.id = id
  source.colours.primary = seed
  const config = astryxThemeConfig({ brand: source })
  const report = astryxThemeReport({ brand: source })
  assert.deepEqual(Object.keys(config.tokens).filter((key) => !(key in tokenDefaults)), [], `${id}: only supported Astryx tokens`)
  const theme = defineTheme(config)
  const warnings = []
  const css = generateThemeCSS(theme, warnings)
  assert.deepEqual(warnings, [], `${id}: upstream accepts every declaration`)
  assert.ok(css.component.includes(`data-astryx-theme="${config.name}"`), `${id}: component CSS is scoped`)
  assert.doesNotMatch(css.component, /undefined|\[object Object\]/)
  assert.ok(report.contrast.allPassed, `${id}: report passes`)
  for (const mode of ['light', 'dark']) {
    const actual = (key) => resolveThemeToken(theme, key, { mode })
    for (const [key] of Object.entries(tokenDefaults)) {
      if (key in config.tokens || ['--font-family-body', '--font-family-heading'].includes(key)) continue
      // An unchanged upstream alias can intentionally follow an overridden accent
      // (for example syntax-keyword → text-accent). Keep its authored mapping.
      if (tokenDefaults[key].includes('var(')) {
        assert.equal(theme.tokens[key] ?? tokenDefaults[key], reference.tokens[key] ?? tokenDefaults[key], `${id}/${mode}: omitted ${key} retains upstream alias`)
        continue
      }
      assert.equal(actual(key), resolveThemeToken(reference, key, { mode }), `${id}/${mode}: omitted ${key} retains upstream default`)
    }
    for (const key of colourTokens) {
      const surface = actual(key)
      assert.ok(report.contrast.checks.find((check) => check.mode === mode && check.purpose === 'Accent control boundary').backgrounds.includes(surface), `${id}/${mode}: report covers actual ${key}`)
      assert.ok(contrast(actual('--color-accent'), surface) >= 3, `${id}/${mode}: real fill contrasts against ${key}`)
      assert.ok(contrast(actual('--color-text-accent'), surface) >= 4.5, `${id}/${mode}: real text contrasts against ${key}`)
    }
    assert.ok(contrast(actual('--color-on-accent'), actual('--color-accent')) >= 4.5, `${id}/${mode}: real button content contrasts`)
    assert.ok(contrast(actual('--color-text-primary'), actual('--color-accent-muted')) >= 4.5, `${id}/${mode}: selected-row primary text contrasts`)
    assert.ok(contrast(actual('--color-text-secondary'), actual('--color-accent-muted')) >= 4.5, `${id}/${mode}: selected-row secondary text contrasts`)
  }
  checks.push(`${id}: token vocabulary, CSS generation, omitted defaults and resolved colour contrast`)
}

const theme = defineTheme(astryxThemeConfig({ brand }))
const secondary = defineTheme(JSON.parse(await readFile(resolve(here, 'generated/secondary-theme.json'), 'utf8')))
const h = React.createElement
const html = renderToString(h(Theme, { theme, mode: 'dark' },
  h(Heading, { level: 1 }, 'Brandkit consumer'),
  h(Button, { label: 'Save', variant: 'primary' }),
  h(TextInput, { label: 'Name', value: 'Northwind', onChange: () => {} }),
  h(Selector, { label: 'Format', value: 'web', options: [{ value: 'web', label: 'Website' }], onChange: () => {} }),
  h(Theme, { theme: secondary, mode: 'dark' }, h(Text, { color: 'accent' }, 'Scoped content'))
))
assert.ok(html.includes(`data-astryx-theme="${theme.name}"`))
assert.ok(html.includes(`data-astryx-theme="${secondary.name}"`))
assert.ok(html.includes('Save') && html.includes('Name') && html.includes('Website'))
checks.push('Real Theme, Heading, Button, TextInput, Selector and nested Theme server-render without import/prop errors')

const appCss = await readFile(resolve(here, 'src/style.css'), 'utf8')
const usedTokens = [...appCss.matchAll(/var\((--[a-z0-9-]+)/g)].map((match) => match[1])
assert.deepEqual([...new Set(usedTokens)].filter((key) => !(key in tokenDefaults)), [], 'Example layout uses real Astryx custom properties')

// Exercise the upstream production compiler and its stale-output gate.
const cli = resolve(here, 'node_modules/@astryxdesign/cli/clients/cli/bin/astryx.mjs')
for (const [source, target] of [['theme.js', 'northwind'], ['secondary-theme.js', 'secondary']]) {
  const args = [cli, 'theme', 'build', `generated/${source}`, '--out', `generated/compiled/${target}.css`]
  for (const suffix of [[], ['--check']]) {
    const result = spawnSync(process.execPath, [...args, ...suffix], { cwd: here, encoding: 'utf8', timeout: 60000 })
    assert.equal(result.status, 0, `Upstream CLI ${source} ${suffix.join(' ')}:\n${result.stdout}\n${result.stderr}`)
  }
  const builtCss = await readFile(resolve(here, `generated/compiled/${target}.css`), 'utf8')
  assert.ok(builtCss.includes('data-astryx-theme'))
  // --out chooses the CSS filename; Astryx names the JS module after the theme.
  const builtName = source === 'theme.js' ? theme.name : secondary.name
  const built = await import(`./generated/compiled/${builtName}.js`)
  assert.ok(Object.values(built).some((value) => value && typeof value === 'object' && typeof value.name === 'string'), 'Compiled module exports a usable theme')
  checks.push(`Upstream CLI builds ${source}, imports its production module and passes --check`)
}

await writeFile(resolve(here, 'generated/verification.json'), `${JSON.stringify({ package: installed.name, version: installed.version, checks, browser: 'Separate browser check required; this verification does not exercise browser CSS/layout, interactions or hydration.' }, null, 2)}\n`)
console.log(`Astryx ${installed.version}: ${checks.length} package-contract checks passed.`)
