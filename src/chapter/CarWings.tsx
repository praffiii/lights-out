import { lazy, Suspense, useEffect, useRef, useState } from 'react'

import { CircuitGuard } from '#/circuits/CircuitGuard.tsx'
import { gsap, REDUCED, ScrollTrigger, useGSAP } from '#/motion/motion.ts'
import { seasonBest, speedLine } from '#/speed/top.ts'
import { useSeason } from '#/season/use-season.ts'
import { Go } from '#/shell/Go.tsx'
import { useTheme } from '#/shell/theme.ts'

import { Term } from './Term.tsx'

const WingsScene = lazy(() => import('#/car/WingsScene.tsx'))

export const MODES = [
  { id: 'corner', name: 'Corner Mode', sub: 'Flaps closed · more grip', poster: 'side-corner', open: 0 },
  { id: 'straight', name: 'Straight Mode', sub: 'Flaps open · less drag', poster: 'side', open: 1 },
] as const

export type Mode = (typeof MODES)[number]['id']

const KMH = new Intl.NumberFormat('en-GB')

const SCROLL_GLIDE = 0.4

const CLICK_GLIDE = 0.8

const modeOf = (open: number): Mode => (open < 0.5 ? 'corner' : 'straight')

function Speed() {
  const top = useSeason().data?.topSpeed
  const best = top ? seasonBest(top.races) : undefined

  return (
    <div className="speed">
      <p className="mono label">{top && best ? `Top speed, ${top.season}` : null}</p>
      <p className="display num">{best ? KMH.format(best.kmh) : null}</p>
      <p className="unit">{best ? 'km/h' : null}</p>
      <p className="line">{best ? speedLine(best) : null}</p>
      <p className="mono source">{best ? 'OpenF1 speed traps · updates after every race' : null}</p>
    </div>
  )
}

export function CarWings() {
  const theme = useTheme().theme ?? 'light'
  const root = useRef<HTMLElement>(null)
  const open = useRef(1)
  const redraw = useRef(() => {})
  const [mode, setMode] = useState<Mode>('straight')
  const [near, setNear] = useState(false)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const shown = MODES.find((m) => m.id === mode) ?? MODES[1]
  const live = ready && !failed

  const show = (v: number) => {
    open.current = v
    setMode(modeOf(v))
    redraw.current()
  }

  const glide = (v: number, duration: number) => gsap.to(open, { current: v, duration, ease: 'brake', overwrite: true, onUpdate: () => show(open.current) })

  useEffect(() => {
    const el = root.current

    if (!el || REDUCED) return

    const nearby = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), { rootMargin: '100% 0px' })

    nearby.observe(el)

    return () => nearby.disconnect()
  }, [])

  useGSAP(
    () => {
      const stage = root.current?.querySelector('.stage')

      if (!live || !stage) return

      const st = ScrollTrigger.create({
        trigger: stage,
        start: 'top 80%',
        end: 'bottom 30%',
        onUpdate: (self) => void glide(self.progress, SCROLL_GLIDE),
      })

      show(st.progress)
    },
    { scope: root, dependencies: [live] },
  )

  const pick = (m: (typeof MODES)[number]) => {
    if (!live) return setMode(m.id)

    glide(m.open, CLICK_GLIDE)
  }

  return (
    <section className="wings" aria-labelledby="wings" ref={root}>
      <div className="head">
        <p className="mono label">Active aero</p>
        <h2 id="wings" className="display headline">
          <span className="hl">Wings that move.</span>
        </h2>
        <p className="body">
          Both wings have <Term k="activeAero">flaps that move</Term>. Closed in the corners for grip, open on the straights to cut drag.
        </p>
      </div>
      <div className="deck">
        <Speed />
        <div className="aero">
          <div className="modes" role="tablist" aria-label="Wing mode">
            {MODES.map((m) => (
              <button key={m.id} type="button" role="tab" id={`mode-${m.id}`} aria-selected={mode === m.id} aria-controls="wing-stage" onClick={() => pick(m)}>
                <span className="mono name">{m.name}</span>
                <span className="mono sub">{m.sub}</span>
              </button>
            ))}
          </div>
          <p className="mono sub-active" aria-hidden>
            {shown.sub}
          </p>
          <div className="stage" id="wing-stage" role="tabpanel" aria-labelledby={`mode-${mode}`} data-gl={ready ? '' : undefined}>
            <img src={`/car/${live ? 'side' : shown.poster}-${theme}.webp`} alt={`The 2026 car from the side in ${shown.name}, both wing flaps ${mode === 'straight' ? 'open' : 'closed'}.`} />
            {near && !failed ? (
              <div className="gl">
                <CircuitGuard onError={() => setFailed(true)}>
                  <Suspense fallback={null}>
                    <WingsScene theme={theme} open={open} redraw={redraw} onReady={() => setReady(true)} />
                  </Suspense>
                </CircuitGuard>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="payoff">
        <p className="mono so">So</p>
        <p className="what">
          Every car gets <Term k="straightMode">Straight Mode</Term> on the straights.
        </p>
        <p className="mono extra">
          <Term k="overtakeMode">Overtake Mode</Term> is the <Go to="/chapters/overtaking">chaser&apos;s extra →</Go>
        </p>
      </div>
    </section>
  )
}
