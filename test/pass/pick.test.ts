import { describe, expect, test } from 'bun:test'

import { best, type Candidate, reject } from '#/pass/pick.ts'

const ok: Candidate = {
  lap: 29,
  position: 9,
  chaser: { number: 44, team: 'Ferrari', pitted: false, slicks: true },
  leader: { number: 41, team: 'Racing Bulls', pitted: false, slicks: true },
  gapAtDetection: 0.62,
  intervalNear: 0.7,
  levelT: 11.2,
  brakeT: { chaser: 13.6, leader: 13.3 },
  brakeGapM: 22,
  aligned: true,
}

describe('reject', () => {
  test('accepts a clean pass', () => {
    expect(reject(ok)).toBeNull()
  })

  test('rejects lap 1', () => {
    expect(reject({ ...ok, lap: 1 })).toMatch(/lap/)
  })

  test('rejects a pit on the lap or the lap before', () => {
    expect(reject({ ...ok, chaser: { ...ok.chaser, pitted: true } })).toMatch(/pit/)
    expect(reject({ ...ok, leader: { ...ok.leader, pitted: true } })).toMatch(/pit/)
  })

  test('rejects intermediates or wets', () => {
    expect(reject({ ...ok, leader: { ...ok.leader, slicks: false } })).toMatch(/slicks/)
  })

  test('rejects team-mates', () => {
    expect(reject({ ...ok, leader: { ...ok.leader, team: 'Ferrari' } })).toMatch(/team/)
  })

  test('rejects a gap over 0.9 s at detection', () => {
    expect(reject({ ...ok, gapAtDetection: 0.91, intervalNear: 0.91 })).toMatch(/detection/)
    expect(reject({ ...ok, gapAtDetection: 0.9, intervalNear: 0.9 })).toBeNull()
    expect(reject({ ...ok, gapAtDetection: null })).toMatch(/detection/)
  })

  test('rejects a gap that disagrees with intervals by more than 0.3 s', () => {
    expect(reject({ ...ok, intervalNear: 0.93 })).toMatch(/intervals/)
    expect(reject({ ...ok, intervalNear: null })).toMatch(/intervals/)
  })

  test('rejects drawing level after braking', () => {
    expect(reject({ ...ok, levelT: 13.7 })).toMatch(/level/)
    expect(reject({ ...ok, levelT: null })).toMatch(/level/)
  })

  test('rejects braking less than 15 m later', () => {
    expect(reject({ ...ok, brakeGapM: 14.9 })).toMatch(/brake/)
    expect(reject({ ...ok, brakeGapM: 15 })).toBeNull()
    expect(reject({ ...ok, brakeT: null, brakeGapM: null })).toMatch(/brake/)
  })

  test('rejects a lap that does not align', () => {
    expect(reject({ ...ok, aligned: false })).toMatch(/align/)
  })
})

describe('best', () => {
  test('picks the highest position', () => {
    expect(best([ok, { ...ok, position: 4 }, { ...ok, position: 7 }])?.position).toBe(4)
  })

  test('is null when nothing passes', () => {
    expect(best([{ ...ok, lap: 1 }, { ...ok, aligned: false }])).toBeNull()
  })
})
