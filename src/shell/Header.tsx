import { useEffect, useRef } from 'react'

import { ScrollTrigger } from '#/motion/motion.ts'
import { Roll } from '#/motion/Roll.tsx'

import { Go } from './Go.tsx'
import { WeekendBox } from './WeekendBox.tsx'

export function Header({ menuOpen, onMenu }: { menuOpen: boolean; onMenu: () => void }) {
  const header = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = header.current

    if (!el) return

    const st = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        const y = self.scroll()

        el.classList.toggle('away', y > 200 && self.direction === 1)
        el.classList.toggle('solid', y > 10)
      },
    })

    return () => st.kill()
  }, [])

  return (
    <header ref={header} className={menuOpen ? 'header menu-open' : 'header'}>
      <Go to="/" className="logo" aria-label="Lights Out, home">
        <span className="dots" aria-hidden>
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
        Lights Out
      </Go>
      <div className="weekend-slot">
        <WeekendBox />
      </div>
      <button type="button" className="menu-btn mono" aria-expanded={menuOpen} aria-controls="menu" onClick={onMenu}>
        <Roll text={menuOpen ? 'Close' : 'Menu'} />
        <span className="bars" aria-hidden>
          <i />
          <i />
        </span>
      </button>
    </header>
  )
}
