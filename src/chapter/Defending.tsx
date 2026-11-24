import { Schema } from 'effect'
import { type CSSProperties, type ReactNode, useRef } from 'react'

import { circuitFor } from '#/circuits/registry.ts'
import baked from '#/fight/melbourne.json'
import { leads, steps } from '#/fight/model.ts'
import { pins } from '#/fight/pins.ts'
import { FightFile } from '#/fight/schema.ts'
import { PHOTOS } from '#/home/content.ts'
import { block, gsap, ONCE, onEnter, REDUCED, reveal, roll, sweep, useGSAP } from '#/motion/motion.ts'
import { Go, Soon } from '#/shell/Go.tsx'
import { useTheme } from '#/shell/theme.ts'

import { Fight } from './Fight.tsx'
import { Next } from './Next.tsx'
import { Term } from './Term.tsx'
import { Words } from './Words.tsx'
import { DEFENDING_WORDS } from './words.ts'

const FILE = Schema.decodeUnknownSync(FightFile)(baked)

const LEADS = leads(FILE)

const STEPS = steps(FILE)

const INFO = circuitFor('albert_park')

type Vars = CSSProperties & Record<`--${string}`, string>

type View = keyof typeof pins

const PHONE = '(max-width: 760px)'

const all = (scope: HTMLElement, selector: string) => [...scope.querySelectorAll<HTMLElement>(selector)]

const rise = (el: HTMLElement, y: number, start: string) => gsap.from(el, { y, opacity: 0, duration: 0.8, ease: 'brake', clearProps: 'transform', scrollTrigger: { trigger: el, start, ...ONCE } })

const pct = (v: number) => `${(v * 100).toFixed(2)}%`

const spot = (view: View, phone: View, key: string): Vars => {
  const [x, y] = pins[view][key] ?? [0.5, 0.5]
  const [px, py] = pins[phone][key] ?? [0.5, 0.5]

  return { '--x': pct(x), '--y': pct(y), '--px': pct(px), '--py': pct(py) }
}

function hero(scope: HTMLElement) {
  for (const [i, el] of all(scope, '.opening .hl, .opening .label').entries()) sweep(el, { scroll: false, delay: 0.1 + i * 0.1 })
}

function motion(scope: HTMLElement) {
  for (const el of all(scope, '.shot')) reveal(el, el.closest('.divebomb') ? { drift: false } : {})

  for (const el of all(scope, '.rule .headline .hl, .fight .headline .hl, .reply .headline .hl, .divebomb .headline .hl, .price .headline, .words h2')) sweep(el)

  for (const el of all(scope, '.rule .payoff, .price .payoff')) block(el, { delay: 0.3 })

  for (const el of all(scope, '.price .num')) roll(el)

  if (REDUCED) return

  for (const el of all(scope, '.opening .intro, .rule .body, .reply .body, .divebomb .body')) rise(el, 24, 'top 90%')

  for (const el of all(scope, '.rule .one, .rule .rows li:not(.payoff), .divebomb .sides li, .price .costs li:not(.payoff), .price .served li')) rise(el, 24, 'top 92%')

  for (const art of all(scope, '.reply .art, .divebomb .art'))
    gsap.from(all(art, '.mark'), { opacity: 0, duration: 0.3, stagger: 0.25, ease: 'brake', scrollTrigger: { trigger: art, start: 'top 55%', ...ONCE } })
}

function Still({ name, alt, w, h }: { name: string; alt: string; w: number; h: number }) {
  const theme = useTheme().theme ?? 'light'

  return (
    <picture>
      <source media={PHONE} srcSet={`/defend/${name}-phone-${theme}.webp`} width={1170} height={1260} />
      <img src={`/defend/${name}-${theme}.webp`} alt={alt} width={w} height={h} loading="lazy" />
    </picture>
  )
}

function Mark({ at, kind, children, purple }: { at: Vars; kind: string; children: ReactNode; purple?: true }) {
  return (
    <li className="mark" data-kind={kind} data-purple={purple ? '' : undefined} style={at}>
      <b className="mono">{children}</b>
    </li>
  )
}

