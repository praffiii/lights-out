import { expect, it } from 'bun:test'
import { Schema } from 'effect'

import { circuitFor } from '../../src/circuits/registry.ts'
import { bakeRun, chipText, runAt, RunSource } from '../../src/people/monza-run.ts'
import { RUN } from '../../src/people/run.ts'

const source = Schema.decodeUnknownSync(RunSource)(await Bun.file('test/fixtures/openf1/monza-lap1-11361.json').json())

const monza = circuitFor('monza')

if (!monza) throw new Error('Monza is modelled')

it('bakes the fixture into the committed run', () => {
  expect(bakeRun(source, monza)).toEqual(RUN)
})

it('keeps the session, the lap time and every position update in lap time', () => {
  expect(RUN.session).toBe(11361)
  expect(RUN.time).toBe(95.76)
  expect(RUN.positions).toEqual([
    [0, 19],
    [11.048, 17],
    [16.272, 16],
    [24.131, 17],
    [33.249, 16],
    [80.522, 15],
    [86.365, 14],
  ])
})

it('reads his position at any moment of the lap', () => {
  expect(runAt(RUN, 0).position).toBe(19)
  expect(runAt(RUN, 20).position).toBe(16)
  expect(runAt(RUN, 30).position).toBe(17)
  expect(runAt(RUN, 82).position).toBe(15)
  expect(runAt(RUN, 95).done).toBe(false)
  expect(runAt(RUN, 95.76)).toMatchObject({ position: 14, done: true, u: 1 })
  expect(runAt(RUN, 200)).toMatchObject({ position: 14, done: true, u: 1 })
})

it('never runs backwards', () => {
  const us = Array.from({ length: 193 }, (_, i) => runAt(RUN, i * 0.5).u)

  expect(us.every((u, i) => i === 0 || u >= (us[i - 1] ?? 0))).toBe(true)
})

it('writes the chip as the lap goes and at the line', () => {
  expect(chipText(RUN, 0)).toBe('ANT · P19')
  expect(chipText(RUN, 20)).toBe('ANT · P16')
  expect(chipText(RUN, RUN.time)).toBe('ANT · P14 · after lap 1')
})
