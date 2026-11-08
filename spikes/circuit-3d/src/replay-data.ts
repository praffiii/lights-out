import data from './replay.json'

/** Where something sits on the map, 0..1 of the frame from the top left. */
export type Point = readonly [number, number]

/** One frame of the simulation. Order matches `frames` in blender/replay.py. */
export type Frame = {
  speed: { chaser: number; leader: number }
  gap: number | null // s the chaser is behind; null once it is ahead
  gear: { chaser: number; leader: number }
  mode: { chaser: Mode; leader: Mode }
  battery: { chaser: number; leader: number }
  at: { chaser: Point; leader: Point }
}
export type Mode = 'straight' | 'overtake' | 'corner'
type Cell = (typeof data.frames)[number][number]
const isMode = (m: Cell): m is Mode => m === 'straight' || m === 'overtake' || m === 'corner'
const num = (v: Cell) => (typeof v === 'number' ? v : 0)
const point = (v: Cell): Point => (Array.isArray(v) ? [v[0], v[1]] : [0, 0])
const pair = ([x, y]: number[]): Point => [x, y]

export const REPLAY = {
  fps: data.fps,
  duration: data.duration,
  posterFrame: data.posterFrame,
  map: {
    ...data.map,
    detect: [pair(data.map.detect[0]), pair(data.map.detect[1])] as const,
    turns: { 12: pair(data.map.turns['12']), 1: pair(data.map.turns['1']) },
  },
  frames: data.frames.map(([cs, ls, gap, cg, lg, cm, lm, cb, lb, ca, la]): Frame => ({
    speed: { chaser: num(cs), leader: num(ls) },
    gap: typeof gap === 'number' && gap >= 0 ? gap : null,
    gear: { chaser: num(cg), leader: num(lg) },
    mode: { chaser: isMode(cm) ? cm : 'straight', leader: isMode(lm) ? lm : 'straight' },
    battery: { chaser: num(cb), leader: num(lb) },
    at: { chaser: point(ca), leader: point(la) },
  })),
}

/** The four steps, at the times the simulation produced. Copy from the approved mock. */
export const STEPS = [
  { at: data.events.detect, title: 'Within one second', body: '0.6 s behind at the detection point. That unlocks Overtake Mode for the straight.' },
  { at: data.events.overtake, title: 'Overtake Mode', body: 'Extra electric power, for longer, all the way up the hill.' },
  { at: data.events.pull, title: 'Out of the tow', body: 'Clean air, nose alongside.' },
  { at: data.events.brake, title: 'Brake later', body: 'Inside line for Turn 1, braking a few metres after the leader.' },
] as const

export const stepAt = (t: number) => Math.max(0, STEPS.findLastIndex((s) => t >= s.at))
export const frameAt = (t: number) => REPLAY.frames[Math.min(REPLAY.frames.length - 1, Math.max(0, Math.round(t * REPLAY.fps)))]
