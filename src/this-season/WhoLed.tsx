import { useSecond } from '#/motion/client.ts'
import { whoLed } from '#/season/page-model.ts'
import type { SeasonSnapshot } from '#/season/snapshot-schema.ts'

export function WhoLed({ snapshot }: { snapshot: SeasonSnapshot }) {
  const now = useSecond()
  const model = whoLed(snapshot, now)

  if (!model) return null

  return (
    <section className="who-led">
      <h2 className="display">Who led</h2>
    </section>
  )
}
