import { createFileRoute } from '@tanstack/react-router'

import { PowerUnit } from '#/chapter/PowerUnit.tsx'
import chapterCss from '#/styles/chapter.css?url'
import engineCss from '#/styles/engine.css?url'

export const Route = createFileRoute('/chapters/power-unit')({
  head: () => ({
    meta: [
      { title: 'The power unit · Lights Out' },
      { name: 'description', content: 'The five parts of a 2026 Formula 1 power unit, why the MGU-H is gone, and a real pole lap where you can watch the electric push run out.' },
    ],
    links: [
      { rel: 'stylesheet', href: chapterCss },
      { rel: 'stylesheet', href: engineCss },
    ],
  }),
  component: PowerUnit,
})
