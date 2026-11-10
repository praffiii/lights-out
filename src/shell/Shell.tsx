import { Outlet, useRouter, useRouterState } from '@tanstack/react-router'
import type Lenis from 'lenis'
import { ReactLenis, useLenis } from 'lenis/react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { useMounted } from '#/motion/client.ts'
import { enter, gsap, leave, REDUCED, ScrollTrigger } from '#/motion/motion.ts'

import { type Dive, ShellContext, type To } from './context.ts'
import { Footer } from './Footer.tsx'
import { Header } from './Header.tsx'
import { Loader } from './Loader.tsx'
import { Menu } from './Menu.tsx'
import { useTheme } from './theme.ts'

function scrollTop(lenis: Lenis | undefined, immediate: boolean) {
  if (lenis) lenis.scrollTo(0, { immediate, force: true })
  else window.scrollTo({ top: 0, behavior: immediate || REDUCED ? 'instant' : 'smooth' })
}

const FULL = 'inset(0px 0px 0px 0px)'

const inset = ({ top, right, bottom, left }: Dive['rect']) => `inset(${top}px ${innerWidth - right}px ${innerHeight - bottom}px ${left}px)`

const place = ({ left, top, width, height }: Dive['image']) => ({ backgroundSize: `${width}px ${height}px`, backgroundPosition: `${left}px ${top}px` })

const spread = ({ width, height }: Dive['image']) => {
  const w = Math.max(innerWidth, (innerHeight * width) / height)
  const h = (w * height) / width

  return place({ left: (innerWidth - w) / 2, top: (innerHeight - h) / 2, width: w, height: h })
}

export function Shell() {
  const router = useRouter()
  const path = useRouterState({ select: (s) => s.location.pathname })
  const mounted = useMounted()
  const { theme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const lenis = useLenis()
  const main = useRef<HTMLElement>(null)
  const sweepBar = useRef<HTMLDivElement>(null)
  const busy = useRef(false)
  const veil = useRef<HTMLDivElement>(null)
  const left = useRef<{ path: string; y: number; dive: Dive | undefined } | null>(null)
  const bare = path.startsWith('/lap/')

  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme
  }, [theme])

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

  useEffect(() => {
    const el = main.current

    if (!lenis || !el) return

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

  useEffect(() => {
    if (!lenis) return

    if (menuOpen) lenis.stop()
    else lenis.start()
  }, [menuOpen, lenis])

  const go = useCallback(
    async (to: To, dive?: Dive) => {
      if (busy.current) return

      if (to === path) {
        setMenuOpen(false)
        scrollTop(lenis, false)

        return
      }

      busy.current = true

      const line = sweepBar.current
      const cover = veil.current
      const page = [main.current, document.querySelector('.footer')].filter((el) => el !== null)
      const diving = dive !== undefined && !REDUCED && cover !== null

      if (diving) {
        gsap.set(cover, { autoAlpha: 0, clipPath: inset(dive.rect), backgroundImage: `url("${dive.poster}")`, ...place(dive.image) })
        await Promise.all([gsap.to(cover, { autoAlpha: 1, duration: 0.18, ease: 'power1.out' }), gsap.to(cover, { clipPath: FULL, ...spread(dive.image), duration: 0.8, ease: 'launch' })])
      } else if (!REDUCED && line) {
        gsap.set(line, { transformOrigin: 'left center' })
        await Promise.all([
          gsap.to(line, { scaleX: 1, duration: 0.32, ease: 'launch' }),
          gsap.to(page, { autoAlpha: 0, duration: 0.2, delay: 0.1, ease: 'power2.in' }),
        ])
      }

      if (to.startsWith('/lap/')) left.current = { path, y: scrollY, dive: diving ? dive : undefined }

      leave()
      setMenuOpen(false)
      await router.navigate({ href: to })
      scrollTop(lenis, true)
      ScrollTrigger.refresh()
      gsap.set(page, { autoAlpha: 1 })
      enter()

      if (diving) await gsap.to(cover, { autoAlpha: 0, duration: 0.35, delay: 0.1, ease: 'power1.out' })
      else if (!REDUCED && line) {
        gsap.set(line, { transformOrigin: 'right center' })
        await gsap.to(line, { scaleX: 0, duration: 0.3, ease: 'launch' })
      }

      busy.current = false
    },
    [path, router, lenis],
  )

  const surface = useCallback(async () => {
    const cover = veil.current
    const dive = left.current?.dive

    if (REDUCED || !cover || !dive) return

    gsap.set(cover, { autoAlpha: 0, clipPath: FULL, backgroundImage: `url("${dive.poster}")`, ...spread(dive.image) })
    await gsap.to(cover, { autoAlpha: 1, duration: 0.3, ease: 'power1.inOut' })
  }, [])

  useLayoutEffect(() => {
    const back = left.current
    const cover = veil.current
    const dive = back?.dive

    if (!back || back.path !== path) return

    left.current = null

    const shrink = !REDUCED && cover !== null && dive !== undefined

    if (shrink) gsap.set(cover, { autoAlpha: 1 })

    requestAnimationFrame(() => {
      scrollTo({ top: back.y, behavior: 'instant' })
      ScrollTrigger.refresh()

      for (const seen of ScrollTrigger.getAll()) if (!seen.vars.scrub && seen.start <= scrollY) seen.animation?.progress(1)

      if (shrink) gsap.timeline().to(cover, { clipPath: inset(dive.rect), ...place(dive.image), duration: 0.8, ease: 'launch' }).to(cover, { autoAlpha: 0, duration: 0.35, ease: 'power1.out' })
    })
  }, [path])

  const api = useMemo(() => ({ go, surface }), [go, surface])
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  return (
    <ShellContext.Provider value={api}>
      {mounted && !REDUCED && !bare && <ReactLenis root options={{ autoRaf: false, lerp: 0.1, anchors: true }} />}
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Loader />
      {bare ? null : (
        <>
          <Header menuOpen={menuOpen} onMenu={() => setMenuOpen((o) => !o)} home={path === '/'} />
          <Menu open={menuOpen} onClose={closeMenu} path={path} />
        </>
      )}
      <main id="main" ref={main} tabIndex={-1}>
        <Outlet />
      </main>
      {bare ? null : <Footer />}
      <div className="veil" ref={veil} aria-hidden />
      <div className="sweep" ref={sweepBar} aria-hidden />
    </ShellContext.Provider>
  )
}
