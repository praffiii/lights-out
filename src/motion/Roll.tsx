export function Roll({ text }: { text: string }) {
  return (
    <>
      <span className="sr">{text}</span>
      <span className="roll" aria-hidden>
        {[...text].map((c, i) => (
          <span key={i} className="rc" data-c={c} style={{ transitionDelay: `${i * 14}ms` }}>
            {c === ' ' ? ' ' : c}
          </span>
        ))}
      </span>
    </>
  )
}
