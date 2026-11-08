import type { CSSProperties } from 'react'

/**
 * Hover roll: on hover or focus of the parent link, each letter rolls up and a purple copy rolls in from below,
 * 14 ms apart, like a position change on the timing tower. CSS only; screen readers get the plain text.
 */
export function Roll({ text }: { text: string }) {
  return (
    <>
      <span className="sr">{text}</span>
      <span className="roll" aria-hidden>
        {[...text].map((c, i) => (
          <span key={i} className="rc" data-c={c} style={{ '--i': i } as CSSProperties}>
            {c === ' ' ? ' ' : c}
          </span>
        ))}
      </span>
    </>
  )
}
