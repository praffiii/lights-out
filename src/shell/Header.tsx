import { useEffect, useState } from 'react'

import { ScrollTrigger } from '#/motion/motion.ts'
import { Roll } from '#/motion/Roll.tsx'

import { Go } from './Go.tsx'
import { WeekendBox } from './WeekendBox.tsx'

export function Header({ menuOpen, onMenu, home }: { menuOpen: boolean; onMenu: () => void; home: boolean }) {
  const [away, setAway] = useState(false)
  const [solid, setSolid] = useState(false)

  useEffect(() => {
    const st = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        const y = self.scroll()

        setAway(y > 200 && self.direction === 1)
        setSolid(y > 10)
      },
    })

    return () => st.kill()
  }, [])

  useEffect(() => setAway(false), [menuOpen])

  const over = home && !solid && !menuOpen ? 'dark' : undefined

  return (
    <header className={['header', menuOpen ? 'menu-open' : away && 'away', solid && 'solid'].filter(Boolean).join(' ')}>
      <Go to="/" className="logo" aria-label="Lights Out, home" data-theme={over}>
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
        <WeekendBox theme={over} />
      </div>
      <button type="button" className="menu-btn mono" data-theme={over} aria-expanded={menuOpen} aria-controls="menu" onClick={onMenu}>
        <Roll text={menuOpen ? 'Close' : 'Menu'} />
        <span className="bars" aria-hidden>
          <i />
          <i />
        </span>
      </button>
    </header>
  )
}
