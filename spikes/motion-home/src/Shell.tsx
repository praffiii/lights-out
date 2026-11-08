/**
 * Everything that outlives a page: theme, smooth scroll and the velocity clock, the loader, Header B,
 * the menu and the page transition. Pages only say what plays when they enter (see motion.ts).
 */
import { Outlet, useRouter, useRouterState } from '@tanstack/react-router'
import type Lenis from 'lenis'
import { ReactLenis, useLenis } from 'lenis/react'
import {
  type ComponentPropsWithoutRef,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { MENU, NEXT_SESSION_IN_S, PHOTOS } from './content'
import { bar, ensureBar, enter, gsap, leave, REDUCED, ScrollTrigger } from './motion'
import { Roll } from './Roll'
import type { Theme } from './tokens'

type Mode = Theme | 'system'
const systemDark = matchMedia('(prefers-color-scheme: dark)')
const savedMode = (): Mode => {
  const t = localStorage.getItem('theme')
  return t === 'light' || t === 'dark' ? t : 'system'
}

type Shell = { theme: Theme; mode: Mode; setMode: (m: Mode) => void; go: (to: string) => void }
const ShellContext = createContext<Shell | null>(null)
export function useShell() {
  const shell = useContext(ShellContext)
  if (!shell) throw new Error('useShell outside <Shell>')
  return shell
}

/** A real link that runs the page transition; new-tab clicks stay native. */
export function Go({ to, onClick, ...rest }: { to: string } & Omit<ComponentPropsWithoutRef<'a'>, 'href'>) {
  const { go } = useShell()
  return (
    <a
      href={to}
      {...rest}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
        e.preventDefault()
        go(to)
      }}
    />
  )
}

export function Shell() {
  const router = useRouter()
  const path = useRouterState({ select: (s) => s.location.pathname })
  const [mode, setMode] = useState<Mode>(savedMode)
  const [systemTheme, setSystemTheme] = useState<Theme>(systemDark.matches ? 'dark' : 'light')
  const theme = mode === 'system' ? systemTheme : mode
  const [menuOpen, setMenuOpen] = useState(false)
  const lenis = useLenis()
  const main = useRef<HTMLElement>(null)
  const header = useRef<HTMLElement>(null)
  const sweep = useRef<HTMLDivElement>(null)
  const busy = useRef(false)

  useEffect(() => {
    const on = () => setSystemTheme(systemDark.matches ? 'dark' : 'light')
    systemDark.addEventListener('change', on)
    return () => systemDark.removeEventListener('change', on)
  }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    if (mode === 'system') localStorage.removeItem('theme')
    else localStorage.setItem('theme', mode)
  }, [mode, theme])

  // Lenis runs on GSAP's ticker, so scroll, ScrollTrigger and every tween share one clock.
  useEffect(() => {
    if (!lenis) return
    lenis.on('scroll', ScrollTrigger.update)
    const raf = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(raf)
      lenis.off('scroll', ScrollTrigger.update)
    }
  }, [lenis])

  // The velocity clock: scroll speed widens display type (wdth 100 → 112), fast to rise, slow to settle.
  useEffect(() => {
    if (!lenis || !main.current) return
    const el = main.current
    let w = 0
    let shown = 0
    const tick = () => {
      const target = Math.min(12, Math.abs(lenis.velocity) * 0.3)
      w += (target - w) * (target > w ? 0.2 : 0.05)
      if (Math.abs(w - shown) > 0.05) {
        shown = w
        el.style.setProperty('--wdth', (100 + w).toFixed(2))
      }
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [lenis])

  // Header B steps aside while you scroll down and comes back, filled, when you scroll up.
  useEffect(() => {
    const el = header.current
    if (!el) return
    const st = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        const y = self.scroll()
        el.classList.toggle('away', y > 200 && self.direction === 1)
        el.classList.toggle('solid', y > 10)
      },
    })
    return () => st.kill()
  }, [])

  useEffect(() => {
    if (!lenis) return
    if (menuOpen) lenis.stop()
    else lenis.start()
  }, [menuOpen, lenis])

  const go = useCallback(
    async (to: string) => {
      if (busy.current) return
      if (to === path) {
        setMenuOpen(false)
        scrollTop(lenis, false)
        return
      }
      busy.current = true
      const bar = sweep.current
      if (!REDUCED && bar && main.current) {
        gsap.set(bar, { transformOrigin: 'left center' })
        await Promise.all([
          gsap.to(bar, { scaleX: 1, duration: 0.32, ease: 'launch' }),
          gsap.to(main.current, { autoAlpha: 0, duration: 0.2, delay: 0.1, ease: 'power2.in' }),
        ])
      }
      leave()
      setMenuOpen(false)
      await router.navigate({ to })
      scrollTop(lenis, true)
      ScrollTrigger.refresh()
      if (main.current) gsap.set(main.current, { autoAlpha: 1 })
      enter()
      if (!REDUCED && bar) {
        gsap.set(bar, { transformOrigin: 'right center' })
        await gsap.to(bar, { scaleX: 0, duration: 0.3, ease: 'launch' })
      }
      busy.current = false
    },
    [path, router, lenis],
  )

  return (
    <ShellContext.Provider value={{ theme, mode, setMode, go }}>
      {!REDUCED && <ReactLenis root options={{ autoRaf: false, lerp: 0.1, anchors: true }} />}
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Loader theme={theme} />
      <header ref={header} className={`header${menuOpen ? ' menu-open' : ''}`}>
        <Go to="/" className="logo" aria-label="Lights Out, home">
          <span className="dots" aria-hidden>
            <i /><i /><i /><i /><i />
          </span>
          Lights Out
        </Go>
        <WeekendBox />
        <button
          className="menu-btn mono"
          aria-expanded={menuOpen}
          aria-controls="menu"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <Roll text={menuOpen ? 'Close' : 'Menu'} />
          <span className="bars" aria-hidden>
            <i /><i />
          </span>
        </button>
      </header>
      <Menu open={menuOpen} onClose={() => setMenuOpen(false)} path={path} />
      <main id="main" ref={main} tabIndex={-1}>
        <Outlet />
      </main>
      <div className="sweep" ref={sweep} aria-hidden />
      <SpikePanel />
    </ShellContext.Provider>
  )
}

