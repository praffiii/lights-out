import { calendarCircuit } from '#/circuits/calendar.ts'
import { type CircuitInfo, circuitFor } from '#/circuits/registry.ts'
import type { DriverRef, Race, Session } from '#/season/jolpica-schema.ts'
import type { SeasonSnapshot } from '#/season/snapshot-schema.ts'
import { gpName, pickRace, type RaceKind } from '#/season/weekend.ts'

export type Format = 'standard' | 'sprint'

export type Knockout = { q1: string | null; q2: string | null; pole: string | null }

export type Ladder = { caption: string; codes: ReadonlyArray<string> }

export type ChapterLive = { circuit: CircuitInfo | undefined; weekend: string | null; format: Format; knockout: Knockout; ladder: Ladder | null }

const LABEL: Record<RaceKind, string> = { 'this-weekend': 'This weekend', next: 'Next', finale: 'Last race' }

const NONE: Knockout = { q1: null, q2: null, pole: null }

const zoneOf = (race: Race) => calendarCircuit(race.circuit.circuitId)?.tz ?? circuitFor(race.circuit.circuitId)?.tz ?? 'UTC'

const weekday = (session: Session, timeZone: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: session.timeConfirmed ? timeZone : 'UTC', weekday: 'short' }).format(new Date(session.startsAt))

const days = (race: Race, timeZone: string) => {
  const first = race.sessions[0]
  const final = race.sessions.find((s) => s.name === 'Race') ?? race.sessions.at(-1)

  return first && final ? `${weekday(first, timeZone)}–${weekday(final, timeZone)}` : null
}

const weekendOf = (race: Race, kind: RaceKind, zone: string) => {
  const track = days(race, zoneOf(race))
  const yours = days(race, zone)

  if (!track || !yours) return null

  const when = track === yours ? track : `${track} at the track, ${yours} your time`

  return `${LABEL[kind]} · ${gpName(race)} · ${when}`
}

const raceAt = (snapshot: SeasonSnapshot, ref: { season: number; round: number } | null) =>
  ref ? snapshot.calendar.find((race) => race.season === ref.season && race.round === ref.round) : undefined

const nameOf = (snapshot: SeasonSnapshot, ref: { season: number; round: number; raceName: string }) => {
  const race = raceAt(snapshot, ref)

  return race ? gpName(race) : ref.raceName.replace(/Grand Prix$/, 'GP')
}

const raced = (snapshot: SeasonSnapshot, t: number) =>
  snapshot.calendar
    .filter((race) => race.sessions.some((s) => s.name === 'Race' && Date.parse(s.startsAt) < t))
    .reverse()
    .map((race) => circuitFor(race.circuit.circuitId))
    .find(Boolean)

const codeOf = (driver: DriverRef) => driver.code ?? driver.familyName.slice(0, 3).toUpperCase()

const knockoutOf = (snapshot: SeasonSnapshot): Knockout => {
  const qualifying = snapshot.latest?.qualifying

  if (!qualifying?.race) return NONE

  const name = nameOf(snapshot, qualifying.race)
  const { rows } = qualifying
  const out = (group: typeof rows) => (group.length === 6 ? `${name} · out: ${group.map((row) => codeOf(row.driver)).join(' ')}` : null)
  const pole = rows.find((row) => row.position === 1)
  const time = pole && [pole.q3, pole.q2, pole.q1].find((q) => q)

  return {
    q1: out(rows.filter((row) => row.q2 === null)),
    q2: out(rows.filter((row) => row.q2 !== null && row.q3 === null)),
    pole: pole && time ? `${name} · pole: ${codeOf(pole.driver)} ${time}` : null,
  }
}

const ladderOf = (snapshot: SeasonSnapshot): Ladder | null => {
  const race = snapshot.latest?.race

  if (!race?.race) return null

  const codes = Array.from({ length: 10 }, (_, i) => {
    const row = race.rows.find((r) => r.position === i + 1)

    return row ? codeOf(row.driver) : ''
  })

  return { caption: `Scored at the ${nameOf(snapshot, race.race)}`, codes }
}

export function chapterLive(snapshot: SeasonSnapshot, now: Date, zone: string): ChapterLive {
  const picked = pickRace(snapshot, now)
  const qualified = raceAt(snapshot, snapshot.latest?.qualifying?.race ?? null)
  const circuit = (qualified && circuitFor(qualified.circuit.circuitId)) ?? (picked && circuitFor(picked.race.circuit.circuitId)) ?? raced(snapshot, now.getTime())

  return {
    circuit,
    weekend: picked ? weekendOf(picked.race, picked.kind, zone) : null,
    format: picked?.race.sessions.some((s) => s.name === 'Sprint') ? 'sprint' : 'standard',
    knockout: knockoutOf(snapshot),
    ladder: ladderOf(snapshot),
  }
}
