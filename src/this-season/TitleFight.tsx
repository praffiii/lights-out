import { titleFight } from '#/season/page-model.ts'
import type { SeasonSnapshot } from '#/season/snapshot-schema.ts'

export function TitleFight({ snapshot }: { snapshot: SeasonSnapshot }) {
  const model = titleFight(snapshot)

  if (!model) return null

  return (
    <section className="title-fight">
      <h2 className="display">The title fight</h2>
    </section>
  )
}
