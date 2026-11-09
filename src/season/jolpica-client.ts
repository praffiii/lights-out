import { Context, Data, Effect, Layer, Schedule, Schema, Semaphore } from 'effect'
import { HttpClient, HttpClientError, HttpClientRequest } from 'effect/http'

import {
  ConstructorStandingsResponse,
  DriverStandingsResponse,
  QualifyingResponse,
  RaceResultsResponse,
  RacesResponse,
  SeasonResultsResponse,
  SeasonSprintsResponse,
  SprintResponse,
} from './jolpica-schema.ts'

export class JolpicaError extends Data.TaggedError('JolpicaError')<{
  readonly path: string
  readonly cause: HttpClientError.HttpClientError | Schema.SchemaError
}> {}

type Season = number | 'current'

type Endpoint<S extends Schema.Decoder<unknown>> = (season: Season) => Effect.Effect<S['Type'], JolpicaError>

type Paged<S extends Schema.Decoder<unknown>> = (season: number, offset: number) => Effect.Effect<S['Type'], JolpicaError>

const BASE_URL = 'https://api.jolpi.ca/ergast/f1'

const USER_AGENT = 'LightsOutFanSite/0.1 (personal project)'

const SPACING = '250 millis'

export class JolpicaClient extends Context.Service<
  JolpicaClient,
  {
    readonly races: Endpoint<typeof RacesResponse>
    readonly lastResults: Endpoint<typeof RaceResultsResponse>
    readonly lastQualifying: Endpoint<typeof QualifyingResponse>
    readonly lastSprint: Endpoint<typeof SprintResponse>
    readonly driverStandings: Endpoint<typeof DriverStandingsResponse>
    readonly constructorStandings: Endpoint<typeof ConstructorStandingsResponse>
    readonly seasonResults: Paged<typeof SeasonResultsResponse>
    readonly seasonSprints: Paged<typeof SeasonSprintsResponse>
  }
>()('JolpicaClient') {
  static readonly layer = Layer.effect(
    JolpicaClient,
    Effect.gen(function* () {
      const client = (yield* HttpClient.HttpClient).pipe(
        HttpClient.mapRequest((request) => request.pipe(HttpClientRequest.prependUrl(BASE_URL), HttpClientRequest.setHeader('user-agent', USER_AGENT))),
        HttpClient.filterStatusOk,
        HttpClient.retryTransient({ retryOn: 'errors-only', schedule: Schedule.exponential('500 millis'), times: 3 }),
      )

      const gate = yield* Semaphore.make(1)

      const get = <S extends Schema.Decoder<unknown>>(schema: S, path: string): Effect.Effect<S['Type'], JolpicaError> =>
        Semaphore.withPermits(gate, 1)(Effect.sleep(SPACING).pipe(Effect.andThen(client.get(path)))).pipe(
          Effect.flatMap((response) => response.json),
          Effect.flatMap(Schema.decodeUnknownEffect(schema)),
          Effect.mapError((cause) => new JolpicaError({ path, cause })),
        )

      const endpoint =
        <S extends Schema.Decoder<unknown>>(schema: S, resource: string): Endpoint<S> =>
        (season) =>
          get(schema, `/${season}/${resource}/?limit=100`)

      const paged =
        <S extends Schema.Decoder<unknown>>(schema: S, resource: string): Paged<S> =>
        (season, offset) =>
          get(schema, `/${season}/${resource}/?limit=100&offset=${offset}`)

      return {
        races: endpoint(RacesResponse, 'races'),
        lastResults: endpoint(RaceResultsResponse, 'last/results'),
        lastQualifying: endpoint(QualifyingResponse, 'last/qualifying'),
        lastSprint: endpoint(SprintResponse, 'last/sprint'),
        driverStandings: endpoint(DriverStandingsResponse, 'driverstandings'),
        constructorStandings: endpoint(ConstructorStandingsResponse, 'constructorstandings'),
        seasonResults: paged(SeasonResultsResponse, 'results'),
        seasonSprints: paged(SeasonSprintsResponse, 'sprint'),
      }
    }),
  )
}
