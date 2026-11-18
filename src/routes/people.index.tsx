import { createFileRoute } from '@tanstack/react-router'

import { PeopleIndex } from '#/people/Index.tsx'
import chapterCss from '#/styles/chapter.css?url'
import peopleCss from '#/styles/people.css?url'
import tracksCss from '#/styles/tracks.css?url'

export const Route = createFileRoute('/people/')({
  head: () => ({
    meta: [
      { title: 'The people · Lights Out' },
      { name: 'description', content: 'Every driver on the 2026 Formula 1 grid as a timing tower, the youngest champion in F1 history, and the legends they chase.' },
    ],
    links: [
      { rel: 'stylesheet', href: chapterCss },
      { rel: 'stylesheet', href: tracksCss },
      { rel: 'stylesheet', href: peopleCss },
    ],
  }),
  component: PeopleIndex,
})
