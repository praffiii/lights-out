import { Schema } from 'effect'
import { useEffect, useState } from 'react'

import { PoleLap } from './schema.ts'

const decode = Schema.decodeUnknownPromise(PoleLap)

const fetchPole = async (id: string, signal: AbortSignal) => {
  const response = await fetch(`/api/pole/${id}`, { signal })

  if (response.status !== 200) {
    await response.body?.cancel()

    return null
  }

  return decode(await response.json())
}

export const usePoleLap = (id: string, near: boolean) => {
  const [lap, setLap] = useState<PoleLap | null>(null)

  useEffect(() => {
    if (!near) return

    const abort = new AbortController()

    fetchPole(id, abort.signal).then(setLap, () => setLap(null))

    return () => abort.abort()
  }, [id, near])

  return lap
}
