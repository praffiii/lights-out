import { useSecond } from '#/motion/client.ts'
import { weekend } from '#/season/page-model.ts'
import type { SeasonSnapshot } from '#/season/snapshot-schema.ts'

export function ThisWeekend({ snapshot }: { snapshot: SeasonSnapshot }) {
  const now = useSecond()
  const model = weekend(snapshot, now)

  if (!model) return null

  return (
    <section className="this-weekend">
      <h2 className="display">This weekend</h2>
    </section>
  )
}
