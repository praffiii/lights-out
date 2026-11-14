import { crossTime, type Focus, type Step, stepAt } from '#/pass/model.ts'

import type { Compound, UndercutCar, UndercutFile } from './schema.ts'

export type Which = 'early' | 'late'

export type Letter = 'S' | 'M' | 'H' | 'I' | 'W'

export type Tyre = { compound: Compound; letter: Letter; age: number }

export type Status = 'In pit' | 'Out-lap' | 'Old tyres' | ''

export type Spot = { u: number; lane: number | null }

export type Gap = { behind: Which; seconds: number | null }

const K_PIT = 3

const RAMP = 6

const LETTER: Record<Compound, Letter> = { SOFT: 'S', MEDIUM: 'M', HARD: 'H', INTERMEDIATE: 'I', WET: 'W' }

const PLURAL: Record<Compound, string> = { SOFT: 'softs', MEDIUM: 'mediums', HARD: 'hards', INTERMEDIATE: 'intermediates', WET: 'wets' }

const other = (which: Which): Which => (which === 'early' ? 'late' : 'early')

const surname = (car: UndercutCar) => car.name.split(' ').at(-1) ?? car.code

const wrap = (u: number) => u - Math.floor(u)

const smooth = (x: number) => {
  const f = Math.min(1, Math.max(0, x))

  return f * f * (3 - 2 * f)
}

export const ageText = (age: number) => {
  if (age === 0) return 'New'

  return `${age} ${age === 1 ? 'lap' : 'laps'}`
}

export const endOf = (file: UndercutFile) => Math.max(file.early.rows.at(-1)?.[0] ?? 0, file.late.rows.at(-1)?.[0] ?? 0)

export const carAt = (car: UndercutCar, t: number): Spot => {
  const i = car.rows.findIndex((r) => r[0] >= t)
  const b = car.rows[i] ?? car.rows.at(-1)
  const a = car.rows[i - 1] ?? b

  if (!a || !b) return { u: 0, lane: null }

  const f = b[0] === a[0] ? 0 : Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0])))
  const u = a[1] + (b[1] - a[1]) * f
  const near = f < 0.5 ? a : b
  const lane = a[2] >= 0 && b[2] >= 0 ? a[2] + (b[2] - a[2]) * f : near[2] >= 0 ? near[2] : null

  return { u, lane }
}

const STEP_IN = 0.01

const racingGap = (file: UndercutFile) => {
  const u = Math.max(file.early.rows[0]?.[1] ?? 0, file.late.rows[0]?.[1] ?? 0) + STEP_IN
  const e = crossTime(file.early.rows, u)
  const l = crossTime(file.late.rows, u)

  return e === null || l === null ? null : e - l
}

export const gapBehind = (file: UndercutFile, t: number): Gap => {
  const behind: Which = carAt(file.early, t).u < carAt(file.late, t).u ? 'early' : 'late'
  const passed = crossTime(file[other(behind)].rows, carAt(file[behind], t).u)

  return { behind, seconds: passed === null ? null : t - passed }
}

const lateBehind = (file: UndercutFile, t: number) => gapBehind(file, t).behind === 'late' && positionAt(file, 'late', t) > positionAt(file, 'early', t)

const settled = (file: UndercutFile) => file.late.rows.reduce<number | null>((at, [t]) => (t >= file.late.stop.exit && lateBehind(file, t) ? (at ?? t) : null), null)

const lapOf = (car: UndercutCar, t: number) => car.laps.reduce((n, [lap, at]) => (at <= t && lap > n ? lap : n), 0) || car.stop.lap

