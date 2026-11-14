import type { ReactNode } from 'react'

import { count, type Quote, races, type Wall } from '#/flags/wall.ts'
import { type Photo, PHOTOS } from '#/home/content.ts'
import { opposite, useTheme } from '#/shell/theme.ts'

import { Term } from './Term.tsx'

type Flag = 'green' | 'yellow' | 'double' | 'blue' | 'red' | 'chequered'

type Poster = {
  flag: Flag
  name: string
  order: ReadonlyArray<string>
  line: ReactNode
  count: (wall: Wall) => number
  unit: (wall: Wall) => string
  quote?: keyof Wall['quotes']
  photo?: { photo: Photo; n: string; alt: string }
}

const RAIL: ReadonlyArray<Flag> = ['green', 'yellow', 'double', 'blue', 'red', 'chequered']

const POSTERS: ReadonlyArray<Poster> = [
  { flag: 'green', name: 'Green flag', order: ['Go.'], line: 'The danger is behind you. Race on.', count: (w) => w.clear, unit: (w) => `all-clears in ${w.season} races`, quote: 'clear' },
  {
    flag: 'yellow',
    name: 'Yellow flag',
    order: ['Slow down.'],
    line: (
      <>
        <Term k="yellowFlag">Danger beside the track</Term>. No overtaking.
      </>
    ),
    count: (w) => w.yellow,
    unit: (w) => `yellows in ${w.season} races`,
    quote: 'yellow',
  },
  {
    flag: 'double',
    name: 'Double yellow · two flags',
    order: ['Be ready', 'to stop.'],
    line: 'The track is blocked, or marshals are on it.',
    count: (w) => w.doubleYellow,
    unit: (w) => `double yellows in ${w.season} races`,
    photo: { photo: PHOTOS.ch04Sweep, n: '02', alt: 'Two marshals sweep debris off the kerb at Turn 11 in Melbourne.' },
  },
  {
    flag: 'blue',
    name: 'Blue flag',
    order: ['Let them by.'],
    line: (
      <>
        A faster car is about to <Term k="lappedCar">lap you</Term>. Move over.
      </>
    ),
    count: (w) => w.blue,
    unit: (w) => `blue flags in ${w.season} races`,
    quote: 'blue',
  },
  {
    flag: 'red',
    name: 'Red flag',
    order: ['Stop.'],
    line: 'Session stopped. Every car to the pit lane, slowly.',
    count: (w) => w.red,
    unit: (w) => `times in a ${w.season} Grand Prix`,
    photo: { photo: PHOTOS.ch04Fire, n: '03', alt: 'A firefighter sprays a grass fire behind the fence at Suzuka.' },
  },
  { flag: 'chequered', name: 'Chequered flag', order: ['It’s over.'], line: 'Race finished. One slow lap, then parc fermé.', count: (w) => w.races, unit: (w) => `${w.races === 1 ? 'race' : 'races'} finished in ${w.season}`, quote: 'chequered' },
]

const pad = (n: number) => String(n).padStart(2, '0')

function Chip({ quote }: { quote: Quote | undefined }) {
  return (
    <div className="mono chip">
      {quote ? (
        <>
          <p className="where">{`Race control · ${quote.circuit} · lap ${quote.lap}`}</p>
          <p className="msg">{quote.message}</p>
        </>
      ) : null}
    </div>
  )
}

function Count({ poster, wall }: { poster: Poster; wall: Wall | undefined }) {
  return (
    <p className="count">
      {wall ? (
        <>
          <span className="display num">{count(poster.count(wall))}</span>
          <span className="mono unit">{poster.unit(wall)}</span>
        </>
      ) : null}
    </p>
  )
}

function Card({ poster, i, wall }: { poster: Poster; i: number; wall: Wall | undefined }) {
  const { photo } = poster

  return (
    <li className="poster" data-flag={poster.flag}>
      <div className="field">
        <p className="mono index">{`${pad(i + 1)} / ${pad(POSTERS.length)} · ${poster.name}`}</p>
        {poster.flag === 'red' ? <p className="mono sub">{wall ? `Race control · ${count(wall.redSessions)} practice, qualifying and sprint sessions` : null}</p> : null}
        {photo ? null : (
          <p className="rail" aria-hidden>
            {RAIL.map((flag) => (
              <i key={flag} data-flag={flag} data-on={flag === poster.flag || undefined} />
            ))}
          </p>
        )}
        <h3 className="display order">
          {poster.order.map((part) => (
            <span key={part} className="hl">
              {part}
            </span>
          ))}
        </h3>
        <p className="line">{poster.line}</p>
        <Count poster={poster} wall={wall} />
        {poster.quote ? <Chip quote={wall?.quotes[poster.quote]} /> : null}
      </div>
      {photo ? (
        <figure className="photo">
          <div className="shot">
            <img src={photo.photo.src} alt={photo.alt} loading="lazy" />
          </div>
          <figcaption className="caption">
            <p className="mono">{`${photo.n} · ${photo.photo.place}`}</p>
            <p className="mono credit">{`${photo.photo.credit}, via Wikimedia Commons`}</p>
          </figcaption>
        </figure>
      ) : null}
      {poster.flag === 'chequered' ? <i className="checks" aria-hidden /> : null}
    </li>
  )
}

export function FlagWall({ wall }: { wall: Wall | undefined }) {
  const { theme } = useTheme()
  const season = wall ? `${wall.season} ` : ''

  return (
    <section className="wall" data-theme={theme ? opposite(theme) : undefined} aria-labelledby="wall">
      <div className="head">
        <p className="mono label">{wall ? `The flag wall · ${wall.season} season` : 'The flag wall'}</p>
        <p className="mono tag">{wall ? `OpenF1 race control · ${races(wall.races)}` : null}</p>
        <h2 id="wall" className="display headline">
          <span className="hl">Six colours.</span>
          <span className="hl">Six orders.</span>
        </h2>
        <p className="body">{`Each flag asks one thing of a driver. Scroll, and they come in the order a race meets them. The counts are every time race control showed one in a ${season}Grand Prix.`}</p>
      </div>
      <ol className="posters">
        {POSTERS.map((poster, i) => (
          <Card key={poster.flag} poster={poster} i={i} wall={wall} />
        ))}
      </ol>
      <p className="mono muted foot">{wall ? `Counts · OpenF1 race control (unofficial) · ${wall.first} to ${wall.latest} · updated after every race` : null}</p>
    </section>
  )
}
