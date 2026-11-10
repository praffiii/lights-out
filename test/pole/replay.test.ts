import { expect, it } from 'bun:test'
import { Schema } from 'effect'

import { advance, apexes, clock, nearest, nearestTurn, sampleAt, splits, timeAt } from '../../src/pole/replay.ts'
import { PoleLapJson } from '../../src/pole/schema.ts'

const lap = Schema.decodeUnknownSync(PoleLapJson)(await Bun.file('test/fixtures/pole/vegas.json').text())

it('sampleAt starts with the first row', () => {
  expect(sampleAt(lap, 0).speed).toBe(lap.rows[0]?.[2] ?? -1)
  expect(sampleAt(lap, 0).u).toBeGreaterThanOrEqual(0)
  expect(sampleAt(lap, 0).u).toBeLessThan(1)
})

it('timeAt inverts sampleAt', () => {
  expect(timeAt(lap, sampleAt(lap, 40).u)).toBeCloseTo(40, 1)
})

it('splits fill the finished sector and run the live one', () => {
  expect(splits(lap, 31)).toEqual([
    { state: 'done', text: '30.430' },
    { state: 'live', text: '0.6' },
    { state: 'idle', text: '—' },
  ])
})

it('clock reads minutes, seconds and thousandths', () => {
  expect(clock(107.934)).toBe('1:47.934')
  expect(clock(0)).toBe('0:00.000')
  expect(clock(59.9996)).toBe('1:00.000')
})

it('advance holds the finished lap for 1.6 s, then restarts', () => {
  let state = advance({ t: 107.9, hold: 0 }, 0.05, 107.934)

  expect(state).toEqual({ t: 107.934, hold: 1.6 })

  for (let i = 0; i < 16; i++) state = advance(state, 0.1, 107.934)

  expect(state.t).toBe(0)
})

it('advance clamps a long frame to 0.1 s', () => {
  expect(advance({ t: 10, hold: 0 }, 30, 107.934).t).toBeCloseTo(10.1, 6)
})

const square = new Float32Array([0, 0, 100, 0, 100, 100, 0, 100])

it('nearest snaps to the closest point of the trace', () => {
  expect(nearest(square, 50, 10, 56)).toBeCloseTo(0.125, 6)
  expect(nearest(square, 50, 200, 56)).toBeNull()
})

it('nearestTurn finds a turn under the finger', () => {
  const turns = [
    { turn: 1, u: 0.25 },
    { turn: 2, u: 0.5 },
  ]

  expect(nearestTurn(square, turns, 98, 4, 32)).toBe(0.25)
  expect(nearestTurn(square, turns, 50, 50, 32)).toBeNull()
})

it('apexes reads the slowest speed through each turn', () => {
  const u = lap.rows.reduce((slow, row) => (row[2] < slow[2] ? row : slow))[1]
  const apex = apexes(lap, [{ turn: 14, u: u - Math.floor(u) }]).get(14)

  expect(apex?.speed).toBe(Math.min(...lap.rows.map((row) => row[2])))
  expect(apex?.gear).toBeGreaterThan(0)
})
