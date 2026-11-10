import { Context, Data, Effect, Layer, Predicate, Schedule, Schema, Semaphore } from 'effect'
import { HttpClient, HttpClientError, HttpClientRequest } from 'effect/http'

import { CarResponse, LapsResponse, LocationResponse, PoleResultResponse, StintsResponse } from '../pole/schema.ts'

import { DriversResponse, ResultResponse, SessionsResponse } from './openf1-schema.ts'

export class OpenF1Error extends Data.TaggedError('OpenF1Error')<{
  readonly path: string
  readonly cause: HttpClientError.HttpClientError | Schema.SchemaError
}> {}

type Read<S extends Schema.Decoder<unknown>> = (key: number) => Effect.Effect<S['Type'], OpenF1Error>

type ReadDriver<S extends Schema.Decoder<unknown>> = (key: number, driver: number) => Effect.Effect<S['Type'], OpenF1Error>

type ReadWindow<S extends Schema.Decoder<unknown>> = (key: number, driver: number, from: string, to: string) => Effect.Effect<S['Type'], OpenF1Error>

const BASE_URL = 'https://api.openf1.org/v1'

const USER_AGENT = 'LightsOutFanSite/0.1 (personal project)'

const SPACING = '400 millis'

const notFound = (error: OpenF1Error) =>
  HttpClientError.isHttpClientError(error.cause) && Predicate.isTagged(error.cause.reason, 'StatusCodeError') && error.cause.reason.response.status === 404

export class OpenF1Client extends Context.Service<
  OpenF1Client,
  {
    readonly sessions: Read<typeof SessionsResponse>
    readonly result: Read<typeof ResultResponse>
    readonly poleResult: Read<typeof PoleResultResponse>
    readonly drivers: Read<typeof DriversResponse>
    readonly laps: ReadDriver<typeof LapsResponse>
    readonly carData: ReadWindow<typeof CarResponse>
    readonly location: ReadWindow<typeof LocationResponse>
    readonly stints: ReadDriver<typeof StintsResponse>
  }
>()('OpenF1Client') {
  static readonly layer = Layer.effect(
    OpenF1Client,
    Effect.gen(function* () {
      const client = (yield* HttpClient.HttpClient).pipe(
        HttpClient.mapRequest((request) => request.pipe(HttpClientRequest.prependUrl(BASE_URL), HttpClientRequest.setHeader('user-agent', USER_AGENT))),
        HttpClient.filterStatusOk,
        HttpClient.retryTransient({ retryOn: 'errors-only', schedule: Schedule.exponential('500 millis'), times: 3 }),
      )

      const gate = yield* Semaphore.make(1)

      const get = <S extends Schema.Decoder<unknown>>(schema: S, path: string): Effect.Effect<S['Type'], OpenF1Error> =>
        Semaphore.withPermits(gate, 1)(Effect.sleep(SPACING).pipe(Effect.andThen(client.get(path)))).pipe(
          Effect.flatMap((response) => response.json),
          Effect.flatMap(Schema.decodeUnknownEffect(schema)),
          Effect.mapError((cause) => new OpenF1Error({ path, cause })),
        )

      const empty = <A>(read: Effect.Effect<ReadonlyArray<A>, OpenF1Error>) => read.pipe(Effect.catchIf(notFound, () => Effect.succeed([])))

      const window = (from: string, to: string) => `date%3E=${from}&date%3C=${to}`

      return {
        sessions: (year) => get(SessionsResponse, `/sessions?year=${year}`),
        result: (key) => get(ResultResponse, `/session_result?session_key=${key}`).pipe(Effect.catchIf(notFound, () => Effect.succeed([]))),
        poleResult: (key) => empty(get(PoleResultResponse, `/session_result?session_key=${key}`)),
        drivers: (key) => get(DriversResponse, `/drivers?session_key=${key}`),
        laps: (key, driver) => empty(get(LapsResponse, `/laps?session_key=${key}&driver_number=${driver}`)),
        carData: (key, driver, from, to) => get(CarResponse, `/car_data?session_key=${key}&driver_number=${driver}&${window(from, to)}`),
        location: (key, driver, from, to) => get(LocationResponse, `/location?session_key=${key}&driver_number=${driver}&${window(from, to)}`),
        stints: (key, driver) => empty(get(StintsResponse, `/stints?session_key=${key}&driver_number=${driver}`)),
      }
    }),
  )
}
