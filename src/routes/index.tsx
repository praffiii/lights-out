import { createFileRoute } from '@tanstack/react-router'

import { Home } from '#/home/Home.tsx'
import homeCss from '#/styles/home.css?url'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Lights Out · Formula 1, from lights out' },
      { name: 'description', content: 'A fan-made guide for anyone who just watched their first Formula 1 race and wants to know what happened.' },
    ],
    links: [{ rel: 'stylesheet', href: homeCss }],
  }),
  component: Home,
})
