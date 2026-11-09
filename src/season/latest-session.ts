import { Effect } from 'effect'

import type { Race, SessionName } from './jolpica-schema.ts'
import { OpenF1Client } from './openf1-client.ts'
import type { LatestRow, LatestSession } from './snapshot-schema.ts'

const NAMES = new Map<string, SessionName>([
  ['Practice 1', 'FP1'],
  ['Practice 2', 'FP2'],
  ['Practice 3', 'FP3'],
  ['Sprint Qualifying', 'SprintQualifying'],
  ['Sprint Shootout', 'SprintQualifying'],
  ['Sprint', 'Sprint'],
  ['Qualifying', 'Qualifying'],
  ['Race', 'Race'],
])

const LIVE_MS = 30 * 60_000

export const latestSession = (calendar: ReadonlyArray<Race>, season: number, now: Date): Effect.Effect<LatestSession | undefined, never, OpenF1Client> =>
  Effect.gen(function* () {
    const openf1 = yield* OpenF1Client
    const sessions = yield* openf1.sessions(season)

    const newest = sessions
      .flatMap((session) => {
        const name = NAMES.get(session.session_name)

        return name && !session.is_cancelled && Date.parse(session.date_end) + LIVE_MS < now.getTime() ? [{ key: session.session_key, name, at: Date.parse(session.date_start) }] : []
      })
      .sort((a, b) => b.at - a.at)[0]

    if (!newest) return undefined

    const race = calendar.find((r) => r.sessions.some((s) => s.name === newest.name && Date.parse(s.startsAt) === newest.at))
    const entry = race?.sessions.find((s) => s.name === newest.name)

    if (!race || !entry) return undefined

    const [result, drivers] = yield* Effect.all([openf1.result(newest.key), openf1.drivers(newest.key)])
    const byNumber = new Map(drivers.map((driver) => [driver.driver_number, driver]))

    const rows = result
      .flatMap((row): ReadonlyArray<LatestRow> => {
        const driver = byNumber.get(row.driver_number)

        if (row.position === null || !driver) return []

        return [
          {
            position: row.position,
            code: driver.name_acronym,
            family: driver.last_name,
            name: `${driver.first_name} ${driver.last_name}`,
            team: driver.team_name,
            colour: driver.team_colour,
            time: row.duration,
            gap: row.gap_to_leader,
          },
        ]
      })
      .sort((a, b) => a.position - b.position)

    return rows.length === 0 ? undefined : { season, round: race.round, name: newest.name, startsAt: entry.startsAt, rows }
  }).pipe(
    Effect.timeout('20 seconds'),
    Effect.catchTags({
      OpenF1Error: (error) => Effect.logWarning('latest session skipped', { path: error.path, cause: String(error.cause) }).pipe(Effect.as(undefined)),
      TimeoutError: (error) => Effect.logWarning('latest session skipped', String(error)).pipe(Effect.as(undefined)),
    }),
  )
