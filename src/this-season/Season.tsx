import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { seasonQueryOptions, useSeason } from '#/season/use-season.ts'
import { waitFor } from '#/shell/Loader.tsx'

import { Calendar } from './Calendar.tsx'
import { Constructors } from './Constructors.tsx'
import { Drivers } from './Drivers.tsx'
import { ThisWeekend } from './ThisWeekend.tsx'
import { TitleFight } from './TitleFight.tsx'
import { WhoLed } from './WhoLed.tsx'

export function Season() {
  const client = useQueryClient()
  const { data } = useSeason()

  useEffect(() => {
    waitFor(client.fetchQuery(seasonQueryOptions))
  }, [client])

  if (!data) {
    return (
      <div className="season">
        <p className="season-empty">The season data is on its way. Try again in a minute.</p>
      </div>
    )
  }

  return (
    <div className="season">
      <TitleFight snapshot={data} />
      <Calendar snapshot={data} />
      <Drivers snapshot={data} />
      <Constructors snapshot={data} />
      <WhoLed snapshot={data} />
      <ThisWeekend snapshot={data} />
    </div>
  )
}
