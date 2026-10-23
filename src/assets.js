// Embedded assets make an imported brand portable through JSON, browser storage and the CLI.
export const fromBase64 = (text) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0))
export const toBase64 = (bytes) => {
  let value = ''
  for (let offset = 0; offset < bytes.length; offset += 8192) value += String.fromCharCode(...bytes.subarray(offset, offset + 8192))
  return btoa(value)
}
export const readBrandAsset = async (brand, path, read) => brand.assets?.[path] != null
  ? fromBase64(brand.assets[path]).buffer
  : read(path)
