import { useCallback, useEffect, useRef } from 'react'

import { frameSrc, nearestLoaded, WING_FRAMES } from '#/drs/wing.ts'

export function useWing(near: boolean, first: number) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const images = useRef(new Map<number, HTMLImageElement>())
  const want = useRef(first)
  const drawn = useRef<number | null>(null)

  const draw = useCallback(() => {
    const el = canvas.current
    const i = nearestLoaded(new Set(images.current.keys()), want.current)
    const image = i === null ? undefined : images.current.get(i)
    const ctx = el?.getContext('2d')

    if (!el || !ctx || !image || i === drawn.current) return

    ctx.drawImage(image, 0, 0, el.width, el.height)
    drawn.current = i
    el.dataset.frame = String(i)
  }, [])

  const show = useCallback(
    (frame: number) => {
      want.current = frame
      draw()
    },
    [draw],
  )

  useEffect(() => {
    if (!near) return

    const loading = Array.from({ length: WING_FRAMES }, (_, i) => {
      const image = new Image()

      image.onload = () => {
        images.current.set(i, image)
        draw()
      }

      image.src = frameSrc(i)

      return image
    })

    return () => {
      for (const image of loading) image.onload = null
    }
  }, [near, draw])

  return { canvas, show }
}
