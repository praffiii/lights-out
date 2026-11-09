import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useSecond, useZone } from '#/motion/client.ts'
import { seasonQueryOptions, useSeason } from '#/season/use-season.ts'
import { waitFor } from '#/shell/Loader.tsx'

import { Clock } from './Clock.tsx'
import { weekendPage } from './page-model.ts'
import { Top } from './Top.tsx'

export function Weekend() {
  const client = useQueryClient()
  const { data } = useSeason()
  const now = useSecond()
  const zone = useZone()

  useEffect(() => {
    waitFor(client.fetchQuery(seasonQueryOptions))
  }, [client])

  const page = data ? weekendPage(data, now, zone) : null

  if (!data || !page) {
    return (
      <div className="weekend-page">
        <p className="weekend-empty">{data ? 'No race on the calendar yet.' : 'The weekend data is on its way. Try again in a minute.'}</p>
      </div>
    )
  }

  return (
    <div className="weekend-page">
      <Top page={page} />
      <Clock page={page} snapshot={data} />
    </div>
  )
}
