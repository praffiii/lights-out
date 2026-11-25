import { useRouterState } from '@tanstack/react-router'
import { useRef } from 'react'

import { PHOTOS } from '#/home/content.ts'
import { onEnter, reveal, sweep, useGSAP } from '#/motion/motion.ts'
import { Go } from '#/shell/Go.tsx'

const { recovery } = PHOTOS

const readable = (path: string) => {
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

function hero(scope: HTMLElement) {
  for (const [i, el] of [...scope.querySelectorAll<HTMLElement>('h1, h2')].entries()) sweep(el, { scroll: false, delay: 0.1 + i * 0.15 })

  const shot = scope.querySelector<HTMLElement>('.shot')

  if (shot) reveal(shot, { scroll: false, drift: false })
}

export function NotFound() {
  const root = useRef<HTMLElement>(null)
  const path = useRouterState({ select: (s) => s.location.pathname })

  useGSAP(
    (_, safe) => {
      const scope = root.current

      if (!scope || !safe) return

      return onEnter(safe(() => hero(scope)))
    },
    { scope: root },
  )

  return (
    <section className="not-found" aria-labelledby="dnf" ref={root}>
      <div className="copy">
        <p className="mono">Error 404 · Race control</p>
        <h1 id="dnf">DNF</h1>
        <p className="mono muted meaning">Did not finish</p>
        <h2>This page did not finish.</h2>
        <p className="muted body">The link may be old, or the page was never built. Rejoin the track from here:</p>
        <nav aria-label="Rejoin the track">
          <Go to="/">Home →</Go>
          <a href="/#start">How F1 works →</a>
          <Go to="/season">This season →</Go>
          <Go to="/glossary">Glossary →</Go>
        </nav>
        <p className="mono muted race-control">{readable(path)} · Did not finish · No further investigation</p>
      </div>
      <figure>
        <div className="shot">
          <img src={recovery.src} alt="Marshals guide a wrecked blue Formula 1 car as a crane lifts it onto a recovery truck." />
        </div>
        <figcaption>
          <p className="mono">01 · {recovery.place}</p>
          <p className="what">Marshals crane a car off the track.</p>
          <p className="mono credit">{recovery.credit}</p>
        </figcaption>
      </figure>
    </section>
  )
}
