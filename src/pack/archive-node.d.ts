export interface ArchiveLimits {
  maxArchiveBytes: number; maxExpandedBytes: number; maxFileBytes: number;
  maxEntries: number; maxDirectoryBytes: number; maxCompressionRatio: number;
}
export const DEFAULT_ARCHIVE_LIMITS: Readonly<ArchiveLimits>
export function readPackFiles(bytes: Uint8Array, limits?: Partial<ArchiveLimits>): Map<string, Uint8Array>
