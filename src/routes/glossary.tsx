import { createFileRoute } from '@tanstack/react-router'

import { Glossary } from '#/glossary/Glossary.tsx'
import chapterCss from '#/styles/chapter.css?url'
import glossaryCss from '#/styles/glossary.css?url'

export const Route = createFileRoute('/glossary')({
  head: () => ({
    meta: [{ title: 'Glossary · Lights Out' }, { name: 'description', content: 'Every Formula 1 word used on Lights Out, explained in one or two plain lines.' }],
    links: [
      { rel: 'stylesheet', href: chapterCss },
      { rel: 'stylesheet', href: glossaryCss },
    ],
  }),
  component: Glossary,
})
