import { Outlet, useRouter, useRouterState } from '@tanstack/react-router'
import type Lenis from 'lenis'
import { ReactLenis, useLenis } from 'lenis/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useMounted } from '#/motion/client.ts'
import { enter, gsap, leave, REDUCED, ScrollTrigger } from '#/motion/motion.ts'

import { ShellContext, type To } from './context.ts'
import { Footer } from './Footer.tsx'
import { Header } from './Header.tsx'
import { Loader } from './Loader.tsx'
import { Menu } from './Menu.tsx'
import { useTheme } from './theme.ts'

function scrollTop(lenis: Lenis | undefined, immediate: boolean) {
  if (lenis) lenis.scrollTo(0, { immediate, force: true })
  else window.scrollTo({ top: 0, behavior: immediate || REDUCED ? 'instant' : 'smooth' })
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
    async (to: To) => {
      if (busy.current) return

      if (to === path) {
        setMenuOpen(false)
        scrollTop(lenis, false)

        return
      }

      busy.current = true

      const line = sweepBar.current
      const page = [main.current, document.querySelector('.footer')].filter((el) => el !== null)

      if (!REDUCED && line) {
        gsap.set(line, { transformOrigin: 'left center' })
        await Promise.all([
          gsap.to(line, { scaleX: 1, duration: 0.32, ease: 'launch' }),
          gsap.to(page, { autoAlpha: 0, duration: 0.2, delay: 0.1, ease: 'power2.in' }),
        ])
      }

      leave()
      setMenuOpen(false)
      await router.navigate({ href: to })
      scrollTop(lenis, true)
      ScrollTrigger.refresh()
      gsap.set(page, { autoAlpha: 1 })
      enter()

      if (!REDUCED && line) {
        gsap.set(line, { transformOrigin: 'right center' })
        await gsap.to(line, { scaleX: 0, duration: 0.3, ease: 'launch' })
      }

      busy.current = false
    },
    [path, router, lenis],
  )

  const api = useMemo(() => ({ go }), [go])
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
      <div className="sweep" ref={sweepBar} aria-hidden />
    </ShellContext.Provider>
  )
}
