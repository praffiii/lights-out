import { useState } from 'react'

import { Soon } from '#/shell/Go.tsx'

import { WORDS, type WordKey } from './words.ts'

export function Words({ keys }: { keys: ReadonlyArray<WordKey> }) {
  const [open, setOpen] = useState<WordKey | null>(null)

  return (
    <section className="words" aria-labelledby="words">
      <div className="head">
        <h2 id="words" className="mono">
          Words from this chapter
        </h2>
        <Soon className="mono">Full glossary</Soon>
      </div>
      <ul className="chips">
        {keys.map((k) => (
          <li key={k}>
            <button type="button" className="mono" aria-expanded={open === k} onClick={() => setOpen((o) => (o === k ? null : k))}>
              {WORDS[k].term}
            </button>
          </li>
        ))}
      </ul>
      {open ? (
        <p className="def" role="note">
          <b className="mono">{WORDS[open].term}</b>
          {WORDS[open].def}
        </p>
      ) : null}
    </section>
  )
}
