import { type CalendarCircuit, calendarCircuit, grandPrix } from '#/circuits/calendar.ts'
import { portraitFor } from '#/drivers/portraits.ts'
import { type Car, CARS, TEAMS } from '#/home/cars.ts'
import type { Photo } from '#/home/content.ts'

import type { ConstructorRef, DriverRef, Race, Session } from './jolpica-schema.ts'
import type { History, SeasonSnapshot } from './snapshot-schema.ts'
import { bounds, gpName, latestStart, pickRace, SESSION_LABEL, SESSION_MINUTES, weekday } from './weekend.ts'
import { capital, words } from './words.ts'

const MINUTE = 60_000

const HOUR = 60 * MINUTE

const DAY = 24 * HOUR

export type CalendarTile = {
  round: number
  circuitId: string
  code: string
  circuit?: CalendarCircuit
  state: 'done' | 'now' | 'upcoming'
  status: 'Done' | 'Now' | ''
}

export type WeekendSession = { label: string; day: string; status: string; next: boolean }

export type Weekend = { label: string; title: string; facts: CalendarCircuit | undefined; sessions: ReadonlyArray<WeekendSession> }

const STATUS = { done: 'Done', now: 'Now', upcoming: '' } as const

const LABEL = { 'this-weekend': 'This weekend', next: 'Next race', finale: 'Last race' } as const

const same = (a: Race, b: Race) => a.season === b.season && a.round === b.round

const liveRace = (snapshot: SeasonSnapshot, now: Date) => {
  const picked = pickRace(snapshot, now)

  return picked?.kind === 'this-weekend' && snapshot.calendar.some((race) => same(race, picked.race)) ? picked.race : null
}

const tileOf = (race: Race, live: Race | null, t: number): CalendarTile => {
  const { circuitId, country } = race.circuit
  const circuit = calendarCircuit(circuitId)
  const closes = bounds(race)?.closes
  const state = closes !== undefined && t >= closes ? 'done' : live && same(race, live) ? 'now' : 'upcoming'
  const tile: CalendarTile = { round: race.round, circuitId, code: circuit?.code ?? country.slice(0, 3).toUpperCase(), state, status: STATUS[state] }

  return circuit ? { ...tile, circuit } : tile
}

export const calendarTiles = (snapshot: SeasonSnapshot, now: Date): ReadonlyArray<CalendarTile> => {
  const live = liveRace(snapshot, now)

  return snapshot.calendar.map((race) => tileOf(race, live, now.getTime()))
}

const progress = (total: number, done: number, live: boolean) => {
  if (done === total) return 'All done.'

  const counted = done === 0 ? 'None' : capital(words(done))

  if (live) return `${counted} done, one live.`

  return done === 0 ? 'None done yet.' : `${counted} done, ${words(total - done)} to go.`
}

export function calendarHead(snapshot: SeasonSnapshot, now: Date) {
  const tiles = calendarTiles(snapshot, now)
  const total = tiles.length
  const current = tiles.find((tile) => tile.state === 'now') ?? tiles.find((tile) => tile.state === 'upcoming')
  const done = tiles.filter((tile) => tile.state === 'done').length

  return {
    label: `The calendar · ${total} rounds`,
    count: current ? `Round ${current.round} of ${total}` : 'Season complete',
    headline: `${capital(words(total))} circuits. ${progress(total, done, tiles.some((tile) => tile.state === 'now'))}`,
  }
}

const two = (n: number) => String(Math.floor(n)).padStart(2, '0')

const away = (ms: number) => (ms > DAY ? `${Math.floor(ms / DAY)}d ${two((ms % DAY) / HOUR)}h` : `${two(ms / HOUR)}h ${two((ms % HOUR) / MINUTE)}m`)

const sessionsOf = (race: Race, timeZone: string, t: number): ReadonlyArray<WeekendSession> => {
  const ends = (session: Session) => latestStart(session) + SESSION_MINUTES[session.name] * MINUTE
  const next = race.sessions.find((session) => ends(session) > t)

  return race.sessions.map((session) => {
    const start = Date.parse(session.startsAt)
    const isNext = session === next

    const status =
      ends(session) <= t
        ? 'Done'
        : !session.timeConfirmed
          ? 'Time TBC'
          : start <= t
            ? 'Live'
            : isNext
              ? `Next · ${away(start - t)}`
              : 'Later'

    return { label: SESSION_LABEL[session.name], day: weekday(session, timeZone), status, next: isNext }
  })
}

