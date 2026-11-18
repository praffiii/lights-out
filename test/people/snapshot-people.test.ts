import { expect, it } from 'bun:test'
import { Effect, Fiber } from 'effect'
import { TestClock } from 'effect/testing'

import { buildSnapshot } from '../../src/season/build-snapshot.ts'
import { missing, peopleFake } from '../season/fake-jolpica.ts'
import { NOW, peopleLayer, snapshot } from './fixture.ts'

it('drops people from another season when the season pages fail', async () => {
  const stale = snapshot.people && { ...snapshot.people, season: 2025 }
  const built = await Effect.runPromise(buildSnapshot(NOW, { people: stale }).pipe(Effect.provide(peopleLayer({ seasonResults: () => missing('/2026/results') }))))

  expect(built.driverStandings?.season).toBe(2026)
  expect(built.people).toBeUndefined()
})

it('keeps the race rows and the careers already built when a career fetch never answers', async () => {
  const built = await Effect.runPromise(
    Effect.gen(function* () {
      const fiber = yield* Effect.forkChild(buildSnapshot(NOW))

      yield* TestClock.adjust('3 minutes')

      return yield* Fiber.join(fiber)
    }).pipe(Effect.provide(peopleLayer({ driverResults: (id, offset) => (id === 'ocon' ? Effect.never : peopleFake.driverResults(id, offset)) })), Effect.provide(TestClock.layer())),
  )

  expect(built.people?.results.ocon).toHaveLength(18)
  expect(built.people?.past.antonelli?.through).toBe(2025)
  expect(built.people?.past.ocon).toBeUndefined()
})
