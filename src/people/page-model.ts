import { portraitFor } from '#/drivers/portraits.ts'
import type { Photo } from '#/home/content.ts'
import { person, team, titleFight } from '#/season/page-model.ts'
import type { SeasonSnapshot } from '#/season/snapshot-schema.ts'
import { capital, ordinal, ordinalWord, words } from '#/season/words.ts'

import { BAND } from './legends.ts'
import { personFor } from './people.ts'
import type { Past, People, PersonRow, Round, Team } from './schema.ts'

export type Career = {
  firstSeason: number
  starts: number
  wins: number
  podiums: number
  poles: number
  points: number
  seasons: number
  teams: ReadonlyArray<Team>
  firstWin: { season: number; country: string } | null
  finals: Past['finals']
  rookie: boolean
}

export type RaceRow = { round: string; grandPrix: string; city: string; start: string | null; finish: string; short: string; points: string | null; best: boolean; dnr: boolean }

type Line = { label: string; value: string }

export type DriverPage = {
  hero: { label: string; given: string; family: string; sub: string; photo: Photo }
  season: { label: string; headline: string; body: string; stats: ReadonlyArray<Line & { note: string }>; payoff: string; credit: string } | null
  career: { label: string; number: string; unit: string; headline: string; body: string; payoff: string; ladder: ReadonlyArray<Line>; credit: string } | null
  races: { label: string; rows: ReadonlyArray<RaceRow>; footnote: string; key: string | null } | null
  next: { label: string; name: string; to: `/people/${string}`; photo: Photo | undefined }
}

const FINISH = new Map([
  ['R', 'Retired'],
  ['D', 'Disqualified'],
  ['N', 'Not classified'],
  ['W', 'Did not start'],
  ['F', 'Did not qualify'],
  ['E', 'Excluded'],
])

const SHORT = new Map([
  ['Retired', 'Out'],
  ['Disqualified', 'DSQ'],
  ['Not classified', 'NC'],
  ['Did not start', 'DNS'],
  ['Did not qualify', 'DNQ'],
  ['Excluded', 'EXC'],
])

const classified = (row: PersonRow) => /^\d+$/.test(row.positionText)

const started = (row: PersonRow) => row.positionText !== 'W' && row.positionText !== 'F'

const plural = (n: number, one: string) => (n === 1 ? one : `${one}s`)

const list = (items: ReadonlyArray<string | number>) => {
  const all = items.map(String)
  const last = all.at(-1)

  return all.length < 2 || last === undefined ? all.join('') : `${all.slice(0, -1).join(', ')} and ${last}`
}

const teamName = (t: Team) => team({ constructorId: t.constructorId, name: t.name.replace(/ F1 Team$/, ''), nationality: '' }).name

const ageAt = (born: string, now: Date) => {
  const [year = 0, month = 1, day = 1] = born.split('-').map(Number)
  const had = now.getUTCMonth() + 1 > month || (now.getUTCMonth() + 1 === month && now.getUTCDate() >= day)

  return now.getUTCFullYear() - year - (had ? 0 : 1)
}

const bestRow = (rows: ReadonlyArray<PersonRow>) =>
  rows.filter(classified).reduce<PersonRow | undefined>((best, row) => (!best || row.position < best.position || (row.position === best.position && row.points > best.points) ? row : best), undefined)

const constructorName = (snapshot: SeasonSnapshot, constructorId: string) =>
  snapshot.driverStandings?.rows.flatMap((row) => row.constructors).find((c) => c.constructorId === constructorId)?.name ?? constructorId

export function career(people: People, driverId: string): Career | null {
  const past = people.past[driverId]

  if (!past || past.through !== people.season - 1) return null

  const rows = (people.results[driverId] ?? []).filter(started)
  const wins = rows.filter((row) => classified(row) && row.position === 1)
  const firstWin = wins[0]
  const country = firstWin && people.rounds.find((round) => round.round === firstWin.round)?.country
  const teams = [...past.teams]

  for (const row of rows) if (!teams.some((t) => t.constructorId === row.constructorId)) teams.push({ constructorId: row.constructorId, name: row.constructorId })

  const seasons = rows.length > 0 ? [...past.seasons, people.season] : past.seasons

  return {
    firstSeason: seasons[0] ?? people.season,
    starts: past.starts + rows.length,
    wins: past.wins + wins.length,
    podiums: past.podiums + rows.filter((row) => classified(row) && row.position <= 3).length,
    poles: past.poles + (people.results[driverId] ?? []).filter((row) => row.qualified === 1).length,
    points: past.points + rows.reduce((sum, row) => sum + row.points, 0) + (people.sprintPoints[driverId] ?? 0),
    seasons: seasons.length,
    teams,
    firstWin: past.firstWin ?? (firstWin && country ? { season: people.season, country } : null),
    finals: past.finals,
    rookie: past.starts === 0,
  }
}

