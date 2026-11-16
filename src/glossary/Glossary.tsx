import { useRef, useState } from 'react'

import { NextRace } from '#/chapter/NextRace.tsx'
import { Term } from '#/chapter/Term.tsx'
import { PHOTOS } from '#/home/content.ts'
import { gsap, ONCE, onEnter, REDUCED, sweep, useGSAP } from '#/motion/motion.ts'
import { Go } from '#/shell/Go.tsx'

import { ENTRIES, find, LETTERS } from './index.ts'

const all = (scope: HTMLElement, selector: string) => [...scope.querySelectorAll<HTMLElement>(selector)]

function hero(scope: HTMLElement) {
  for (const [i, el] of all(scope, '.opening .hl, .opening .label').entries()) sweep(el, { scroll: false, delay: 0.1 + i * 0.1 })
}

function motion(scope: HTMLElement) {
  for (const el of all(scope, '.tap .headline .hl')) sweep(el)

  if (REDUCED) return

  for (const el of all(scope, '.opening .intro, .find, .tap .body, .tap .say')) gsap.from(el, { y: 24, opacity: 0, duration: 0.8, ease: 'brake', scrollTrigger: { trigger: el, start: 'top 92%', ...ONCE } })
}

export function Glossary() {
  const root = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const shown = find(query)
  const first = new Map(shown.filter((e, i) => shown[i - 1]?.letter !== e.letter).map((e) => [e.letter, e.key]))

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
    <div className="chapter-page glossary-page" ref={root}>
      <section className="opening" aria-labelledby="h1">
        <div className="top">
          <p className="mono muted label">{`Glossary · ${ENTRIES.length} words · from 5 chapters`}</p>
          <nav className="mono nav" aria-label="Chapters">
            <a href="/#start">All chapters →</a>
          </nav>
        </div>
        <h1 id="h1" className="display">
          <span className="hl">Every word,</span>
          <span className="hl">in plain English.</span>
        </h1>
        <p className="intro">Every F1 word on this site, in one or two lines. Tap one anywhere and the meaning opens right where you are reading.</p>
      </section>
      <div className="find">
        <label>
          <span className="mono muted">Search</span>
          <input type="search" value={query} placeholder="Try “undercut” or “box, box”" autoComplete="off" spellCheck={false} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <nav className="mono letters" aria-label="Jump to a letter">
          {LETTERS.map((letter) => {
            const key = first.get(letter)

            return key ? (
              <a key={letter} href={`#${key}`}>
                {letter}
              </a>
            ) : (
              <span key={letter} aria-hidden>
                {letter}
              </span>
            )
          })}
        </nav>
      </div>
      <section className="tap" data-theme="dark" aria-labelledby="tap">
        <div className="head">
          <p className="mono label">Anywhere on the site</p>
          <p className="mono how">Tap or hover</p>
          <h2 id="tap" className="headline">
            <span className="hl">Tap a word.</span>
            <span className="hl">Get the meaning.</span>
          </h2>
          <p className="body">Words with a dotted line open a short note in place. No new page, and you never lose your spot.</p>
        </div>
        <p className="say">
          Car 99 pits a lap early. By the time the leader stops, the{' '}
          <Term k="undercut" shown>
            undercut
          </Term>{' '}
          has worked.
        </p>
      </section>
      <section className="list" aria-label="Every word">
        <div className="mono muted cols" aria-hidden>
          <span>Letter</span>
          <span>Word</span>
          <span>Meaning</span>
          <span>Chapter</span>
        </div>
        <ul>
          {shown.map((e, i) => (
            <li key={e.key} id={e.key}>
              <span className="letter" aria-hidden>
                {shown[i - 1]?.letter === e.letter ? '' : e.letter}
              </span>
              <h3>{e.term}</h3>
              <p>{e.def}</p>
              {e.chapter.to ? (
                <Go to={e.chapter.to} className="mono go" aria-label={`Chapter ${e.chapter.n}: ${e.chapter.title}`}>
                  {`Chapter ${e.chapter.n} →`}
                </Go>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="none" aria-live="polite">
          {shown.length === 0 ? `No word matches “${query.trim()}”.` : ''}
        </p>
      </section>
      <NextRace photo={PHOTOS.ch02} />
    </div>
  )
}
