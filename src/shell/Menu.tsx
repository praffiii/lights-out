import { useEffect, useRef, useState } from 'react'

import { bar, ensureBar, gsap, REDUCED } from '#/motion/motion.ts'
import { Roll } from '#/motion/Roll.tsx'
import { gpName, pickRace, RACE_WHEN } from '#/season/weekend.ts'
import { useSeason } from '#/season/use-season.ts'

import { Go, Soon } from './Go.tsx'
import { MENU } from './menu.ts'
import { type Mode, useTheme } from './theme.ts'

const MODES: ReadonlyArray<Mode> = ['light', 'dark', 'system']

const number = (i: number) => String(i + 1).padStart(2, '0')

export function Menu({ open, onClose, path }: { open: boolean; onClose: () => void; path: string }) {
  const { mode, setMode } = useTheme()
  const root = useRef<HTMLDivElement>(null)
  const tl = useRef<gsap.core.Timeline>(null)
  const [active, setActive] = useState(0)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    const el = root.current

    if (!el) return

    if (open) {
      setHidden(false)
      setActive(Math.max(0, MENU.findIndex((m) => m.to === path)))
      gsap.delayedCall(0, () => el.querySelector<HTMLElement>('nav a')?.focus({ preventScroll: true }))

      if (REDUCED) return

      tl.current?.kill()

      const t = gsap
        .timeline()
        .fromTo(el, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: 'launch' })
        .from(el.querySelectorAll('.subs > *, nav .kicker'), { autoAlpha: 0, x: -8, duration: 0.5, stagger: 0.02 }, 0.7)
        .from(el.querySelector('.foot'), { autoAlpha: 0, duration: 0.4 }, 0.8)

      tl.current = t
      el.querySelectorAll<HTMLElement>('nav .line').forEach((line, i) => {
        const link = line.firstElementChild

        if (!link) return

        gsap.set(link, { visibility: 'hidden' })
        bar(t, ensureBar(line), link, 0.3 + i * 0.07, 0.32)
      })

      const ph = el.querySelector<HTMLElement>('figure .ph')

      if (ph) {
        const imgs = ph.querySelectorAll('img')

        gsap.set(imgs, { opacity: 0 })
        bar(t, ensureBar(ph), imgs, 0.3, 0.5)
        t.set(imgs, { opacity: 1 }, 0.92).fromTo(ph, { scale: 1.06 }, { scale: 1, duration: 1.2 }, 0.92)
      }

      return
    }

    if (hidden) return

    document.querySelector<HTMLElement>('.menu-btn')?.focus({ preventScroll: true })

    if (REDUCED || !tl.current) {
      setHidden(true)

      return
    }

    tl.current.kill()
    tl.current = gsap.timeline({ onComplete: () => setHidden(true) }).to(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.5, ease: 'launch' })
  }, [open])

  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    addEventListener('keydown', onKey)

    return () => removeEventListener('keydown', onKey)
  }, [open, onClose])

  const shown = useRef(active)

  useEffect(() => {
    const el = root.current?.querySelectorAll<HTMLElement>('figure img')[active]

    if (!el || shown.current === active) return

    shown.current = active

    if (!REDUCED) gsap.fromTo(el, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.5, ease: 'launch' })
  }, [active])

  const photo = (MENU[active] ?? MENU[0])?.photo

  return (
    <div className="menu" id="menu" ref={root} hidden={hidden} role="dialog" aria-modal="true" aria-label="Menu">
      <nav aria-label="Pages">
        <ol>
          {MENU.map((m, i) => (
            <li key={m.label} className={m.to === path ? 'on' : undefined} onPointerEnter={() => setActive(i)}>
              {m.weekend && <WeekendLine path={path} />}
              <span className="line">
                {m.to ? (
                  <Go to={m.to} onFocus={() => setActive(i)} aria-current={m.to === path ? 'page' : undefined}>
                    <span className="mono">{number(i)}</span>
                    <Roll text={m.label} />
                  </Go>
                ) : (
                  <Soon className="off">
                    <span className="mono">{number(i)}</span>
                    {m.label}
                  </Soon>
                )}
              </span>
              {m.chapters && (
                <div className="subs">
                  {m.chapters.map((c) => {
                    const row = (
                      <>
                        <span className="mono">{c.n}</span>
                        <span className="title">{c.title.replace(/,.*/, '')}</span>
                        <span className="mono min">{c.min} min</span>
                      </>
                    )

                    return c.to ? (
                      <Go key={c.n} to={c.to} aria-current={c.to === path ? 'page' : undefined}>
                        {row}
                      </Go>
                    ) : (
                      <Soon key={c.n}>{row}</Soon>
                    )
                  })}
                </div>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <figure>
        <div className="ph">
          {MENU.map((m, i) => (
            <img key={m.label} src={m.photo.src} alt="" loading="lazy" style={{ visibility: i === active ? 'visible' : 'hidden', zIndex: i === active ? 1 : 0 }} />
          ))}
        </div>
        {photo && (
          <figcaption className="mono muted">
            <span>{photo.place}</span>
            <span>{photo.credit}</span>
          </figcaption>
        )}
      </figure>
      <div className="foot mono">
        <span className="muted">Theme</span>
        <div className="seg" role="group" aria-label="Theme">
          {MODES.map((m) => (
            <button type="button" key={m} className="mono" aria-pressed={mode === m} onClick={() => setMode(m)}>
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function WeekendLine({ path }: { path: string }) {
  const season = useSeason()
  const picked = season.data ? pickRace(season.data, new Date()) : null

  if (!picked) return null

  return (
    <Go to="/weekend" className="kicker mono" aria-current={path === '/weekend' ? 'page' : undefined}>
      {picked.kind === 'this-weekend' && <i aria-hidden />}
      {`Round ${picked.round} · ${gpName(picked.race)} ${RACE_WHEN[picked.kind]}`}
    </Go>
  )
}
