import { useRef } from 'react'

import { PHOTOS, type Photo } from '#/home/content.ts'
import { gsap, ONCE, onEnter, REDUCED, reveal, sweep, useGSAP } from '#/motion/motion.ts'
import { Go } from '#/shell/Go.tsx'

import { FiveParts } from './FiveParts.tsx'
import { LapBand } from './LapBand.tsx'
import { NextRace } from './NextRace.tsx'
import { Term } from './Term.tsx'
import { Words } from './Words.tsx'
import { POWER_WORDS } from './words.ts'

const ERAS = [
  { year: '1967', name: 'Cosworth DFV', line: '3.0 litre V8. 155 wins.', photo: PHOTOS.ch06Y1967, alt: 'A Ford Cosworth DFV 3.0-litre V8 engine on display in London.' },
  { year: '1986', name: 'BMW M12/13', line: '1.5 litre turbo. Over 1,000 hp.', photo: PHOTOS.ch06Y1986, alt: 'A BMW M12/13 1.5-litre turbocharged four-cylinder engine at the BMW Museum in Munich.' },
  { year: '2001', name: 'Ferrari 050', line: '3.0 litre V10. Over 17,000 rpm.', photo: PHOTOS.ch06Y2001, alt: 'A Ferrari 050 3.0-litre V10 engine on display at Museo Ferrari in Maranello.' },
  { year: '2014', name: 'Mercedes PU106', line: '1.6 litre V6 hybrid. Two motors.', photo: PHOTOS.ch06Y2014, alt: 'A Mercedes PU106 1.6-litre V6 hybrid power unit with its battery at Silverstone.' },
] as const satisfies ReadonlyArray<{ year: string; name: string; line: string; photo: Photo; alt: string }>

const all = (scope: HTMLElement, selector: string) => [...scope.querySelectorAll<HTMLElement>(selector)]

const rise = (el: HTMLElement, y: number, start: string) => gsap.from(el, { y, opacity: 0, duration: 0.8, ease: 'brake', scrollTrigger: { trigger: el, start, ...ONCE } })

function hero(scope: HTMLElement) {
  for (const [i, el] of all(scope, '.opening .hl, .opening .label').entries()) sweep(el, { scroll: false, delay: 0.1 + i * 0.1 })
}

function motion(scope: HTMLElement) {
  for (const el of all(scope, '.shot')) reveal(el, el.closest('.mguh, .history') ? { drift: false } : {})

  for (const el of all(scope, '.five-parts .headline .hl, .lap-band .headline .hl, .numbers-band .headline .hl, .mguh .headline .hl, .history .headline .hl, .words h2')) sweep(el)

  if (REDUCED) return

  for (const el of all(scope, '.opening .intro, .five-parts .body, .numbers-band .body, .mguh .body, .payoff, .plus')) rise(el, 24, 'top 90%')

  for (const el of all(scope, '.figures-grid li, .mguh-rows li, .history figure')) rise(el, 24, 'top 92%')
}

function Numbers() {
  return (
    <section className="numbers-band" aria-labelledby="numbers">
      <div className="top">
        <div className="head">
          <p className="mono label">By the numbers</p>
          <h2 id="numbers" className="display headline">
            <span className="hl">What it</span>
            <span className="hl">makes.</span>
          </h2>
          <p className="body">Peak power from each half. The FIA set out to split it close to 50:50.</p>
        </div>
        <ul className="figures-grid">
          <li>
            <p className="mono label">V6 engine</p>
            <p className="num">
              <span className="display val">400</span>
              <span className="unit">kW</span>
            </p>
            <p className="note">
              Burns advanced <Term k="sustainableFuel">sustainable fuel</Term>
            </p>
          </li>
          <li>
            <p className="mono label">MGU-K, electric</p>
            <p className="num">
              <span className="display val">350</span>
              <span className="unit">kW</span>
            </p>
            <p className="note">Up from 120 kW in 2025</p>
          </li>
          <li>
            <p className="mono label">Engine size</p>
            <p className="num">
              <span className="display val">1.6</span>
              <span className="unit">litres</span>
            </p>
            <p className="note">Six cylinders, one turbo</p>
          </li>
          <li>
            <p className="mono label">MGU-H</p>
            <p className="num">
              <span className="display val">0</span>
            </p>
            <p className="note">Dropped for 2026</p>
          </li>
        </ul>
      </div>
      <div className="payoff">
        <span className="mono so">So</span>
        <p className="what">Together, about 750 kW. More than 1,000 hp.</p>
        <span className="mono extra">Close to half of it electric</span>
      </div>
      <div className="plus">
        <span className="mono tag">Plus</span>
        <strong className="display mj">+0.5 MJ</strong>
        <p className="what">Overtake Mode: be within one second at the detection point and you get this much extra energy on the next lap.</p>
        <Go to="/chapters/overtaking" className="mono link">
          How overtaking works →
        </Go>
      </div>
    </section>
  )
}