export function weekend(snapshot: SeasonSnapshot, now: Date): Weekend | null {
  const picked = pickRace(snapshot, now)

  if (!picked) return null

  const { race, kind, round } = picked
  const facts = calendarCircuit(race.circuit.circuitId)
  const later = !snapshot.calendar.some((entry) => same(entry, race))

  const label = later ? `Next race · ${race.season} · Round ${round}` : `${LABEL[kind]} · Round ${round}`

  return { label, title: `${grandPrix(gpName(race))}.`, facts, sessions: sessionsOf(race, facts?.tz ?? 'UTC', now.getTime()) }
}

export type Person = { code: string | null; name: string; family: string; colour: string; car?: Car; portrait?: Photo }

export type Team = { id: string; name: string; colour: string }

const MUTED = 'var(--muted)'

const TEAM_IDS = new Map<string, keyof typeof TEAMS>([
  ['mercedes', 'Mercedes'],
  ['ferrari', 'Ferrari'],
  ['red_bull', 'Red Bull'],
  ['mclaren', 'McLaren'],
  ['rb', 'Racing Bulls'],
  ['alpine', 'Alpine'],
  ['haas', 'Haas'],
  ['audi', 'Audi'],
  ['williams', 'Williams'],
  ['aston_martin', 'Aston Martin'],
  ['cadillac', 'Cadillac'],
])

export function person(ref: DriverRef): Person {
  const car = CARS.find((entry) => entry.code === ref.code)

  return {
    code: ref.code,
    name: car?.driver ?? `${ref.givenName} ${ref.familyName}`,
    family: ref.familyName,
    colour: car?.colour ?? MUTED,
    car,
    portrait: ref.code === null ? undefined : portraitFor(ref.code),
  }
}

export function team(ref: ConstructorRef): Team {
  const name = TEAM_IDS.get(ref.constructorId)

  return name ? { id: ref.constructorId, name, colour: TEAMS[name].colour } : { id: ref.constructorId, name: ref.name, colour: MUTED }
}

const standingsRound = (snapshot: SeasonSnapshot, standings: { season: number; round: number }) => {
  const race = snapshot.latest?.race.race

  return race && race.season === standings.season ? race.round : standings.round
}

const pointsOf = (race: Race) => (race.sessions.some((session) => session.name === 'Race') ? 25 : 0) + (race.sessions.some((session) => session.name === 'Sprint') ? 8 : 0)

const remaining = (snapshot: SeasonSnapshot, season: number, round: number) =>
  season === snapshot.season ? snapshot.calendar.filter((race) => race.round > round) : []

const pointsLeft = (races: ReadonlyArray<Race>) => races.reduce((sum, race) => sum + pointsOf(race), 0)

