export * from './record.js'
import type { HandoverRecord } from './record.js'

export interface HandoverFigure {
  src: string
  alt: string
  caption?: string
  provenance?: string
  widthMm?: number
  heightMm?: number
}

export type WelcomeCoverVariant = 'hero' | 'blocks' | 'grid' | 'index'

export interface WelcomeCoverVariantMetadata {
  readonly id: WelcomeCoverVariant
  readonly label: string
  readonly description: string
  readonly status: 'recommended' | 'proposed'
}

export const WELCOME_COVER_VARIANTS: readonly Readonly<WelcomeCoverVariantMetadata>[]
export const DEFAULT_COVER_VARIANT: 'hero'
/** Omitted selection is the recommended design; unsupported IDs throw. */
export function welcomeCoverVariant(id?: WelcomeCoverVariant): Readonly<WelcomeCoverVariantMetadata>

export interface WelcomeCoverSection {
  title: string
  description: string
}

/** Where one piece of cover wording is set: page millimetres from the top left. */
export interface WelcomeCoverFrame {
  key: 'kicker' | 'title' | 'subtitle' | 'clientName' | 'preparedFor' | 'preparedBy' | 'dateText' | 'barDate' | 'status' | `section${1 | 2 | 3 | 4}${'Title' | 'Description'}`
  x: number
  /** Top of the first line's box. */
  y: number
  width: number
  sizePt: number
  leadingPt: number
  role: 'title' | 'body' | 'label'
  colour: string
  caps: boolean
  trackingEm: number
  align: 'left' | 'right' | 'center'
  heading?: 1 | 2
}

export interface WelcomeCover {
  schema: 'brandkit/welcome-cover/2'
  variant: WelcomeCoverVariant
  paper: 'letter' | 'a4'
  /** The whole page without its text, as an embedded PNG data URL. */
  artwork: { src: string; alt: string }
  /** The frames name the fields below; the fields stay the source of the wording. */
  frames: WelcomeCoverFrame[]
  /** The contents of an index cover, one to four entries. */
  sections?: WelcomeCoverSection[]
  kicker: string
  title: string
  subtitle?: string
  clientName: string
  preparedBy?: string
  dateText?: string
  status?: string
}

/** Brandkit's existing publication/1 JSON, editable in its Documents view. */
export interface HandoverPublication {
  schema: 'brandkit/publication/1'
  id: string
  title: string
  subtitle: string
  edition: string
  purpose: 'report' | 'brief' | 'portfolio'
  paper: 'letter' | 'a4'
  example: boolean
  profile: Record<string, unknown>
  pages: Array<{ id: string; title: string; kind: string; cover?: WelcomeCover; blocks: Array<Record<string, unknown>> }>
  [key: string]: unknown
}

export function handoverPublications(record: HandoverRecord, options: {
  providerBrand: Record<string, any>
  clientBrand: Record<string, any>
  paper?: 'letter' | 'a4'
  providerLogo?: HandoverFigure
  welcomeCover?: WelcomeCover
  brandFigures?: { logoVariants?: HandoverFigure; palette?: HandoverFigure }
  forIssue?: boolean
  /** One table design for every publication, in place of each brand's own. */
  tableStyle?: 'grid' | 'ruled' | 'ledger' | 'panel' | 'accent'
}): { welcome: HandoverPublication; quickStart: HandoverPublication; brandGuide: HandoverPublication }

export const WELCOME_COVER_SCHEMA: 'brandkit/welcome-cover/2'
export const WELCOME_COVER_TEXT: Readonly<{ kicker: string; title: string; subtitle: string; sections: readonly Readonly<WelcomeCoverSection>[] }>

/**
 * Draws a cover from the provider's and client's loaded brands ({ brand, fonts }) and a
 * handover record (its client, provider, preparedAt, kind, version and optional cover).
 */
export function createWelcomeCover(provider: { brand: Record<string, any>; fonts?: unknown }, client: { brand: Record<string, any>; fonts?: unknown }, record: HandoverRecord, options: {
  png: (svg: string, width: number) => Promise<Uint8Array>
  paper?: 'letter' | 'a4'
  issue?: boolean
  variant?: WelcomeCoverVariant
}): Promise<{ cover: WelcomeCover; svg: { artwork: string; providerLogo: string; clientLogo: string }; profile: Record<string, unknown> }>