function scrollTop(lenis: Lenis | undefined, immediate: boolean) {
  if (lenis) lenis.scrollTo(0, { immediate, force: true })
  else window.scrollTo({ top: 0, behavior: immediate || REDUCED ? 'instant' : 'smooth' })
}

/**
 * The loader is the start lights: five dots light with real progress (fonts, the hero photo), then all go
 * out together and the page launches. Capped at 2.6 s; skipped under reduced motion.
 */
function Loader({ theme }: { theme: Theme }) {
  const [lit, setLit] = useState(0)
  const [out, setOut] = useState(false)
  const [gone, setGone] = useState(REDUCED)
  const [pct, setPct] = useState(0)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (REDUCED) {
      enter()
      return
    }
    const hero = new Image()
    hero.src = theme === 'dark' ? PHOTOS.heroDark.src : PHOTOS.heroLight.src
    const tasks = [document.fonts.ready, hero.decode()]
    let done = 0
    for (const t of tasks) void t.catch(() => {}).finally(() => setPct(Math.round((++done / tasks.length) * 100)))
    const t0 = performance.now()
    let shown = 0
    let call: gsap.core.Tween | undefined
    const step = () => {
      const progress = done / tasks.length
      const goal = performance.now() - t0 > 1800 ? 5 : Math.ceil(progress * 5)
      if (shown < goal) setLit(++shown)
      if (shown < 5) {
        call = gsap.delayedCall(0.14, step)
        return
      }
      // all five on, a short hold, then lights out
      call = gsap.delayedCall(0.2 + Math.random() * 0.3, () => {
        setOut(true)
        call = gsap.delayedCall(0.18, () => {
          enter()
          gsap.to(root.current, {
            clipPath: 'inset(0% 0% 100% 0%)',
            duration: 0.7,
            ease: 'launch',
            onComplete: () => setGone(true),
          })
        })
      })
    }
    step()
    return () => void call?.kill()
  }, [])

  if (gone) return null
  return (
    <div className="loader" ref={root} role="status" aria-label="Loading">
      <div className="lights" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <i key={i} className={!out && i < lit ? 'on' : undefined} />
        ))}
      </div>
      <p className="mono muted">{out ? 'Lights out' : `Loading · ${pct}%`}</p>
    </div>
  )
}

/** Broadcast-style timing graphic. Spike data: counts down to a session set at load. */
function WeekendBox() {
  const [left, setLeft] = useState(NEXT_SESSION_IN_S)
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [])
  const hms = [left / 3600, (left % 3600) / 60, left % 60].map((n) => String(Math.floor(n)).padStart(2, '0')).join(':')
  return (
    <a className="weekend mono" href="#weekend" aria-label={`São Paulo GP, Practice 3 in ${hms}`}>
      <b>São Paulo GP</b>
      <span className="sep">|</span>
      <span>Practice 3 in</span>
      <b>{hms}</b>
      <span aria-hidden>↓</span>
    </a>
  )
}

