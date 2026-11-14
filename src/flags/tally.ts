import type { OpenF1Session } from '../season/openf1-schema.ts'

import type { FlagRace, FlagSample, RaceControl } from './schema.ts'

const LIVE_MS = 30 * 60_000
const FROZEN_MS = 48 * 3_600_000

type Kind = 'clear' | 'yellow' | 'doubleYellow' | 'blue' | 'red' | 'chequered' | 'blackWhite'

const KINDS = new Map<string | null, Kind>([
  ['CLEAR', 'clear'],
  ['YELLOW', 'yellow'],
  ['DOUBLE YELLOW', 'doubleYellow'],
  ['BLUE', 'blue'],
  ['RED', 'red'],
  ['CHEQUERED', 'chequered'],
  ['BLACK AND WHITE', 'blackWhite'],
])

const QUOTED = ['clear', 'yellow', 'blue', 'chequered'] as const

type Quoted = (typeof QUOTED)[number]

const RED_SESSIONS = new Set(['Practice 1', 'Practice 2', 'Practice 3', 'Qualifying', 'Sprint Qualifying', 'Sprint'])

const quoted = (kind: Kind | undefined): kind is Quoted => QUOTED.some((q) => q === kind)

export const finishedRaces = (sessions: ReadonlyArray<OpenF1Session>, now: Date): ReadonlyArray<OpenF1Session> =>
  sessions
    .filter((s) => s.session_name === 'Race' && !s.is_cancelled && Date.parse(s.date_end) + LIVE_MS < now.getTime())
    .sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start))

export const frozen = (race: { readonly dateEnd: string }, now: Date): boolean => Date.parse(race.dateEnd) + FROZEN_MS < now.getTime()

export function countRace(session: OpenF1Session, rows: ReadonlyArray<RaceControl>): FlagRace {
  const counts: Record<Kind, number> = { clear: 0, yellow: 0, doubleYellow: 0, blue: 0, red: 0, chequered: 0, blackWhite: 0 }
  const samples: Partial<Record<Quoted, FlagSample>> = {}
  let blackWhiteTrackLimits = 0
  let safetyCars = 0
  let vscs = 0

  for (const row of rows) {
    const kind = KINDS.get(row.flag)

    if (kind) counts[kind] += 1

    if (quoted(kind) && !samples[kind] && row.lap_number !== null) samples[kind] = { lap: row.lap_number, message: row.message }

    if (kind === 'blackWhite' && row.message.includes('TRACK LIMITS')) blackWhiteTrackLimits += 1

    if (row.category === 'SafetyCar' && row.message.includes('SAFETY CAR DEPLOYED')) safetyCars += 1

    if (row.message.includes('VSC DEPLOYED')) vscs += 1
  }

  return { sessionKey: session.session_key, circuit: session.circuit_short_name, dateEnd: session.date_end, ...counts, blackWhiteTrackLimits, safetyCars, vscs, samples }
}

export const redSessionCount = (sessions: ReadonlyArray<OpenF1Session>, rows: ReadonlyArray<RaceControl>): number => {
  const counted = new Set(sessions.flatMap((s) => (RED_SESSIONS.has(s.session_name) ? [s.session_key] : [])))

  return new Set(rows.flatMap((r) => (r.flag === 'RED' && counted.has(r.session_key) ? [r.session_key] : []))).size
}