export const tyreAt = (car: UndercutCar, t: number): Tyre => {
  const old = car.stints.filter((s) => s.lapStart <= car.stop.lap).at(-1) ?? car.stints[0]
  const next = car.stints.find((s) => s.lapStart > car.stop.lap)

  if (next && t >= car.stop.exit) {
    const age = next.ageAtStart + car.laps.filter(([, at]) => at > car.stop.exit && at <= t).length

    return { compound: next.compound, letter: LETTER[next.compound], age }
  }

  const compound = old?.compound ?? 'MEDIUM'

  return { compound, letter: LETTER[compound], age: (old?.ageAtStart ?? 0) + lapOf(car, t) - (old?.lapStart ?? 1) + 1 }
}

export const statusAt = (file: UndercutFile, which: Which, t: number): Status => {
  const me = file[which]
  const you = file[other(which)]

  if (t >= me.stop.entry && t < me.stop.exit) return 'In pit'

  const nextLap = me.laps.find(([, at]) => at > me.stop.exit)?.[1] ?? Infinity

  if (t >= me.stop.exit && t < nextLap) return 'Out-lap'

  if (t < me.stop.exit && t >= you.stop.exit) return 'Old tyres'

  return ''
}

export const positionAt = (file: UndercutFile, which: Which, t: number) => {
  const mine = file.positions.filter(([, number]) => number === file[which].number)

  return (mine.filter(([at]) => at <= t).at(-1) ?? mine[0])?.[2] ?? 0
}

export const lapAt = (file: UndercutFile, t: number) => Math.max(lapOf(file.early, t), lapOf(file.late, t))

export const windowLaps = (file: UndercutFile): readonly [number, number] => [lapAt(file, 0), lapAt(file, endOf(file))]

export const steps = (file: UndercutFile): readonly [Step, Step, Step, Step] | null => {
  const { early, late } = file
  const end = endOf(file)
  const atBox = racingGap(file)
  const atEnd = gapBehind(file, end)
  const behind = settled(file)

  if (early.stop.exit >= late.stop.entry || atBox === null || atBox <= 0 || behind === null || atEnd.seconds === null) return null

  const e = surname(early)
  const l = surname(late)
  const worn = PLURAL[tyreAt(early, early.stop.entry).compound]
  const fresh = PLURAL[tyreAt(early, early.stop.exit).compound]

  return [
    { n: 1, t: early.stop.entry, title: 'Box first.', text: `${atBox.toFixed(1)} s behind ${l}, on the same worn ${worn}. ${early.team} call him in.` },
    { n: 2, t: early.stop.exit, title: 'New tyres, one lap early.', text: `${e} is out on fresh ${fresh}. ${l} does one more lap on worn ${worn}.` },
    { n: 3, t: late.stop.entry, title: `${l} boxes.`, text: `${l} stops one lap later. His stop takes ${late.stop.stopS.toFixed(1)} s, against ${e}'s ${early.stop.stopS.toFixed(1)} s.` },
    { n: 4, t: behind, title: 'Out behind.', text: `${l} rejoins ${atEnd.seconds.toFixed(1)} s behind. Every tenth in the pit lane counted.` },
  ]
}

export const sliderText = (file: UndercutFile, all: ReadonlyArray<Step>, t: number) => {
  const n = stepAt(all, t)
  const step = all[n - 1]
  const lap = lapAt(file, t)

  return step ? `Lap ${lap}, step ${n} of ${all.length}, ${step.title}` : `Lap ${lap}, before the first stop`
}

export const camAt = (file: UndercutFile, all: ReadonlyArray<Step>, t: number): Focus => {
  const near = all.reduce<Step | null>((best, s) => (best && Math.abs(best.t - t) <= Math.abs(s.t - t) ? best : s), null)
  const w = near ? smooth(1 - Math.abs(near.t - t) / RAMP) : 0
  const pair = wrap((carAt(file.early, t).u + carAt(file.late, t).u) / 2)

  if (!near || w <= 0) return { u: pair, k: 1, w: 0 }

  const subject = near.n === all.length ? null : near.n <= 2 ? file.early : file.late

  return { u: subject ? wrap(carAt(subject, near.t).u) : pair, k: 1 + (K_PIT - 1) * w, w }
}
