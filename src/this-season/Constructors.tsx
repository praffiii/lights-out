import { constructorRows } from '#/season/page-model.ts'
import type { SeasonSnapshot } from '#/season/snapshot-schema.ts'

export function Constructors({ snapshot }: { snapshot: SeasonSnapshot }) {
  const model = constructorRows(snapshot)

  if (!model) return null

  return (
    <section className="constructors">
      <h2 className="display">Constructors</h2>
    </section>
  )
}