const careerSection = (snapshot: SeasonSnapshot, c: Career, round: number) => {
  const names = c.teams.map((t) => teamName({ constructorId: t.constructorId, name: t.name === t.constructorId ? constructorName(snapshot, t.constructorId) : t.name }))
  const titles = c.finals.filter((f) => f.position === 1).map((f) => f.season)
  const best = Math.min(...c.finals.flatMap((f) => (f.position === null ? [] : [f.position])))
  const bestYears = c.finals.filter((f) => f.position === best).map((f) => f.season)
  const record = titles.length > 0 ? ` World champion in ${list(titles)}.` : Number.isFinite(best) ? ` Best season: ${ordinal(best)}, in ${list(bestYears)}.` : ''

  const headline =
    c.wins === 0 || !c.firstWin ? 'No wins yet.' : c.wins === 1 ? `One win: ${c.firstWin.country}, ${c.firstWin.season}.` : `${c.wins} wins. The first: ${c.firstWin.country}, ${c.firstWin.season}.`

  return {
    label: `Career · Since ${c.firstSeason}`,
    number: String(c.starts),
    unit: `${plural(c.starts, 'start')} in Formula 1`,
    headline,
    body: `With ${list(names)}.${record}`,
    payoff: c.rookie ? 'First season.' : `${capital(words(c.seasons))} ${plural(c.seasons, 'season')}, ${words(c.teams.length)} ${plural(c.teams.length, 'team')}.`,
    ladder: [
      { label: 'Wins', value: String(c.wins) },
      { label: 'Podiums', value: String(c.podiums) },
      { label: 'Pole positions', value: String(c.poles) },
      { label: 'Points', value: String(c.points) },
      titles.length > 0 ? { label: 'Titles', value: String(titles.length) } : { label: 'Best season', value: Number.isFinite(best) ? ordinal(best) : '—' },
    ],
    credit: `Career figures: Jolpica F1 API, after round ${round} · points include sprints`,
  }
}

const teammate = (people: People, driverId: string, constructorId: string) => {
  const mine = new Set((people.results[driverId] ?? []).filter((row) => row.constructorId === constructorId).map((row) => row.round))

  return Object.entries(people.results)
    .filter(([id]) => id !== driverId)
    .map(([id, rows]) => ({ id, shared: rows.filter((row) => row.constructorId === constructorId && mine.has(row.round)).length }))
    .filter((mate) => mate.shared > 0)
    .sort((a, b) => b.shared - a.shared)[0]?.id
}

const headToHead = (people: People, driverId: string, mateId: string) => {
  const mates = people.results[mateId] ?? []

  const duels = (people.results[driverId] ?? []).flatMap((me) => {
    const mate = mates.find((row) => row.round === me.round)

    return me.qualified !== null && mate !== undefined && mate.qualified !== null && me.constructorId === mate.constructorId ? [me.qualified < mate.qualified] : []
  })

  const ahead = duels.filter(Boolean).length

  return { ahead, behind: duels.length - ahead, total: duels.length }
}

const roundOf = (people: People, round: number): Round | undefined => people.rounds.find((r) => r.round === round)

const raceRows = (people: People, driverId: string): ReadonlyArray<RaceRow> => {
  const rows = people.results[driverId] ?? []
  const best = bestRow(rows)

  return people.rounds.map((round) => {
    const row = rows.find((r) => r.round === round.round)
    const base = { round: String(round.round).padStart(2, '0'), grandPrix: round.raceName.replace(' Grand Prix', ''), city: round.locality }

    if (!row) return { ...base, start: null, finish: 'Did not race', short: 'Did not race', points: null, best: false, dnr: true }

    const finish = classified(row) ? `P${row.position}` : (FINISH.get(row.positionText) ?? row.positionText)

    return {
      ...base,
      start: row.grid === 0 ? 'Pit lane' : `P${row.grid}`,
      finish,
      short: SHORT.get(finish) ?? finish,
      points: String(row.points),
      best: row === best,
      dnr: false,
    }
  })
}

const shortKey = (rows: ReadonlyArray<RaceRow>) => [...new Set(rows.flatMap((row) => (row.short === row.finish ? [] : [`${row.short}: ${row.finish.toLowerCase()}.`])))].join(' ') || null

