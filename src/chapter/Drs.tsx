import { type CSSProperties, type ReactNode, useRef } from 'react'

import { circuitFor } from '#/circuits/registry.ts'
import { GAINS } from '#/drs/gain.ts'
import { GHOST } from '#/drs/miami.ts'
import { PHOTOS } from '#/home/content.ts'
import { block, gsap, ONCE, onEnter, REDUCED, reveal, roll, sweep, useGSAP } from '#/motion/motion.ts'
import { Go } from '#/shell/Go.tsx'

import { GhostLap } from './GhostLap.tsx'
import { Next } from './Next.tsx'
import { Term } from './Term.tsx'
import { Words } from './Words.tsx'
import { DRS_WORDS } from './words.ts'

const INFO = circuitFor('miami')

type Vars = CSSProperties & Record<`--${string}`, string>

const ERAS = [
  {
    year: '2011',
    caption: 'The first season',
    rows: [
      { label: 'First race', name: 'Melbourne', tag: '27 March 2011' },
      { label: 'First champion', name: 'Sebastian Vettel', tag: 'Red Bull' },
    ],
  },
  {
    year: '2025',
    caption: 'The last season',
    rows: [
      { label: 'Last race', name: 'Yas Marina', tag: '7 December 2025' },
      { label: 'Last to open it', name: 'Kimi Antonelli', tag: 'On the last lap' },
    ],
  },
]

const all = (scope: HTMLElement, selector: string) => [...scope.querySelectorAll<HTMLElement>(selector)]

const rise = (el: HTMLElement, start: string) => gsap.from(el, { y: 24, opacity: 0, duration: 0.8, ease: 'brake', clearProps: 'transform', scrollTrigger: { trigger: el, start, ...ONCE } })

function hero(scope: HTMLElement) {
  for (const [i, el] of all(scope, '.opening .hl, .opening .label').entries()) sweep(el, { scroll: false, delay: 0.1 + i * 0.1 })
}

function motion(scope: HTMLElement) {
  for (const el of all(scope, '.shot')) reveal(el, el.closest('.pinned') ? { drift: false } : {})

  for (const el of all(scope, '.years .headline, .ghost .headline .hl, .gain .headline .hl, .how .headline .hl, .after .headline .hl, .words h2')) sweep(el)

  for (const el of all(scope, '.gain .payoff, .how .payoff')) block(el, { delay: 0.3 })

  for (const el of all(scope, '.years .num')) roll(el)

  if (REDUCED) return

  for (const el of all(scope, '.opening .intro, .years .body, .gain .body, .how .body, .after .body')) rise(el, 'top 90%')

  for (const el of all(scope, '.years li, .gain li:not(.payoff), .how .step')) rise(el, 'top 92%')

  for (const el of all(scope, '.pinned')) gsap.from(all(el, '.callout'), { opacity: 0, duration: 0.3, stagger: 0.25, ease: 'brake', scrollTrigger: { trigger: el, start: 'top 45%', ...ONCE } })
}

function Callout({ x, y, stem, purple, left, children }: { x: string; y: string; stem: string; purple?: true; left?: true; children: ReactNode }) {
  const at: Vars = { '--x': x, '--y': y, '--stem': stem }

  return (
    <span className="callout" data-purple={purple ? '' : undefined} data-left={left ? '' : undefined} style={at}>
      <b className="mono">{children}</b>
    </span>
  )
}

