import { calendarCircuit } from '#/circuits/calendar.ts'

import type { Race, Session, SessionName } from './jolpica-schema.ts'
import type { SeasonSnapshot } from './snapshot-schema.ts'

const HOUR = 3_600_000

const MINUTE = 60_000

const DAY = 24 * HOUR

const startOf = (session: Session) => Date.parse(session.startsAt)

export const latestStart = (session: Session) => startOf(session) + (session.timeConfirmed ? 0 : DAY)

export type RaceKind = 'this-weekend' | 'next' | 'finale'

export type PickedRace = { race: Race; round: number; of: number; kind: RaceKind }

export const bounds = (race: Race) => {
  const first = race.sessions[0]
  const final = race.sessions.find((session) => session.name === 'Race') ?? race.sessions.at(-1)

  return first && final ? { opens: Date.parse(first.startsAt) - 48 * HOUR, closes: latestStart(final) + 4 * HOUR } : null
}

const entries = (calendar: ReadonlyArray<Race>) =>
  calendar.flatMap((race) => {
    const window = bounds(race)

    return window ? [{ race, of: calendar.length, ...window }] : []
  })

export function pickRace(snapshot: SeasonSnapshot, now: Date): PickedRace | null {
  const t = now.getTime()
  const races = [...entries(snapshot.calendar), ...entries(snapshot.nextCalendar)].sort((a, b) => a.opens - b.opens)
  const live = races.find((entry) => entry.opens <= t && t < entry.closes)

  if (live) return { race: live.race, round: live.race.round, of: live.of, kind: 'this-weekend' }

  const upcoming = races.find((entry) => entry.opens > t)

  if (upcoming) return { race: upcoming.race, round: upcoming.race.round, of: upcoming.of, kind: 'next' }

  const last = entries(snapshot.calendar).at(-1)

  return last ? { race: last.race, round: last.race.round, of: last.of, kind: 'finale' } : null
}

export const SESSION_MINUTES: Record<SessionName, number> = { FP1: 60, FP2: 60, FP3: 60, SprintQualifying: 45, Sprint: 60, Qualifying: 60, Race: 120 }

export const SESSION_LABEL: Record<SessionName, string> = {
  FP1: 'Practice 1',
  FP2: 'Practice 2',
  FP3: 'Practice 3',
  SprintQualifying: 'Sprint qualifying',
  Sprint: 'Sprint',
  Qualifying: 'Qualifying',
  Race: 'Race',
}

export type BoxState =
  | { kind: 'live'; gp: string; session: SessionName; leftMs: number }
  | { kind: 'after'; gp: string; session: 'Qualifying' | 'Sprint' | 'Race'; winner: string }
  | { kind: 'before'; gp: string; session: SessionName; inMs: number; confirmed: boolean }
  | { kind: 'between'; gp: string; days: number }
  | { kind: 'over'; season: number }

export type Segment = { label?: string; value: string }

export const gpName = (race: Race) => calendarCircuit(race.circuit.circuitId)?.gp ?? race.raceName.replace(/Grand Prix$/, 'GP')

const endOf = (session: Session) => startOf(session) + SESSION_MINUTES[session.name] * MINUTE

const isScored = (name: SessionName): name is 'Qualifying' | 'Sprint' | 'Race' => name === 'Qualifying' || name === 'Sprint' || name === 'Race'

const winnerOf = (snapshot: SeasonSnapshot, race: Race, name: 'Qualifying' | 'Sprint' | 'Race') => {
  const latest = snapshot.latest
  const held = { Race: latest?.race, Sprint: latest?.sprint, Qualifying: latest?.qualifying }[name]
  const same = held?.race?.season === race.season && held.race.round === race.round

  return same ? held.rows.find((row) => row.position === 1)?.driver.familyName : undefined
}

