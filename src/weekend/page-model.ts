import { Predicate } from 'effect'

import { type CalendarCircuit, calendarCircuit, grandPrix } from '#/circuits/calendar.ts'
import { type CircuitInfo, circuitFor } from '#/circuits/registry.ts'
import { portraitFor } from '#/drivers/portraits.ts'
import { CARS } from '#/home/cars.ts'
import type { Photo } from '#/home/content.ts'
import type { Race, Session, SessionName } from '#/season/jolpica-schema.ts'
import type { LatestRow, LatestSession, SeasonSnapshot } from '#/season/snapshot-schema.ts'
import { countdown, gpName, latestStart, nextLightsOut, pickRace, SESSION_LABEL, SESSION_MINUTES, sessionDay, weekday, when, zoneName } from '#/season/weekend.ts'

const MINUTE = 60_000

const DAY = 24 * 60 * MINUTE

export type Clock = { label: string; target: string; units: 'dhm' | 'hms' | 'd'; track: string; yours: string }

export type ScheduleRow = { label: string; day: string; time: string; state: 'done' | 'live' | 'next' | 'later' }

export type Band = { when: string; info: CircuitInfo | undefined; facts: CalendarCircuit | undefined; zone: string; schedule: ReadonlyArray<ScheduleRow> }

export type Latest = {
  label: string
  gap: string
  headline: string
  body: string
  rows: ReadonlyArray<{ position: number; code: string; colour: string; time: string }>
  image: Photo | undefined
  who: string
}

export type WeekendPage = {
  label: string
  title: string
  dates: string
  place: string
  photo: CalendarCircuit['photo'] | undefined
  clock: Clock | null
  flag: string | null
  note: string
  band: Band
  latest: Latest | null
}

const PRACTICE = "an hour for teams to try set-ups. Times hint, they don't decide."

const about = (name: SessionName, raceDay: string) =>
  ({
    FP1: PRACTICE,
    FP2: PRACTICE,
    FP3: PRACTICE,
    SprintQualifying: 'a shorter knockout that sets the sprint grid.',
    Sprint: 'a 100 km race with points for the top eight.',
    Qualifying: `three knockout rounds that set ${raceDay}'s grid.`,
    Race: 'Points go to the top ten, 25 for the win.',
  })[name]

const LESSON: Record<SessionName, string> = {
  FP1: "Practice times hint, they don't decide: teams run different fuel loads and tyres.",
  FP2: "Practice times hint, they don't decide: teams run different fuel loads and tyres.",
  FP3: "Practice times hint, they don't decide: teams run different fuel loads and tyres.",
  SprintQualifying: 'It sets the sprint grid only.',
  Sprint: 'Sprint points go to the top eight.',
  Qualifying: 'Pole is the best seat into Turn 1, not a promise.',
  Race: 'Points go to the top ten, 25 for the win.',
}

const LEAD: Record<SessionName, string> = {
  FP1: 'fastest',
  FP2: 'fastest',
  FP3: 'fastest',
  SprintQualifying: 'on sprint pole',
  Sprint: 'wins the sprint',
  Qualifying: 'on pole',
  Race: 'wins',
}

const same = (a: Race, b: Race) => a.season === b.season && a.round === b.round

const zoneOf = (race: Race) => calendarCircuit(race.circuit.circuitId)?.tz ?? circuitFor(race.circuit.circuitId)?.tz ?? 'UTC'

const startOf = (session: Session) => Date.parse(session.startsAt)

const endOf = (session: Session) => latestStart(session) + SESSION_MINUTES[session.name] * MINUTE

const isLive = (session: Session, t: number) => session.timeConfirmed && startOf(session) <= t && t < endOf(session)

const format = (session: Session, timeZone: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: session.timeConfirmed ? timeZone : 'UTC', ...options }).format(new Date(session.startsAt))

