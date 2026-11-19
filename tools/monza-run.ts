import { writeFileSync } from 'node:fs'

import { Schema } from 'effect'

import { circuitFor } from '../src/circuits/registry.ts'
import { bakeRun, MonzaRunJson, RunSource } from '../src/people/monza-run.ts'

const SOURCE = 'test/fixtures/openf1/monza-lap1-11361.json'

const OUT = 'src/people/monza-run.json'

const info = circuitFor('monza')

if (!info) throw new Error('Monza is not in the circuit registry')

const run = bakeRun(Schema.decodeUnknownSync(RunSource)(await Bun.file(SOURCE).json()), info)

if (!run) {
  console.error('Monza lap 1 does not line up with the it-1922 model')
  process.exit(1)
}

writeFileSync(OUT, `${Schema.encodeSync(MonzaRunJson)(run)}\n`)

console.log(`${OUT}: ${run.rows.length} rows, positions ${run.positions.map(([, n]) => n).join(' → ')}`)
