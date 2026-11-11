import { useEffect, useId, useRef, useState } from 'react'

import { HOVER } from '#/motion/motion.ts'

import { WORDS, type WordKey } from './words.ts'

export function Term({ k, children }: { k: WordKey; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const root = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return

    const away = (e: PointerEvent) => {
      if (e.target instanceof Node && !root.current?.contains(e.target)) setOpen(false)
    }

    document.addEventListener('pointerdown', away)

    return () => document.removeEventListener('pointerdown', away)
  }, [open])

  return (
    <span className="term" ref={root} onPointerEnter={() => HOVER && setOpen(true)} onPointerLeave={() => HOVER && setOpen(false)}>
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
