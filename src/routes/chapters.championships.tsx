import { createFileRoute } from '@tanstack/react-router'

import { Championships } from '#/chapter/Championships.tsx'
import championshipsCss from '#/styles/championships.css?url'
import chapterCss from '#/styles/chapter.css?url'

export const Route = createFileRoute('/chapters/championships')({
  head: () => ({
    meta: [
      { title: 'The two championships · Lights Out' },
      { name: 'description', content: "Why every point counts twice, how the drivers' and teams' titles are won at different times, and what a team may spend to win one." },
    ],
    links: [
      { rel: 'stylesheet', href: chapterCss },
      { rel: 'stylesheet', href: championshipsCss },
    ],
  }),
  component: Championships,
})