function Years() {
  return (
    <section className="years" aria-labelledby="years">
      <p className="mono label">Fifteen seasons</p>
      <h2 id="years" className="display headline">
        First and last.
      </h2>
      <p className="body">It came to make passing easier. The new cars of 2026 replaced it.</p>
      <div className="eras">
        {ERAS.map((era) => (
          <div key={era.year} className="era">
            <p className="display num">{era.year}</p>
            <p className="mono muted caption">{era.caption}</p>
            <ul>
              {era.rows.map((row) => (
                <li key={row.label}>
                  <p className="mono muted">{row.label}</p>
                  <p className="name">{row.name}</p>
                  <p className="mono tag">{row.tag}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="mono span">15 seasons</p>
      </div>
      <p className="mono muted credit">Dates and champion: Jolpica F1 API · Last use: OpenF1 (unofficial) and Formula1.com</p>
    </section>
  )
}

function Gain() {
  const last = GAINS.length - 1

  return (
    <section className="gain" aria-labelledby="gain">
      <p className="mono label">Not a one-off</p>
      <h2 id="gain" className="display headline">
        <span className="hl">Ten more, </span>
        <span className="hl">give or take.</span>
      </h2>
      <p className="body">The same driver, two laps at most three apart: one just inside a second of the car ahead, one just outside. The typical difference in top speed.</p>
      <ul className="straights">
        {GAINS.map((row, i) => (
          <li key={row.race + row.straight} className={i === last ? 'payoff' : undefined}>
            <p className="mono where">{row.race}</p>
            <p className="what">{row.straight}</p>
            <p className="mono pairs">{`${row.pairs} pairs`}</p>
            <p className="display num">{`+${row.gain}${i === last ? ' km/h' : ''}`}</p>
          </li>
        ))}
      </ul>
      <p className="mono muted credit">2025 races · top speed on the straight, OpenF1 (unofficial) · pairs share laps · a closer car ahead also gives a little more tow</p>
    </section>
  )
}

function How() {
  const photo = PHOTOS.ch09Wing

  return (
    <section className="how" aria-labelledby="how">
      <p className="mono label">How it worked</p>
      <h2 id="how" className="display headline">
        <span className="hl">One second. </span>
        <span className="hl">One button.</span>
      </h2>
      <p className="body">The FIA set each zone before the race, with its own lines on the track, and could change the one second rule from race to race.</p>
      <figure>
        <div className="pinned">
          <div className="shot">
            <img src={photo.src} alt="The rear wing of the 2018 Mercedes on display, its flap above the main plane." loading="lazy" />
          </div>
          <Callout x="46%" y="22.2%" stem="12.6%" purple>
            Flap
          </Callout>
          <Callout x="32.9%" y="24.6%" stem="8.3%" left>
            Actuator
          </Callout>
        </div>
        <figcaption className="caption">
          <p className="mono">{`02 · ${photo.place}`}</p>
          <p className="what">A real 2018 Mercedes rear wing, flap and all.</p>
        </figcaption>
        <p className="mono muted credit">{`${photo.credit}, via Wikimedia Commons`}</p>
      </figure>
      <ol className="steps">
        <li className="step">
          <p className="mono">
            01 · <Term k="detection">Detection point</Term>
          </p>
          <p className="what">Within one second of the car ahead.</p>
          <p className="text">Less than a second, timed at a line before the zone. It could even be a car being lapped.</p>
        </li>
        <li className="step">
          <p className="mono">
            02 · <Term k="activationPoint">Activation point</Term>
          </p>
          <p className="what">The flap may open.</p>
          <p className="text">A board reading DRS marks the start of the zone, and the car&apos;s electronics tell the driver it is allowed.</p>
        </li>
        <li className="step">
          <p className="mono">03 · Brake</p>
          <p className="what">The flap shuts.</p>
          <p className="text">It shuts by itself the first time the driver touches the brakes.</p>
        </li>
      </ol>
      <div className="payoff">
        <p className="mono">Locked shut</p>
        <p className="what">For a lap after the start or a safety car, and in poor visibility.</p>
        <p className="mono">Race director</p>
      </div>
      <p className="mono muted credit">FIA Formula One Sporting Regulations 2025, issue 1, 22.1</p>
    </section>
  )
}

function After() {
  const photo = PHOTOS.ch09F3

  return (
    <section className="after" aria-labelledby="after">
      <div className="copy">
        <p className="mono label">After 2025</p>
        <h2 id="after" className="display headline">
          <span className="hl">Gone from F1.</span>
          <span className="hl">Still in F2 and F3.</span>
        </h2>
        <p className="body">
          In 2026 every car&apos;s wings open on marked straights, attacking or not: Straight mode. The help for passing is now <Term k="overtakeMode">Overtake Mode</Term>, extra electric power.
        </p>
        <Go to="/chapters/overtaking" className="more">
          Chapter 02 · How overtaking works →
        </Go>
      </div>
      <figure>
        <div className="shot">
          <img src={photo.src} alt="Formula 3 cars in a line at Spa-Francorchamps." loading="lazy" />
        </div>
        <figcaption className="caption">
          <p className="mono">{`03 · ${photo.place}`}</p>
          <p className="what">The F3 cars still carry DRS, and so do F2&apos;s.</p>
        </figcaption>
        <p className="mono muted credit">{`${photo.credit}, via Wikimedia Commons · FIA F2 and F3 Sporting Regulations 2026, 21.4`}</p>
      </figure>
    </section>
  )
}

export function Drs() {
  const root = useRef<HTMLDivElement>(null)
  const photo = PHOTOS.ch09Antonelli

  useGSAP(
    (_, safe) => {
      const scope = root.current

      if (!scope || !safe) return

      motion(scope)

      return onEnter(safe(() => hero(scope)))
    },
    { scope: root },
  )

  return (
    <div className="chapter-page drs-page" ref={root}>
      <section className="opening" aria-labelledby="h1">
        <div className="top">
          <p className="mono muted label">How F1 works · Chapter 09 · 5 min</p>
          <nav className="mono nav" aria-label="Chapters">
            <Go to="/chapters/championships">← 08 The two championships</Go>
            <span aria-hidden> · </span>
            <Go to="/chapters">All nine chapters</Go>
          </nav>
        </div>
        <h1 id="h1" className="display">
          <span className="hl">Fifteen seasons</span>
          <span className="hl">with a flap.</span>
        </h1>
        <p className="intro">From 2011 to 2025, a driver within one second of the car ahead could open a flap in the rear wing on marked straights. Less drag, more speed, an easier pass. In 2026 it was gone.</p>
      </section>
      <figure className="photo-band">
        <div className="pinned">
          <div className="shot">
            <img src={photo.src} alt="Kimi Antonelli's Mercedes side on at Monza, its rear wing on the left." />
          </div>
          <Callout x="18.2%" y="38.7%" stem="10.2%">
            Rear wing · the flap sat on top
          </Callout>
        </div>
        <figcaption className="caption">
          <p className="mono">{`01 · ${photo.place}`}</p>
          <p className="what">Antonelli at Monza. He became the last driver to use DRS.</p>
        </figcaption>
        <p className="mono muted credit">{`${photo.credit}, via Wikimedia Commons`}</p>
      </figure>
      <Years />
      {INFO ? <GhostLap file={GHOST} info={INFO} /> : null}
      <Gain />
      <How />
      <After />
      <Words keys={DRS_WORDS} />
      <Next label="Next · This season" title="This season." line="Every race, round by round" photo={PHOTOS.ch02Tow} to="/season" />
    </div>
  )
}
