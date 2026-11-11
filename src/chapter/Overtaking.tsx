import { Schema } from 'effect'
import { type CSSProperties, useRef } from 'react'

import { circuitFor } from '#/circuits/registry.ts'
import { PHOTOS } from '#/home/content.ts'
import { block, gsap, ONCE, onEnter, REDUCED, reveal, sweep, useGSAP } from '#/motion/motion.ts'
import { steps } from '#/pass/model.ts'
import baked from '#/pass/pass.json'
import { PassFile } from '#/pass/schema.ts'
import { Go, Soon } from '#/shell/Go.tsx'

import { Next } from './Next.tsx'
import { Replay } from './Replay.tsx'
import { Term } from './Term.tsx'
import { Words } from './Words.tsx'
import { OVERTAKING_WORDS } from './words.ts'

const PASS = Schema.decodeUnknownSync(PassFile)(baked)

const STEPS = steps(PASS)

const INFO = circuitFor('interlagos')

type Vars = CSSProperties & Record<`--${string}`, string>

const all = (scope: HTMLElement, selector: string) => [...scope.querySelectorAll<HTMLElement>(selector)]

const CALLOUTS = [
  { n: 1, text: 'Leader · punches the hole', x: 31, y: 24, len: 52, side: 'up' },
  { n: 2, text: 'Chaser · in its tow', x: 78, y: 33, len: 88, side: 'up' },
  { n: 3, text: 'The pocket · less drag', x: 51.75, y: 62, len: 28, side: 'down' },
] as const

const place = (c: (typeof CALLOUTS)[number]): Vars => ({ '--x': `${c.x}%`, '--y': `${c.y}%`, '--len': `${c.len}px` })

const TOOLS = [
  { name: 'DRS', tag: 'Until 2025', does: 'Opens a flap in the rear wing', who: 'Chaser only, within 1 s', where: 'DRS zones', term: null, state: 'old' },
  { name: 'Straight mode', tag: null, does: 'Opens the front and rear wings', who: 'Every car', where: 'Long straights', term: 'straightMode', state: 'now' },
  { name: 'Overtake Mode', tag: 'New', does: 'Extra electric power, for longer', who: 'Chaser only, within 1 s', where: 'After the detection point', term: 'detection', state: 'new' },
] as const

function hero(scope: HTMLElement) {
  for (const [i, el] of all(scope, '.opening .hl, .opening .label').entries()) sweep(el, { scroll: false, delay: 0.1 + i * 0.1 })
}

function motion(scope: HTMLElement) {
  for (const el of all(scope, '.shot')) reveal(el)

  for (const el of all(scope, '.frames .headline .hl, .replay .headline, .air .headline .hl, .rules .headline, .words h2')) sweep(el)

  for (const el of all(scope, '.air .payoff')) block(el, { delay: 0.5 })

  if (REDUCED) return

  for (const el of all(scope, '.opening .intro, .frames .lead, .replay .body, .air .body, .rules .body')) gsap.from(el, { y: 24, opacity: 0, duration: 0.9, ease: 'brake', scrollTrigger: { trigger: el, start: 'top 90%', ...ONCE } })

  const frame = scope.querySelector('.air .frame')

  if (frame) {
    const tl = gsap.timeline({ scrollTrigger: { trigger: frame, start: 'top 70%', ...ONCE } })

    for (const [i, pin] of all(scope, '.air .pin').entries()) {
      const at = 0.6 + i * 0.35

      tl.from(pin.querySelector('.dot'), { scale: 0, duration: 0.3, ease: 'launch' }, at)
      tl.from(pin.querySelector('.leader'), { scaleY: 0, duration: 0.3, ease: 'brake' }, at + 0.1)
    }

    for (const [i, chip] of all(scope, '.air .callouts li').entries()) block(chip, { trigger: frame, start: 'top 70%', delay: 1 + i * 0.35 })
  }

  for (const el of all(scope, '.air .rows li')) gsap.from(el, { y: 24, opacity: 0, duration: 0.8, ease: 'brake', scrollTrigger: { trigger: el, start: 'top 92%', ...ONCE } })

  const strike = scope.querySelector('.rules .strike')

  if (strike) gsap.from(strike, { scaleX: 0, transformOrigin: 'left center', duration: 0.9, ease: 'brake', scrollTrigger: { trigger: strike, start: 'top 75%', ...ONCE } })

  for (const el of all(scope, '.rules tbody tr')) gsap.from(el, { y: 16, opacity: 0, duration: 0.6, ease: 'brake', scrollTrigger: { trigger: el, start: 'top 95%', ...ONCE } })
}

