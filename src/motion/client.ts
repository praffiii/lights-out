import { useSyncExternalStore } from 'react'

const never = () => () => {}

export const useMounted = () =>
  useSyncExternalStore(
    never,
    () => true,
    () => false,
  )
