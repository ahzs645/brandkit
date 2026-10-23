// Adapt one module boundary and keep upstream's complete import pipeline.
export * from '@template-printer/package-url'
import { readPackageUrl as readOriginal, describePackageSource as describeOriginal } from '@template-printer/package-url'
import { trustedPackageUrl, trustedPackageSource } from './handoff.js'

export const readPackageUrl = (search) => {
  const value = new URLSearchParams(search).get('url')
  return value && value === trustedPackageUrl() ? value : readOriginal(search)
}
export const describePackageSource = (url) => url === trustedPackageUrl() ? trustedPackageSource() : describeOriginal(url)
