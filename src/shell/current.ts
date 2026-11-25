import { MENU } from './menu.ts'

export const unslashed = (path: string) => path.replace(/(.)\/$/, '$1')

export function currentEntry(path: string) {
  const here = unslashed(path)
  const exact = MENU.findIndex((m) => m.to === here)

  return exact >= 0 ? exact : Math.max(0, MENU.findIndex((m) => m.chapters?.some((c) => c.to === here)))
}