function Menu({ open, onClose, path }: { open: boolean; onClose: () => void; path: string }) {
  const { mode, setMode } = useShell()
  const root = useRef<HTMLDivElement>(null)
  const tl = useRef<gsap.core.Timeline>(null)
  const [active, setActive] = useState(0)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    const el = root.current
    if (!el) return
    if (open) {
      setHidden(false)
      const current = Math.max(0, MENU.findIndex((m) => m.to === path))
      setActive(current)
      requestAnimationFrame(() => el.querySelector<HTMLElement>('nav a')?.focus({ preventScroll: true }))
      if (REDUCED) return
      tl.current?.kill()
      tl.current = gsap
        .timeline()
        .fromTo(el, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: 'launch' })
        .from(el.querySelectorAll('.subs > *'), { autoAlpha: 0, x: -8, duration: 0.5, stagger: 0.02 }, 0.7)
        .from(el.querySelector('.foot'), { autoAlpha: 0, duration: 0.4 }, 0.8)
      // the links arrive as a staircase of sector bars, and the photo behind a bar of its own
      el.querySelectorAll<HTMLElement>('nav .line').forEach((line, i) => {
        const link = line.firstElementChild
        if (!link) return
        gsap.set(link, { visibility: 'hidden' })
        bar(tl.current!, ensureBar(line), link, 0.3 + i * 0.07, 0.32)
      })
      const ph = el.querySelector<HTMLElement>('figure .ph')
      if (ph) {
        const imgs = ph.querySelectorAll('img')
        gsap.set(imgs, { opacity: 0 })
        bar(tl.current, ensureBar(ph), imgs, 0.3, 0.5)
        tl.current.set(imgs, { opacity: 1 }, 0.92).fromTo(ph, { scale: 1.06 }, { scale: 1, duration: 1.2 }, 0.92)
      }
    } else if (!hidden) {
      document.querySelector<HTMLElement>('.menu-btn')?.focus({ preventScroll: true })
      if (REDUCED || !tl.current) {
        setHidden(true)
        return
      }
      tl.current.kill()
      tl.current = gsap
        .timeline({ onComplete: () => setHidden(true) })
        .to(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.5, ease: 'launch' })
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [open, onClose])

  // swap the photo with a short sector wipe
  const shown = useRef(active)
  useEffect(() => {
    const el = root.current?.querySelectorAll<HTMLElement>('figure img')[active]
    if (!el || shown.current === active) return
    shown.current = active
    if (!REDUCED) gsap.fromTo(el, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.5, ease: 'launch' })
  }, [active])

  const photo = MENU[active].photo
  return (
    <div className="menu" id="menu" ref={root} hidden={hidden} role="dialog" aria-modal="true" aria-label="Menu">
      <nav aria-label="Pages">
        <ol>
          {MENU.map((m, i) => (
            <li key={m.label} className={m.to === path ? 'on' : undefined} onPointerEnter={() => setActive(i)}>
              <span className="line">
                {m.to ? (
                  <Go to={m.to} onFocus={() => setActive(i)} aria-current={m.to === path ? 'page' : undefined}>
                    <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                    <Roll text={m.label} />
                  </Go>
                ) : (
                  <span className="off" aria-disabled title="Not in this spike">
                    <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                    {m.label}
                  </span>
                )}
              </span>
              {'subs' in m && (
                <div className="subs mono">
                  {m.subs.map((c) =>
                    c.to ? (
                      <Go key={c.n} to={c.to} aria-current={c.to === path ? 'page' : undefined}>
                        <Roll text={`${c.n} ${c.title}`} />
                      </Go>
                    ) : (
                      <span key={c.n} className="muted">
                        {c.n} {c.title}
                      </span>
                    ),
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <figure>
        <div className="ph">
          {MENU.map((m, i) => (
            <img key={m.label} src={m.photo.src} alt="" style={{ visibility: i === active ? 'visible' : 'hidden', zIndex: i === active ? 1 : 0 }} />
          ))}
        </div>
        <figcaption className="mono muted">
          <span>{photo.place}</span>
          <span>{photo.credit}</span>
        </figcaption>
      </figure>
      <div className="foot mono">
        <span className="muted">Theme</span>
        <div className="seg" role="group" aria-label="Theme">
          {(['light', 'dark', 'system'] as const).map((m) => (
            <button key={m} className="mono" aria-pressed={mode === m} onClick={() => setMode(m)}>
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function SpikePanel() {
  const reload = (reduced: boolean) => {
    const u = new URL(location.href)
    if (reduced) u.searchParams.set('reduced', '')
    else u.searchParams.delete('reduced')
    location.href = u.toString()
  }
  return (
    <aside className="spike-panel mono" aria-label="Spike controls">
      <span className="muted">Motion spike · throwaway</span>
      <div className="row">
        <span className="muted">Motion</span>
        <button aria-pressed={!REDUCED} onClick={() => reload(false)}>Full</button>
        <button aria-pressed={REDUCED} onClick={() => reload(true)}>Reduced</button>
      </div>
    </aside>
  )
}

