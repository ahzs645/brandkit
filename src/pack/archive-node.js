// Bounded, inert ZIP intake for server hosts and the catalog CLI (Node/Bun).
import { Buffer } from 'node:buffer'
import * as zlib from 'node:zlib'
import { BrandPackError, packMemberPath } from './host.js'

export const DEFAULT_ARCHIVE_LIMITS = Object.freeze({ maxArchiveBytes: 32 * 1024 * 1024, maxExpandedBytes: 128 * 1024 * 1024,
  maxFileBytes: 16 * 1024 * 1024, maxEntries: 4000, maxDirectoryBytes: 4 * 1024 * 1024, maxCompressionRatio: 1000 })
const table = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let bit = 0; bit < 8; bit++) n = (n & 1) ? 0xedb88320 ^ (n >>> 1) : n >>> 1
  return n >>> 0
})
const crc32 = bytes => {
  if (typeof zlib.crc32 === 'function') return zlib.crc32(bytes) >>> 0
  let crc = 0xffffffff
  for (const byte of bytes) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}
const invalid = message => { throw new BrandPackError(message, 'invalid_archive') }
const limited = message => { throw new BrandPackError(message, 'limit_exceeded') }

/** Verify every directory entry before inflating any member. Does not write or execute files. */
export const readPackFiles = (input, options = {}) => {
  const limits = { ...DEFAULT_ARCHIVE_LIMITS, ...options }
  for (const value of Object.values(limits)) if (!Number.isSafeInteger(value) || value <= 0) invalid('Archive limits must be positive integers.')
  if (!(input instanceof Uint8Array) || !input.byteLength || input.byteLength > limits.maxArchiveBytes) limited('ZIP exceeds the archive size limit.')
  const bytes = Buffer.from(input.buffer, input.byteOffset, input.byteLength)
  let end = -1
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) {
    if (bytes.readUInt32LE(offset) === 0x06054b50 && offset + 22 + bytes.readUInt16LE(offset + 20) === bytes.length) { end = offset; break }
  }
  if (end < 0) invalid('Not a ZIP archive (no end of central directory).')
  if (bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6) || bytes.readUInt16LE(end + 8) !== bytes.readUInt16LE(end + 10)) invalid('Multi-disk ZIP archives are unsupported.')
  const count = bytes.readUInt16LE(end + 10), size = bytes.readUInt32LE(end + 12), start = bytes.readUInt32LE(end + 16)
  if (count === 0xffff || size === 0xffffffff || start === 0xffffffff) invalid('ZIP64 brand packs are unsupported.')
  if (count > limits.maxEntries || size > limits.maxDirectoryBytes) limited('ZIP contains too many entries.')
  if (start + size > end) invalid('ZIP central directory is outside the archive.')
  const entries = [], names = new Set()
  let offset = start, expanded = 0
  for (let index = 0; index < count; index++) {
    if (offset + 46 > start + size || bytes.readUInt32LE(offset) !== 0x02014b50) invalid('Invalid ZIP directory entry.')
    const flags = bytes.readUInt16LE(offset + 8), method = bytes.readUInt16LE(offset + 10)
    const checksum = bytes.readUInt32LE(offset + 16), compressed = bytes.readUInt32LE(offset + 20), length = bytes.readUInt32LE(offset + 24)
    const nameLength = bytes.readUInt16LE(offset + 28), extraLength = bytes.readUInt16LE(offset + 30), commentLength = bytes.readUInt16LE(offset + 32)
    const next = offset + 46 + nameLength + extraLength + commentLength
    const attributes = bytes.readUInt32LE(offset + 38), local = bytes.readUInt32LE(offset + 42), type = (attributes >>> 16) & 0o170000
    if (next > start + size || bytes.readUInt16LE(offset + 34)) invalid('Invalid ZIP directory bounds or disk.')
    if (length === 0xffffffff || compressed === 0xffffffff || local === 0xffffffff) invalid('ZIP64 brand packs are unsupported.')
    const nameBytes = bytes.subarray(offset + 46, offset + 46 + nameLength)
    const path = nameBytes.toString(flags & 0x800 ? 'utf8' : 'latin1')
    const directory = path.endsWith('/') || type === 0o040000 || (attributes & 0x10) !== 0
    const name = packMemberPath(directory ? path.replace(/\/$/, '') : path)
    if (names.has(name)) invalid('ZIP contains duplicate paths.')
    names.add(name)
    if ((flags & 0x41) || ![0, 8].includes(method) || ![0, 0o040000, 0o100000].includes(type)) invalid('Encrypted ZIPs, links and special files are unsupported.')
    expanded += length
    if (length > limits.maxFileBytes || expanded > limits.maxExpandedBytes || length / Math.max(1, compressed) > limits.maxCompressionRatio) limited('ZIP exceeds the expanded file or library size limit.')
    entries.push({ path, directory, flags, method, checksum, compressed, length, local, nameBytes })
    offset = next
  }
  if (offset !== start + size) invalid('ZIP directory size disagrees with its entries.')
  const files = new Map()
  for (const entry of entries) {
    if (entry.directory) continue
    const { local } = entry
    if (local + 30 > start || bytes.readUInt32LE(local) !== 0x04034b50) invalid('Invalid ZIP local header.')
    const nameLength = bytes.readUInt16LE(local + 26), dataStart = local + 30 + nameLength + bytes.readUInt16LE(local + 28)
    if (dataStart + entry.compressed > start || !bytes.subarray(local + 30, local + 30 + nameLength).equals(entry.nameBytes)
      || bytes.readUInt16LE(local + 6) !== entry.flags || bytes.readUInt16LE(local + 8) !== entry.method) invalid('ZIP member disagrees with its directory.')
    let data = bytes.subarray(dataStart, dataStart + entry.compressed)
    if (entry.method === 8) {
      try { data = zlib.inflateRawSync(data, { maxOutputLength: Math.max(1, entry.length) }) }
      catch { invalid('ZIP member cannot be inflated within its declared size.') }
    }
    if (data.byteLength !== entry.length || crc32(data) !== entry.checksum) invalid('ZIP member failed its size or CRC check.')
    files.set(entry.path, data)
  }
  return files
}
