import { createFileRoute } from '@tanstack/react-router'

import { Flags } from '#/chapter/Flags.tsx'
import chapterCss from '#/styles/chapter.css?url'
import flagsCss from '#/styles/flags.css?url'

export const Route = createFileRoute('/chapters/flags')({
  head: () => ({
    meta: [
      { title: 'Flags and what they mean · Lights Out' },
      { name: 'description', content: "What every Formula 1 flag asks of a driver, from green to chequered, with live counts from this season's Grands Prix." },
    ],
    links: [
      { rel: 'stylesheet', href: chapterCss },
      { rel: 'stylesheet', href: flagsCss },
    ],
  }),
  component: Flags,
})
