import { createFileRoute } from '@tanstack/react-router'

import weekendCss from '#/styles/weekend.css?url'
import { Weekend } from '#/weekend/Weekend.tsx'

export const Route = createFileRoute('/weekend')({
  head: () => ({
    meta: [{ title: 'Race weekend · Lights Out' }, { name: 'description', content: 'The next Formula 1 weekend: a countdown to the next session, the circuit and the latest result, in your time.' }],
    links: [{ rel: 'stylesheet', href: weekendCss }],
  }),
  component: Weekend,
})
