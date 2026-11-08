import { queryOptions, useQuery } from '@tanstack/react-query'
import { Data, Schema } from 'effect'

import { SeasonSnapshot } from './snapshot-schema.ts'

export class SeasonWarmingError extends Data.TaggedError('SeasonWarmingError') {}

const decode = Schema.decodeUnknownPromise(SeasonSnapshot)

export const fetchSeason = async (): Promise<SeasonSnapshot> => {
  const response = await fetch('/api/season')

  if (!response.ok) {
    await response.body?.cancel()

    if (response.status === 503) throw new SeasonWarmingError()

    throw new Error(`/api/season answered ${response.status}`)
  }

  return decode(await response.json())
}

export const seasonQueryOptions = queryOptions({ queryKey: ['season'], queryFn: fetchSeason, staleTime: 60_000 })

export const useSeason = () => useQuery(seasonQueryOptions)
