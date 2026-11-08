import { useEffect, useState } from 'react'
import { CircuitPage } from './CircuitPage'
import { ReplayPage } from './ReplayPage'
import type { Theme } from './tokens'

const hasWebGL = () => !!document.createElement('canvas').getContext('webgl2')
const media = (q: string) => window.matchMedia(q).matches
const PAGE = new URLSearchParams(window.location.search).has('replay') ? 'replay' : 'circuit'

export function App() {
  const [theme, setTheme] = useState<Theme>(() => (media('(prefers-color-scheme: dark)') ? 'dark' : 'light'))
  const [webgl] = useState(hasWebGL)
  const [poster, setPoster] = useState(() => !webgl || media('(prefers-reduced-motion: reduce)'))

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <main className={PAGE}>
      <nav className="nav label" aria-label="Spike pages">
        <a href="/" aria-current={PAGE === 'circuit' ? 'page' : undefined}>Circuit</a>
        <a href="/?replay" aria-current={PAGE === 'replay' ? 'page' : undefined}>Replay</a>
        <span className="spacer" />
        <button type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
          {theme === 'light' ? 'Dark' : 'Light'}
        </button>
        <button type="button" disabled={!webgl} onClick={() => setPoster(!poster)}>
          {poster ? 'Show 3D' : 'Show poster'}
        </button>
      </nav>
      {PAGE === 'replay' ? <ReplayPage theme={theme} poster={poster} /> : <CircuitPage theme={theme} poster={poster} />}
    </main>
  )
}
