import type { ChapterPath, Photo } from '#/home/content.ts'
import { Go, Soon } from '#/shell/Go.tsx'

type Props = { n: string; min: number; title: string; line: string; photo: Photo; to: ChapterPath | null }

export function Next({ n, min, title, line, photo, to }: Props) {
  return (
    <section className="next" aria-labelledby="next">
      <div className="shot">
        <img src={photo.src} alt="" loading="lazy" />
      </div>
      <div className="caption">
        <p className="mono">{`Next · Chapter ${n} · ${min} min`}</p>
        <h2 id="next" className="display">
          {title}
        </h2>
        {to ? (
          <Go to={to} className="read">
            {`${line} →`}
          </Go>
        ) : (
          <Soon className="read">{line}</Soon>
        )}
      </div>
      <p className="mono muted credit">{`${photo.place} · ${photo.credit}`}</p>
    </section>
  )
}
