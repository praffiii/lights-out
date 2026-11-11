import { createFileRoute } from '@tanstack/react-router'

import { RaceWeekend } from '#/chapter/RaceWeekend.tsx'
import chapterCss from '#/styles/chapter.css?url'
import stageCss from '#/styles/stage.css?url'

export const Route = createFileRoute('/chapters/race-weekend')({
  head: () => ({
    meta: [
      { title: 'A race weekend · Lights Out' },
      { name: 'description', content: 'How a Formula 1 weekend works: practice on Friday, qualifying on Saturday, the race and its points on Sunday.' },
    ],
    links: [
      { rel: 'stylesheet', href: stageCss },
      { rel: 'stylesheet', href: chapterCss },
    ],
  }),
  component: RaceWeekend,
})