export function Overtaking() {
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

  const baku = PHOTOS.ch02
  const tow = PHOTOS.ch02Tow

  return (
    <div className="chapter-page overtaking-page" ref={root}>
      <section className="opening" aria-labelledby="h1">
        <div className="top">
          <p className="mono muted label">How F1 works · Chapter 02 · 5 min</p>
          <nav className="mono nav" aria-label="Chapters">
            <Go to="/chapters/race-weekend">← 01 A race weekend</Go>
            <span aria-hidden> · </span>
            <Soon>03 Tyres and strategy</Soon>
          </nav>
        </div>
        <h1 id="h1" className="display">
          <span className="hl">Every pass starts long</span>
          <span className="hl">before the corner.</span>
        </h1>
        <p className="intro">
          A pass is planned a whole straight before it happens. Get within a second, use the battery, get out of the wake, <Term k="brakingZone">brake later</Term>. Here is one, slowed down.
        </p>
      </section>
      <figure className="photo-band">
        <div className="shot">
          <img src={baku.src} srcSet={baku.srcSet} sizes="100vw" alt="A McLaren leads a Ferrari and an Alpine down the main straight in Baku." />
        </div>
        <figcaption className="caption">
          <p className="mono">{`01 · ${baku.place}`}</p>
          <p className="what">The chaser closes down the 2 km straight.</p>
        </figcaption>
        <p className="mono muted credit">{baku.credit}</p>
      </figure>
      <section className="frames" aria-labelledby="frames">
        <p className="mono muted label">One move</p>
        <h2 id="frames" className="display headline">
          <span className="hl">One move,</span>
          <span className="hl">three frames.</span>
        </h2>
        <div className="grid">
          <p className="lead">
            Malaysia, 2017. Verstappen used <Term k="drs">DRS</Term> down the main straight, drew alongside and took Turn 1 on the <Term k="insideLine">inside</Term>. The 2026 rules removed that tool, so the same move now needs a
            different one.
          </p>
          <figure className="big">
            <div className="shot">
              <img src={PHOTOS.ch02Straight.src} alt="Verstappen's Red Bull and Hamilton's Mercedes side by side on the Sepang straight, sparks under both cars." loading="lazy" />
            </div>
            <figcaption>
              <p className="mono">01 · The straight</p>
              <p className="what">Side by side at full speed. Sparks off the floor.</p>
            </figcaption>
          </figure>
          <figure className="small">
            <div className="shot">
              <img src={PHOTOS.ch02Turn1.src} alt="Verstappen on the inside of Hamilton beside the Turn 1 board." loading="lazy" />
            </div>
            <figcaption>
              <p className="mono">02 · Turn 1</p>
              <p className="what">Verstappen goes past Hamilton on the inside.</p>
            </figcaption>
          </figure>
          <figure className="small">
            <div className="shot">
              <img src={PHOTOS.ch02Exit.src} alt="Verstappen ahead of Hamilton on the exit of Turn 1." loading="lazy" />
            </div>
            <figcaption>
              <p className="mono">03 · The exit</p>
              <p className="what">Turn 1 done. Verstappen leads.</p>
            </figcaption>
          </figure>
        </div>
        <p className="mono muted credit">Photos Morio · CC BY-SA 4.0, via Wikimedia Commons</p>
      </section>
      {INFO && STEPS ? <Replay pass={PASS} all={STEPS} info={INFO} /> : null}
      <section className="air" aria-labelledby="air">
        <figure className="photo">
          <div className="frame">
            <div className="shot">
              <img src={tow.src} srcSet={tow.srcSet} sizes="100vw" alt="Two Haas cars nose to tail on the straight at Spa." loading="lazy" />
            </div>
            <div className="pins" aria-hidden>
              {CALLOUTS.map((c) => (
                <i key={c.n} className="pin" data-side={c.side} style={place(c)}>
                  <i className="leader" />
                  <b className="dot mono">{c.n}</b>
                </i>
              ))}
            </div>
            <ol className="callouts mono">
              {CALLOUTS.map((c) => (
                <li key={c.n} data-side={c.side} style={place(c)}>
                  <b>{c.n}</b>
                  {c.text}
                </li>
              ))}
            </ol>
          </div>
          <figcaption className="caption">
            <p className="mono">{`04 · ${tow.place}`}</p>
            <p className="what">Two Haas cars, nose to tail.</p>
          </figcaption>
          <p className="mono muted credit">{`${tow.credit}, via Wikimedia Commons`}</p>
        </figure>
        <div className="head">
          <p className="mono muted label">The air</p>
          <h2 id="air" className="display headline">
            <span className="hl">The same air helps,</span>
            <span className="hl">then hurts.</span>
          </h2>
          <p className="body">
            A car punches a hole through the air. Behind it on a straight, that hole is a gift: the <Term k="slipstream">slipstream</Term>. In a corner, it is a curse.
          </p>
        </div>
        <ol className="rows">
          <li>
            <p className="mono where">On a straight</p>
            <p className="display what">Tow.</p>
            <p className="text">The leader leaves a pocket of slow air. Less drag, so the chaser gains speed without using more power.</p>
            <p className="mono verdict">Helps</p>
          </li>
          <li>
            <p className="mono where">In a corner</p>
            <p className="display what">Dirty air.</p>
            <p className="text">
              The same wake is now <Term k="dirtyAir">turbulent</Term>. The chaser's wings lose grip, the car slides and the tyres overheat.
            </p>
            <p className="mono verdict">Hurts</p>
          </li>
          <li className="payoff">
            <p className="mono where">So</p>
            <p className="what">Most passes happen at the end of a straight.</p>
            <p className="mono verdict">Not in a corner</p>
          </li>
        </ol>
      </section>
      <section className="rules" aria-labelledby="rules">
        <p className="mono muted label">The 2026 rules</p>
        <div className="ghost">
          <p className="display letters" aria-hidden>
            DRS
          </p>
          <i className="strike" aria-hidden />
          <p className="mono muted caption">Drag Reduction System · 2011 to 2025</p>
        </div>
        <div className="side">
          <h2 id="rules" className="display headline">
            Gone in 2026.
          </h2>
          <p className="body">
            For fifteen seasons a flap in the rear wing opened for the chasing car. Now every car <Term k="activeAero">opens its wings</Term> on the straights, so the chaser's edge comes from{' '}
            <Term k="overtakeMode">the battery</Term> instead.
          </p>
        </div>
        <table>
          <thead className="mono">
            <tr>
              <th scope="col">Tool</th>
              <th scope="col">What it does</th>
              <th scope="col">Who gets it</th>
              <th scope="col">Where</th>
            </tr>
          </thead>
          <tbody>
            {TOOLS.map((tool) => (
              <tr key={tool.name} data-state={tool.state}>
                <th scope="row">
                  {tool.name}
                  {tool.tag ? <span className="mono tag">{tool.tag}</span> : null}
                </th>
                <td data-label="What it does">{tool.does}</td>
                <td data-label="Who gets it">{tool.who}</td>
                <td data-label="Where">{tool.term ? <Term k={tool.term}>{tool.where}</Term> : tool.where}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <Words keys={OVERTAKING_WORDS} />
      <Next n="03" min={7} title="Tyres and strategy." line="Why one pit stop can win a race" photo={PHOTOS.ch03} to={null} />
    </div>
  )
}
