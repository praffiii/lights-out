import { Effect } from 'effect'

import { finishedRaces, frozen } from '../season/finished.ts'
import { OpenF1Client } from '../season/openf1-client.ts'

import type { SpeedRace, TopSpeed } from './schema.ts'
import { raceRow } from './top.ts'

const FETCHES_PER_RUN = 8

const skipped = (previous: TopSpeed | undefined, cause: string) => Effect.logWarning('top speed skipped', cause).pipe(Effect.as(previous))

export const topSpeed = (season: number, now: Date, previous: TopSpeed | undefined): Effect.Effect<TopSpeed | undefined, never, OpenF1Client> =>
  Effect.gen(function* () {
    const openf1 = yield* OpenF1Client
    const current = yield* openf1.sessions(season)
    const year = finishedRaces(current, now).length > 0 ? season : season - 1
    const sessions = year === season ? current : yield* openf1.sessions(year)
    const kept = new Map(previous?.season === year ? previous.races.map((race) => [race.sessionKey, race]) : [])
    const races: Array<SpeedRace> = []
    let fetches = 0

    for (const session of finishedRaces(sessions, now)) {
      const old = kept.get(session.session_key)

      if (old && frozen(old, now)) {
        races.push(old)
        continue
      }

      if (fetches === FETCHES_PER_RUN) {
        if (old) races.push(old)
        continue
      }

      fetches += 1

      const laps = yield* openf1.sessionLaps(session.session_key)
      const row = laps.length > 0 ? raceRow(session, laps, yield* openf1.drivers(session.session_key)) : undefined

      if (row) races.push(row)
      else if (old) races.push(old)
    }

    if (races.length === 0) return previous

    return { season: year, races }
  }).pipe(
    Effect.timeout('60 seconds'),
    Effect.catchTags({
      OpenF1Error: (error) => skipped(previous, `${error.path} ${String(error.cause)}`),
      TimeoutError: (error) => skipped(previous, String(error)),
    }),
  )
