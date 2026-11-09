import { Context, Data, Effect, Layer, Predicate, Schedule, Schema, Semaphore } from 'effect'
import { HttpClient, HttpClientError, HttpClientRequest } from 'effect/http'

import { DriversResponse, ResultResponse, SessionsResponse } from './openf1-schema.ts'

export class OpenF1Error extends Data.TaggedError('OpenF1Error')<{
  readonly path: string
  readonly cause: HttpClientError.HttpClientError | Schema.SchemaError
}> {}

type Read<S extends Schema.Decoder<unknown>> = (key: number) => Effect.Effect<S['Type'], OpenF1Error>

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
    readonly drivers: Read<typeof DriversResponse>
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

      return {
        sessions: (year) => get(SessionsResponse, `/sessions?year=${year}`),
        result: (key) => get(ResultResponse, `/session_result?session_key=${key}`).pipe(Effect.catchIf(notFound, () => Effect.succeed([]))),
        drivers: (key) => get(DriversResponse, `/drivers?session_key=${key}`),
      }
    }),
  )
}
