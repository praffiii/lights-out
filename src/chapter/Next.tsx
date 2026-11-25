import type { ReactNode } from 'react'

import type { Photo } from '#/home/content.ts'
import type { To } from '#/shell/context.ts'
import { Go } from '#/shell/Go.tsx'

type Props = { label: string; title: ReactNode; line: string; photo: Photo; to: To }

export function Next({ label, title, line, photo, to }: Props) {
  return (
    <section className="next" aria-labelledby="next">
      <div className="shot">
        <img src={photo.src} alt="" loading="lazy" />
      </div>
      <div className="caption">
        <p className="mono">{label}</p>
        <h2 id="next" className="display">
          {title}
        </h2>
        <Go to={to} className="read">
          {`${line} →`}
        </Go>
      </div>
      <p className="mono muted credit">{`${photo.place} · ${photo.credit}`}</p>
    </section>
  )
}
