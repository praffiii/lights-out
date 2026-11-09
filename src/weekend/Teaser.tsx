import { PHOTOS } from '#/home/content.ts'
import { Soon } from '#/shell/Go.tsx'

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
          <Soon className="mono read">Read</Soon>
        </div>
      </div>
      <p className="mono credit">{`${photo.place} · ${photo.credit}`}</p>
    </section>
  )
}
