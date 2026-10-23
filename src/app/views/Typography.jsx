import { useState } from 'react'

/** Every supplied brand face, including specialist type and its original font download. */
export const Typography = ({ brand, source }) => {
  const [sample, setSample] = useState('')
  const seen = new Set()
  const faces = Object.entries(brand.fonts ?? {}).filter(([, face]) => {
    const id = `${face.file ?? face.web ?? face.family}:${face.weight}:${face.style ?? 'normal'}`
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
  return <div className="specimens">
    <label className="field"><span className="field__label">Try the brand’s fonts</span><input type="text" value={sample} placeholder="Type your own sample…" onChange={(event) => setSample(event.target.value)} /></label>
    {faces.map(([role, face]) => <div key={role} className="specimen" data-font-role={role}>
      <span className="eyebrow">{role.replace(/([a-z])([A-Z])/g, '$1 $2')} · {face.label ?? `${face.family} ${face.weight ?? 400}`}</span>
      <p style={{ fontFamily: face.stack ?? face.family, fontWeight: face.weight, fontStyle: face.style, fontSize: ['display', 'hand'].includes(role) ? 36 : 20 }}>
        {sample || face.sample || brand.copy?.tagline || brand.name}
      </p>
      <div className="downloads">
        {(face.file || face.web) && source?.has(face.file ?? face.web) && <a className="link" href={source.url(face.file ?? face.web)} download={(face.file ?? face.web).split('/').at(-1)}>Download font</a>}
        {face.license && source?.has(face.license) && <a className="link" href={source.url(face.license)} target="_blank" rel="noopener noreferrer">Licence</a>}
        {face.usage && <span className="muted">{face.usage}</span>}
      </div>
    </div>)}
  </div>
}
