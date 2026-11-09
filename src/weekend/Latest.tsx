import { Soon } from '#/shell/Go.tsx'

import type { Latest as LatestBlock } from './page-model.ts'

export function Latest({ latest }: { latest: LatestBlock | null }) {
  if (!latest) return null

  const { image } = latest

  return (
    <section className={image ? 'latest' : 'latest is-text'} aria-labelledby="latest">
      {image ? (
        <figure>
          <img src={image.src} alt="" loading="lazy" />
          <figcaption>
            <p className="who">{latest.who}</p>
            <p className="mono credit">{image.credit}</p>
          </figcaption>
        </figure>
      ) : null}
      <div className="text">
        <p className="mono label">{latest.label}</p>
        {latest.gap ? <p className="display gap">{latest.gap}</p> : null}
        <h2 id="latest" className="headline">
          {latest.headline}
        </h2>
        <p className="body">{latest.body}</p>
        <ol className="rows">
          {latest.rows.map((row) => (
            <li key={row.position}>
              <span className="mono pos">P{row.position}</span>
              <i style={{ background: row.colour }} aria-hidden />
              <span className="mono code">{row.code}</span>
              <span className="mono time">{row.time}</span>
            </li>
          ))}
        </ol>
        <Soon className="mono more">Full timesheet</Soon>
      </div>
    </section>
  )
}
