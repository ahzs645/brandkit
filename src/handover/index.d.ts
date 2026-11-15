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

export type PackDocument = 'welcome' | 'quickStart' | 'brandGuide' | 'frontCover'
export type WelcomeSection = 'access' | 'tasks' | 'services' | 'support' | 'continuity' | 'resources'
export type BrandSection = 'logo' | 'colour' | 'files'
export type TableStyle = 'grid' | 'ruled' | 'ledger' | 'panel' | 'accent'
interface Choice<Id> { readonly id: Id; readonly label: string; readonly description: string }
export const PACK_DOCUMENTS: readonly (Choice<PackDocument> & { readonly file: string; readonly eyebrow: string })[]
export const WELCOME_SECTIONS: readonly Choice<WelcomeSection>[]
export const BRAND_SECTIONS: readonly Choice<BrandSection>[]
export const PACK_SCHEMA: 'brandkit/managed-site-delivery/1'

/** Choices for one pack; each overrides the record's `pack`, which overrides the defaults. */
export interface PackChoices {
  documents?: PackDocument[]
  sections?: WelcomeSection[]
  brandSections?: BrandSection[]
  cover?: boolean
  coverVariant?: WelcomeCoverVariant
  tableStyle?: TableStyle
  paper?: 'letter' | 'a4'
  issue?: boolean
}
export interface LoadedBrand { brand: Record<string, any>; fonts?: unknown; bytes?: Uint8Array }
export interface PackArgs {
  record: HandoverRecord
  provider: LoadedBrand
  client: LoadedBrand
  options?: PackChoices
  png: (svg: string, width: number) => Promise<Uint8Array>
  /** The cover artwork's resolution; 300 for print, less for a live preview. */
  dpi?: number
  sourceRevision?: string
}
export interface PreparedPack {
  record: HandoverRecord
  choices: Required<Omit<PackChoices, 'cover' | 'tableStyle'>> & { coverVariant: WelcomeCoverVariant | null; tableStyle?: TableStyle }
  publications: Partial<Record<PackDocument, HandoverPublication>>
  cover: { cover: WelcomeCover; svg: { artwork: string; providerLogo: string; clientLogo: string } } | null
}
export function packOptions(record: HandoverRecord, overrides?: PackChoices): PreparedPack['choices']
export function preparePack(args: PackArgs): Promise<PreparedPack>
/** Print views by document id, for a preview. */
export function packHtml(prepared: PreparedPack, brands: { provider: LoadedBrand; client: LoadedBrand; sourceRevision?: string }): Partial<Record<PackDocument, string>>
/** The whole pack in memory: `[path, bytes]` pairs, manifest included. */
export function composePack(args: PackArgs): Promise<{ prepared: PreparedPack; manifest: Record<string, unknown>; files: [string, Uint8Array][] }>
export function sha256(value: string | Uint8Array): Promise<string>
