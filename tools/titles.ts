import { writeFileSync } from 'node:fs'

import { Effect, Layer } from 'effect'
import { FetchHttpClient } from 'effect/http'

import { seasonPages } from '../src/season/build-snapshot.ts'
import { JolpicaClient } from '../src/season/jolpica-client.ts'
import { matches, titlesOf } from '../src/titles/build.ts'

const SEASON = 2026

const arg = (name: string) => {
  const i = process.argv.indexOf(name)

  return i >= 0 ? process.argv[i + 1] : undefined
}

const run = JolpicaClient.use((jolpica) =>
  Effect.gen(function* () {
    const { races } = yield* jolpica.races(SEASON)
    const drivers = yield* jolpica.driverStandings(SEASON)
    const teams = yield* jolpica.constructorStandings(SEASON)
    const pages = yield* seasonPages(jolpica, SEASON)
    const titles = pages ? titlesOf(SEASON, races, pages.races, pages.sprints) : null

    if (!titles || !matches(titles, drivers, teams)) throw new Error('the points do not add up to the standings')

    return titles
  }),
)

const titles = await Effect.runPromise(run.pipe(Effect.provide(JolpicaClient.layer.pipe(Layer.provide(FetchHttpClient.layer)))))

console.log(`${titles.rounds.length} rounds, totals match`)

const out = arg('--out')

if (out) writeFileSync(out, `${JSON.stringify(titles)}\n`)
