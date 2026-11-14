import { useRef } from 'react'

import { PHOTOS } from '#/home/content.ts'
import { block, gsap, ONCE, onEnter, REDUCED, reveal, sweep, useGSAP } from '#/motion/motion.ts'
import { Go, Soon } from '#/shell/Go.tsx'

import { Next } from './Next.tsx'
import { Term } from './Term.tsx'
import { Words } from './Words.tsx'
import { TYRES_WORDS } from './words.ts'

const COMPOUNDS = [
  { name: 'Soft', line: 'Fastest · wears first', tag: 'Dry', colour: '#ff1e1e' },
  { name: 'Medium', line: 'The all-rounder', tag: 'Dry', colour: '#f5c400' },
  { name: 'Hard', line: 'Slowest · lasts longest', tag: 'Dry', colour: '#f4f3ef' },
  { name: 'Intermediate', line: 'Damp track', tag: 'Wet', colour: '#2bd45e' },
  { name: 'Wet', line: 'Standing water', tag: 'Wet', colour: '#1e6bff' },
] as const

const STATS = [
  { value: '19.5 s', label: 'Racing', on: false },
  { value: '12.7 s', label: 'Safety car', on: true },
  { value: '13.5 s', label: 'Virtual SC', on: false },
] as const

const all = (scope: HTMLElement, selector: string) => [...scope.querySelectorAll<HTMLElement>(selector)]

const rise = (el: HTMLElement, y: number, start: string) => gsap.from(el, { y, opacity: 0, duration: 0.8, ease: 'brake', scrollTrigger: { trigger: el, start, ...ONCE } })

function hero(scope: HTMLElement) {
  for (const [i, el] of all(scope, '.opening .hl, .opening .label').entries()) sweep(el, { scroll: false, delay: 0.1 + i * 0.1 })
}

function motion(scope: HTMLElement) {
  for (const el of all(scope, '.shot')) reveal(el)

  for (const el of all(scope, '.tyres .headline .hl, .cost .headline .hl, .cheap .headline, .words h2')) sweep(el)

  for (const el of all(scope, '.cost .big, .cheap .stats li')) block(el)

  for (const el of all(scope, '.ways .payoff')) block(el, { delay: 0.5 })

  if (REDUCED) return

  for (const el of all(scope, '.opening .intro, .tyres .body, .cost .body, .cost .source, .cheap .body')) rise(el, 24, 'top 90%')

  for (const el of all(scope, '.compounds li, .ways .rows li:not(.payoff)')) rise(el, 24, 'top 92%')
}

