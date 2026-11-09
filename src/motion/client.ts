import { useEffect, useState, useSyncExternalStore } from 'react'

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
