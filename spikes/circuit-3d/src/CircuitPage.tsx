import { Canvas } from '@react-three/fiber'
import { Suspense, useRef, useState } from 'react'
import { Circuit } from './Circuit'
import PINS from './pins.json'
import type { Theme } from './tokens'

export function CircuitPage({ theme, poster }: { theme: Theme; poster: boolean }) {
  const [ready, setReady] = useState(false)
  const pins = useRef<HTMLDivElement>(null)
  const readout = useRef<HTMLSpanElement>(null)

  return (
    <section className="stage" aria-labelledby="title">
      <header className="head">
        <p className="label">This weekend · Round 21 of 24</p>
        <h1 id="title">Interlagos.</h1>
      </header>

      <div className="frame">
        <img
          className="poster"
          src={`/poster-${theme}.png`}
          alt="Interlagos in 3D with its real climb: the start straight up on the hill, the back straight down by the lake. Sector one purple, two green, three yellow, 15 numbered turns."
          hidden={!poster && ready}
        />
        {!poster && (
          <Canvas className="gl" flat dpr={[1, 2]} gl={{ antialias: true, alpha: true }} aria-hidden>
            <Suspense fallback={null}>
              <Circuit theme={theme} pins={pins} readout={readout} onReady={() => setReady(true)} />
            </Suspense>
          </Canvas>
        )}
        <div className="pins" ref={pins} aria-hidden>
          {Object.entries(PINS).map(([name, [x, y]]) => (
            <span
              key={name}
              data-pin={name}
              className={name.startsWith('label-') ? `sector ${name}` : 'turn'}
              style={poster ? { left: `${x * 100}%`, top: `${y * 100}%`, transform: 'none', opacity: 1 } : undefined}
            >
              {name.replace(/^(turn|label)-/, '')}
            </span>
          ))}
        </div>
      </div>

      <footer className="foot">
        <p className="label credit">
          Layout bacinger/f1-circuits (MIT) · elevation SRTM (NASA), 3× · modelled in Blender · sector splits are placeholders
        </p>
        <span className="label" ref={readout}>
          {poster ? 'Poster frame' : 'S1 · lap 0%'}
        </span>
      </footer>
    </section>
  )
}
