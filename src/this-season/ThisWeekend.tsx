import { useSecond } from '#/motion/client.ts'
import { weekend } from '#/season/page-model.ts'
import type { SeasonSnapshot } from '#/season/snapshot-schema.ts'

export function ThisWeekend({ snapshot }: { snapshot: SeasonSnapshot }) {
  const now = useSecond()
  const band = weekend(snapshot, now)

  if (!band) return null

  const { facts } = band

  return (
    <section className="this-weekend" aria-labelledby="this-weekend">
      <div className="band">
        {facts ? <img className="shot" src={facts.photo.large} srcSet={`${facts.photo.small} 720w, ${facts.photo.large} 2400w`} sizes="100vw" alt="" loading="lazy" /> : null}
        <div className="caption" data-theme="dark">
          <p className="mono">{band.label}</p>
          <h2 id="this-weekend" className="display">
            {band.title}
          </h2>
          {facts ? (
            <dl className="facts">
              <div>
                <dt className="mono">Laps</dt>
                <dd>{facts.laps}</dd>
              </div>
              <div>
                <dt className="mono">Lap length</dt>
                <dd>{facts.lengthKm} km</dd>
              </div>
              <div>
                <dt className="mono">First race here</dt>
                <dd>{facts.firstGp}</dd>
              </div>
            </dl>
          ) : null}
        </div>
        <div className="sessions">
          <p className="mono">Sessions · track time</p>
          <ul>
            {band.sessions.map((session) => (
              <li key={session.label} className={session.next ? 'is-next' : undefined}>
                <span className="name">{session.label}</span>
                <span className="mono day">{session.day}</span>
                <span className="mono status">{session.status}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mono credit">{facts ? `${facts.photo.place} · ${facts.photo.credit} · times from the official calendar` : 'Times from the official calendar'}</p>
    </section>
  )
}