function Rule() {
  return (
    <section className="rule" aria-labelledby="rule">
      <p className="mono label">The rule</p>
      <div className="top">
        <p className="display one" aria-hidden>
          1
        </p>
        <div className="side">
          <h2 id="rule" className="display headline">
            <span className="hl">One move.</span>
            <span className="hl">No more.</span>
          </h2>
          <p className="body">
            A driver may change direction once to defend a place. If that took them off the <Term k="racingLine">racing line</Term>, they may come back toward it, but must leave a <Term k="carsWidth">car&apos;s width</Term> to the edge
            of the track.
          </p>
        </div>
      </div>
      <ol className="rows">
        <li>
          <p className="mono where">Defending</p>
          <p className="display what">One move.</p>
          <p className="text">Cover the inside or the outside, once, and hold that line into the corner.</p>
          <p className="mono verdict">Allowed</p>
        </li>
        <li>
          <p className="mono where">Coming back</p>
          <p className="display what">A car&apos;s width.</p>
          <p className="text">Moving back toward the racing line, leave at least one car&apos;s width to the edge of the track.</p>
          <p className="mono verdict">Allowed</p>
        </li>
        <li className="payoff">
          <p className="mono where">Never</p>
          <p className="what">A second move. Or any swerve after the brakes go on.</p>
          <p className="mono verdict">Not allowed</p>
        </li>
      </ol>
      <p className="mono muted credit">
        FIA F1 Driving Standards Guidelines, 26 February 2026, G and H · International Sporting Code, Appendix L, Chapter IV, 2b · After braking starts, only the racing line may be followed
      </p>
    </section>
  )
}

function Reply() {
  const at = (key: string) => spot('switch', 'switchPhone', key)

  return (
    <section className="reply" aria-labelledby="reply">
      <p className="mono label">The reply</p>
      <h2 id="reply" className="display headline">
        <span className="hl">Too fast in. </span>
        <span className="hl">Second out.</span>
      </h2>
      <p className="body">
        The answer is called the <Term k="switchback">switchback</Term>. Let the diver go deep, brake in time, turn late and drive off the corner sooner. At Turn 1, Leclerc was back ahead by the exit.
      </p>
      <div className="art">
        <Still name="switch" w={2400} h={1250} alt="Two clay cars at a hairpin. The pale car has dived in and runs wide; the purple car turns late and cuts back on the inner side." />
        <ul className="marks">
          <Mark at={at('wide')} kind="wide" purple>
            Stays outside
          </Mark>
          <Mark at={at('dive')} kind="dive">
            Dives inside
          </Mark>
          <Mark at={at('def')} kind="def" purple>
            Defender · on power first
          </Mark>
          <Mark at={at('att')} kind="att">
            Attacker · runs wide
          </Mark>
        </ul>
      </div>
      <p className="mono muted credit">A drawing of the technique, not telemetry · Cars drawn larger than life · Car: MaG80, CC BY 4.0, rendered in Blender</p>
    </section>
  )
}

function Divebomb() {
  const at = (key: string) => spot('dive', 'divePhone', key)

  return (
    <section className="divebomb" aria-labelledby="divebomb">
      <div className="copy">
        <p className="mono label">The divebomb</p>
        <h2 id="divebomb" className="display headline">
          <span className="hl">Alongside</span>
          <span className="hl">the mirror.</span>
        </h2>
        <p className="body">
          To be owed room on the inside, the attacker&apos;s front axle must be level with the other car&apos;s mirror, before the <Term k="apex">apex</Term> and at it. Arrive later and it is a <Term k="divebomb">divebomb</Term>.
        </p>
        <ul className="sides">
          <li>
            <p className="mono muted">
              Inside<span className="more"> · before and at the apex</span>
            </p>
            <p className="what">Front axle level with their mirror.</p>
          </li>
          <li>
            <p className="mono muted">
              Outside<span className="more"> · at the apex</span>
            </p>
            <p className="what">Front axle ahead of their front axle.</p>
          </li>
        </ul>
      </div>
      <div className="art">
        <div className="shot">
          <Still name="dive" w={2400} h={1583} alt="Two clay cars from above, side by side. One line crosses the purple car's mirrors and the pale car's front axle." />
        </div>
        <ul className="marks">
          <Mark at={at('mirror')} kind="mirror" purple>
            Mirror
          </Mark>
          <Mark at={at('axle')} kind="axle">
            Front axle
          </Mark>
        </ul>
      </div>
      <p className="mono muted credit">FIA F1 Driving Standards Guidelines, 26 February 2026, A and B · Car: MaG80, CC BY 4.0, rendered in Blender</p>
    </section>
  )
}

