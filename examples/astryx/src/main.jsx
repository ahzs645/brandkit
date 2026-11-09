import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import '@astryxdesign/core/reset.css'
import '@astryxdesign/core/astryx.css'
import { Theme } from '@astryxdesign/core/theme'
import { Button } from '@astryxdesign/core/Button'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Selector } from '@astryxdesign/core/Selector'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { brandTheme } from '../generated/theme.js'
import { brandTheme as secondaryTheme } from '../generated/secondary-theme.js'
import report from '../generated/report.json'
import './style.css'

// Keep font files beside the generated CSS exactly as in a downloaded Website kit.
const fontStyle = document.createElement('link')
fontStyle.rel = 'stylesheet'
fontStyle.href = `${import.meta.env.BASE_URL}brand/web/brand.css`
document.head.appendChild(fontStyle)

function Example() {
  const [mode, setMode] = useState('light')
  const [name, setName] = useState('Field research team')
  const [format, setFormat] = useState('web')
  const [scope, setScope] = useState('brand')
  const [saved, setSaved] = useState(null)
  const [open, setOpen] = useState(false)
  const hasUnsavedChanges = saved && (saved.name !== name || saved.format !== format)
  return <Theme theme={brandTheme} mode={mode}>
    <main className="example" data-testid="root-theme">
      <header className="masthead">
        <img className="brand-logo" src={`${import.meta.env.BASE_URL}brand/logo-${mode === 'dark' ? 'reverse' : 'primary'}.svg`} alt="Northwind" />
        <div className="mode-controls" role="group" aria-label="Appearance">
          <Button label="Light" variant={mode === 'light' ? 'primary' : 'secondary'} onClick={() => setMode('light')} />
          <Button label="Dark" variant={mode === 'dark' ? 'primary' : 'secondary'} onClick={() => setMode('dark')} />
        </div>
      </header>
      <section className="intro">
        <p className="eyebrow">BRANDKIT × ASTRYX</p>
        <Heading level={1}>Your identity.<br />A working interface.</Heading>
        <Text className="intro-copy">Northwind’s brand colours and local fonts, applied to real Astryx components. The same export works in your own React application.</Text>
      </section>
      <div className="panels">
        <section className="panel" aria-labelledby="workspace-title">
          <div className="section-number" aria-hidden="true">01</div>
          <Heading level={2} id="workspace-title">Workspace preferences</Heading>
          <Text color="secondary">Interact with the controls to check the generated theme.</Text>
          <div className="form">
            <TextInput label="Workspace name" value={name} onChange={setName} />
            <Selector label="Export format" options={[{ value: 'web', label: 'Website kit' }, { value: 'documents', label: 'Documents and slides' }]} value={format} onChange={setFormat} />
            <div className="actions"><Button label="Save preferences" variant="primary" onClick={() => setSaved({ name, format })} /><Button label="Reset" variant="secondary" onClick={() => { setName('Field research team'); setFormat('web'); setSaved(null) }} /></div>
            <div role="status" className="save-status">{hasUnsavedChanges ? 'Unsaved changes. Save preferences to apply them.' : saved ? `Saved “${saved.name}” with ${saved.format === 'web' ? 'Website kit' : 'Documents and slides'}.` : 'Preferences are kept only for this demo.'}</div>
          </div>
          <Text color="accent" data-testid="root-accent-text">Accent text uses the brand’s readable interface colour.</Text>
        </section>
        <Theme theme={secondaryTheme} mode={mode}>
          <section className="panel secondary-panel" data-testid="secondary-theme" aria-labelledby="scope-title">
            <div className="section-number" aria-hidden="true">02</div>
            <Heading level={2} id="scope-title">A second theme scope</Heading>
            <Text color="secondary">This synthetic orange accent demonstrates independent workspace branding on the same page.</Text>
            <div className="scope-callout"><Text color="accent" data-testid="secondary-accent-text">Scoped tokens stay with this workspace.</Text></div>
            <Selector label="Scoped selection" options={[{ value: 'brand', label: 'Brand files' }, { value: 'templates', label: 'Templates' }]} value={scope} onChange={setScope} renderOption={(option) => <Text color="accent" data-testid={`scoped-option-${option.value}`}>{option.label}</Text>} />
            <Button label="Open scoped dialog" variant="primary" onClick={() => setOpen(true)} />
            <Text color="secondary">The selection popup and modal keep this scope’s theme.</Text>
            <Dialog isOpen={open} onOpenChange={setOpen} width={480}>
              <DialogHeader title="Scoped theme preview" onOpenChange={setOpen} />
              <div className="dialog-content" data-testid="scoped-dialog-content">
                <Text>The dialog opens in the browser’s top layer with the same theme and appearance.</Text>
                <Text color="accent" data-testid="dialog-accent-text">The orange accent remains scoped here.</Text>
                <Button label="Done" variant="primary" onClick={() => setOpen(false)} />
              </div>
            </Dialog>
          </section>
        </Theme>
      </div>
      <footer className="footer">
        <Text color="secondary">Astryx 0.7.11 · React 19 · Fonts served locally · Source logo geometry preserved</Text>
        <details><summary>Export report</summary><pre>{JSON.stringify(report, null, 2)}</pre></details>
      </footer>
    </main>
  </Theme>
}

createRoot(document.getElementById('root')).render(<Example />)
