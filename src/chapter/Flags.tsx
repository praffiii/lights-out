import { useRef } from 'react'

import { count, races, wallOf } from '#/flags/wall.ts'
import { PHOTOS } from '#/home/content.ts'
import { block, gsap, ONCE, onEnter, REDUCED, reveal, sweep, useGSAP } from '#/motion/motion.ts'
import { useSeason } from '#/season/use-season.ts'
import { Go, Soon } from '#/shell/Go.tsx'

import { FlagWall } from './FlagWall.tsx'
import { Next } from './Next.tsx'
import { Term } from './Term.tsx'
import { Words } from './Words.tsx'
import { FLAGS_WORDS } from './words.ts'

const TILES = [
  { flag: 'bw', name: 'Black and white', line: "Warning. One more and it's a penalty." },
  { flag: 'disc', name: 'Black, orange disc', tag: 'Mechanical', line: 'Something is broken. Pit now.' },
  { flag: 'black', name: 'Black', tag: 'Rare', line: 'Disqualified. Your race is over.' },
  { flag: 'stripes', name: 'Red and yellow', tag: 'Surface', line: 'Slippery: oil, water or gravel ahead.' },
  { flag: 'white', name: 'White', tag: 'Slow car', line: 'A slow car or truck is on track.' },
] as const

const STRIKES = ['Lap time deleted', 'Lap time deleted', 'Black-and-white flag', 'Five-second penalty'] as const

const all = (scope: HTMLElement, selector: string) => [...scope.querySelectorAll<HTMLElement>(selector)]

const rise = (el: HTMLElement, y: number, start: string) => gsap.from(el, { y, opacity: 0, duration: 0.8, ease: 'brake', scrollTrigger: { trigger: el, start, ...ONCE } })

function hero(scope: HTMLElement) {
  for (const [i, el] of all(scope, '.opening .hl, .opening .label').entries()) sweep(el, { scroll: false, delay: 0.1 + i * 0.1 })
}

function motion(scope: HTMLElement) {
  for (const el of all(scope, '.shot')) reveal(el)

  for (const el of all(scope, '.wall .headline .hl, .poster .order .hl, .rest .headline .hl, .limits .headline .hl, .boards .headline .hl, .words h2')) sweep(el)

  for (const el of all(scope, '.strikes li')) block(el)

  if (REDUCED) return

  for (const el of all(scope, '.opening .intro, .wall .head .body, .poster .line, .rest .body, .limits .body, .boards .body')) rise(el, 24, 'top 90%')

  for (const el of all(scope, '.tiles li, .boards .stats li')) rise(el, 24, 'top 92%')
}

