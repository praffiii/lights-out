import { describe, expect, test } from 'bun:test'

import { Schema } from 'effect'

import baked from '#/tyres/miami.json'
import { camAt, carAt, gapBehind, lapAt, positionAt, sliderText, statusAt, steps, tyreAt, windowLaps } from '#/tyres/model.ts'
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

  test('old tyres count the lap being run', () => {
    expect(tyreAt(file.late, three.t - 1)).toEqual({ compound: 'MEDIUM', letter: 'M', age: 27 })
  })

  test('statuses follow the stops', () => {
    expect(statusAt(file, 'early', (file.early.stop.entry + file.early.stop.exit) / 2)).toBe('In pit')
    expect(statusAt(file, 'early', file.early.stop.exit + 1)).toBe('Out-lap')
    expect(statusAt(file, 'late', (file.early.stop.exit + file.late.stop.entry) / 2)).toBe('Old tyres')
    expect(statusAt(file, 'late', 1)).toBe('')
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

describe('camera and slider', () => {
  test('the camera pushes in at each step and is wide between them', () => {
    for (const s of all) expect(camAt(file, all, s.t).k).toBe(3)

    expect(camAt(file, all, (two.t + three.t) / 2).k).toBe(1)
    expect(camAt(file, all, one.t).u).toBe(file.pit.u)
  })

  test('the slider names the lap and step', () => {
    expect(sliderText(file, all, two.t)).toMatch(/^Lap 2[67], step 2 of 4, New tyres, one lap early\.$/)
    expect(sliderText(file, all, 0)).toBe('Lap 26, before the first stop')
  })
})
