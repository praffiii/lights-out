import { createFileRoute } from '@tanstack/react-router'

import { Overtaking } from '#/chapter/Overtaking.tsx'
import chapterCss from '#/styles/chapter.css?url'
import overtakingCss from '#/styles/overtaking.css?url'
import stageCss from '#/styles/stage.css?url'

export const Route = createFileRoute('/chapters/overtaking')({
  head: () => ({
    meta: [
      { title: 'How overtaking works · Lights Out' },
      { name: 'description', content: 'How a Formula 1 pass is built a straight early: within a second, Overtake Mode, the tow and a later brake, replayed from a real 2026 pass.' },
    ],
    links: [
      { rel: 'stylesheet', href: stageCss },
      { rel: 'stylesheet', href: chapterCss },
      { rel: 'stylesheet', href: overtakingCss },
    ],
  }),
  component: Overtaking,
})
