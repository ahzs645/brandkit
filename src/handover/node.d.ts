export interface HandoverDeliveryManifest {
  schema: 'brandkit/managed-site-delivery/1'
  recordId: string
  kind: 'template' | 'example' | 'client'
  status: 'draft' | 'issued'
  version: string
  generatedAt: string
  sourceRevision: string | null
  paper: 'letter' | 'a4'
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
  issue?: boolean
  providerLogoPath?: string
  sourceRevision?: string
}): Promise<HandoverDeliveryManifest>
