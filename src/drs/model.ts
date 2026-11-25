import type { Pace } from '../chapter/pace.ts'
import type { Focus } from '../pass/model.ts'

import type { GhostFile, GhostLap } from './schema.ts'

export const START = -3

const FLAP_S = 0.3

const LEVEL_M = 1

const STEP_M = 100

const ZONE_SHARE = 0.66

const SCALE_STEPS = 40

const KMH = 3.6

const CAM = { wide: 5, close: 15, yaw: 0.55, pitch: 0.4 } as const

export type Point = { u: number; speed: number }

export type Now = { laps: readonly [Point, Point]; lap: readonly [number, number]; metres: number; seconds: number; flap: number; open: boolean; along: number }

export const END = (file: GhostFile) => file.end - START

const read = (lap: GhostLap, t: number): Point => {
  const i = Math.max(1, Math.min(lap.rows.length - 1, lap.rows.findIndex((r) => r[0] >= t)))
  const a = lap.rows[i - 1]
  const b = lap.rows[i]

  if (!a || !b) return { u: 0, speed: 0 }

  const f = (t - a[0]) / (b[0] - a[0])

  return { u: a[1] + (b[1] - a[1]) * f, speed: a[2] + (b[2] - a[2]) * f }
}

export const at = (file: GhostFile, t: number): Now => {
  const [on, off] = file.laps
  const a = read(on, t)
  const b = read(off, t)
  const metres = (a.u - b.u) * file.lengthM

  return {
    laps: [a, b],
    lap: [on.lap, off.lap],
    metres,
    seconds: b.speed > 0 ? metres / (b.speed / KMH) : 0,
    flap: Math.min(1, Math.max(0, t / FLAP_S)),
    open: t > 0,
    along: (a.u - file.from) * file.lengthM,
  }
}

export const isLevel = (now: Now) => now.metres < LEVEL_M

export const gapText = (now: Now) => (isLevel(now) ? 'Level' : `${Math.round(now.metres)} m`)

export const flapFrame = (flap: number, count: number) => Math.round(flap * (count - 1))

const state = (now: Now) => (now.open ? 'open' : 'shut')

const metresText = (m: number) => Math.round(m).toLocaleString('en-GB')

export const sliderText = (now: Now) =>
  [
    `${metresText(now.along)} metres.`,
    `Lap ${now.lap[0]} ${Math.round(now.laps[0].speed)}, lap ${now.lap[1]} ${Math.round(now.laps[1].speed)} kilometres an hour.`,
    `Flap ${state(now)}, ${isLevel(now) ? 'level' : `${Math.round(now.metres)} metres ahead`}.`,
  ].join(' ')

export const timeOfMetres = (file: GhostFile, m: number) => {
  let low = START
  let high = file.end

  for (let i = 0; i < SCALE_STEPS; i++) {
    const mid = (low + high) / 2

    if (at(file, mid).along < m) low = mid
    else high = mid
  }

  return (low + high) / 2
}

export const ghostPace = (file: GhostFile): Pace => [
  [0, 0],
  [1 - ZONE_SHARE, -START],
  [1, END(file)],
]

export const lengthOf = (file: GhostFile) => (file.to - file.from) * file.lengthM

export const barScale = (file: GhostFile): Pace => {
  const first = at(file, START).along
  const last = at(file, file.end).along

  const knots = Array.from({ length: SCALE_STEPS + 1 }, (_, i): readonly [number, number] => {
    const m = first + ((last - first) * i) / SCALE_STEPS

    return [m / lengthOf(file), timeOfMetres(file, m) - START]
  })

  return [...knots.slice(0, -1), [last / lengthOf(file), END(file)], [1, END(file)]]
}

export const stops = (file: GhostFile): ReadonlyArray<number> => {
  const first = Math.ceil(at(file, START).along / STEP_M)
  const last = Math.floor(at(file, file.end).along / STEP_M)

  return Array.from({ length: last - first + 1 }, (_, i) => timeOfMetres(file, (first + i) * STEP_M) - START)
}

const smooth = (x: number) => {
  const f = Math.min(1, Math.max(0, x))

  return f * f * (3 - 2 * f)
}

export const camAt = (file: GhostFile, t: number): Focus => {
  const now = at(file, t)
  const f = smooth((t - START) / END(file))

  return { u: (now.laps[0].u + now.laps[1].u) / 2, k: CAM.wide + (CAM.close - CAM.wide) * f, w: 1, yaw: CAM.yaw, pitch: CAM.pitch }
}
