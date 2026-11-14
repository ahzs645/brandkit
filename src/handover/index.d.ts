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

export type WelcomeCoverVariant = 'complete-mark' | 'inset-frame' | 'mark-pattern' | 'type-only' | 'legacy-crop'

export interface WelcomeCoverVariantMetadata {
  readonly id: WelcomeCoverVariant
  readonly label: string
  readonly description: string
  readonly status: 'proposed' | 'legacy'
}

export const WELCOME_COVER_VARIANTS: readonly Readonly<WelcomeCoverVariantMetadata>[]
/** Omitted selection preserves legacy-crop; unsupported IDs throw. */
export function welcomeCoverVariant(id?: WelcomeCoverVariant): Readonly<WelcomeCoverVariantMetadata>

export interface WelcomeCoverImage {
  /** Embedded PNG data URL. */
  src: string
  alt: string
}

export interface WelcomeCoverLogo extends WelcomeCoverImage {
  /** Maximum width; the renderer preserves the image's proportions. */
  widthMm?: number
}

export interface WelcomeCoverSection {
  number: string
  title: string
  description: string
}

export interface WelcomeCover {
  schema: 'brandkit/welcome-cover/1'
  /** Missing in older saved publications; interpreted as legacy-crop. */
  variant?: WelcomeCoverVariant
  providerLogo: WelcomeCoverLogo
  clientLogo?: WelcomeCoverLogo
  /** Required for graphic variants; omitted for type-only. */
  graphic?: WelcomeCoverImage
  /** Native editable rows for type-only; validated by the cover renderer. */
  sections?: WelcomeCoverSection[]
  kicker: string
  title: string
  subtitle: string
  clientName: string
  preparedBy: string
  dateText: string
  status: string
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
}): { welcome: HandoverPublication; quickStart: HandoverPublication; brandGuide: HandoverPublication }
