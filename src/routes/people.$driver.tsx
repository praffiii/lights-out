import { createFileRoute } from '@tanstack/react-router'

import { CARS } from '#/home/cars.ts'
import { DriverPage } from '#/people/DriverPage.tsx'
import { personFor } from '#/people/people.ts'
import { StoryPage } from '#/people/StoryPage.tsx'
import chapterCss from '#/styles/chapter.css?url'
import peopleCss from '#/styles/people.css?url'
import stageCss from '#/styles/stage.css?url'
import tracksCss from '#/styles/tracks.css?url'

const STORY = 'antonelli'

export const Route = createFileRoute('/people/$driver')({
  head: ({ params }) => {
    const code = personFor(params.driver)?.code
    const name = CARS.find((car) => car.code === code)?.driver
    const story = params.driver === STORY

    return {
      meta: [
        { title: name ? `${name} · The people · Lights Out` : 'The people · Lights Out' },
        {
          name: 'description',
          content: story
            ? 'Kimi Antonelli: the youngest champion in Formula 1 history, from Bologna to the 2026 title.'
            : name
              ? `${name}: the season so far, the career in numbers and every race of the year.`
              : 'Every driver on the Formula 1 grid.',
        },
      ],
      links: [{ rel: 'stylesheet', href: chapterCss }, { rel: 'stylesheet', href: tracksCss }, ...(story ? [{ rel: 'stylesheet', href: stageCss }] : []), { rel: 'stylesheet', href: peopleCss }],
    }
  },
  component: Driver,
})

function Driver() {
  const { driver } = Route.useParams()

  return driver === STORY ? <StoryPage /> : <DriverPage driverId={driver} />
}
