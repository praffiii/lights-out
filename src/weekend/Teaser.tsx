import { PHOTOS } from '#/home/content.ts'
import { Go } from '#/shell/Go.tsx'

export function Teaser() {
  const photo = PHOTOS.ch02

  return (
    <section className="teaser" aria-labelledby="teaser">
      <div className="frame">
        <img className="shot" src={photo.src} alt="" loading="lazy" />
        <div className="caption">
          <p className="mono">Next · How F1 works · Chapter 02</p>
          <h2 id="teaser" className="display">
            Watch the pass
            <br />
            at Turn 1.
          </h2>
          <Go to="/chapters/overtaking" className="mono read">
            Read
          </Go>
        </div>
      </div>
      <p className="mono credit">{`${photo.place} · ${photo.credit}`}</p>
    </section>
  )
}
