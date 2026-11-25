import { createFileRoute } from '@tanstack/react-router'

import { Drs } from '#/chapter/Drs.tsx'
import chapterCss from '#/styles/chapter.css?url'
import drsCss from '#/styles/drs.css?url'
import overtakingCss from '#/styles/overtaking.css?url'
import stageCss from '#/styles/stage.css?url'

export const Route = createFileRoute('/chapters/drs')({
  head: () => ({
    meta: [
      { title: 'DRS, 2011 to 2025 · Lights Out' },
      { name: 'description', content: 'What DRS was, when the flap could open, what it was worth on four real straights, and what replaced it in 2026.' },
    ],
    links: [
      { rel: 'stylesheet', href: stageCss },
      { rel: 'stylesheet', href: chapterCss },
      { rel: 'stylesheet', href: overtakingCss },
      { rel: 'stylesheet', href: drsCss },
    ],
  }),
  component: Drs,
})
