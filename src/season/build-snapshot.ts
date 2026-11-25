import { Effect } from 'effect'

import { flagTally } from '../flags/build.ts'
import { buildPeople } from '../people/build.ts'
import { topSpeed } from '../speed/build.ts'
import { matches, nextTitles, titlesOf } from '../titles/build.ts'

import { JolpicaClient, type JolpicaError } from './jolpica-client.ts'
import { seasonHistory, type SeasonRace } from './history.ts'
import { latestSession } from './latest-session.ts'
import type { OpenF1Client } from './openf1-client.ts'
import type { Race, SeasonResults } from './jolpica-schema.ts'
import type { NextSession, SeasonSnapshot } from './snapshot-schema.ts'
import type { People } from '../people/schema.ts'

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

export const seasonPages = (jolpica: JolpicaClient['Service'], season: number) =>
  Effect.gen(function* () {
    const races = yield* allPages((offset) => jolpica.seasonResults(season, offset))
    const sprints = yield* allPages((offset) => jolpica.seasonSprints(season, offset))

    return { races, sprints }
  }).pipe(
    Effect.timeout('20 seconds'),
    Effect.catch((error) => Effect.logWarning('season history skipped', error).pipe(Effect.as(undefined))),
  )

const people = (season: number, pages: { races: ReadonlyArray<SeasonRace>; sprints: ReadonlyArray<SeasonRace> }, previous: People | undefined) =>
  buildPeople(season, pages.races, pages.sprints, previous).pipe(
    Effect.timeout('2 minutes'),
    Effect.catch((error) => Effect.logWarning('people kept from the previous snapshot', error).pipe(Effect.as(previous))),
  )

const titlesFrom = (input: Parameters<typeof nextTitles>[0]) =>
  Effect.gen(function* () {
    const fresh = titlesOf(input.season, input.calendar, input.races, input.sprints)

    if (fresh && !matches(fresh, input.drivers, input.teams)) yield* Effect.logWarning('titles kept from the previous snapshot: the points do not add up to the standings', { round: fresh.rounds.at(-1)?.round })

    return nextTitles(input)
  }).pipe(Effect.catchDefect((defect) => Effect.logWarning('titles kept from the previous snapshot', { cause: String(defect) }).pipe(Effect.as(input.previous))))

export const buildSnapshot = (now: Date, previous?: Pick<SeasonSnapshot, 'flags' | 'topSpeed' | 'people' | 'titles'>): Effect.Effect<SeasonSnapshot, JolpicaError, JolpicaClient | OpenF1Client> =>
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

    const pages = driverStandings === null ? undefined : yield* seasonPages(jolpica, driverStandings.season)
    const past = pages && seasonHistory(pages.races, pages.sprints)
    const built = pages && driverStandings ? yield* people(driverStandings.season, pages, previous?.people) : previous?.people
    const grid = built?.season === driverStandings?.season ? built : undefined
    const standings = { drivers: driverStandings, teams: constructorStandings }

    const titles =
      pages && driverStandings
        ? yield* titlesFrom({ season: driverStandings.season, calendar: races, ...pages, ...standings, previous: previous?.titles })
        : previous?.titles

    const session = yield* latestSession(races, season, now)
    const flags = yield* flagTally(season, now, previous?.flags)
    const speed = yield* topSpeed(season, now, previous?.topSpeed)

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

    return { ...snapshot, ...(past && { history: past }), ...(session && { latestSession: session }), ...(flags && { flags }), ...(speed && { topSpeed: speed }), ...(grid && { people: grid }), ...(titles && { titles }) }
  })
