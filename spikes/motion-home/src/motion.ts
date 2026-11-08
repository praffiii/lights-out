/**
 * The motion system in one place: plugins, the two eases, reduced motion, the page-enter signal and the
 * small reusable moves every section is built from. Everything runs on GSAP's ticker (Lenis included).
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

const whenIn = (el: Element, start = 'top 85%') => ({ trigger: el, start, once: true })

/** Display lines rise from behind a mask, 60 ms apart. The headline move. */
export function rise(el: HTMLElement, opts: { delay?: number; scroll?: boolean } = {}) {
  if (REDUCED) return
  SplitText.create(el, {
    type: 'lines',
    mask: 'lines',
    autoSplit: true,
    onSplit: (self) =>
      gsap.from(self.lines, {
        yPercent: 110,
        duration: 1.1,
        stagger: 0.06,
        delay: opts.delay ?? 0,
        scrollTrigger: opts.scroll === false ? undefined : whenIn(el),
      }),
  })
}

/** Mono labels type on like a timing feed: a clip that steps forward one character at a time, purple caret at its edge. */
export function typeOn(el: HTMLElement, opts: { delay?: number; scroll?: boolean } = {}) {
  if (REDUCED) return
  const chars = Math.max(1, el.textContent?.length ?? 1)
  el.classList.add('typing')
  gsap.fromTo(
    el,
    { '--type': 0 },
    {
      '--type': 1,
      duration: Math.min(0.9, chars * 0.022),
      ease: `steps(${chars})`,
      delay: opts.delay ?? 0,
      scrollTrigger: opts.scroll === false ? undefined : whenIn(el, 'top 92%'),
      onComplete: () => el.classList.remove('typing'),
    },
  )
}

/** Hairlines draw from the left, like a sector bar filling. */
export function draw(els: Element[] | NodeListOf<Element>, trigger: Element, axis: 'x' | 'y' = 'x') {
  if (REDUCED) return
  gsap.from(els, {
    [axis === 'x' ? 'scaleX' : 'scaleY']: 0,
    transformOrigin: axis === 'x' ? 'left center' : 'center top',
    duration: 1.2,
    stagger: 0.06,
    scrollTrigger: whenIn(trigger),
  })
}

/** Numbers count up like a live readout. Tabular figures keep the width still while they run. */
export function countUp(el: HTMLElement, opts: { from?: number; decimals?: number; group?: boolean } = {}) {
  const text = el.textContent ?? ''
  const match = text.match(/[\d,.]+/)
  if (REDUCED || !match) return
  const to = Number(match[0].replace(/,/g, ''))
  const decimals = opts.decimals ?? (match[0].split('.')[1]?.length ?? 0)
  const fmt = (v: number) =>
    text.replace(
      match[0],
      opts.group ? v.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : v.toFixed(decimals),
    )
  const box = { v: opts.from ?? 0 }
  el.textContent = fmt(box.v)
  gsap.to(box, {
    v: to,
    duration: 1.6,
    scrollTrigger: whenIn(el, 'top 90%'),
    onUpdate: () => void (el.textContent = fmt(box.v)),
  })
}

/** Photos are revealed by a wipe, left to right, like a sector bar on a timing screen; then they drift slower than the page. */
export function wipe(el: HTMLElement, opts: { delay?: number; scroll?: boolean; drift?: boolean; from?: 'left' | 'bottom' } = {}) {
  if (REDUCED) return
  const hidden = opts.from === 'bottom' ? 'inset(100% 0% 0% 0%)' : 'inset(0% 100% 0% 0%)'
  gsap.fromTo(
    el,
    { clipPath: hidden },
    {
      clipPath: 'inset(0% 0% 0% 0%)',
      duration: 1.3,
      ease: 'launch',
      delay: opts.delay ?? 0,
      scrollTrigger: opts.scroll === false ? undefined : whenIn(el, 'top 80%'),
    },
  )
  const img = el.querySelector('img')
  if (img && opts.drift !== false) {
    gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } })
  }
}
