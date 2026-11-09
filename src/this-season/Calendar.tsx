import { useSecond } from '#/motion/client.ts'
import { calendarTiles } from '#/season/page-model.ts'
import type { SeasonSnapshot } from '#/season/snapshot-schema.ts'

export function Calendar({ snapshot }: { snapshot: SeasonSnapshot }) {
  const now = useSecond()
  const model = calendarTiles(snapshot, now)

  if (!model) return null

  return (
    <section className="calendar">
      <h2 className="display">The calendar</h2>
    </section>
  )
}
