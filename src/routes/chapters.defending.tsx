import { createFileRoute } from '@tanstack/react-router'

import { Defending } from '#/chapter/Defending.tsx'
import chapterCss from '#/styles/chapter.css?url'
import defendingCss from '#/styles/defending.css?url'

export const Route = createFileRoute('/chapters/defending')({
  head: () => ({
    meta: [
      { title: 'Defending · Lights Out' },
      { name: 'description', content: 'The one-move rule, a real fight for the lead at Melbourne in 2026, the switchback and the divebomb, and what breaking the rules costs.' },
    ],
    links: [
      { rel: 'stylesheet', href: chapterCss },
      { rel: 'stylesheet', href: defendingCss },
    ],
  }),
  component: Defending,
})
