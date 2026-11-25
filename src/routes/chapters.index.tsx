import { createFileRoute } from '@tanstack/react-router'

import { Guide } from '#/guide/Guide.tsx'
import chapterCss from '#/styles/chapter.css?url'
import guideCss from '#/styles/guide.css?url'

export const Route = createFileRoute('/chapters/')({
  head: () => ({
    meta: [
      { title: 'How F1 works · Lights Out' },
      { name: 'description', content: 'Nine short chapters that explain Formula 1, and one real race to see them in.' },
    ],
    links: [
      { rel: 'stylesheet', href: chapterCss },
      { rel: 'stylesheet', href: guideCss },
    ],
  }),
  component: Guide,
})
