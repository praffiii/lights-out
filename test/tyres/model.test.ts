import { describe, expect, test } from 'bun:test'

import { Schema } from 'effect'

import { circuitFor } from '#/circuits/registry.ts'
import baked from '#/tyres/miami.json'
import { ageText, camAt, carAt, gapBehind, lapAt, positionAt, sliderText, statusAt, steps, tyreAt, windowLaps } from '#/tyres/model.ts'
import { UndercutFile } from '#/tyres/schema.ts'

const file = Schema.decodeUnknownSync(UndercutFile)(baked)

const all = (() => {
  const s = steps(file)

  if (!s) throw new Error('the baked undercut has no steps')

  return s
})()

const end = file.early.rows.at(-1)?.[0] ?? 0

const numberIn = (text: string) => Number(/(\d+\.\d) s behind/.exec(text)?.[1])

const [one, two, three, four] = all

describe('steps', () => {
  test('the baked undercut has four steps in order', () => {
    expect(all.every((s, i) => i === 0 || s.t > (all[i - 1]?.t ?? Infinity))).toBe(true)
    expect(all.map((s) => s.title)).toEqual(['Box first.', 'New tyres, one lap early.', 'Norris boxes.', 'Out behind.'])
  })

  test('step 1 puts Antonelli about two seconds behind', () => {
    const gap = numberIn(one.text)

    expect(gap).toBeGreaterThan(1.5)
    expect(gap).toBeLessThan(2.6)
    expect(one.text).toEndWith('Mercedes call him in.')
  })

  test('step 2 names both tyres', () => {
    expect(two.text).toBe('Antonelli is out on fresh hards. Norris does one more lap on worn mediums.')
  })

  test('step 3 states both stop times', () => {
    expect(three.text).toBe("Norris stops one lap later. His stop takes 2.8 s, against Antonelli's 2.2 s.")
  })

  test('step 4 ends on the pit lane, not the tyres', () => {
    const gap = numberIn(four.text)

    expect(four.text).toEndWith('Every tenth in the pit lane counted.')
    expect(gap).toBeGreaterThan(0)
    expect(gap).toBeLessThan(1.5)
  })

  test('steps is null when the early car is not ahead at the end', () => {
    const late = { ...file.late, rows: file.late.rows.map(([t, u, lane]): [number, number, number] => [t, u + 0.05, lane]) }

    expect(steps({ ...file, late })).toBeNull()
  })
})

describe('readouts', () => {
  test('tyres change at lane exit', () => {
    expect(tyreAt(file.early, file.early.stop.exit - 0.1).letter).toBe('M')
    expect(tyreAt(file.early, file.early.stop.exit + 0.1)).toEqual({ compound: 'HARD', letter: 'H', age: 0 })
  })

  test('tyre age reads New, then 1 lap, then laps', () => {
    expect([0, 1, 27].map(ageText)).toEqual(['New', '1 lap', '27 laps'])
  })

  test('old tyres count the lap being run', () => {
    expect(tyreAt(file.late, three.t - 1)).toEqual({ compound: 'MEDIUM', letter: 'M', age: 27 })
  })

  test('statuses follow the stops', () => {
    expect(statusAt(file, 'early', (file.early.stop.entry + file.early.stop.exit) / 2)).toBe('In pit')
    expect(statusAt(file, 'early', file.early.stop.exit + 1)).toBe('Out-lap')
    expect(statusAt(file, 'late', (file.early.stop.exit + file.late.stop.entry) / 2)).toBe('Old tyres')
    expect(statusAt(file, 'late', 1)).toBe('')
  })

  test('statuses switch at the exact moment a car leaves the lane', () => {
    expect(statusAt(file, 'early', file.early.stop.exit)).toBe('Out-lap')
    expect(statusAt(file, 'late', file.late.stop.exit)).toBe('Out-lap')
    expect(statusAt(file, 'late', file.early.stop.exit)).toBe('Old tyres')
  })

  test('step 4 lands once Norris is behind on track and in the timing, not at his lane exit', () => {
    expect(four.t).toBeGreaterThan(file.late.stop.exit)
    expect(gapBehind(file, four.t).behind).toBe('late')
    expect(positionAt(file, 'late', four.t)).toBeGreaterThan(positionAt(file, 'early', four.t))
  })

  test('Antonelli drops then climbs', () => {
    expect(positionAt(file, 'early', 0)).toBe(2)
    expect(positionAt(file, 'early', two.t + 1)).toBeGreaterThan(2)
    expect(positionAt(file, 'early', end)).toBeLessThan(positionAt(file, 'late', end))
  })

  test('the lap counter follows the car further round', () => {
    expect(lapAt(file, 0)).toBe(26)
    expect(lapAt(file, end)).toBe(28)
    expect(windowLaps(file)).toEqual([26, 28])
  })

  test('the gap reads Norris ahead at the start and behind at the end', () => {
    expect(gapBehind(file, 0).behind).toBe('early')
    expect(gapBehind(file, end).behind).toBe('late')
  })

  test('the readouts are a pure function of time', () => {
    const read = (t: number) => ({
      tyre: [tyreAt(file.early, t), tyreAt(file.late, t)],
      status: [statusAt(file, 'early', t), statusAt(file, 'late', t)],
      pos: [positionAt(file, 'early', t), positionAt(file, 'late', t)],
      lap: lapAt(file, t),
      cam: camAt(file, all, t),
    })

    const first = read(four.t)

    read(0)
    expect(read(four.t)).toEqual(first)
  })

  test('a car snaps to the side of the lane boundary it is nearest in time', () => {
    const car = {
      ...file.early,
      rows: [
        [10, 25.9, -1],
        [11, 25.95, 0.02],
      ] satisfies Array<[number, number, number]>,
    }

    expect(carAt(car, 10.4).lane).toBeNull()
    expect(carAt(car, 10.6).lane).toBe(0.02)
    expect(carAt(car, 10.5).u).toBeCloseTo(25.925, 9)
  })
})

