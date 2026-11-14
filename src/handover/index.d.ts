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
  pages: Array<{ id: string; title: string; kind: string; blocks: Array<Record<string, unknown>> }>
  [key: string]: unknown
}

export function handoverPublications(record: HandoverRecord, options: {
  providerBrand: Record<string, any>
  clientBrand: Record<string, any>
  paper?: 'letter' | 'a4'
  providerLogo?: HandoverFigure
  brandFigures?: { logoVariants?: HandoverFigure; palette?: HandoverFigure }
  forIssue?: boolean
}): { welcome: HandoverPublication; quickStart: HandoverPublication; brandGuide: HandoverPublication }
