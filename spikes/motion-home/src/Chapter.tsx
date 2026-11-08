/** A stub chapter page: just enough to judge the page transition and the enter motion on a second page. */
import { useRef } from 'react'
import { PHOTOS } from './content'
import { gsap, onEnter, reveal, sweep, useGSAP } from './motion'
import { Roll } from './Roll'
import { Go } from './Shell'

export function Chapter() {
  const root = useRef<HTMLDivElement>(null)
  const photo = PHOTOS.ch02

  useGSAP(
    (_, safe) => {
      const q = gsap.utils.selector(root)
      return onEnter(
        safe!(() => {
          q('h1 .hl').forEach((el, i) => sweep(el, { scroll: false, delay: i * 0.1 }))
          sweep(q('.top p.mono')[0] as HTMLElement, { scroll: false, delay: 0.3 })
          reveal(q('.photo')[0] as HTMLElement, { scroll: false, delay: 0.25 })
          for (const el of q('.caption > span, .body p')) sweep(el as HTMLElement)
        }),
      )
    },
    { scope: root },
  )

  return (
    <article className="chapter" ref={root} aria-labelledby="h1">
      <div className="top">
        <Go to="/" className="back mono">
          <span className="arr">←</span> <Roll text="All chapters" />
        </Go>
        <p className="mono muted">Chapter 02 · 5 min</p>
        <h1 id="h1" className="display">
          <span className="hl">How overtaking</span>
          <span className="hl">works.</span>
        </h1>
      </div>
      <div className="photo">
        <img src={photo.src} alt="Cars on the main straight in Baku." />
      </div>
      <p className="caption mono">
        <span>01 · {photo.place}</span>
        <span className="muted">{photo.credit}, via Wikimedia Commons</span>
      </p>
      <div className="body">
        <p className="mono muted">The idea</p>
        <div>
          <p>
            Passing is hard because the car in front spoils the air for the one behind. Since 2026, a driver within one
            second at the detection point can use Overtake mode: extra electric power on the next straight.
          </p>
        </div>
      </div>
    </article>
  )
}
