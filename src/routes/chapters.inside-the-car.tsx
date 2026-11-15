import { createFileRoute } from '@tanstack/react-router'

import { Car } from '#/chapter/Car.tsx'
import carCss from '#/styles/car.css?url'
import chapterCss from '#/styles/chapter.css?url'

export const Route = createFileRoute('/chapters/inside-the-car')({
  head: () => ({
    meta: [
      { title: 'Inside the car · Lights Out' },
      { name: 'description', content: 'The eight parts of a 2026 Formula 1 car, taken apart one at a time, with wings that move and the fastest speed trap reading of the season.' },
    ],
    links: [
      { rel: 'stylesheet', href: chapterCss },
      { rel: 'stylesheet', href: carCss },
    ],
  }),
  component: Car,
})
