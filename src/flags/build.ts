import { Effect } from 'effect'

import { finishedRaces, frozen } from '../season/finished.ts'
import { OpenF1Client } from '../season/openf1-client.ts'

import type { FlagRace, FlagTally } from './schema.ts'
import { countRace, redSessionCount } from './tally.ts'

const skipped = (previous: FlagTally | undefined, cause: string) => Effect.logWarning('flag tally skipped', cause).pipe(Effect.as(previous))

export const flagTally = (season: number, now: Date, previous: FlagTally | undefined): Effect.Effect<FlagTally | undefined, never, OpenF1Client> =>
  Effect.gen(function* () {
    const openf1 = yield* OpenF1Client
    const current = yield* openf1.sessions(season)
    const year = finishedRaces(current, now).length > 0 ? season : season - 1
    const sessions = year === season ? current : yield* openf1.sessions(year)
    const kept = new Map(previous?.season === year ? previous.races.map((race) => [race.sessionKey, race]) : [])
    const races: Array<FlagRace> = []

    for (const session of finishedRaces(sessions, now)) {
      const old = kept.get(session.session_key)

      if (old && frozen(old, now)) {
        races.push(old)
        continue
      }

      const rows = yield* openf1.raceControl(session.session_key)

      if (rows.length > 0) races.push(countRace(session, rows))
      else if (old) races.push(old)
    }

    if (races.length === 0) return previous

    return { season: year, races, redSessions: redSessionCount(sessions, yield* openf1.redFlags(year)) }
  }).pipe(
    Effect.timeout('60 seconds'),
    Effect.catchTags({
      OpenF1Error: (error) => skipped(previous, `${error.path} ${String(error.cause)}`),
      TimeoutError: (error) => skipped(previous, String(error)),
    }),
  )
