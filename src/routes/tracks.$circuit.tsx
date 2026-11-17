import { createFileRoute } from '@tanstack/react-router'

import chapterCss from '#/styles/chapter.css?url'
import stageCss from '#/styles/stage.css?url'
import tracksCss from '#/styles/tracks.css?url'
import { TrackPage, trackFor } from '#/tracks/TrackPage.tsx'

export const Route = createFileRoute('/tracks/$circuit')({
  head: ({ params }) => {
    const info = trackFor(params.circuit)?.info

    return {
      meta: [
        { title: info ? `${info.name} · The tracks · Lights Out` : 'The tracks · Lights Out' },
        { name: 'description', content: info ? `${info.name}: the lap in 3D, its corners, where drivers brake and its history.` : 'Every Formula 1 circuit of the season, drawn to one scale.' },
      ],
      links: [
        { rel: 'stylesheet', href: chapterCss },
        { rel: 'stylesheet', href: stageCss },
        { rel: 'stylesheet', href: tracksCss },
      ],
    }
  },
  component: Track,
})

function Track() {
  const { circuit } = Route.useParams()

  return <TrackPage circuit={circuit} />
}
