import { createFileRoute } from '@tanstack/react-router'

import chapterCss from '#/styles/chapter.css?url'
import tracksCss from '#/styles/tracks.css?url'
import { TracksIndex } from '#/tracks/Index.tsx'

export const Route = createFileRoute('/tracks/')({
  head: () => ({
    meta: [
      { title: 'The tracks · Lights Out' },
      {
        name: 'description',
        content: 'Every 2026 Formula 1 circuit side by side, drawn to one scale, with this weekend’s track lit.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: chapterCss },
      { rel: 'stylesheet', href: tracksCss },
    ],
  }),
  component: TracksIndex,
})