export function boxState(snapshot: SeasonSnapshot, now: Date): BoxState {
  const t = now.getTime()
  const races = [...snapshot.calendar, ...snapshot.nextCalendar]
  const sessions = races.flatMap((race) => race.sessions.filter((session) => session.timeConfirmed).map((session) => ({ race, session })))
  const live = sessions.find(({ session }) => startOf(session) <= t && t < endOf(session))

  if (live) return { kind: 'live', gp: gpName(live.race), session: live.session.name, leftMs: endOf(live.session) - t }

  const after = sessions
    .flatMap(({ race, session }) => {
      const { name } = session
      const winner = isScored(name) && endOf(session) <= t && t < endOf(session) + 2 * HOUR ? winnerOf(snapshot, race, name) : undefined

      return isScored(name) && winner ? [{ race, name, winner, end: endOf(session) }] : []
    })
    .sort((a, b) => b.end - a.end)[0]

  if (after) return { kind: 'after', gp: gpName(after.race), session: after.name, winner: after.winner }

  const picked = pickRace(snapshot, now)
  const coming = picked?.kind === 'this-weekend' ? picked.race.sessions.find((session) => latestStart(session) > t) : undefined

  if (picked && coming) return { kind: 'before', gp: gpName(picked.race), session: coming.name, inMs: Math.max(0, startOf(coming) - t), confirmed: coming.timeConfirmed }

  const next = races
    .flatMap((race) => {
      const first = race.sessions[0]
      const final = race.sessions.find((session) => session.name === 'Race')

      return first && final && startOf(first) > t ? [{ race, at: startOf(final) }] : []
    })
    .sort((a, b) => a.at - b.at)[0]

  return next ? { kind: 'between', gp: gpName(next.race), days: Math.ceil((next.at - t) / DAY) } : { kind: 'over', season: snapshot.season }
}

const two = (n: number) => String(Math.floor(n)).padStart(2, '0')

const hms = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))

  return `${two(s / 3600)}:${two((s % 3600) / 60)}:${two(s % 60)}`
}

const left = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const mmss = `${two((s % 3600) / 60)}:${two(s % 60)}`

  return s >= 3600 ? `${Math.floor(s / 3600)}:${mmss}` : mmss
}

export function boxCopy(state: BoxState): ReadonlyArray<Segment> {
  switch (state.kind) {
    case 'live':
      return [{ value: state.gp }, { label: SESSION_LABEL[state.session], value: `${left(state.leftMs)} left` }]
    case 'after':
      return [{ value: state.gp }, { label: SESSION_LABEL[state.session], value: `P1 ${state.winner}` }]
    case 'before':
      return [
        { value: state.gp },
        state.confirmed ? { label: `${SESSION_LABEL[state.session]} in`, value: hms(state.inMs) } : { label: SESSION_LABEL[state.session], value: 'Time TBC' },
      ]
    case 'between':
      return [
        { label: 'Next', value: state.gp },
        { label: 'in', value: `${state.days} ${state.days === 1 ? 'day' : 'days'}` },
      ]
    case 'over':
      return [{ value: `${state.season} season complete` }, { label: `${state.season + 1} calendar`, value: 'soon' }]
  }
}

const dayKey = (at: Date, timeZone?: string) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at)

const clock = (at: Date, timeZone?: string) => new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at)

export function when(iso: string, timeZone: string) {
  const at = new Date(iso)
  const track = dayKey(at, timeZone)
  const mine = dayKey(at)
  const shift = mine > track ? ' (next day)' : mine < track ? ' (day before)' : ''
  const day = new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short', day: 'numeric', month: 'short' }).format(at).replace(',', '')

  return { day, track: clock(at, timeZone), yours: `${clock(at)}${shift}` }
}

export const weekday = (session: Session, timeZone: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: session.timeConfirmed ? timeZone : 'UTC', weekday: 'short' }).format(new Date(session.startsAt))

export const sessionDay = (session: Session, timeZone: string) => when(session.startsAt, session.timeConfirmed ? timeZone : 'UTC').day

export type NextStart = { race: Race; round: number; of: number; startsAt: string; confirmed: boolean }

export function nextLightsOut(snapshot: SeasonSnapshot, now: Date): NextStart | null {
  const t = now.getTime()

  return (
    [snapshot.calendar, snapshot.nextCalendar]
      .flatMap((calendar) =>
        calendar.flatMap((race) => {
          const start = race.sessions.find((session) => session.name === 'Race')

          return start && latestStart(start) > t ? [{ race, round: race.round, of: calendar.length, startsAt: start.startsAt, confirmed: start.timeConfirmed }] : []
        }),
      )
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0] ?? null
  )
}

export function countdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))

  return [
    ['days', two(s / 86_400)],
    ['hrs', two((s % 86_400) / 3600)],
    ['min', two((s % 3600) / 60)],
    ['sec', two(s % 60)],
  ] as const
}
