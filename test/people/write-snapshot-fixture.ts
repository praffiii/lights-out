import { Effect, Layer } from 'effect'

import { buildPeople } from '../../src/people/build.ts'
import { JolpicaClient } from '../../src/season/jolpica-client.ts'
import { peopleFake, results2026r20, sprints2026r20 } from '../season/fake-jolpica.ts'

const path = 'test/fixtures/season-snapshot.json'
const people = await Effect.runPromise(buildPeople(2026, results2026r20.races, sprints2026r20.races, undefined).pipe(Effect.provide(Layer.succeed(JolpicaClient, peopleFake))))
const snapshot = await Bun.file(path).json()

await Bun.write(path, `${JSON.stringify({ ...snapshot, people }, null, 2)}\n`)
