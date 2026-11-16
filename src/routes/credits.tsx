import { createFileRoute } from '@tanstack/react-router'

import { Credits } from '#/credits/Credits.tsx'
import chapterCss from '#/styles/chapter.css?url'
import creditsCss from '#/styles/credits.css?url'

export const Route = createFileRoute('/credits')({
  head: () => ({
    meta: [{ title: 'Credits · Lights Out' }, { name: 'description', content: 'Every photographer, typeface and data source behind Lights Out, with a link to each original.' }],
    links: [
      { rel: 'stylesheet', href: chapterCss },
      { rel: 'stylesheet', href: creditsCss },
    ],
  }),
  component: Credits,
})
