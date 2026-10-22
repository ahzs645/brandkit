// The Motion tab's rules, in a plain module so Node's test runner can import them.

/** The URL of the brand's motion library page, when the brand has one and its files hold it. */
export const motionUrl = (brand, source) => (brand?.motion?.page && source?.url(brand.motion.page)) || null

/** The view to show: Motion falls back to the overview for a brand (or revision) without a library. */
export const viewOrOverview = (view, url) => (view === 'motion' && !url ? 'overview' : view)
