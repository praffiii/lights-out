import type { Pace } from './pace.ts'

export type ScrubOptions = { length?: string; rest?: number; scale?: Pace; stepped?: true }

export const scrubOptions = (end: number, pace: Pace, options?: ScrubOptions) => ({
  length: options?.length ?? '+=300%',
  rest: options?.rest ?? end,
  initial: options?.rest ?? 0,
  scale: options?.scale ?? pace,
})
