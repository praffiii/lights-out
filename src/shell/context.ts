import { createContext, useContext } from 'react'

import type { FileRoutesByTo } from '#/routeTree.gen'

export type To = Exclude<keyof FileRoutesByTo, `/api/${string}` | `/lap/${string}`> | `/lap/${string}`

export type Dive = { rect: { top: number; right: number; bottom: number; left: number }; image: { left: number; top: number; width: number; height: number }; poster: string }

export type ShellApi = { go: (to: To, dive?: Dive) => Promise<void>; surface: () => Promise<void> }

export const ShellContext = createContext<ShellApi | null>(null)

export function useShell() {
  const shell = useContext(ShellContext)

  if (!shell) throw new Error('useShell outside <Shell>')

  return shell
}
