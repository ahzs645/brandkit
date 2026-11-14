import type { WelcomeCoverVariant } from './index.js'

export interface HandoverDeliveryManifest {
  schema: 'brandkit/managed-site-delivery/1'
  recordId: string
  kind: 'template' | 'example' | 'client'
  status: 'draft' | 'issued'
  version: string
  generatedAt: string
  sourceRevision: string | null
  paper: 'letter' | 'a4'
  cover: 'brandkit/welcome-cover/1' | null
  coverVariant: WelcomeCoverVariant | null
  provider: { id: string; version: string; sha256: string; originalLogo: { sha256: string; format: string } | null }
  client: { id: string; version: string; sha256: string }
  review: { checkedBy: string; checkedOn: string }
  note: string
  files: Array<{ path: string; bytes: number; sha256: string }>
}

export function buildHandover(options: {
  recordPath: string
  providerPath: string
  clientPath: string
  outDir: string
  paper?: 'letter' | 'a4'
  pdf?: boolean
  /** Enables legacy-crop when no explicit coverVariant is supplied. */
  cover?: boolean
  /** Selects and enables a cover, including when cover is omitted. */
  coverVariant?: WelcomeCoverVariant
  issue?: boolean
  providerLogoPath?: string
  sourceRevision?: string
}): Promise<HandoverDeliveryManifest>
