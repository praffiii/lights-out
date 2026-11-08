import { Context, Data, Effect, Layer, Schedule, Schema } from 'effect'
import { HttpClient, HttpClientError, HttpClientRequest } from 'effect/http'

import {
  ConstructorStandingsResponse,
  DriverStandingsResponse,
  QualifyingResponse,
  RaceResultsResponse,
  RacesResponse,
  SprintResponse,
} from './jolpica-schema.ts'

export class JolpicaError extends Data.TaggedError('JolpicaError')<{
  readonly path: string
  readonly cause: HttpClientError.HttpClientError | Schema.SchemaError
}> {}

type Season = number | 'current'

type Endpoint<S extends Schema.Decoder<unknown>> = (season: Season) => Effect.Effect<S['Type'], JolpicaError>

const BASE_URL = 'https://api.jolpi.ca/ergast/f1'

const USER_AGENT = 'LightsOutFanSite/0.1 (personal project)'

export class JolpicaClient extends Context.Service<
  JolpicaClient,
  {
    readonly races: Endpoint<typeof RacesResponse>
    readonly lastResults: Endpoint<typeof RaceResultsResponse>
    readonly lastQualifying: Endpoint<typeof QualifyingResponse>
    readonly lastSprint: Endpoint<typeof SprintResponse>
    readonly driverStandings: Endpoint<typeof DriverStandingsResponse>
    readonly constructorStandings: Endpoint<typeof ConstructorStandingsResponse>
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

      const endpoint =
        <S extends Schema.Decoder<unknown>>(schema: S, resource: string): Endpoint<S> =>
        (season) => {
          const path = `/${season}/${resource}/?limit=100`

          return client.get(path).pipe(
            Effect.flatMap((response) => response.json),
            Effect.flatMap(Schema.decodeUnknownEffect(schema)),
            Effect.mapError((cause) => new JolpicaError({ path, cause })),
          )
        }

      return {
        races: endpoint(RacesResponse, 'races'),
        lastResults: endpoint(RaceResultsResponse, 'last/results'),
        lastQualifying: endpoint(QualifyingResponse, 'last/qualifying'),
        lastSprint: endpoint(SprintResponse, 'last/sprint'),
        driverStandings: endpoint(DriverStandingsResponse, 'driverstandings'),
        constructorStandings: endpoint(ConstructorStandingsResponse, 'constructorstandings'),
      }
    }),
  )
}