const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`

const roundsWord = (n: number) => `${words(n)} ${n === 1 ? 'round' : 'rounds'}`

const settledAt = (snapshot: SeasonSnapshot, history: History | undefined, leader: DriverRef) => {
  const settled = history?.leaders.find(
    (entry) => entry.driver.driverId === leader.driverId && entry.lead > pointsLeft(remaining(snapshot, snapshot.season, entry.round)),
  )

  const race = settled && snapshot.calendar.find((entry) => entry.round === settled.round)
  const spare = settled ? remaining(snapshot, snapshot.season, settled.round).length : 0

  return race && spare > 0 ? `It was settled at the ${grandPrix(gpName(race))}, with ${roundsWord(spare)} to spare.` : null
}

export function titleFight(snapshot: SeasonSnapshot) {
  const standings = snapshot.driverStandings
  const [p1, p2] = standings?.rows ?? []

  if (!standings || !p1 || !p2) return null

  const round = standingsRound(snapshot, standings)
  const left = remaining(snapshot, standings.season, round)
  const points = pointsLeft(left)
  const gap = p1.points - p2.points
  const state = points === 0 ? 'over' : gap > points ? 'decided' : 'open'
  const first = person(p1.driver)
  const champion = `${first.family} is the ${standings.season} champion`
  const settled = standings.season === snapshot.season ? settledAt(snapshot, snapshot.history, p1.driver) : null
  const sameTeam = p1.constructors.at(-1)?.constructorId === p2.constructors.at(-1)?.constructorId

  const line =
    state === 'open'
      ? `${capital(roundsWord(left.length))} left, ${points} points still to win.${sameTeam ? ' Same team, same car, one title.' : ''}`
      : settled
        ? `${champion}. ${settled}`
        : state === 'decided'
          ? `${champion}, with ${roundsWord(left.length)} still to run.`
          : `${champion}.`

  return {
    label: `The ${standings.season} title fight · ${state === 'over' ? 'final' : `after round ${round}`}`,
    first,
    second: person(p2.driver),
    firstPoints: p1.points,
    secondPoints: p2.points,
    gap,
    line,
    state,
  }
}

export function driversCopy(rows: ReadonlyArray<{ points: number }>) {
  const [first, , third, fourth] = rows

  if (!first || !third || !fourth) return ''

  return `The front three are covered by ${plural(first.points - third.points, 'point')}. Fourth is ${plural(third.points - fourth.points, 'point')} behind third.`
}

export type DriverRow = { position: number; person: Person; team: Team; points: number; gap: string }

export function driverRows(snapshot: SeasonSnapshot) {
  const rows = snapshot.driverStandings?.rows

  if (!rows) return null

  const raced = snapshot.latest?.race.rows ?? []
  const leader = rows[0]?.points ?? 0

  const all: ReadonlyArray<DriverRow> = rows.map((row, i) => {
    const constructor = raced.find((entry) => entry.driver.driverId === row.driver.driverId)?.constructor ?? row.constructors.at(-1)

    return {
      position: row.position ?? i + 1,
      person: person(row.driver),
      team: constructor ? team(constructor) : { id: '', name: '', colour: MUTED },
      points: row.points,
      gap: i === 0 ? '' : `+${leader - row.points}`,
    }
  })

  return { podium: all.slice(0, 3), rest: all.slice(3) }
}

const partsOf = (history: History, constructorId: string, total: number) => {
  const entries = history.teams.filter((entry) => entry.constructorId === constructorId)
  const sum = entries.reduce((acc, entry) => acc + entry.points, 0)

  if (total === 0 || sum !== total) return []

  const top = entries
    .filter((entry) => entry.points > 0)
    .sort((a, b) => b.points - a.points || (a.driver.code ?? a.driver.familyName).localeCompare(b.driver.code ?? b.driver.familyName))
    .slice(0, 2)
    .map((entry) => ({ label: entry.driver.code ?? entry.driver.familyName, points: entry.points }))

  const others = total - top.reduce((acc, part) => acc + part.points, 0)

  return others > 0 ? [...top, { label: 'Others', points: others }] : top
}

export function constructorRows(snapshot: SeasonSnapshot) {
  const standings = snapshot.constructorStandings

  if (!standings) return []

  const history = snapshot.history
  const split = history && history.round === standingsRound(snapshot, standings) ? history : null

  return standings.rows.map((row, i) => ({
    position: row.position ?? i + 1,
    team: team(row.constructor),
    parts: split ? partsOf(split, row.constructor.constructorId, row.points) : [],
    total: row.points,
  }))
}

type Stint = { person: Person; from: number; to: number; current: boolean; photo: 'car' | 'portrait' }

export function whoLed(snapshot: SeasonSnapshot, now: Date) {
  const standings = snapshot.driverStandings
  const leaders = snapshot.history?.leaders ?? []
  const last = leaders.at(-1)

  if (!standings || !last) return null

  const runs: Array<{ driver: DriverRef; from: number; to: number }> = []

  for (const leader of leaders) {
    const run = runs.at(-1)

    if (run && run.driver.driverId === leader.driver.driverId) run.to = leader.round
    else runs.push({ driver: leader.driver, from: leader.round, to: leader.round })
  }

  const stints: ReadonlyArray<Stint> = runs.map((run, i) => {
    const shown = person(run.driver)
    const photo = run.to - run.from + 1 >= 4 || !shown.portrait ? 'car' : 'portrait'

    return { person: shown, from: run.from, to: run.to, current: i === runs.length - 1, photo }
  })

  const thisSeason = standings.season === snapshot.season
  const live = thisSeason ? calendarTiles(snapshot, now).find((tile) => tile.state === 'now' && tile.round > last.round)?.round ?? null : null
  const only = stints.length === 1 ? stints[0] : undefined

  return {
    columns: thisSeason ? snapshot.calendar.length : standings.round,
    stints,
    leads: leaders.map((leader) => leader.lead),
    changes: stints.slice(1).map((stint) => stint.from),
    live,
    line: `Each column is one round. The photo shows who led the championship after it. ${only ? `${only.person.family} has led every round.` : `${capital(words(stints.length))} drivers have led this season.`}`,
  }
}