export function driverPage(snapshot: SeasonSnapshot, driverId: string, now: Date): DriverPage | null {
  const entry = personFor(driverId)
  const standings = snapshot.driverStandings
  const people = snapshot.people
  const standing = standings?.rows.find((row) => row.driver.driverId === driverId)

  if (!entry || !standings || !people || !standing) return null

  const ref = standing.driver
  const name = person(ref).name
  const given = name.endsWith(` ${ref.familyName}`) ? name.slice(0, -ref.familyName.length - 1) : ref.givenName
  const rows = people.results[driverId] ?? []
  const constructorId = rows.at(-1)?.constructorId ?? standing.constructors.at(-1)?.constructorId ?? ''
  const teamLabel = teamName({ constructorId, name: constructorName(snapshot, constructorId) })
  const round = standings.round
  const lastRound = roundOf(people, people.rounds.at(-1)?.round ?? round)
  const born = people.born[driverId]
  const age = born ? `, ${ageAt(born, now)}` : ''
  const c = career(people, driverId)
  const raceList = raceRows(people, driverId)

  const since = !c
    ? ''
    : c.rookie
      ? ` First season in Formula 1, with ${teamLabel}.`
      : c.teams.length === 1
        ? ` In Formula 1 since ${c.firstSeason}, with ${teamLabel}.`
        : ` In Formula 1 since ${c.firstSeason}, with ${words(c.teams.length)} teams.`

  const fight = titleFight(snapshot)
  const decided = fight?.state === 'decided' || fight?.state === 'over'
  const position = standing.position ?? 0
  const startsNow = rows.filter(started).length
  const winsNow = rows.filter((row) => classified(row) && row.position === 1)
  const best = bestRow(rows)
  const bestRound = best && roundOf(people, best.round)
  const firstWinRound = winsNow[0] && roundOf(people, winsNow[0].round)
  const mateId = teammate(people, driverId, constructorId)
  const mate = mateId === undefined ? undefined : standings.rows.find((row) => row.driver.driverId === mateId)
  const duel = mateId === undefined ? undefined : headToHead(people, driverId, mateId)
  const headline = position === 1 ? (decided ? `Champion in ${people.season}.` : `Leading ${people.season}.`) : `${capital(ordinalWord(position))} in ${people.season}.`

  const payoff =
    winsNow.length > 1 && firstWinRound
      ? `${winsNow.length} wins in ${people.season}, the first in ${firstWinRound.locality}.`
      : winsNow.length === 1 && firstWinRound
        ? `Best of ${people.season}: a win in ${firstWinRound.locality}.`
        : best && bestRound
          ? `Best of ${people.season}: ${ordinal(best.position)} in ${bestRound.locality}, for ${best.points} ${plural(best.points, 'point')}.`
          : `No classified finish in ${people.season} yet.`

  const order = standings.rows.filter((row) => personFor(row.driver.driverId))
  const here = order.findIndex((row) => row.driver.driverId === driverId)
  const next = order[(here + 1) % order.length] ?? order[0]
  const nextPerson = next ? person(next.driver) : undefined
  const portrait = next?.driver.code ? portraitFor(next.driver.code) : undefined

  return {
    hero: { label: `The people · ${teamLabel} · No. ${ref.number ?? ''}`, given, family: ref.familyName, sub: `${ref.nationality ?? ''}${age}.${since}`, photo: entry.hero },
    season: {
      label: `${people.season} · After round ${round}`,
      headline,
      body: `${capital(words(standing.points))} ${plural(standing.points, 'point')} from ${startsNow} ${plural(startsNow, 'race')}.${mate ? ` ${teamLabel} teammate ${person(mate.driver).name} has ${mate.points}.` : ''}`,
      stats: [
        { label: 'Points', value: String(standing.points), note: `P${position} in the championship` },
        { label: 'Best finish', value: best ? ordinal(best.position) : '—', note: bestRound ? `${bestRound.country}, round ${bestRound.round}` : '' },
        ...(mate && duel ? [{ label: `Qualifying vs ${mate.driver.familyName}`, value: `${duel.ahead}–${duel.behind}`, note: `Ahead in ${duel.ahead} of ${duel.total}` }] : []),
        { label: 'Races', value: String(startsNow), note: `Of ${people.rounds.length} so far` },
      ],
      payoff,
      credit: `Figures: Jolpica F1 API, after round ${round}, ${lastRound?.locality ?? ''}`,
    },
    career: c ? careerSection(snapshot, decided && position === 1 ? { ...c, finals: [...c.finals, { season: people.season, position }] } : c, round) : null,
    races: { label: `Race by race · ${people.season}`, rows: raceList, footnote: `Results: Jolpica F1 API, after round ${round}. Sprints not shown.`, key: shortKey(raceList) },
    next: {
      label: `Next · P${next?.position ?? 1}`,
      name: nextPerson?.name ?? '',
      to: `/people/${next?.driver.driverId ?? ''}`,
      photo: portrait && nextPerson ? { ...portrait, place: `${nextPerson.name} · ${portrait.place}` } : next && personFor(next.driver.driverId)?.hero,
    },
  }
}

