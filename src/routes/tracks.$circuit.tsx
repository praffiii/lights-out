import { createFileRoute } from '@tanstack/react-router'

import chapterCss from '#/styles/chapter.css?url'
import stageCss from '#/styles/stage.css?url'
import tracksCss from '#/styles/tracks.css?url'
import { TrackPage } from '#/tracks/TrackPage.tsx'

export const Route = createFileRoute('/tracks/$circuit')({
  head: () => ({
    meta: [{ title: 'The tracks · Lights Out' }],
    links: [
      { rel: 'stylesheet', href: chapterCss },
      { rel: 'stylesheet', href: stageCss },
      { rel: 'stylesheet', href: tracksCss },
    ],
  }),
  component: Track,
})

function Track() {
  const { circuit } = Route.useParams()

  return <TrackPage circuit={circuit} />
}
