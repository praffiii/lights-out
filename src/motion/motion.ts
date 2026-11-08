import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

export { gsap, ScrollTrigger, SplitText, useGSAP }

const browser = typeof window !== 'undefined'

if (browser) {
  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, useGSAP)
  CustomEase.create('launch', '0.8,0,0.15,1')
  CustomEase.create('brake', '0.05,0.7,0.1,1')
  gsap.defaults({ ease: 'brake', duration: 0.9 })
}

export const REDUCED = browser && (matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).has('reduced'))

export const HOVER = browser && matchMedia('(hover: hover) and (pointer: fine)').matches

let entered = false
const waiting = new Set<() => void>()

export function onEnter(fn: () => void) {
  if (entered) fn()
  else waiting.add(fn)

  return () => void waiting.delete(fn)
}

export function enter() {
  entered = true
  document.documentElement.dataset.entered = ''

  for (const fn of waiting) fn()

  waiting.clear()
}

export function leave() {
  entered = false
  delete document.documentElement.dataset.entered
}

export const ONCE = { toggleActions: 'play none none none' } as const

type When = { delay?: number; scroll?: boolean; trigger?: Element; start?: string }

const timeline = (el: Element, o: When) =>
  gsap.timeline({
    delay: o.delay ?? 0,
    scrollTrigger: o.scroll === false ? undefined : { trigger: o.trigger ?? el, start: o.start ?? 'top 88%', ...ONCE },
  })

export const ensureBar = (el: Element) => el.querySelector(':scope > .bar') ?? el.appendChild(Object.assign(document.createElement('i'), { className: 'bar' }))

export function bar(tl: gsap.core.Timeline, el: Element, content: gsap.TweenTarget, at: number, drawFor = 0.4) {
  tl.fromTo(el, { scaleX: 0, scaleY: 0.08, transformOrigin: 'left bottom' }, { scaleX: 1, duration: drawFor, ease: 'launch' }, at)
    .to(el, { scaleY: 1, duration: 0.16 }, at + drawFor - 0.04)
    .set(content, { visibility: 'inherit', opacity: 1 }, at + drawFor + 0.12)
    .set(el, { transformOrigin: 'right bottom' }, at + drawFor + 0.12)
    .to(el, { scaleX: 0, duration: 0.42, ease: 'launch' }, at + drawFor + 0.12)
}

export function sweep(el: HTMLElement, o: When = {}) {
  if (REDUCED) return

  let tl: gsap.core.Timeline | undefined
  let started = false

  SplitText.create(el, {
    type: 'lines,words',
    linesClass: 'sl',
    aria: 'none',
    autoSplit: true,
    onSplit: (self) => {
      tl?.scrollTrigger?.kill()
      tl?.kill()

      if (started) return

      gsap.set(self.words, { opacity: 0 })

      const t = timeline(el, o).eventCallback('onStart', () => void (started = true))

      tl = t
      self.lines.forEach((line, i) => {
        const b = document.createElement('i')

        b.className = 'bar'
        b.setAttribute('aria-hidden', 'true')
        line.appendChild(b)
        bar(
          t,
          b,
          self.words.filter((w) => line.contains(w)),
          i * 0.08,
        )
      })
    },
  })
}

export function reveal(el: HTMLElement, o: When & { drift?: boolean } = {}) {
  if (REDUCED) return

  const img = el.querySelector('img')

  if (!img) return

  const b = ensureBar(el)

  gsap.set(img, { opacity: 0 })

  const tl = timeline(el, { start: 'top 82%', ...o })

  bar(tl, b, img, 0, 0.55)
  tl.fromTo(img, { scale: 1.18 }, { scale: 1, duration: 1.4 }, 0.67)

  if (o.drift !== false)
    gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } })
}

export function block(el: HTMLElement, o: When = {}) {
  if (REDUCED) return

  const b = ensureBar(el)

  gsap.set(el, { visibility: 'hidden' })
  bar(timeline(el, o), b, el, 0, 0.35)
}

export function draw(els: Element[] | NodeListOf<Element>, trigger: Element) {
  if (REDUCED) return

  gsap.from(els, { scaleX: 0, transformOrigin: 'left center', duration: 1.2, stagger: 0.06, scrollTrigger: { trigger, start: 'top 85%', ...ONCE } })
}

export function roll(el: HTMLElement, o: { from?: number } = {}) {
  const text = (el.dataset.text ??= el.textContent ?? '')
  const digits = text.replace(/[^\d]/g, '')

  if (REDUCED || !digits) return

  const from = String(o.from ?? 0)
    .padStart(digits.length, '0')
    .slice(-digits.length)

  el.textContent = ''

  const span = (className: string, textContent = '') => Object.assign(document.createElement('span'), { className, textContent })
  const strips: { strip: HTMLElement; n: number }[] = []
  let d = 0

  for (const ch of text) {
    if (!/\d/.test(ch)) {
      el.appendChild(span('ch', ch === ' ' ? ' ' : ch))
      continue
    }

    const f = Number(from[d])
    const t = Number(ch)
    const n = f === t && o.from !== undefined ? 0 : 10 + ((t - f + 10) % 10)
    const col = span('dg')
    const strip = span('strip')

    for (let k = 0; k <= n; k++) strip.appendChild(span('', String((f + k) % 10)))

    col.appendChild(strip)
    el.appendChild(col)
    strips.push({ strip, n })
    d++
  }

  for (const child of el.children) child.setAttribute('aria-hidden', 'true')

  el.appendChild(span('sr', text))

  const tl = timeline(el, { start: 'top 90%' })

  strips.forEach(({ strip, n }, i) => {
    if (n) tl.fromTo(strip, { yPercent: 0 }, { yPercent: (-100 * n) / (n + 1), duration: 1.1 + i * 0.12, ease: 'power3.inOut' }, 0)
  })
}
