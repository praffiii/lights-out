import { useRef } from 'react'

import { gsap, ONCE, REDUCED, SplitText, sweep, useGSAP } from '#/motion/motion.ts'

import { Soon } from './Go.tsx'
import { FOOTER_LINKS } from './menu.ts'

export function Footer() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const footer = root.current
      const note = footer?.querySelector<HTMLElement>('.row p')
      const wordmark = footer?.querySelector<HTMLElement>('.wordmark')

      if (!footer || !note || !wordmark || REDUCED) return

      sweep(note, { start: 'top bottom' })
      SplitText.create(wordmark, {
        type: 'chars,lines',
        mask: 'lines',
        linesClass: 'wm-line',
        charsClass: 'char',
        onSplit: (self) =>
          gsap.fromTo(
            self.chars,
            { yPercent: 105, '--w': 62 },
            {
              yPercent: 0,
              '--w': 100,
              duration: 1.3,
              ease: 'launch',
              stagger: 0.035,
              scrollTrigger: { trigger: footer, start: 'top 70%', ...ONCE },
            },
          ),
      })
    },
    { scope: root },
  )

  return (
    <footer className="footer" ref={root}>
      <p className="wordmark" aria-label="Lights Out">
        Lights Out
      </p>
      <div className="row">
        <p className="mono muted">Lights Out is an unofficial fan project. Not affiliated with Formula 1, FOM or any team.</p>
        <p className="mono links">
          {FOOTER_LINKS.map((l) => (
            <Soon key={l}>{l}</Soon>
          ))}
        </p>
      </div>
    </footer>
  )
}
