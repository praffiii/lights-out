import { createFileRoute } from '@tanstack/react-router'

import seasonCss from '#/styles/season.css?url'
import { Season } from '#/this-season/Season.tsx'

export const Route = createFileRoute('/season')({
  head: () => ({
    meta: [{ title: 'This season · Lights Out' }, { name: 'description', content: 'The Formula 1 calendar, the standings and the next session, in your time.' }],
    links: [{ rel: 'stylesheet', href: seasonCss }],
  }),
  component: Season,
})
