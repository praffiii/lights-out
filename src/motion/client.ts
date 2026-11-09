import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

import { gsap } from './motion.ts'

const never = () => () => {}

export const useMounted = () =>
  useSyncExternalStore(
    never,
    () => true,
    () => false,
  )

export function useSecond() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let last = Math.floor(Date.now() / 1000)

    const tick = () => {
      const second = Math.floor(Date.now() / 1000)

      if (second === last) return

      last = second
      setNow(new Date())
    }

    gsap.ticker.add(tick)

    return () => gsap.ticker.remove(tick)
  }, [])

  return now
}

export const useZone = () =>
  useSyncExternalStore(
    never,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => 'UTC',
  )

export function useMedia(query: string) {
  const watch = useCallback(
    (fn: () => void) => {
      const list = matchMedia(query)

      list.addEventListener('change', fn)

      return () => list.removeEventListener('change', fn)
    },
    [query],
  )

  return useSyncExternalStore(
    watch,
    () => matchMedia(query).matches,
    () => false,
  )
}
