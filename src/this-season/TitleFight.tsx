import { type Person, titleFight } from '#/season/page-model.ts'
import type { SeasonSnapshot } from '#/season/snapshot-schema.ts'
import { opposite, useTheme } from '#/shell/theme.ts'

import { creditOf, Shot } from './Fighter.tsx'

function Fighter({ person, place, points }: { person: Person; place: string; points: number }) {
  const { theme } = useTheme()

  return (
    <figure className="fighter">
      <div className="frame">
        <Shot person={person} />
        <img className="brackets" src="/img/viewfinder.svg" alt="" width={420} height={540} />
      </div>
      <figcaption data-theme={opposite(theme ?? 'light')} style={{ borderTopColor: person.colour }}>
        <span className="mono place">{place}</span>
        <span className="name">{person.name}</span>
        <span className="mono pts">{points} pts</span>
      </figcaption>
    </figure>
  )
}

export function TitleFight({ snapshot }: { snapshot: SeasonSnapshot }) {
  const fight = titleFight(snapshot)

  if (!fight) return null

  const gap = String(fight.gap)
  const credits = [creditOf(fight.first), creditOf(fight.second)].filter((credit) => credit !== null)

  return (
    <section className="title-fight" aria-labelledby="title-fight">
      <h2 id="title-fight" className="mono label">
        {fight.label}
      </h2>
      <div className="poster">
        <Fighter person={fight.first} place="P1" points={fight.firstPoints} />
        <div className="middle">
          <p className="gap display" data-digits={gap.length}>
            {gap}
          </p>
          <p className="mono what">Points between first and second</p>
          <p className="line">{fight.line}</p>
        </div>
        <Fighter person={fight.second} place="P2" points={fight.secondPoints} />
      </div>
      <p className="mono credit muted">{[...new Set(credits)].join(' / ')}</p>
    </section>
  )
}
