import { useId, useState } from 'react'

import { HOVER } from '#/motion/motion.ts'

import { WORDS, type WordKey } from './words.ts'

export function Term({ k, children }: { k: WordKey; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <span className="term" onPointerEnter={() => HOVER && setOpen(true)} onPointerLeave={() => HOVER && setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => {
          if (!HOVER || e.detail === 0) setOpen((o) => !o)
        }}
      >
        {children}
      </button>
      <span className="def" id={id} role="note" hidden={!open}>
        <b className="mono">{WORDS[k].term}</b>
        {WORDS[k].def}
      </span>
    </span>
  )
}
