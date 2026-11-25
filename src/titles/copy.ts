import { TEAM_IDS } from '#/season/page-model.ts'
import { ordinal, words } from '#/season/words.ts'

import { frame, type Frame, pointsLeft, type Side, total, won } from './model.ts'
import type { Titles } from './schema.ts'

const TERMS = 3

export const teamName = (titles: Titles, id: string): string => TEAM_IDS.get(id) ?? titles.teams[id]?.name ?? id

export const driverName = (titles: Titles, id: string): string => titles.drivers[id]?.family ?? id

const AHEAD = new Map([
  [0, 'Level.'],
  [1, 'point ahead.'],
])

const leftText = ({ left, wonAt }: Side) => (left === 0 ? 'No points left.' : wonAt === null ? `${left} left to win.` : `Only ${left} left to win.`)

export const heroText = (side: Side) => ({ lead: String(side.lead), ahead: AHEAD.get(side.lead) ?? 'points ahead.', left: leftText(side) })

export const stateText = ({ wonAt }: Side, titles: Titles) => (wonAt === null ? 'Still open' : `Won · round ${titles.rounds[wonAt]?.round ?? wonAt + 1}`)

export const dateText = (date: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'long' }).format(new Date(`${date}T00:00:00Z`))

const spoken = (side: Side, name: string) => `${name} ${side.lead} ahead, ${side.left} left, ${side.wonAt === null ? 'open' : 'won'}.`

export const sliderText = (titles: Titles, f: Frame) =>
  [
    `Round ${f.round.round} of ${total(titles)}, ${f.round.locality}.`,
    `Drivers: ${spoken(f.drivers, driverName(titles, f.drivers.rows[0]?.id ?? ''))}`,
    `Constructors: ${spoken(f.teams, teamName(titles, f.teams.rows[0]?.id ?? ''))}`,
  ].join(' ')

const lastTeam = (titles: Titles, driver: string) =>
  titles.rounds
    .flatMap((round) => round.rows)
    .filter(([id]) => id === driver)
    .at(-1)?.[1]

type Win = { at: number; name: string; title: string }

const later = (gap: number) => (gap === 0 ? ' the same day' : ` ${words(gap)} ${gap === 1 ? 'race' : 'races'} later, at `)

const story = (titles: Titles, f: Frame) => {
  const at = won(titles)
  const n = titles.rounds.length
  const place = (i: number) => titles.rounds[i]?.locality ?? ''
  const driver = f.drivers.rows[0]?.id ?? ''
  const team = f.teams.rows[0]?.id ?? ''
  const wins: Array<Win> = []

  if (at.drivers !== null) wins.push({ at: at.drivers, name: driverName(titles, driver), title: "drivers'" })

  if (at.teams !== null) wins.push({ at: at.teams, name: teamName(titles, team), title: "teams'" })

  const [first, second] = wins.sort((a, b) => a.at - b.at)
  const opening = first ? `${first.name} won the ${first.title} title at ${place(first.at)}.` : ''

  if (!second) {
    const left = pointsLeft(titles, n)

    return { headline: ['One title won.', 'One still open.'] as const, body: `${opening} The other is still open, with ${at.drivers === null ? left.drivers : left.teams} points left.` }
  }

  const gap = second.at - (first?.at ?? 0)
  const closing = `${second.name} won the ${second.title} title${later(gap)}${gap === 0 ? '' : place(second.at)}.`
  const same = lastTeam(titles, driver) === team

  return {
    headline: same ? (['Both titles.', 'One team.'] as const) : (['Two titles.', 'Two teams.'] as const),
    body: [opening, closing, ...(same ? ['It took both cars.'] : [])].join(' '),
  }
}

export const sum = (titles: Titles) => {
  const f = frame(titles, titles.rounds.length - 1)
  const top = f.teams.rows[0]
  const split = top?.split ?? []
  const shown = split.length > TERMS ? split.slice(0, TERMS - 1) : split
  const rest = split.slice(shown.length).reduce((points, s) => points + s.points, 0)
  const position = new Map(f.drivers.rows.map((row) => [row.id, row.position]))
  const terms = shown.map(({ id, points }) => ({ points, caption: `${driverName(titles, id)} · drivers' ${ordinal(position.get(id) ?? 0)}` }))

  return {
    label: titles.left.length === 0 ? `The ${titles.season} season · final` : `The season so far · after round ${f.round.round}`,
    terms: rest > 0 ? [...terms, { points: rest, caption: 'Others' }] : terms,
    total: { points: top?.points ?? 0, caption: `${teamName(titles, top?.id ?? '')} · constructors' 1st` },
    ...story(titles, f),
    source: `Standings: Jolpica F1 API, after the ${f.round.name}`,
  }
}
