import { useQueryClient } from '@tanstack/react-query'
import { type PointerEvent, useEffect, useRef } from 'react'

import { block, draw, gsap, HOVER, ONCE, REDUCED, reveal, roll, ScrollTrigger, sweep, useGSAP } from '#/motion/motion.ts'
import { Go } from '#/shell/Go.tsx'
import { waitFor } from '#/shell/Loader.tsx'
import { opposite, useTheme } from '#/shell/theme.ts'
import { seasonQueryOptions } from '#/season/use-season.ts'

import { CALLOUT_FRAME, CALLOUTS, CAR_STATS, CHAPTERS, CHIP_H, PHOTOS, READ_NEXT } from './content.ts'
import { Hero, heroShown } from './Hero.tsx'

const pct = (v: number, of: number) => `${(v / of) * 100}%`

const all = (scope: HTMLElement, selector: string) => [...scope.querySelectorAll<HTMLElement>(selector)]

const one = (scope: HTMLElement, selector: string) => {
  const el = scope.querySelector<HTMLElement>(selector)

  if (!el) throw new Error(`Home is missing ${selector}`)

  return el
}

type Rider = { x: gsap.QuickToFunc; y: gsap.QuickToFunc; at: number; z: number }

export function Home() {
  const { theme } = useTheme()
  const root = useRef<HTMLDivElement>(null)
  const preview = useRef<HTMLDivElement>(null)
  const ride = useRef<Rider | null>(null)
  const client = useQueryClient()

  useEffect(() => {
    waitFor(client.fetchQuery(seasonQueryOptions).then(heroShown))

    const img = root.current?.querySelector('.hero .tracker img')

    if (img instanceof HTMLImageElement) waitFor(img.decode())
  }, [client])

  const { contextSafe } = useGSAP(
    (_, safe) => {
      const scope = root.current

      if (!scope || !safe) return

      for (const el of all(scope, '.type, h2.display, .next h3, .next p, .car .credit')) sweep(el)

      const rows = one(scope, '.rows')

      all(scope, '.rows h3').forEach((el, i) => sweep(el, { trigger: rows, start: 'top 78%', delay: i * 0.08 }))
      draw(all(scope, '.rows .hair'), rows)

      for (const el of all(scope, '.car [data-count]')) roll(el, { from: el.dataset.count === 'year' ? 1950 : undefined })

      for (const el of all(scope, '.next .photo')) reveal(el)

      block(one(scope, '.car .plate'))

      if (REDUCED) return

      const band = one(scope, '.car')

      gsap.fromTo(
        band,
        { clipPath: 'inset(0% 4% 0% 4%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: band, start: 'top bottom', end: 'top 15%', scrub: true } },
      )
      ScrollTrigger.create({
        trigger: band,
        start: 'top 55%',
        end: 'bottom 45%',
        onToggle: (self) => document.documentElement.classList.toggle('flip', self.isActive),
      })

      const stage = one(scope, '.car .stage')

      gsap.fromTo(one(scope, '.car .stage img'), { scale: 1.14 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: stage, start: 'top bottom', end: 'top 25%', scrub: true } })

      const callouts = gsap.timeline({ scrollTrigger: { trigger: stage, start: 'top 55%', ...ONCE } })

      all(scope, '.callout').forEach((c, i) => {
        const at = i * 0.14

        callouts
          .from(c.querySelector('.dot'), { scale: 0, duration: 0.5, ease: 'back.out(3)' }, at)
          .from(c.querySelector('.lead'), { scaleY: 0, duration: 0.45 }, at + 0.08)

        const chip = c.querySelector<HTMLElement>('.chip')

        if (chip) block(chip, { trigger: stage, start: 'top 55%', delay: at + 0.25 })
      })

      const card = preview.current
      let last = 0
      const lean = card ? gsap.quickTo(card, 'rotation', { duration: 0.5, ease: 'power3.out' }) : null

      const tick = () => {
        if (!card || !lean) return

        const x = Number(gsap.getProperty(card, 'x'))

        if (x !== last || Number(gsap.getProperty(card, 'rotation')) !== 0) lean(gsap.utils.clamp(-12, 12, (x - last) * 0.4))

        last = x
      }

      if (HOVER) gsap.ticker.add(tick)

      return () => {
        gsap.ticker.remove(tick)
        document.documentElement.classList.remove('flip')
      }
    },
    { scope: root },
  )

  const rider = () => {
    const card = preview.current

    if (!HOVER || REDUCED || !card) return null

    ride.current ??= {
      x: gsap.quickTo(card, 'x', { duration: 0.45, ease: 'power3.out' }),
      y: gsap.quickTo(card, 'y', { duration: 0.45, ease: 'power3.out' }),
      at: -1,
      z: 1,
    }

    return ride.current
  }

  const onRows = {
    onPointerMove: contextSafe((e: PointerEvent) => {
      const r = rider()

      r?.x(e.clientX)
      r?.y(e.clientY)
    }),
    onPointerLeave: contextSafe(() => {
      const r = rider()

      if (!r) return

      r.at = -1
      gsap.to('.preview .card', { scale: 0, duration: 0.35, ease: 'power2.in', overwrite: true })
    }),
  }

  const show = contextSafe((i: number, e: PointerEvent) => {
    const r = rider()
    const imgs = preview.current?.querySelectorAll('img')

    if (!r || !imgs || r.at === i) return

    if (r.at === -1) {
      gsap.set(preview.current, { x: e.clientX, y: e.clientY })
      gsap.set(imgs[i] ?? [], { yPercent: 0, scale: 1, zIndex: ++r.z, visibility: 'inherit' })
      gsap.fromTo('.preview .card', { visibility: 'inherit', scale: 0 }, { scale: 1, duration: 0.5, overwrite: true })
    } else {
      const dir = i > r.at ? 1 : -1

      gsap.fromTo(imgs[i] ?? [], { yPercent: 100 * dir, scale: 1.25, zIndex: ++r.z, visibility: 'inherit' }, { yPercent: 0, scale: 1, duration: 0.6, overwrite: true })
      gsap.to(imgs[r.at] ?? [], { yPercent: -30 * dir, duration: 0.6, overwrite: true })
    }

    r.at = i
  })

  return (
    <div ref={root}>
      <Hero />

      <section className="chapters" aria-labelledby="start">
        <div className="head">
          <h2 id="start" className="mono type">
            Start here
          </h2>
          <p className="mono muted type">Five chapters · 30 min</p>
        </div>
        <ol className="rows" {...onRows}>
          {CHAPTERS.map((c, i) => {
            const body = (
              <>
                <span className="mono muted">{c.n}</span>
                <h3>{c.title}</h3>
                <span className="end">
                  <span className="mono muted">{c.min} min</span>
                  {c.to ? (
                    <span className="read">
                      Read <span className="arr">→</span>
                    </span>
                  ) : (
                    <span className="soon mono">Soon</span>
                  )}
                </span>
              </>
            )

            return (
              <li key={c.n} onPointerEnter={(e) => show(i, e)}>
                <i className="hair" />
                {c.to ? (
                  <Go to={c.to} className="row">
                    {body}
                  </Go>
                ) : (
                  <div className="row is-soon">{body}</div>
                )}
              </li>
            )
          })}
        </ol>
        <div className="preview" ref={preview} aria-hidden>
          <div className="card">
            {CHAPTERS.map((c) => (
              <img key={c.n} src={c.photo.src} alt="" loading="lazy" />
            ))}
          </div>
        </div>
      </section>

      <section className="car" data-theme={theme ? opposite(theme) : undefined} aria-labelledby="car">
        <div className="head">
          <p className="mono type">The car</p>
          <p className="mono muted type">One real 2026 car, labelled</p>
        </div>
        <h2 id="car" className="display">
          Part by part.
        </h2>
        <div className="stage">
          <div className="frame">
            <div className="photo">
              <img src={PHOTOS.williams.src} alt="The Williams FW48 at speed in qualifying, side on." loading="lazy" />
            </div>
            {CALLOUTS.map((c, i) => {
              const top = c.chip[1] < c.dot[1]
              const from = top ? c.chip[1] + CHIP_H : c.dot[1]
              const to = top ? c.dot[1] : c.chip[1]

              return (
                <div className="callout" key={c.label} aria-hidden>
                  <span className={top ? 'lead' : 'lead up'} style={{ left: pct(c.dot[0], CALLOUT_FRAME.w), top: pct(from, CALLOUT_FRAME.h), height: pct(to - from, CALLOUT_FRAME.h) }} />
                  <span className="dot" data-n={i + 1} style={{ left: pct(c.dot[0], CALLOUT_FRAME.w), top: pct(c.dot[1], CALLOUT_FRAME.h) }} />
                  <span className="chip mono" style={{ left: pct(c.chip[0], CALLOUT_FRAME.w), top: pct(c.chip[1], CALLOUT_FRAME.h) }}>
                    {c.label}
                  </span>
                </div>
              )
            })}
            <div className="plate">
              <span className="mono">01 · The car · Shanghai, 2026</span>
              <strong>Williams FW48, in qualifying.</strong>
            </div>
          </div>
          <ul className="parts mono">
            {CALLOUTS.map((c) => (
              <li key={c.label}>{c.label}</li>
            ))}
          </ul>
          <p className="credit mono muted">{PHOTOS.williams.credit}, via Wikimedia Commons</p>
          <dl className="stats">
            {CAR_STATS.map((s) => (
              <div key={s.k}>
                <dt className="mono muted type">{s.k}</dt>
                <dd>
                  <strong data-count={s.count ?? undefined}>{s.v}</strong>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="next" aria-labelledby="next">
        <h2 id="next" className="mono muted type">
          Read next
        </h2>
        <div className="pair">
          {READ_NEXT.map((r) => (
            <div key={r.title} className="next-item is-soon">
              <div className="photo">
                <img src={r.photo.src} alt={r.alt} loading="lazy" />
              </div>
              <h3>
                {r.title}
                <span className="soon mono">Soon</span>
              </h3>
              <p className="mono muted">
                {r.kind} · {r.photo.credit}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
