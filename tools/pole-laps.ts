import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { Effect, Layer } from 'effect'
import { FetchHttpClient } from 'effect/http'

import { refreshPoles } from '../src/pole/refresh-poles.ts'
import { PoleStore } from '../src/pole/store.ts'
import { OpenF1Client } from '../src/season/openf1-client.ts'
import type { KVText } from '../src/season/store.ts'

const flag = process.argv.indexOf('--out')
const out = flag >= 0 ? process.argv[flag + 1] : undefined

if (!out) {
  console.error('Usage: bun tools/pole-laps.ts --out <dir>')
  process.exit(1)
}

mkdirSync(out, { recursive: true })

const file = (key: string) => join(out, `${key.replace('pole:v1:', '')}.json`)

const read = (key: string) => {
  try {
    return readFileSync(file(key), 'utf8')
  } catch {
    return null
  }
}

const kv: KVText = {
  get: async (key) => read(key),
  put: async (key, value) => writeFileSync(file(key), value),
}

const services = Layer.merge(OpenF1Client.layer.pipe(Layer.provide(FetchHttpClient.layer)), PoleStore.fromKV(kv))

const outcomes = await Effect.runPromise(refreshPoles(new Date()).pipe(Effect.provide(services)))

console.log(outcomes.map((o) => `${o.id} ${o.outcome}`).join('\n'))
