import { createFileRoute } from '@tanstack/react-router'

import { CARS } from '#/home/cars.ts'
import { DriverPage } from '#/people/DriverPage.tsx'
import { personFor } from '#/people/people.ts'
import chapterCss from '#/styles/chapter.css?url'
import peopleCss from '#/styles/people.css?url'
import tracksCss from '#/styles/tracks.css?url'

export const Route = createFileRoute('/people/$driver')({
  head: ({ params }) => {
    const code = personFor(params.driver)?.code
    const name = CARS.find((car) => car.code === code)?.driver

    return {
      meta: [
        { title: name ? `${name} · The people · Lights Out` : 'The people · Lights Out' },
        { name: 'description', content: name ? `${name}: the season so far, the career in numbers and every race of the year.` : 'Every driver on the Formula 1 grid.' },
      ],
      links: [
        { rel: 'stylesheet', href: chapterCss },
        { rel: 'stylesheet', href: tracksCss },
        { rel: 'stylesheet', href: peopleCss },
      ],
    }
  },
  component: Driver,
})

function Driver() {
  const { driver } = Route.useParams()

  return <DriverPage driverId={driver} />
}
