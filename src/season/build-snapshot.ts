import { Effect } from 'effect'

import { JolpicaClient, type JolpicaError } from './jolpica-client.ts'
import { seasonHistory, type SeasonRace } from './history.ts'
import { latestSession } from './latest-session.ts'
import type { OpenF1Client } from './openf1-client.ts'
import type { Race, SeasonResults } from './jolpica-schema.ts'
import type { History, NextSession, SeasonSnapshot } from './snapshot-schema.ts'

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

const allPages = (page: (offset: number) => Effect.Effect<SeasonResults, JolpicaError>): Effect.Effect<ReadonlyArray<SeasonRace>, JolpicaError> =>
  Effect.gen(function* () {
    const races: Array<SeasonRace> = []
    let offset = 0
    let total = 1

    while (offset < total) {
      const next = yield* page(offset)

      races.push(...next.races)
      total = next.total
      offset += 100
    }

    return races
  })

const history = (jolpica: JolpicaClient['Service'], season: number): Effect.Effect<History | undefined> =>
  Effect.gen(function* () {
    const races = yield* allPages((offset) => jolpica.seasonResults(season, offset))
    const sprints = yield* allPages((offset) => jolpica.seasonSprints(season, offset))

    return seasonHistory(races, sprints)
  }).pipe(
    Effect.timeout('20 seconds'),
    Effect.catch((error) => Effect.logWarning('season history skipped', error).pipe(Effect.as(undefined))),
  )

export const buildSnapshot = (now: Date): Effect.Effect<SeasonSnapshot, JolpicaError, JolpicaClient | OpenF1Client> =>
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

    const past = driverStandings === null ? undefined : yield* history(jolpica, driverStandings.season)
    const session = yield* latestSession(races, season, now)

    const snapshot: SeasonSnapshot = {
      fetchedAt: now.toISOString(),
      season,
      calendar: races,
      nextCalendar: next.calendar,
      nextSession: next.session,
      latest: results.race === null ? null : { race: results, qualifying: sameWeekend(qualifying), sprint: sameWeekend(sprint) },
      driverStandings,
      constructorStandings,
    }

    return { ...snapshot, ...(past && { history: past }), ...(session && { latestSession: session }) }
  })
