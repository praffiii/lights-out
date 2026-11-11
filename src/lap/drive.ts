import type { LinePoint } from '#/circuits/registry.ts'

export const LAP_PX = 14000
export const SETTLE = 6
export const SNAP = 0.012
export const SNAP_AFTER = 0.35

const ON_TURN = 1e-4

export type Drive = { pos: number; target: number; mine: boolean; quiet: number }

type Step = { cruise: number; holding: boolean; turns: ReadonlyArray<number>; settle: number }

export const wrap = (x: number) => x - Math.floor(x)

export const toward = (from: number, lap: number) => lap + Math.round(from - lap)

export const push = (d: Drive, px: number): Drive => ({ ...d, target: d.target + px / LAP_PX, mine: true, quiet: 0 })

export const seek = (d: Drive, lap: number): Drive => ({ ...d, target: toward(d.pos, lap), mine: true, quiet: 0 })

export const resume = (d: Drive): Drive => ({ ...d, target: d.pos, mine: false })

const snapped = (target: number, turns: ReadonlyArray<number>) =>
  turns.map((turn) => toward(target, turn)).reduce((best, at) => (Math.abs(at - target) < Math.abs(best - target) ? at : best), Infinity)

export const step = (d: Drive, dt: number, o: Step): Drive => {
  const cruised = d.mine ? d.target : d.target + o.cruise * dt
  const near = d.mine && !o.holding && d.quiet + dt > SNAP_AFTER ? snapped(cruised, o.turns) : Infinity
  const target = Math.abs(near - cruised) <= SNAP ? near : cruised
  const pos = d.pos + (target - d.pos) * (1 - Math.exp(-dt * o.settle))

  return { ...d, target, pos, quiet: d.quiet + dt }
}

export const nextTurn = (u: number, turns: ReadonlyArray<number>, dir: 1 | -1) =>
  turns.map((turn) => dir * wrap(dir * (turn - u) - ON_TURN) + dir * ON_TURN).reduce((best, gap) => (Math.abs(gap) < Math.abs(best) ? gap : best), dir)

export const turnLaps = (points: ReadonlyArray<{ x: number; z: number }>, line: ReadonlyArray<LinePoint>) =>
  points.map((p) => line.reduce((best, q) => (Math.hypot(q.x - p.x, q.z - p.z) < Math.hypot(best.x - p.x, best.z - p.z) ? q : best), line[0] ?? { u: 0, x: Infinity, y: 0, z: Infinity }).u)
