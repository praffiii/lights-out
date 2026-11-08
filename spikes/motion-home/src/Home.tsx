/** Home, as in the mock (Figma 13:3), with the motion from the Motion notes board layered on. */
import { lazy, type PointerEvent, Suspense, useRef, useState } from 'react'
import { CALLOUTS, CAR_STATS, CHAPTERS, CHIP_H, PHOTOS } from './content'
import { block, draw, gsap, HOVER, ONCE, onEnter, REDUCED, reveal, roll, ScrollTrigger, SplitText, sweep, useGSAP } from './motion'
import { Roll } from './Roll'
import PINS from './pins.json'
import { Go, useShell } from './Shell'
import { opposite } from './tokens'

// The 3D starts downloading the moment the page opens and mounts at once, behind the loader, so the lap is live
// before anyone sees the page (and any shader-compile hitch is hidden by the loader).
const circuit = REDUCED ? null : import('./Circuit')
const Circuit = lazy(() => circuit ?? import('./Circuit'))
const W = 1440
const H = 548
const pct = (v: number, of: number) => `${(v / of) * 100}%`
const TURNS = Object.entries(PINS).filter(([name]) => name.startsWith('turn-'))

export function Home() {
  const { theme } = useShell()
  const root = useRef<HTMLDivElement>(null)
  const preview = useRef<HTMLDivElement>(null)
  const hero = theme === 'dark' ? PHOTOS.heroDark : PHOTOS.heroLight

  // the circuit: one progress number drives the 3D; the canvas loads only when the section is near
  const progress = useRef(REDUCED ? 1 : 0)
  const live = useRef(false)
  const pins = useRef<HTMLDivElement>(null)
  const [glReady, setGlReady] = useState(false)

  const { contextSafe } = useGSAP(
    (_, safe) => {
      const q = gsap.utils.selector(root)
      const one = (s: string) => q(s)[0] as HTMLElement

      // hero intro: plays when the loader or the page change says the page has entered
      const off = onEnter(
        safe!(() => {
          q('.hero h1 .hl').forEach((el, i) => sweep(el, { scroll: false, delay: i * 0.1 }))
          sweep(one('.hero .intro p'), { scroll: false, delay: 0.3 })
          for (const el of q('.hero .meta .mono')) sweep(el, { scroll: false, delay: 0.5 })
          reveal(one('.hero .photo'), { scroll: false, delay: 0.2 })
          if (!REDUCED) gsap.from(one('.hero .cta'), { autoAlpha: 0, y: 12, duration: 0.6, delay: 0.85 })
        }),
      )

      // one move at every scale: labels, headings, captions and titles arrive behind the sector bar
      for (const el of q('.type, h2.display, .caption > span, .next h3, .next p, .car .credit, .foot-note')) sweep(el)
      sweep(one('.footer .row p'), { start: 'top bottom' }) // the disclaimer sits at the page's foot, below 88 % even at full scroll
      q('.rows h3').forEach((el, i) => sweep(el, { trigger: one('.rows'), start: 'top 78%', delay: i * 0.08 }))
      draw(q('.rows .hair'), one('.rows'))
      for (const el of q('[data-count]')) roll(el, { from: el.dataset.count === 'year' ? 1950 : undefined })
      for (const el of q('.next .photo')) reveal(el)
      block(one('.car .plate'))

      if (REDUCED) return off

      // scroll is the throttle: leaving the hero, the headline launches wider and its lines pull apart
      gsap
        .timeline({ scrollTrigger: { trigger: one('.hero'), start: 'top top', end: 'bottom top', scrub: true } })
        .fromTo(one('.hero h1'), { '--wdth': 100 }, { '--wdth': 125, ease: 'none' }, 0)
        .to(q('.hero h1 .hl')[0], { x: '-6vw', ease: 'none' }, 0)
        .to(q('.hero h1 .hl')[1], { x: '8vw', ease: 'none' }, 0)

      // the car band grows from a card to full bleed, and the whole page turns to the opposite theme
      const band = one('.car')
      gsap.fromTo(band, { clipPath: 'inset(0% 4% 0% 4%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: band, start: 'top bottom', end: 'top 15%', scrub: true } })
      ScrollTrigger.create({
        trigger: band,
        start: 'top 55%',
        end: 'bottom 45%',
        onToggle: (self) => document.documentElement.classList.toggle('flip', self.isActive),
      })
      const stage = one('.car .stage')
      gsap.fromTo(one('.car .stage img'), { scale: 1.14 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: stage, start: 'top bottom', end: 'top 25%', scrub: true } })
      const callouts = gsap.timeline({ scrollTrigger: { trigger: stage, start: 'top 55%', ...ONCE } })
      q('.callout').forEach((c, i) => {
        const at = i * 0.14
        callouts.from(c.querySelector('.dot'), { scale: 0, duration: 0.5, ease: 'back.out(3)' }, at).from(c.querySelector('.lead'), { scaleY: 0, duration: 0.45 }, at + 0.08)
        block(c.querySelector<HTMLElement>('.chip')!, { trigger: stage, start: 'top 55%', delay: at + 0.25 })
      })

      // the footer wordmark: letters rise and launch from condensed to full width
      SplitText.create(one('.wordmark'), {
        type: 'chars,lines',
        mask: 'lines',
        linesClass: 'wm-line',
        charsClass: 'char',
        onSplit: (self) =>
          gsap.fromTo(self.chars, { yPercent: 105, '--w': 62 }, {
            yPercent: 0,
            '--w': 100,
            duration: 1.3,
            ease: 'launch',
            stagger: 0.035,
            scrollTrigger: { trigger: one('.footer'), start: 'top 70%', ...ONCE },
          }),
      })

      // circuit: the 3D is already live (see `circuit` above). Then the heading, circuit and facts hold still together while
      // scroll drives one full lap, so the lap reads clearly. A phone holds only the circuit (the rest won't fit),
      // and the heading above it simply scrolls away.
      const mm = gsap.matchMedia()
      mm.add({ wide: '(min-width: 761px)', narrow: '(max-width: 760px)' }, (ctx) => {
        const held = ctx.conditions?.wide ? one('.weekend-sec .held') : one('.weekend-sec .grid > div')
        ScrollTrigger.create({ trigger: held, pin: true, start: () => (held.offsetHeight > innerHeight ? 'top top' : 'center center'), invalidateOnRefresh: true, end: '+=150%', scrub: true, onUpdate: (s) => void (progress.current = s.progress) })
        ScrollTrigger.create({ trigger: one('.weekend-sec'), refreshPriority: -1, start: 'top bottom', end: 'bottom top', onToggle: (s) => void (live.current = s.isActive) })
      })
      ScrollTrigger.sort() // the pin was made after triggers further down the page; refresh in page order

      // chapter index: the photo leans into the direction it travels, like a car through a corner
      let last = 0
      const lean = gsap.quickTo(preview.current, 'rotation', { duration: 0.5, ease: 'power3.out' })
      const tick = () => {
        const x = gsap.getProperty(preview.current, 'x') as number
        if (x !== last || gsap.getProperty(preview.current, 'rotation') !== 0) lean(gsap.utils.clamp(-12, 12, (x - last) * 0.4))
        last = x
      }
      if (HOVER) gsap.ticker.add(tick)

      return () => {
        off()
        mm.revert()
        gsap.ticker.remove(tick)
        document.documentElement.classList.remove('flip')
      }
    },
    { scope: root },
  )

  // chapter index: the photo chases the cursor (the outer box moves, the inner card scales and swaps), and the
  // next chapter's photo overtakes from the side you moved towards
  const ride = useRef<{ x: gsap.QuickToFunc; y: gsap.QuickToFunc; at: number; z: number } | null>(null)
  const rider = () =>
    HOVER && !REDUCED && preview.current
      ? (ride.current ??= {
          x: gsap.quickTo(preview.current, 'x', { duration: 0.45, ease: 'power3.out' }),
          y: gsap.quickTo(preview.current, 'y', { duration: 0.45, ease: 'power3.out' }),
          at: -1,
          z: 1,
        })
      : null
  const onRows = {
    onPointerMove: contextSafe((e: PointerEvent) => {
      const r = rider()
      r?.x(e.clientX)
      r?.y(e.clientY)
    }),
    onPointerLeave: contextSafe(() => {
      const r = rider()
      if (!r) return
      r.at = -1
      gsap.to('.preview .card', { scale: 0, duration: 0.35, ease: 'power2.in', overwrite: true })
    }),
  }
  const show = contextSafe((i: number, e: PointerEvent) => {
    const r = rider()
    if (!r || r.at === i) return
    const imgs = preview.current!.querySelectorAll('img')
    if (r.at === -1) {
      gsap.set(preview.current, { x: e.clientX, y: e.clientY })
      gsap.set(imgs[i], { yPercent: 0, scale: 1, zIndex: ++r.z, visibility: 'inherit' })
      gsap.fromTo('.preview .card', { visibility: 'inherit', scale: 0 }, { scale: 1, duration: 0.5, overwrite: true })
    } else {
      const dir = i > r.at ? 1 : -1
      gsap.fromTo(imgs[i], { yPercent: 100 * dir, scale: 1.25, zIndex: ++r.z, visibility: 'inherit' }, { yPercent: 0, scale: 1, duration: 0.6, overwrite: true })
      gsap.to(imgs[r.at], { yPercent: -30 * dir, duration: 0.6, overwrite: true })
    }
    r.at = i
  })

  return (
    <div ref={root}>
      <section className="hero" aria-labelledby="h1">
        <div className="hero-top">
          <h1 id="h1" className="display">
            <span className="hl">Formula 1,</span>
            <span className="hl">from lights out.</span>
          </h1>
          <div className="intro">
            <p>A fan-made guide for anyone who just watched their first race and wants to know what happened.</p>
            <Go to="/chapters/overtaking" className="cta">
              <Roll text="Start the guide" /> <span className="arr">→</span>
            </Go>
          </div>
        </div>
        <div className="meta">
          <span className="mono">2026 season · 22 drivers · 11 teams · 23 races</span>
          <span className="mono scroll-cue" aria-hidden>
            Scroll <i />
          </span>
        </div>
        <div className="photo">
          <img src={hero.src} alt={hero.place} fetchPriority="high" />
        </div>
        <p className="caption mono">
          <span>{hero.place}</span>
          <span className="muted">{hero.credit}</span>
        </p>
      </section>

      <section className="chapters" aria-labelledby="start">
        <div className="head">
          <h2 id="start" className="mono type">Start here</h2>
          <p className="mono muted type">Five chapters · 30 min</p>
        </div>
        <ol className="rows" {...onRows}>
          {CHAPTERS.map((c, i) => {
            const body = (
              <>
                <span className="mono muted">{c.n}</span>
                <h3>{c.title}</h3>
                <span className="end">
                  <span className="mono muted">{c.min} min</span>
                  <span className="read">
                    Read <span className="arr">→</span>
                  </span>
                </span>
              </>
            )
            return (
              <li key={c.n} onPointerEnter={(e) => show(i, e)}>
                <i className="hair" />
                {c.to ? (
                  <Go to={c.to}>{body}</Go>
                ) : (
                  <a href="#start" onClick={(e) => e.preventDefault()} title="Not in this spike">{body}</a>
                )}
              </li>
            )
          })}
        </ol>
        <div className="preview" ref={preview} aria-hidden>
          <div className="card">
            {CHAPTERS.map((c) => (
              <img key={c.n} src={c.photo.src} alt="" />
            ))}
          </div>
        </div>
      </section>

      <section className="car" data-theme={opposite(theme)} aria-labelledby="car">
        <div className="head">
          <p className="mono type">The car</p>
          <p className="mono muted type">One real 2026 car, labelled</p>
        </div>
        <h2 id="car" className="display">Part by part.</h2>
        <div className="stage">
          <div className="frame">
          <div className="photo">
            <img src="/img/williams.jpg" alt="The Williams FW48 at speed in qualifying, side on." />
          </div>
          {CALLOUTS.map((c, i) => {
            const top = c.chip[1] < c.dot[1]
            const from = top ? c.chip[1] + CHIP_H : c.dot[1]
            const to = top ? c.dot[1] : c.chip[1]
            return (
              <div className="callout" key={c.label} aria-hidden>
                <span className={`lead${top ? '' : ' up'}`} style={{ left: pct(c.dot[0], W), top: pct(from, H), height: pct(to - from, H) }} />
                <span className="dot" data-n={i + 1} style={{ left: pct(c.dot[0], W), top: pct(c.dot[1], H) }} />
                <span className="chip mono" style={{ left: pct(c.chip[0], W), top: pct(c.chip[1], H) }}>
                  {c.label}
                </span>
              </div>
            )
          })}
          </div>
          <div className="plate">
            <span className="mono">01 · The car · Shanghai, 2026</span>
            <strong>Williams FW48, in qualifying.</strong>
          </div>
        </div>
        <ul className="parts mono">
          {CALLOUTS.map((c) => (
            <li key={c.label}>{c.label}</li>
          ))}
        </ul>
        <p className="credit mono muted">Photo Liauzh · CC BY 4.0, via Wikimedia Commons</p>
        <dl className="stats">
          {CAR_STATS.map((s) => (
            <div key={s.k}>
              <dt className="mono muted type">{s.k}</dt>
              <dd>
                <strong data-count={s.count ?? undefined}>{s.v}</strong>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="weekend-sec" id="weekend" aria-labelledby="interlagos">
        <div className="held">
        <p className="mono type">
          This weekend · Round 20 of 23
        </p>
        <h2 id="interlagos" className="display">
          Interlagos,
          <br />
          this weekend.
        </h2>
        <div className="grid">
          <div>
            <div className="track" data-waiting={!REDUCED && !glReady ? '' : undefined}>
              <div className="inner">
                <img
                  className="poster"
                  src={`/poster-${theme}.png`}
                  alt="Interlagos in 3D: the start straight up on the hill, the back straight down by the lake. Sector one purple, two green, three yellow, 15 numbered turns."
                  hidden={glReady}
                />
                {!REDUCED && (
                  <Suspense fallback={null}>
                    <Circuit theme={theme} progress={progress} live={live} pins={pins} onReady={() => setGlReady(true)} />
                  </Suspense>
                )}
                <div className="pins" ref={pins} aria-hidden>
                  {TURNS.map(([name, [x, y]]) => {
                    const n = name.slice(5).padStart(2, '0')
                    return (
                      <span key={name} data-pin={name} className={n === '01' ? 't1' : undefined} style={glReady ? undefined : { left: pct(x, 1), top: pct(y, 1) }}>
                        {n}
                        {n === '01' && <span className="name">{'\n'}S do Senna</span>}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
            <p className="legend mono">
              <span><i style={{ background: 'var(--s1)' }} />Sector 1</span>
              <span><i style={{ background: 'var(--s2)' }} />Sector 2</span>
              <span><i style={{ background: 'var(--s3)' }} />Sector 3</span>
            </p>
            <p className="foot-note mono muted">Built in Blender from bacinger/f1-circuits (MIT) and NASA SRTM elevation.</p>
          </div>
          <dl className="facts">
            <div><dt className="mono muted type">First GP</dt><dd><strong data-count="year">1973</strong></dd></div>
            <div><dt className="mono muted type">Circuit length</dt><dd><strong data-count="">4.309 km</strong></dd></div>
            <div><dt className="mono muted type">Laps</dt><dd><strong data-count="">71</strong></dd></div>
            <div><dt className="mono muted type">Race distance</dt><dd><strong data-count="">305.939 km</strong></dd></div>
            <span className="rule" />
            <div><dt className="mono muted type">Turns · direction</dt><dd><strong className="small">15, anticlockwise</strong></dd></div>
            <a className="mono more" href="#weekend" onClick={(e) => e.preventDefault()} title="Not in this spike"><Roll text="This weekend on This season" /> <span className="arr">→</span></a>
          </dl>
        </div>
        </div>
      </section>

      <section className="next" aria-labelledby="next">
        <h2 id="next" className="mono muted type">Read next</h2>
        <div className="pair">
          <a href="#next" onClick={(e) => e.preventDefault()} title="Not in this spike">
            <div className="photo"><img src="/img/tyres.jpg" alt="Pirelli tyres on display, from slicks to wets." /></div>
            <h3>Why one pit stop can win a race.</h3>
            <p className="mono muted">Strategy · Photo Hullian111 · CC BY-SA 4.0</p>
          </a>
          <a href="#next" onClick={(e) => e.preventDefault()} title="Not in this spike">
            <div className="photo"><img src="/img/y1973.jpg" alt="Mechanics at work on the number 20 BRM at the 1973 Swedish Grand Prix." /></div>
            <h3>Swedish Grand Prix, 1973.</h3>
            <p className="mono muted">History · Photo Markku Lepola · CC BY 4.0</p>
          </a>
        </div>
      </section>

      <footer className="footer">
        <p className="wordmark" aria-label="Lights Out">Lights Out</p>
        <div className="row">
          <p className="mono muted">Lights Out is an unofficial fan project. Not affiliated with Formula 1, FOM or any team.</p>
          <p className="mono links">
            {['Credits', 'Glossary', 'Source'].map((l) => (
              <a key={l} href="#top" onClick={(e) => e.preventDefault()} title="Not in this spike">
                <Roll text={l} />
              </a>
            ))}
          </p>
        </div>
      </footer>
    </div>
  )
}
