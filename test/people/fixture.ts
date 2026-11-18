import { Effect, Layer } from 'effect'

import { buildSnapshot } from '../../src/season/build-snapshot.ts'
import { JolpicaClient } from '../../src/season/jolpica-client.ts'
import { peopleFake, results2026r20 } from '../season/fake-jolpica.ts'
import { fakeOpenF1 } from '../season/fake-openf1.ts'

const round20 = results2026r20.races.find((race) => race.round === 20)

const lastResults: JolpicaClient['Service']['lastResults'] = () =>
  Effect.succeed(round20 ? { race: { season: 2026, round: 20, raceName: round20.raceName }, rows: round20.rows } : { race: null, rows: [] })

export const NOW = new Date('2026-11-18T12:00:00Z')

export const snapshot = await Effect.runPromise(buildSnapshot(NOW).pipe(Effect.provide(Layer.merge(Layer.succeed(JolpicaClient, { ...peopleFake, lastResults }), fakeOpenF1()))))
