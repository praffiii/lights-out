import { type PointerEvent, type RefObject, useRef } from 'react'

import { gsap, HOVER, REDUCED, useGSAP } from '#/motion/motion.ts'

import type { Photo } from './content.ts'

type Rider = { x: gsap.QuickToFunc; y: gsap.QuickToFunc; at: number; z: number }

export function usePreview(scope: RefObject<HTMLElement | null>, photos: ReadonlyArray<Photo>) {
  const preview = useRef<HTMLDivElement>(null)
  const ride = useRef<Rider | null>(null)

  const { contextSafe } = useGSAP(
    () => {
      const card = preview.current

      if (!card || !HOVER || REDUCED) return

      let last = 0
      const lean = gsap.quickTo(card, 'rotation', { duration: 0.5, ease: 'power3.out' })

      const tick = () => {
        const x = Number(gsap.getProperty(card, 'x'))

        if (x !== last || Number(gsap.getProperty(card, 'rotation')) !== 0) lean(gsap.utils.clamp(-12, 12, (x - last) * 0.4))

        last = x
      }

      gsap.ticker.add(tick)

      return () => gsap.ticker.remove(tick)
    },
    { scope },
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

  const card = (
    <div className="preview" ref={preview} aria-hidden>
      <div className="card">
        {photos.map((p) => (
          <img key={p.src} src={p.src} alt="" loading="lazy" />
        ))}
      </div>
    </div>
  )

  return { onRows, show, card }
}