export function Tyres() {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    (_, safe) => {
      const scope = root.current

      if (!scope || !safe) return

      motion(scope)

      return onEnter(safe(() => hero(scope)))
    },
    { scope: root },
  )

  const pit = PHOTOS.ch03
  const medium = PHOTOS.ch03Medium
  const sc = PHOTOS.ch03Sc

  return (
    <div className="chapter-page tyres-page" ref={root}>
      <section className="opening" aria-labelledby="h1">
        <div className="top">
          <p className="mono muted label">How F1 works · Chapter 03 · 7 min</p>
          <nav className="mono nav" aria-label="Chapters">
            <Go to="/chapters/overtaking">← 02 How overtaking works</Go>
            <span aria-hidden> · </span>
            <Soon>04 Flags and what they mean</Soon>
          </nav>
        </div>
        <h1 id="h1" className="display">
          <span className="hl">A race is won</span>
          <span className="hl">in the pit lane.</span>
        </h1>
        <p className="intro">Tyres wear out, and a stop costs about 20 seconds. In Miami this year, the race was decided by who stopped first. Here is that lap.</p>
      </section>
      <figure className="photo-band">
        <div className="shot">
          <img src={pit.src} alt="Verstappen's Red Bull leaves the pit lane at Suzuka." />
        </div>
        <figcaption className="caption">
          <p className="mono">{`01 · ${pit.place}`}</p>
          <p className="what">Verstappen rejoins the track from the pit lane.</p>
        </figcaption>
        <p className="mono muted credit">{pit.credit}</p>
      </figure>
      <section className="tyres" aria-labelledby="tyres">
        <p className="mono label">The tyres</p>
        <h2 id="tyres" className="display headline">
          <span className="hl">Three for dry,</span>
          <span className="hl">two for rain.</span>
        </h2>
        <figure className="photo">
          <div className="shot">
            <img src={medium.src} alt="A 2026 Pirelli medium slick with its yellow sidewall band." loading="lazy" />
          </div>
          <figcaption className="caption">
            <p className="mono">{`02 · ${medium.place}`}</p>
            <p className="what">The yellow band says medium.</p>
          </figcaption>
          <p className="mono muted credit">{`${medium.credit}, via Wikimedia Commons`}</p>
        </figure>
        <div className="side">
          <p className="body">
            Pirelli makes five dry <Term k="compound">compounds</Term>, C1 to C5, and brings three to each race. The colour on the sidewall tells you which. Grooved tyres clear the water when it rains.
          </p>
          <ul className="compounds">
            {COMPOUNDS.map((c) => (
              <li key={c.name} data-tag={c.tag}>
                <i className="ring" style={{ background: c.colour }} aria-hidden />
                <p className="display name">{c.name}</p>
                <p className="mono muted line">{c.line}</p>
                <p className="mono tag">{c.tag}</p>
              </li>
            ))}
          </ul>
          <p className="mono facts">2026 · 25 mm narrower front · 30 mm rear · C6 dropped</p>
        </div>
      </section>
      <section className="cost" aria-labelledby="cost">
        <p className="mono muted label">What a stop costs · Miami</p>
        <p className="display big">19.5 s</p>
        <div className="side">
          <h2 id="cost" className="display headline">
            <span className="hl">The price of</span>
            <span className="hl">new tyres.</span>
          </h2>
          <p className="body">
            Slow down for the pit lane, stand still for about two seconds, rejoin. Against staying on track, that <Term k="pitLoss">costs</Term> Miami about 19.5 seconds. New tyres have to win it back.
          </p>
          <p className="mono muted source">Pit loss · MultiViewer estimate for Miami</p>
        </div>
      </section>
      <section className="ways" aria-labelledby="ways">
        <h2 id="ways" className="mono muted label">
          Two ways to use a stop
        </h2>
        <ol className="rows">
          <li>
            <p className="mono where">Stop first</p>
            <p className="display what">Undercut.</p>
            <p className="text">New tyres are faster than worn ones. Stop a lap early and that pace carries you past.</p>
            <p className="mono verdict">Tyres wear fast</p>
          </li>
          <li>
            <p className="mono where">Stay out</p>
            <p className="display what">Overcut.</p>
            <p className="text">Run longer in clean air while the other car brings its new tyres up to temperature.</p>
            <p className="mono verdict">Tyres slow to warm</p>
          </li>
          <li className="payoff">
            <p className="mono where">So</p>
            <p className="what">Antonelli got ahead of Norris without passing him on track.</p>
            <p className="mono verdict">In the pit lane</p>
          </li>
        </ol>
      </section>
      <section className="cheap" aria-labelledby="cheap">
        <p className="mono muted label">The cheap stop</p>
        <figure className="photo">
          <div className="shot">
            <img src={sc.src} alt="The red Mercedes-AMG safety car on track at Suzuka." loading="lazy" />
          </div>
          <figcaption className="caption">
            <p className="mono">{`03 · ${sc.place}`}</p>
            <p className="mono credit">{`${sc.credit}, via Wikimedia Commons`}</p>
          </figcaption>
        </figure>
        <div className="side">
          <p className="mono muted label">Pit loss · Miami</p>
          <ul className="stats">
            {STATS.map((s) => (
              <li key={s.label} data-on={s.on || undefined}>
                <p className="display num">{s.value}</p>
                <p className="mono what">{s.label}</p>
              </li>
            ))}
          </ul>
          <h2 id="cheap" className="display headline">
            A third cheaper.
          </h2>
          <p className="body">
            Under a <Term k="safetyCar">safety car</Term> the whole field slows, so a stop loses less time. Watch the pit lane fill the moment it comes out.
          </p>
        </div>
      </section>
      <Words keys={TYRES_WORDS} />
      <Next n="04" min={4} title="Flags and what they mean." line="What each colour asks of a driver" photo={PHOTOS.ch04} to={null} />
    </div>
  )
}
