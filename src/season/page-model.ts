import { type CalendarCircuit, calendarCircuit, grandPrix } from '#/circuits/calendar.ts'

import type { Race, Session } from './jolpica-schema.ts'
import type { SeasonSnapshot } from './snapshot-schema.ts'
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
