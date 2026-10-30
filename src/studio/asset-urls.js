// A standalone host may omit an asset resolver when rendering an imported brand. Treat its
// document link as data, not as permission to execute a URL scheme in the host's origin.
const DOCUMENT_PROTOCOLS = new Set(['http:', 'https:', 'blob:'])

/** Preserve valid relative links and web/object URLs; reject executable or unsupported schemes. */
export const safeDocumentHref = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null
  const href = value.trim()
  try {
    // The fixed base is only for classifying relative URLs. Return the original relative path
    // so the host's own base URL continues to resolve its assets. URL parsing also accounts for
    // browser-normalized control characters, e.g. a newline embedded in "javascript:".
    const parsed = new URL(href, 'https://brandkit.invalid/')
    return DOCUMENT_PROTOCOLS.has(parsed.protocol) ? href : null
  } catch {
    return null
  }
}
