/**
 * The motion system in one place. One signature move, the sector bar, at every scale: a thin purple line runs
 * under a line of text (a sector completing on a timing screen), thickens into a block, and pulls away to the
 * right leaving the content behind. Numbers roll like a timing tower. Everything runs on GSAP's ticker.
 */
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, useGSAP)
CustomEase.create('launch', '0.8,0,0.15,1') // hold, then a violent start
CustomEase.create('brake', '0.05,0.7,0.1,1') // fast arrival, long settle
gsap.defaults({ ease: 'brake', duration: 0.9 })

export { gsap, ScrollTrigger, SplitText, useGSAP }

/** Reduced motion: the system setting, or ?reduced to preview it. Everything then shows in its final state. */
export const REDUCED =
  matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).has('reduced')
export const HOVER = matchMedia('(hover: hover) and (pointer: fine)').matches

/* Page enter: the loader (first load) or the page transition (later) says when the page may play its intro. */
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

/**
 * Play a reveal the first time its start is reached, and never reverse it. Not `once: true`: a once-trigger kills
 * itself when its end is passed, and when the page loads already scrolled down (the browser restores the position)
 * that kill lands inside ScrollTrigger's refresh loop, which then reads a missing trigger and crashes the page.
 */
export const ONCE = { toggleActions: 'play none none none' } as const

type When = { delay?: number; scroll?: boolean; trigger?: Element; start?: string }
const timeline = (el: Element, o: When) =>
  gsap.timeline({
    delay: o.delay ?? 0,
    scrollTrigger: o.scroll === false ? undefined : { trigger: o.trigger ?? el, start: o.start ?? 'top 88%', ...ONCE },
  })

/** The bar element inside `el` (made once, so a re-run never stacks two). */
export const ensureBar = (el: Element) =>
  el.querySelector(':scope > .bar') ?? el.appendChild(Object.assign(document.createElement('i'), { className: 'bar' }))

/** The bar's three beats on one target: draw thin along the baseline, thicken, show the content, pull away. */
export function bar(tl: gsap.core.Timeline, el: Element, content: gsap.TweenTarget, at: number, draw = 0.4) {
  tl.fromTo(el, { scaleX: 0, scaleY: 0.08, transformOrigin: 'left bottom' }, { scaleX: 1, duration: draw, ease: 'launch' }, at)
    .to(el, { scaleY: 1, duration: 0.16 }, at + draw - 0.04)
    .set(content, { visibility: 'inherit' }, at + draw + 0.12)
    .set(el, { transformOrigin: 'right bottom' }, at + draw + 0.12)
    .to(el, { scaleX: 0, duration: 0.42, ease: 'launch' }, at + draw + 0.12)
}

/** Text: every line gets its own bar, 80 ms after the line above, so a paragraph arrives as a staircase. */
export function sweep(el: HTMLElement, o: When = {}) {
  if (REDUCED) return
  let tl: gsap.core.Timeline | undefined
  let started = false
  SplitText.create(el, {
    type: 'lines,words',
    linesClass: 'sl',
    autoSplit: true,
    // A re-split (fonts landing, a resize) rebuilds the lines with fresh, visible words. If the sweep had already
    // begun, keep them visible rather than replaying it or freezing half way.
    onSplit: (self) => {
      tl?.scrollTrigger?.kill()
      tl?.kill()
      if (started) return
      gsap.set(self.words, { visibility: 'hidden' })
      const t = (tl = timeline(el, o).eventCallback('onStart', () => void (started = true)))
      self.lines.forEach((line, i) => {
        const b = document.createElement('i')
        b.className = 'bar'
        b.setAttribute('aria-hidden', 'true')
        line.append(b)
        bar(t, b, self.words.filter((w) => line.contains(w)), i * 0.08)
      })
    },
  })
}

/** Photos: the bar crosses the whole frame, the photo lands behind it (settling from 1.18×), then drifts. */
export function reveal(el: HTMLElement, o: When & { drift?: boolean } = {}) {
  if (REDUCED) return
  const img = el.querySelector('img')
  if (!img) return
  const b = ensureBar(el)
  gsap.set(img, { visibility: 'hidden' })
  const tl = timeline(el, { start: 'top 82%', ...o })
  bar(tl, b, img, 0, 0.55)
  tl.fromTo(img, { scale: 1.18 }, { scale: 1, duration: 1.4 }, 0.67)
  if (o.drift !== false)
    gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } })
}

/** A small solid thing (a chip, a caption plate): hidden until the bar has crossed it. */
export function block(el: HTMLElement, o: When = {}) {
  if (REDUCED) return
  const b = ensureBar(el)
  gsap.set(el, { visibility: 'hidden' })
  bar(timeline(el, o), b, el, 0, 0.35)
}

/** Hairlines draw from the left, like a sector bar filling. */
export function draw(els: Element[] | NodeListOf<Element>, trigger: Element) {
  if (REDUCED) return
  gsap.from(els, { scaleX: 0, transformOrigin: 'left center', duration: 1.2, stagger: 0.06, scrollTrigger: { trigger, start: 'top 85%', ...ONCE } })
}

/**
 * Numbers roll into place like a timing tower: each digit is a column that spins through a full lap and lands,
 * left column first. `from` keeps leading digits still (a year rolls 1950 → 1973, not from 0000).
 */
export function roll(el: HTMLElement, o: { from?: number } = {}) {
  const text = (el.dataset.text ??= el.textContent ?? '')
  const digits = text.replace(/[^\d]/g, '')
  if (REDUCED || !digits) return
  const from = String(o.from ?? 0).padStart(digits.length, '0').slice(-digits.length)
  el.setAttribute('aria-label', text)
  el.textContent = ''
  const span = (className: string, textContent = '') => Object.assign(document.createElement('span'), { className, textContent })
  const strips: { strip: HTMLElement; n: number }[] = []
  let d = 0
  for (const ch of text) {
    if (!/\d/.test(ch)) {
      el.append(span('ch', ch === ' ' ? '\u00a0' : ch))
      continue
    }
    const f = Number(from[d])
    const t = Number(ch)
    const n = f === t && o.from !== undefined ? 0 : 10 + ((t - f + 10) % 10)
    const col = span('dg')
    const strip = span('strip')
    for (let k = 0; k <= n; k++) strip.append(span('', String((f + k) % 10)))
    col.append(strip)
    el.append(col)
    strips.push({ strip, n })
    d++
  }
  for (const child of el.children) child.setAttribute('aria-hidden', 'true')
  const tl = timeline(el, { start: 'top 90%' })
  strips.forEach(({ strip, n }, i) => {
    if (n) tl.fromTo(strip, { yPercent: 0 }, { yPercent: (-100 * n) / (n + 1), duration: 1.1 + i * 0.12, ease: 'power3.inOut' }, 0)
  })
}
