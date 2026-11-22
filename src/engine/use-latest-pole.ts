import { Schema } from 'effect'
import { useEffect, useState } from 'react'

import { Latest } from '#/pole/latest.ts'

const decode = Schema.decodeUnknownPromise(Latest)

const fetchLatest = async (signal: AbortSignal): Promise<Latest | null> => {
  const response = await fetch('/api/pole/latest', { signal })

  if (response.status !== 200) {
    await response.body?.cancel()

    return null
  }

  return decode(await response.json())
}

export const useLatestPole = (near: boolean): Latest | null | 'loading' => {
  const [state, setState] = useState<Latest | null | 'loading'>('loading')

  useEffect(() => {
    if (!near) return

    const abort = new AbortController()

    fetchLatest(abort.signal).then(setState, () => setState(null))

    return () => abort.abort()
  }, [near])

  return state
}
