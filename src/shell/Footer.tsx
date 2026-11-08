import { useRef } from 'react'

import { circuitFor } from '#/circuits/registry.ts'
import { PHOTOS } from '#/home/content.ts'
import { useSecond } from '#/motion/client.ts'
import { gsap, ONCE, REDUCED, ScrollTrigger, SplitText, sweep, useGSAP } from '#/motion/motion.ts'
import type { SeasonSnapshot } from '#/season/snapshot-schema.ts'
import { useSeason } from '#/season/use-season.ts'
import { countdown, gpName, nextLightsOut, when } from '#/season/weekend.ts'

import { Go, Soon } from './Go.tsx'
import { FOOTER_LINKS, MENU } from './menu.ts'

const LIGHTS = [0, 1, 2, 3, 4]

const BEAT_S = 0.45

const HOLD_S = 0.5

const HOLD_SPREAD_S = 0.8

const pad = (n: number) => String(n).padStart(2, '0')

export function Footer() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const footer = root.current
      const wordmark = footer?.querySelector<HTMLElement>('.wordmark')

      if (!footer || !wordmark || REDUCED) return

      for (const el of footer.querySelectorAll<HTMLElement>('.start h2, .start .lede')) sweep(el)

      SplitText.create(wordmark, {
        type: 'chars,lines',
        mask: 'lines',
        linesClass: 'wm-line',
        charsClass: 'char',
        onSplit: (self) =>
          gsap.fromTo(
            self.chars,
            { yPercent: 105, '--w': 62 },
            {
              yPercent: 0,
              '--w': 100,
              duration: 1.3,
              ease: 'launch',
              stagger: 0.035,
              scrollTrigger: { trigger: wordmark, start: 'top 92%', ...ONCE },
            },
          ),
      })
    },
    { scope: root },
  )

  const { place, credit, src } = PHOTOS.startLights

  return (
    <footer className="footer" ref={root}>
      <section className="start" aria-labelledby="start-h">
        <div className="copy">
          <p className="mono muted">The start</p>
          <h2 id="start-h">
            Five red lights.
            <br />
            Then they go out.
          </h2>
          <p className="lede muted">One light comes on every second. When all five go out together, the race has started. There is no green light, and that moment gave this site its name.</p>
        </div>
        <figure>
          <div className="photo">
            <img src={src} alt="The five start-light pods on the gantry above the grid at Albert Park." width={1312} height={695} loading="lazy" />
          </div>
          <figcaption className="mono muted">
            <span>{place}</span>
            <span>{credit}</span>
          </figcaption>
        </figure>
      </section>
      <NextRace />
      <nav className="index" aria-label="Site">
        <div>
          <p className="mono muted">Chapters</p>
          <ol className="toc">
            {MENU.map((entry, i) => (
              <li key={entry.label}>
                <span className="mono muted">{pad(i + 1)}</span>
                {entry.to ? <Go to={entry.to}>{entry.label}</Go> : <Soon>{entry.label}</Soon>}
              </li>
            ))}
          </ol>
        </div>
        <div className="site">
          <p className="mono muted">This site</p>
          <ul>
            {FOOTER_LINKS.map((label) => (
              <li key={label}>
                <Soon>{label}</Soon>
              </li>
            ))}
            <li>
              <a href="#main">Back to top ↑</a>
            </li>
          </ul>
        </div>
      </nav>
      <p className="wordmark" aria-label="Lights Out">
        Lights Out
      </p>
      <div className="row mono muted">
        <p>Lights Out is an unofficial fan project. Not affiliated with Formula 1, FOM or any team.</p>
        <p>Data Jolpica F1 · NASA SRTM · Photos Wikimedia Commons</p>
      </div>
    </footer>
  )
}

function NextRace() {
  const season = useSeason()

  return season.data ? <Strip snapshot={season.data} /> : null
}

function Strip({ snapshot }: { snapshot: SeasonSnapshot }) {
  const now = useSecond()
  const root = useRef<HTMLDivElement>(null)
  const next = nextLightsOut(snapshot, now)
  const tz = next ? circuitFor(next.race.circuit.circuitId)?.tz : undefined
  const at = next && tz ? when(next.startsAt, tz) : null
  const time = next?.confirmed && at ? `${at.day} · ${at.track} local` : at ? `${at.day} · time TBC` : 'Time TBC'

  useGSAP(
    () => {
      const strip = root.current

      if (!strip || REDUCED) return

      const lights = [...strip.querySelectorAll('.lights i')]
      const tl = gsap.timeline({ scrollTrigger: { trigger: strip, start: 'top 85%', ...ONCE } })

      lights.forEach((light, i) => tl.call(() => light.classList.add('on'), [], i * BEAT_S))
      tl.call(() => lights.forEach((light) => light.classList.remove('on')), [], (lights.length - 1) * BEAT_S + HOLD_S + Math.random() * HOLD_SPREAD_S)
      ScrollTrigger.refresh()
    },
    { scope: root },
  )

  return (
    <div className="next-race" ref={root}>
      <div>
        <p className="mono muted">Next lights out</p>
        <p className="gp">{next ? gpName(next.race) : `${snapshot.season} season complete`}</p>
        <p className="meta mono muted">
          {next
            ? `${circuitFor(next.race.circuit.circuitId)?.name ?? next.race.circuit.locality} · round ${next.round} of ${next.of} · ${time}`
            : `The ${snapshot.season + 1} calendar is not out yet`}
        </p>
      </div>
      <div className="clock">
        <div className="lights" aria-hidden>
          {LIGHTS.map((i) => (
            <i key={i} />
          ))}
        </div>
        {next?.confirmed && (
          <p className="count" role="timer">
            {countdown(Date.parse(next.startsAt) - now.getTime()).map(([unit, n]) => (
              <span key={unit}>
                <b>{n}</b>
                <span className="mono muted">{unit}</span>
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  )
}
