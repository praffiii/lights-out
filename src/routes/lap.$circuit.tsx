import { createFileRoute } from '@tanstack/react-router'

import { circuitFor } from '#/circuits/registry.ts'
import { LapPage } from '#/lap/LapPage.tsx'
import lapCss from '#/styles/lap.css?url'

export const Route = createFileRoute('/lap/$circuit')({
  head: ({ params }) => {
    const info = circuitFor(params.circuit)

    return {
      meta: [
        { title: info ? `${info.name} lap · Lights Out` : 'Lap explorer · Lights Out' },
        { name: 'description', content: info ? `Ride a lap of ${info.name} in 3D, corner by corner.` : 'Ride a Formula 1 lap in 3D, corner by corner.' },
      ],
      links: [{ rel: 'stylesheet', href: lapCss }],
    }
  },
  component: Lap,
})

function Lap() {
  const { circuit } = Route.useParams()

  return <LapPage circuit={circuit} />
}
