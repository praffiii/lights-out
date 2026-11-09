import { driverRows } from '#/season/page-model.ts'
import type { SeasonSnapshot } from '#/season/snapshot-schema.ts'

export function Drivers({ snapshot }: { snapshot: SeasonSnapshot }) {
  const model = driverRows(snapshot)

  if (!model) return null

  return (
    <section className="drivers">
      <h2 className="display">Drivers</h2>
    </section>
  )
}
