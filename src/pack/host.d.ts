export type BrandDefinition = Record<string, unknown> & { id: string; name: string }
export interface PackManifest extends Record<string, unknown> {
  format: 'brandkit-pack'; version: 1; id: string; name: string;
  brandVersion?: string; menuLogo?: string; pages?: Record<string, unknown>;
  aliases?: Record<string, string>; library?: Record<string, string>;
}
export class BrandPackError extends Error { code: string; constructor(message: string, code?: string) }
export interface InspectedBrand {
  brand: BrandDefinition; manifest: PackManifest | null; root: string; assetRoot: string;
  files: Map<string, Uint8Array>; archiveFiles: Set<string>; library: Map<string, string>;
  warnings: string[]; exportOriginal: boolean;
}
export interface CatalogEntry {
  id: string; name: string; url: string; sha256?: string; bytes?: number;
  brandVersion?: string; description?: string; menuLogo?: string; pages?: Record<string, unknown>;
}
export interface PackCatalog { format: 'brandkit-catalog'; version: 1; name?: string; description?: string; packs: CatalogEntry[] }
export function packMemberPath(value: unknown): string
export function brandDefinitions(entries: Map<string, Uint8Array>): string[]
export function inspectBrandFiles(entries: Map<string, Uint8Array>, options?: { definitionPath?: string; maxManifestBytes?: number; maxAliases?: number }): InspectedBrand
export function brandReferenceSummary(brand: BrandDefinition): Record<string, unknown>
export function catalogProblems(catalog: unknown): string[]
export function verifyCatalogEntry(entry: CatalogEntry, actual: { sha256: string; bytes: number; id?: string }): true
export function catalogEntriesForPath(catalog: PackCatalog, catalogPath: string, memberPath: string): CatalogEntry[]
export function buildCatalog(packs: Array<{ manifest: PackManifest; sha256: string; bytes: Uint8Array; file: string; description?: string; menuLogo?: string | null }>, options?: { name?: string; baseUrl?: string; description?: string }): PackCatalog