function Price() {
  return (
    <section className="price" aria-labelledby="price">
      <p className="mono label">The price</p>
      <h2 id="price" className="display headline">
        Defend too much, and pay.
      </h2>
      <ul className="costs">
        <li>
          <p className="display num">5</p>
          <p className="mono unit">Seconds, or more</p>
          <p className="what">A second move to block.</p>
          <p className="text">
            Anywhere from five seconds up to a <Term k="driveThrough">drive-through</Term>, and up to three penalty points.
          </p>
        </li>
        <li>
          <p className="display num">10</p>
          <p className="mono unit">Seconds, as a rule</p>
          <p className="what">Pushing a car off. Causing a crash. Cutting a corner to stay ahead.</p>
        </li>
        <li className="payoff">
          <p className="display num">12</p>
          <p className="mono unit">Penalty points in 12 months</p>
          <p className="what">Sit out the next race.</p>
          <p className="text">As a rule, points now come only for dangerous, reckless or deliberate driving.</p>
        </li>
      </ul>
      <ul className="served">
        <li>
          <p className="mono muted">First swerve</p>
          <p className="what">Black-and-white flag. A warning, if it was not dangerous.</p>
          <p className="mono how">Braking zone</p>
        </li>
        <li>
          <p className="mono muted">Served</p>
          <p className="what">Stopped at the next pit stop, or added at the flag.</p>
          <p className="mono how">5 s · 10 s</p>
        </li>
      </ul>
      <p className="mono muted credit">FIA F1 Penalty Guidelines 2026 v01 · FIA F1 Sporting Regulations, issue 07, B1.9.5 and B1.9.6 · 12-point ban: PlanetF1 penalty points tracker, 2026</p>
    </section>
  )
}

export function Defending() {
  const root = useRef<HTMLDivElement>(null)
  const photo = PHOTOS.ch07

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
    <div className="chapter-page defending-page" ref={root}>
      <section className="opening" aria-labelledby="h1">
        <div className="top">
          <p className="mono muted label">How F1 works · Chapter 07 · 6 min</p>
          <nav className="mono nav" aria-label="Chapters">
            <Go to="/chapters/power-unit">← 06 The power unit</Go>
            <span aria-hidden> · </span>
            <Soon>08 The two championships</Soon>
          </nav>
        </div>
        <h1 id="h1" className="display">
          <span className="hl">One move to defend.</span>
          <span className="hl">Then it&apos;s a race.</span>
        </h1>
        <p className="intro">The car in front may block a pass, but only once. Here is the rule, a real fight for the lead, and what it costs to cheat.</p>
      </section>
      <figure className="photo-band">
        <div className="shot">
          <img src={photo.src} srcSet={photo.srcSet} sizes="100vw" alt="Lewis Hamilton's Ferrari beside George Russell's Mercedes on the pit straight at Silverstone." />
        </div>
        <figcaption className="caption">
          <p className="mono">{`01 · ${photo.place}`}</p>
          <p className="what">Hamilton&apos;s Ferrari alongside Russell&apos;s Mercedes.</p>
        </figcaption>
        <p className="mono muted credit">{`${photo.credit}, via Wikimedia Commons`}</p>
      </figure>
      <Rule />
      {INFO && STEPS ? <Fight file={FILE} all={STEPS} lead={LEADS} info={INFO} /> : null}
      <Reply />
      <Divebomb />
      <Price />
      <Words keys={DEFENDING_WORDS} />
      <Next label="Next · Chapter 08 · 6 min" title="The two championships." line="One for drivers, one for teams" photo={PHOTOS.ch07Podium} to={null} />
    </div>
  )
}
