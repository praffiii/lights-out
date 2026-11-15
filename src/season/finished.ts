import type { OpenF1Session } from './openf1-schema.ts'

const LIVE_MS = 30 * 60_000

const FROZEN_MS = 48 * 3_600_000

export const finishedRaces = (sessions: ReadonlyArray<OpenF1Session>, now: Date): ReadonlyArray<OpenF1Session> =>
  sessions
    .filter((s) => s.session_name === 'Race' && !s.is_cancelled && Date.parse(s.date_end) + LIVE_MS < now.getTime())
    .sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start))

export const frozen = (race: { readonly dateEnd: string }, now: Date): boolean => Date.parse(race.dateEnd) + FROZEN_MS < now.getTime()