const span = (race: Race, timeZone: string, month: 'long' | 'short') => {
  const first = race.sessions[0]
  const last = race.sessions.find((s) => s.name === 'Race') ?? race.sessions.at(-1)

  if (!first || !last) return ''

  const day = (s: Session) => format(s, timeZone, { day: 'numeric' })
  const monthOf = (s: Session) => format(s, timeZone, { month })
  const opening = monthOf(first) === monthOf(last) ? day(first) : `${day(first)} ${monthOf(first)}`

  return `${opening}–${day(last)} ${monthOf(last)}`
}

const clockTime = (session: Session, timeZone: string) => format(session, timeZone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

const target = (race: Race, t: number) => {
  const live = race.sessions.find((s) => isLive(s, t))

  if (live) return { session: live, at: endOf(live), live: true }

  const next = race.sessions.find((s) => latestStart(s) > t)

  return next ? { session: next, at: latestStart(next), live: false } : null
}

const clockOf = (aim: NonNullable<ReturnType<typeof target>>, timeZone: string, visitor: string, t: number): Clock => {
  const { session, at, live } = aim
  const label = `${live ? 'Live' : 'Next'} · ${SESSION_LABEL[session.name]}`
  const targetIso = new Date(at).toISOString()

  if (!session.timeConfirmed) return { label, target: targetIso, units: 'd', track: `${sessionDay(session, timeZone)} · time TBC`, yours: '' }

  const w = when(session.startsAt, timeZone, visitor)

  return { label, target: targetIso, units: at - t < DAY ? 'hms' : 'dhm', track: `${w.day} · ${w.track} at the track`, yours: `${w.yours.replace(/ \(.*\)$/, '')} your time` }
}

const noteOf = (race: Race, aim: ReturnType<typeof target>, timeZone: string, info: CircuitInfo | undefined) => {
  if (!aim) return ''

  const { session } = aim

  if (!session.timeConfirmed) return 'Session times are not confirmed yet.'

  const final = race.sessions.find((s) => s.name === 'Race')
  const raceDay = final ? format(final, timeZone, { weekday: 'long' }) : 'Sunday'

  if (session.name === 'Race') return info ? `${info.facts.laps} laps, ${info.facts.distanceKm} km. ${about('Race', raceDay)}` : about('Race', raceDay)

  const after = race.sessions[race.sessions.indexOf(session) + 1]

  if (!after) return ''

  const at = after.timeConfirmed ? `at ${clockTime(after, timeZone)} track time` : `on ${weekday(after, timeZone)}`

  return `Then ${SESSION_LABEL[after.name].toLowerCase()} ${at}: ${about(after.name, raceDay)}`
}

const flagOf = (snapshot: SeasonSnapshot, now: Date) => {
  const next = nextLightsOut(snapshot, now)
  const start = next?.race.sessions.find((s) => s.name === 'Race')

  if (!next || !start) return `Chequered flag. That was the last race of ${snapshot.season}.`

  return `Chequered flag. The ${grandPrix(gpName(next.race))} starts ${sessionDay(start, zoneOf(next.race))}.`
}

const scheduleOf = (race: Race, aim: ReturnType<typeof target>, visitor: string, t: number): ReadonlyArray<ScheduleRow> =>
  race.sessions.map((session) => {
    const state = endOf(session) <= t ? 'done' : isLive(session, t) ? 'live' : aim?.session === session ? 'next' : 'later'
    const day = format(session, visitor, { weekday: 'short' }).toUpperCase()

    return {
      label: SESSION_LABEL[session.name],
      day: state === 'next' || state === 'live' ? `${day} · ${state}` : day,
      time: session.timeConfirmed ? clockTime(session, visitor) : 'TBC',
      state,
    }
  })

const carOf = (code: string) => CARS.find((car) => car.code === code)

const familyOf = (row: LatestRow) => carOf(row.code)?.driver.split(' ').slice(1).join(' ') ?? row.family

const seconds = (value: number) => value.toFixed(3)

const lapTime = (value: number | null) => {
  if (value === null) return ''

  const ms = Math.round(value * 1000)
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = ((ms % 60_000) / 1000).toFixed(3).padStart(6, '0')

  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

const gapText = (gap: LatestRow['gap']) => {
  if (gap === null) return ''

  return Predicate.isNumber(gap) ? `${seconds(gap)} s` : gap.replace(/^\+/, '').toLowerCase()
}

const behind = (gap: LatestRow['gap']) => (gap === null ? '' : Predicate.isNumber(gap) ? `+${seconds(gap)}` : gap)

const imageOf = (code: string): Photo | undefined => {
  const car = carOf(code)

  return portraitFor(code) ?? (car && { src: car.src, place: `${car.team} ${car.car} · Shanghai, 2026`, credit: `Photo ${car.credit}` })
}

const latestOf = (snapshot: SeasonSnapshot, race: Race, session: LatestSession | undefined): Latest | null => {
  const [p1, p2, p3, p4] = session?.rows ?? []
  const held = session && snapshot.calendar.find((r) => r.season === session.season && r.round === session.round)

  if (!session || session.season !== snapshot.season || !held || !p1 || !p2) return null

  const day = when(session.startsAt, zoneOf(held)).day
  const label = same(held, race) ? `Latest · ${SESSION_LABEL[session.name]} · ${day}` : `Latest · ${gpName(held)} · ${SESSION_LABEL[session.name]} · ${day}`
  const car = carOf(p1.code)

  return {
    label,
    gap: gapText(p2.gap),
    headline: `${familyOf(p1)} ${LEAD[session.name]}. ${familyOf(p2)} that far behind.`,
    body: p3 && p4 ? `${familyOf(p3)} third, ${familyOf(p4)} fourth. ${LESSON[session.name]}` : LESSON[session.name],
    rows: [p1, p2, p3].flatMap((row, i) =>
      row ? [{ position: row.position, code: row.code, colour: carOf(row.code)?.colour ?? (row.colour ? `#${row.colour}` : 'var(--muted)'), time: i === 0 ? lapTime(row.time) : behind(row.gap) }] : [],
    ),
    image: imageOf(p1.code),
    who: car ? `${car.driver} · ${car.team}` : `${p1.name} · ${p1.team}`,
  }
}

export function weekendPage(snapshot: SeasonSnapshot, now: Date, zone: string): WeekendPage | null {
  const picked = pickRace(snapshot, now)

  if (!picked) return null

  const { race, round, of } = picked
  const t = now.getTime()
  const facts = calendarCircuit(race.circuit.circuitId)
  const info = circuitFor(race.circuit.circuitId)
  const timeZone = zoneOf(race)
  const later = !snapshot.calendar.some((entry) => same(entry, race))
  const aim = target(race, t)
  const final = race.sessions.find((s) => s.name === 'Race') ?? race.sessions.at(-1)
  const year = final ? format(final, timeZone, { year: 'numeric' }) : String(race.season)

  return {
    label: later ? `Next race · ${race.season} · Round ${round}` : `This season · Round ${round} of ${of}`,
    title: `${grandPrix(gpName(race))}.`,
    dates: `${span(race, timeZone, 'long')} ${year} · ${race.circuit.circuitName}`,
    place: `${race.circuit.locality}, ${race.circuit.country}`,
    photo: facts?.photo,
    clock: aim ? clockOf(aim, timeZone, zone, t) : null,
    flag: aim ? null : flagOf(snapshot, now),
    note: noteOf(race, aim, timeZone, info),
    band: { when: span(race, timeZone, 'short'), info, facts, zone: zoneName(now, zone), schedule: scheduleOf(race, aim, zone, t) },
    latest: latestOf(snapshot, race, snapshot.latestSession),
  }
}

const UNITS = { days: 'Days', hrs: 'Hours', min: 'Minutes', sec: 'Seconds' } as const

const SHOWN = { hms: ['hrs', 'min', 'sec'], dhm: ['days', 'hrs', 'min'], d: ['days'] } as const

export function clockDigits(clock: Clock, now: number): ReadonlyArray<{ value: string; unit: string }> {
  const parts = new Map(countdown(Date.parse(clock.target) - now))
  const shown: ReadonlyArray<keyof typeof UNITS> = SHOWN[clock.units]

  return shown.map((key) => ({ value: parts.get(key) ?? '00', unit: UNITS[key] }))
}
