import { createFileRoute } from '@tanstack/react-router'

import { Tyres } from '#/chapter/Tyres.tsx'
import chapterCss from '#/styles/chapter.css?url'
import overtakingCss from '#/styles/overtaking.css?url'
import stageCss from '#/styles/stage.css?url'
import tyresCss from '#/styles/tyres.css?url'

export const Route = createFileRoute('/chapters/tyres-and-strategy')({
  head: () => ({
    meta: [
      { title: 'Tyres and strategy · Lights Out' },
      { name: 'description', content: 'How Formula 1 tyres and pit stops decide races: five compounds, what a stop costs, and the real 2026 Miami undercut, replayed from the timing data.' },
    ],
    links: [
      { rel: 'stylesheet', href: stageCss },
      { rel: 'stylesheet', href: chapterCss },
      { rel: 'stylesheet', href: overtakingCss },
      { rel: 'stylesheet', href: tyresCss },
    ],
  }),
  component: Tyres,
})
