import { Effect } from 'effect'

import { JolpicaClient, type JolpicaError } from './jolpica-client.ts'
import type { Race } from './jolpica-schema.ts'
import type { NextSession, SeasonSnapshot } from './snapshot-schema.ts'

const timeline = (races: ReadonlyArray<Race>): ReadonlyArray<NextSession> =>
  races
    .flatMap((race) =>
      race.sessions.map((session) => ({
        round: race.round,
        raceName: race.raceName,
        circuitName: race.circuit.circuitName,
        country: race.circuit.country,
        session,
      })),
    )
    .sort((a, b) => Date.parse(a.session.startsAt) - Date.parse(b.session.startsAt))

export const buildSnapshot = (now: Date): Effect.Effect<SeasonSnapshot, JolpicaError, JolpicaClient> =>
  Effect.gen(function* () {
    const jolpica = yield* JolpicaClient
    const { season, races } = yield* jolpica.races('current')

    const orLastSeason = <A>(get: (season: number) => Effect.Effect<A | null, JolpicaError>) =>
      get(season).pipe(Effect.flatMap((current) => (current === null ? get(season - 1) : Effect.succeed(current))))

    const upcoming = timeline(races).find((entry) => Date.parse(entry.session.startsAt) > now.getTime())

    const [next, results, qualifying, sprint, driverStandings, constructorStandings] = yield* Effect.all(
      [
        upcoming
          ? Effect.succeed({ session: upcoming, calendar: [] })
          : jolpica.races(season + 1).pipe(Effect.map((following) => ({ session: timeline(following.races)[0] ?? null, calendar: following.races }))),
        jolpica.lastResults(season),
        jolpica.lastQualifying(season),
        jolpica.lastSprint(season),
        orLastSeason(jolpica.driverStandings),
        orLastSeason(jolpica.constructorStandings),
      ],
      { concurrency: 4 },
    )

    const sameWeekend = <S extends { race: { round: number } | null; rows: ReadonlyArray<object> }>(session: S) =>
      session.race?.round === results.race?.round && session.rows.length > 0 ? session : null

    return {
      fetchedAt: now.toISOString(),
      season,
      calendar: races,
      nextCalendar: next.calendar,
      nextSession: next.session,
      latest: results.race === null ? null : { race: results, qualifying: sameWeekend(qualifying), sprint: sameWeekend(sprint) },
      driverStandings,
      constructorStandings,
    }
  })