export function Flags() {
  const root = useRef<HTMLDivElement>(null)
  const tally = useSeason().data?.flags
  const wall = tally ? wallOf(tally) : undefined

  useGSAP(
    (_, safe) => {
      const scope = root.current

      if (!scope || !safe) return

      motion(scope)

      return onEnter(safe(() => hero(scope)))
    },
    { scope: root },
  )

  const marshal = PHOTOS.ch04Marshal
  const board = PHOTOS.ch04Board

  const boards = wall
    ? [
        { num: wall.safetyCars, what: 'Safety cars', races: wall.scRaces },
        { num: wall.vscs, what: 'Virtual safety cars', races: wall.vscRaces },
      ]
    : [
        { num: null, what: 'Safety cars', races: null },
        { num: null, what: 'Virtual safety cars', races: null },
      ]

  return (
    <div className="chapter-page flags-page" ref={root}>
      <section className="opening" aria-labelledby="h1">
        <div className="top">
          <p className="mono muted label">How F1 works · Chapter 04 · 4 min</p>
          <nav className="mono nav" aria-label="Chapters">
            <Go to="/chapters/tyres-and-strategy">← 03 Tyres and strategy</Go>
            <span aria-hidden> · </span>
            <Soon>05 Inside the car</Soon>
          </nav>
        </div>
        <h1 id="h1" className="display">
          <span className="hl">A flag is</span>
          <span className="hl">an order.</span>
        </h1>
        <p className="intro">
          At 300 km/h a driver can&apos;t hear the <Term k="marshal">marshals</Term>. So they show a colour, and every colour has one job. Here is what each one asks.
        </p>
      </section>
      <figure className="photo-band">
        <div className="shot">
          <img src={marshal.src} alt="A marshal in an orange rain suit at Zandvoort, yellow and green flags tucked into his vest." />
        </div>
        <figcaption className="caption">
          <p className="mono">{`01 · ${marshal.place}`}</p>
          <p className="what">A marshal waits out the rain, yellow and green flags in his vest.</p>
        </figcaption>
        <p className="mono muted credit">{`${marshal.credit}, via Wikimedia Commons`}</p>
      </figure>
      <FlagWall wall={wall} />
      <section className="rest" aria-labelledby="rest">
        <p className="mono label">Five more · seen less</p>
        <h2 id="rest" className="display headline">
          <span className="hl">The rest</span>
          <span className="hl">of the box.</span>
        </h2>
        <p className="body">Marshals have ten flags, and most races need only a few. These five come out when one car, or one stretch of track, has a problem.</p>
        <ul className="tiles">
          {TILES.map((t) => (
            <li key={t.flag}>
              <i className="flag" data-flag={t.flag} aria-hidden />
              <p className="mono tag">{'tag' in t ? t.tag : wall ? `${count(wall.blackWhite)} in ${wall.season}` : null}</p>
              <p className="name">{t.name}</p>
              <p className="what">{t.line}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="limits" aria-labelledby="limits">
        <p className="mono label">Track limits</p>
        <h2 id="limits" className="display headline">
          <span className="hl">Four wheels off,</span>
          <span className="hl">three strikes.</span>
        </h2>
        <p className="body">
          Run all four wheels past the <Term k="trackLimits">white line</Term> and the lap does not count. Keep doing it and the <Term k="blackWhiteFlag">black-and-white flag</Term> comes out, then a penalty.
        </p>
        <ol className="strikes">
          {STRIKES.map((what, i) => (
            <li key={`${what}-${i}`} data-strike={i + 1} data-payoff={i === 3 || undefined}>
              <p className="display n">{i + 1}</p>
              <p className="mono what">{what}</p>
              {i === 2 ? <i className="flag" data-flag="bw" aria-hidden /> : null}
            </li>
          ))}
        </ol>
        <p className="mono stat">{wall ? `${count(wall.trackLimits)} of ${count(wall.blackWhite)} black-and-white flags in ${wall.season} races were for track limits · OpenF1` : null}</p>
      </section>
      <section className="boards" aria-labelledby="boards">
        <div className="side">
          <p className="mono label">When a flag isn&apos;t enough</p>
          <h2 id="boards" className="display headline">
            <span className="hl">The boards</span>
            <span className="hl">take over.</span>
          </h2>
          <p className="body">
            For a crash that needs a crane, race control slows the whole field. Light panels round the track show SC for the <Term k="safetyCar">safety car</Term> or VSC for a <Term k="vsc">virtual one</Term>, and every driver holds position.
          </p>
          <ul className="stats">
            {boards.map((b) => (
              <li key={b.what}>
                <p className="display num">{b.num === null ? null : count(b.num)}</p>
                <p className="mono what">{b.what}</p>
                <p className="mono muted races">{wall && b.races !== null ? `${races(b.races)} in ${wall.season}` : null}</p>
              </li>
            ))}
          </ul>
          <Go className="more" to="/chapters/tyres-and-strategy">
            Why a stop is cheaper then → Chapter 03
          </Go>
        </div>
        <figure className="photo">
          <div className="shot">
            <img src={board.src} alt="A marshal holds up an SC board while another waves a yellow flag at Indianapolis." loading="lazy" />
          </div>
          <figcaption className="caption">
            <p className="mono">
              <span className="full">{`04 · ${board.place}`}</span>
              <span className="short">04 · SC board · Indianapolis, 2005</span>
            </p>
            <p className="mono credit">{`${board.credit}, via Wikimedia Commons`}</p>
          </figcaption>
        </figure>
      </section>
      <Words keys={FLAGS_WORDS} />
      <Next n="05" min={8} title="Inside the car." line="What every part of a 2026 car does" photo={PHOTOS.ch05} to={null} />
    </div>
  )
}
