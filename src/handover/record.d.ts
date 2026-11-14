export const HANDOVER_SCHEMA: 'brandkit/managed-site-handover/1'

export type HandoverKind = 'template' | 'example' | 'client'
export type HandoverStatus = 'draft' | 'ready'
export type HandoverAccessMethod = 'invitation' | 'password' | 'sso' | 'passwordless' | 'managed-only' | 'unconfirmed'

export interface HandoverProvider {
  name: string
  brandId: string
  supportEmail: string
  supportUrl: string
  hours: string
  responseTarget: string
  urgentRoute: string
}

export interface HandoverClient {
  name: string
  brandId: string
  contactName: string
  contactEmail: string
}

export interface HandoverSite {
  name: string
  url: string
  loginUrl: string
  helpUrl: string
  launchDate: string
}

/** Instructions and account labels only. Never include passwords or recovery codes. */
export interface HandoverAccess {
  method: HandoverAccessMethod
  role: string
  accountLabel: string
  invitationSender: string
  invitationExpiry: string
  setupInstructions: string[]
  recoveryInstructions: string
  mfaInstructions: string
}

export interface HandoverTask {
  title: string
  steps: string[]
  confirmation: string
  tutorialUrl: string
}

export interface HandoverService {
  name: string
  accountOwner: string
  managedBy: string
  clientAccess: string
  billedBy: string
  renewalDate: string
  costText: string
  scope: string
}

export interface HandoverCare {
  included: string[]
  requests: string
  backups: string
  restore: string
  dataExport: string
  agreementRef: string
  rights: string
}

export interface HandoverAsset {
  name: string
  url: string
  note: string
}

/** A versioned operational record, separate from the provider and client artwork. */
export interface HandoverRecord {
  schema: typeof HANDOVER_SCHEMA
  id: string
  kind: HandoverKind
  status: HandoverStatus
  version: string
  preparedAt: string
  provider: HandoverProvider
  client: HandoverClient
  site: HandoverSite
  access: HandoverAccess
  tasks: HandoverTask[]
  services: HandoverService[]
  care: HandoverCare
  assets: HandoverAsset[]
  nextSteps: string[]
  notes: string[]
  review: { checkedBy: string; checkedOn: string }
}

export interface HandoverValidationOptions {
  /** Completeness gates only; this does not verify facts or contractual promises. */
  forIssue?: boolean
}

export function createHandoverTemplate(): HandoverRecord
export function handoverProblems(record: unknown, options?: HandoverValidationOptions): string[]
export function assertHandover(record: unknown, options?: HandoverValidationOptions): HandoverRecord