export type TowerRow = {
  position: string
  number: string
  name: string
  team: string
  nationality: string
  points: string
  to: `/people/${string}` | null
  champion: boolean
  thumb: Photo | null
}

export type PeopleIndex = {
  hero: { label: string; count: number; body: string; facts: ReadonlyArray<Line & { note: string }> }
  band: { visible: boolean }
  tower: { label: string; meta: string; rows: ReadonlyArray<TowerRow>; footnote: string | null }
}

const roundsText = (rounds: ReadonlyArray<number>) => {
  const first = rounds[0]
  const last = rounds.at(-1)
  const run = first !== undefined && last !== undefined && last - first === rounds.length - 1

  return rounds.length === 1 ? `round ${first}` : run ? `rounds ${first} to ${last}` : `rounds ${list(rounds)}`
}

export function peopleIndex(snapshot: SeasonSnapshot, now: Date): PeopleIndex | null {
  const standings = snapshot.driverStandings

  if (!standings) return null

  const people = snapshot.people
  const fight = titleFight(snapshot)
  const decided = fight?.state === 'decided' || fight?.state === 'over'
  const currentTeam = (driverId: string, fallback: string) => (people?.results[driverId] ?? []).at(-1)?.constructorId ?? fallback
  const nameOf = (constructorId: string) => teamName({ constructorId, name: constructorName(snapshot, constructorId) })
  const grid = standings.rows.filter((row) => personFor(row.driver.driverId))
  const teams = new Set(grid.map((row) => currentTeam(row.driver.driverId, row.constructors.at(-1)?.constructorId ?? '')))
  const locality = people?.rounds.at(-1)?.locality ?? ''

  const aged = (driverId: string) => {
    const born = people?.born[driverId]

    return born ? `Aged ${ageAt(born, now)}` : ''
  }

  const byAge = grid.flatMap((row) => {
    const born = people?.born[row.driver.driverId]

    return born ? [{ row, born }] : []
  })

  const sorted = [...byAge].sort((a, b) => b.born.localeCompare(a.born))
  const youngest = sorted[0]
  const oldest = sorted.at(-1)
  const leader = standings.rows[0]
  const fact = (label: string, entry: (typeof standings.rows)[number] | undefined) => (entry ? [{ label, value: entry.driver.familyName, note: aged(entry.driver.driverId) }] : [])
  const standIns = standings.rows.filter((row) => !personFor(row.driver.driverId))

  const footnote = standIns.map((row) => {
    const rows = people?.results[row.driver.driverId] ?? []

    return `${person(row.driver).name} (${nameOf(currentTeam(row.driver.driverId, row.constructors.at(-1)?.constructorId ?? ''))}, ${roundsText(rows.map((r) => r.round))})`
  })

  return {
    hero: {
      label: `The people · ${standings.season} season`,
      count: grid.length,
      body: `${capital(words(teams.size))} teams, two cars each. Who drives for whom, how they stand after ${locality}, and the champions they are chasing.`,
      facts: [...fact(decided ? 'Champion' : 'Leader', leader), ...fact('Youngest', youngest?.row), ...fact('Oldest', oldest?.row)],
    },
    band: { visible: standings.season === BAND.season },
    tower: {
      label: `The grid · after round ${standings.round}`,
      meta: `${grid.length} drivers · ${teams.size} teams · points after ${locality}`,
      rows: standings.rows.map((row, i) => {
        const entry = personFor(row.driver.driverId)
        const position = row.position ?? i + 1

        return {
          position: String(position).padStart(2, '0'),
          number: String(row.driver.number ?? ''),
          name: person(row.driver).name,
          team: nameOf(currentTeam(row.driver.driverId, row.constructors.at(-1)?.constructorId ?? '')),
          nationality: row.driver.nationality ?? '',
          points: String(row.points),
          to: entry ? `/people/${entry.driverId}` : null,
          champion: decided && position === 1,
          thumb: entry?.hero ?? null,
        }
      }),
      footnote: footnote.length > 0 ? `Also raced in ${standings.season}: ${list(footnote)}.` : null,
    },
  }
}