describe('track position', () => {
  const line = circuitFor('miami')?.line ?? []

  const onLine = ([x, , z]: readonly [number, number, number]) => line.reduce((best, p) => (Math.hypot(p.x - x, p.z - z) < Math.hypot(best.x - x, best.z - z) ? p : best), line[0] ?? { u: 0, x: 0, y: 0, z: 0 }).u

  const wrapped = (u: number) => u - Math.floor(u)

  const apart = (a: number, b: number) => Math.min(Math.abs(a - b), 1 - Math.abs(a - b))

  test('each car meets the pit lane where it leaves and rejoins the racing line', () => {
    const entry = onLine(file.pit.points[0] ?? [0, 0, 0])
    const exit = onLine(file.pit.points.at(-1) ?? [0, 0, 0])

    for (const car of [file.early, file.late]) {
      const before = car.rows.filter(([t, , lane]) => lane < 0 && t < car.stop.entry).at(-1)
      const after = car.rows.find(([t, , lane]) => lane < 0 && t > car.stop.exit)

      expect(apart(wrapped(before?.[1] ?? 0), entry)).toBeLessThan(0.005)
      expect(apart(wrapped(after?.[1] ?? 0), exit)).toBeLessThan(0.005)
    }
  })
})

describe('camera and slider', () => {
  test('the camera pushes in at each step and is wide between them', () => {
    for (const s of all) expect(camAt(file, all, s.t).k).toBe(3)

    expect(camAt(file, all, (two.t + three.t) / 2).k).toBe(1)
  })

  test('at each stop the camera centres on the car that is stopping', () => {
    const at = (car: typeof file.early, t: number) => {
      const u = carAt(car, t).u

      return u - Math.floor(u)
    }

    expect(camAt(file, all, one.t).u).toBeCloseTo(at(file.early, one.t), 6)
    expect(camAt(file, all, two.t).u).toBeCloseTo(at(file.early, two.t), 6)
    expect(camAt(file, all, three.t).u).toBeCloseTo(at(file.late, three.t), 6)
  })

  test('the camera follows the pair, not the pit, when the order settles', () => {
    const mid = (carAt(file.early, four.t).u + carAt(file.late, four.t).u) / 2

    expect(camAt(file, all, four.t).u).toBeCloseTo(mid - Math.floor(mid), 6)
  })

  test('the slider names the lap and step', () => {
    expect(sliderText(file, all, two.t)).toMatch(/^Lap 2[67], step 2 of 4, New tyres, one lap early\.$/)
    expect(sliderText(file, all, 0)).toBe('Lap 26, before the first stop')
  })
})
