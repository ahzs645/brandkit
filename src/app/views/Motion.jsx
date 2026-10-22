// A brand's motion library: the page the brand carries for it (`motion.page`), shown whole, so its
// studies play exactly as they do in the kit's motion/index.html.

/** The URL of the brand's motion library page, when the brand has one and its files hold it. */
export const motionUrl = (brand, source) => (brand?.motion?.page && source?.url(brand.motion.page)) || null

export const Motion = ({ brand, source }) => {
  const url = motionUrl(brand, source)
  if (!url) {
    return <div className="view"><p className="muted">{brand.name} has no motion library. A brand adds one by naming its page in <code>motion.page</code>.</p></div>
  }
  const { tokens, studies = [] } = brand.motion
  return (
    <div className="view motion-view">
      <p className="muted">
        {studies.length} studies
        {tokens?.durations && <> · {Object.entries(tokens.durations).map(([key, value]) => `${key} ${value} ms`).join(' · ')}</>}
        {' · '}<a href={url} target="_blank" rel="noreferrer">Open in a new tab</a>
      </p>
      <iframe className="motion-frame" title={`${brand.name} motion library`} src={url} />
    </div>
  )
}
