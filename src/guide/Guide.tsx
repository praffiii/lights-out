import { useRef } from 'react'

import { Next } from '#/chapter/Next.tsx'
import { CHAPTERS, PHOTOS } from '#/home/content.ts'
import { countWord, MINUTES } from '#/home/summary.ts'
import { usePreview } from '#/home/usePreview.tsx'
import { draw, gsap, ONCE, onEnter, REDUCED, reveal, roll, sweep, useGSAP } from '#/motion/motion.ts'
import { Go } from '#/shell/Go.tsx'

import { Race } from './Race.tsx'

const PHOTO_LIST = CHAPTERS.map((c) => c.photo)

const FIGURES = [
  { k: 'Chapters', v: CHAPTERS.length },
  { k: 'Minutes', more: ' to read', v: MINUTES },
  { k: 'Rulebook', v: 2026 },
]

const LAP_S = 1.8

const all = (scope: HTMLElement, selector: string) => [...scope.querySelectorAll<HTMLElement>(selector)]

function hero(scope: HTMLElement) {
  for (const [i, el] of all(scope, '.opening .hl, .opening .label').entries()) sweep(el, { scroll: false, delay: 0.1 + i * 0.1 })
}

function motion(scope: HTMLElement) {
  const list = scope.querySelector('.list')

  for (const el of all(scope, '.race h2 .hl, .next h2')) sweep(el)

  for (const el of all(scope, '.figures .num')) roll(el, { from: el.textContent === '2026' ? 1950 : undefined })

  for (const el of all(scope, '.next .shot')) reveal(el)

  if (list) {
    all(scope, '.list h2').forEach((el, i) => sweep(el, { trigger: list, start: 'top 84%', delay: i * 0.06 }))
    draw(all(scope, '.list .hair'), list)
  }

  if (REDUCED) return

  lap(scope)

  for (const el of all(scope, '.figures p, .race .body')) gsap.from(el, { y: 24, opacity: 0, duration: 0.8, ease: 'brake', clearProps: 'transform', scrollTrigger: { trigger: el, start: 'top 95%', ...ONCE } })
}

function lap(scope: HTMLElement) {
  const ruler = scope.querySelector('.race .ruler')

  if (!ruler) return

  const media = gsap.matchMedia(scope)

  const run = (axis: 'scaleX' | 'scaleY', when: (li: HTMLElement, i: number, n: number) => number) => {
    const items = all(scope, '.race li')
    const tl = gsap.timeline({ scrollTrigger: { trigger: ruler, start: 'top 80%', ...ONCE } }).from(ruler, { [axis]: 0, duration: LAP_S, ease: 'none' })

    items.forEach((li, i) => {
      const from = when(li, i, items.length) * LAP_S

      tl.from(li.querySelector('.tick'), { opacity: 0, duration: 0.2 }, from).from(li.querySelector('a'), { opacity: 0, y: 14, duration: 0.6, clearProps: 'transform' }, from)
    })
  }

  media.add('(min-width: 1200px)', () => run('scaleX', (li) => Number(li.style.getPropertyValue('--at'))))
  media.add('(max-width: 1199.98px)', () => run('scaleY', (_, i, n) => i / (n - 1)))
}

export function Guide() {
  const root = useRef<HTMLDivElement>(null)
  const { onRows, show, card } = usePreview(root, PHOTO_LIST)

  useGSAP(
    (_, safe) => {
      const scope = root.current

      if (!scope || !safe) return

      motion(scope)

      return onEnter(safe(() => hero(scope)))
    },
    { scope: root },
  )

  return (
    <div className="chapter-page guide-page" ref={root}>
      <section className="opening" aria-labelledby="h1">
        <div className="top">
          <p className="mono label">{`How F1 works · ${CHAPTERS.length} chapters`}</p>
          <nav className="mono nav" aria-label="Chapters">
            <Go to="/chapters/race-weekend">Start with 01 →</Go>
          </nav>
        </div>
        <h1 id="h1" className="display">
          <span className="hl">Read this</span>
          <span className="hl">before Sunday.</span>
        </h1>
      </section>
      <section className="figures" aria-label="The guide in numbers">
        <dl>
          {FIGURES.map(({ k, more, v }) => (
            <div key={k}>
              <dt className="mono">
                {k}
                {more ? <span className="more">{more}</span> : null}
              </dt>
              <dd className="display num">{String(v)}</dd>
            </div>
          ))}
        </dl>
        <p>{`${countWord(CHAPTERS.length)} short chapters, ${MINUTES} minutes in all. Read them in order and the next Grand Prix makes sense from the first lap.`}</p>
      </section>
      <section className="index" aria-label="Chapters">
        <div className="mono heads" aria-hidden>
          <span>No.</span>
          <span>Chapter</span>
          <span>Read</span>
        </div>
        <ol className="list" {...onRows}>
          {CHAPTERS.map((c, i) => (
            <li key={c.n} onPointerEnter={(e) => show(i, e)}>
              <i className="hair" />
              <Go to={c.to}>
                <span className="display n">{c.n}</span>
                <h2 className="display">{c.title}</h2>
                <p>{c.line}</p>
                <span className="mono time">
                  {i === 0 ? <span>Start here · </span> : null}
                  {`${c.min} min`}
                </span>
              </Go>
            </li>
          ))}
        </ol>
        {card}
      </section>
      <Race />
      <Next label="Start · Chapter 01 · 5 min" title={'Three days.\nOne race.'} line="Read chapter 01" photo={PHOTOS.ch01} to="/chapters/race-weekend" />
    </div>
  )
}