function MguH() {
  const photo = PHOTOS.ch06MguH

  return (
    <section className="mguh" aria-labelledby="mguh">
      <figure className="photo">
        <div className="shot">
          <img src={photo.src} alt="Rear view of the Honda RA621H Formula 1 power unit showing the turbocharger at the centre." loading="lazy" />
          <div className="callout" aria-hidden>
            <span className="mono chip">Turbocharger · the MGU-H sat on its shaft</span>
            <span className="stem" />
            <span className="dot" />
          </div>
        </div>
        <figcaption className="mono muted credit">{`${photo.place} · ${photo.credit.replace(/^Photo /, '')}`}</figcaption>
      </figure>
      <div className="copy">
        <p className="mono label">2014 to 2025</p>
        <h2 id="mguh" className="display headline">
          <span className="hl">The MGU-H</span>
          <span className="hl">is gone.</span>
        </h2>
        <p className="body">
          For twelve seasons <Term k="mguH">a second motor</Term> sat on the turbo shaft and turned exhaust heat into electricity. It was costly and hard to master, so the 2026 rules drop it. The MGU-K now does all the electric work.
        </p>
        <ul className="mguh-rows">
          <li>
            <span className="mono when">2025 · MGU-K</span>
            <strong className="display power">120 kW</strong>
            <span className="mono muted note">plus the MGU-H</span>
          </li>
          <li className="is-now">
            <span className="mono when">2026 · MGU-K</span>
            <strong className="display power">350 kW</strong>
            <span className="mono muted note">the only motor</span>
          </li>
        </ul>
      </div>
    </section>
  )
}

function History() {
  return (
    <section className="history" aria-labelledby="history">
      <p className="mono label">History</p>
      <h2 id="history" className="display headline">
        <span className="hl">Louder,</span>
        <span className="hl">then smarter.</span>
      </h2>
      <div className="eras">
        {ERAS.map((era) => (
          <figure key={era.year}>
            <div className="meta">
              <strong className="display year">{era.year}</strong>
              <span className="mono muted place">{era.photo.place}</span>
            </div>
            <div className="shot">
              <img src={era.photo.src} alt={era.alt} loading="lazy" />
            </div>
            <figcaption className="name">{era.name}</figcaption>
            <p className="line">{era.line}</p>
            <p className="mono muted credit">{era.photo.credit}</p>
          </figure>
        ))}
      </div>
    </section>
  )
}

export function PowerUnit() {
  const root = useRef<HTMLDivElement>(null)
  const photo = PHOTOS.ch06

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
    <div className="chapter-page engine-page" ref={root}>
      <section className="opening" aria-labelledby="h1">
        <div className="top">
          <p className="mono muted label">How F1 works · Chapter 06 · 6 min</p>
          <nav className="mono nav" aria-label="Chapters">
            <Go to="/chapters/inside-the-car">← 05 Inside the car</Go>
            <span aria-hidden> · </span>
            <a href="/#start">All chapters →</a>
          </nav>
        </div>
        <h1 id="h1" className="display">
          <span className="hl">Half fuel.</span>
          <span className="hl">Half battery.</span>
        </h1>
        <p className="intro">A 1.6-litre V6 and an electric motor share the work, close to 50:50. Ride a real pole lap and watch the energy move.</p>
      </section>
      <figure className="photo-band">
        <div className="shot">
          <img src={photo.src} alt="Nico Hülkenberg's Audi R26 on track at Melbourne in 2026." />
        </div>
        <figcaption className="caption">
          <p className="mono">{`01 · ${photo.place}`}</p>
          <p className="what">New rules, new engine makers. Audi builds its own.</p>
        </figcaption>
        <p className="mono muted credit">{`${photo.credit}, via Wikimedia Commons`}</p>
      </figure>
      <FiveParts />
      <LapBand />
      <Numbers />
      <MguH />
      <History />
      <Words keys={POWER_WORDS} />
      <NextRace photo={PHOTOS.heroDark} />
    </div>
  )
}
