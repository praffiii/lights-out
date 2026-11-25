import type { Photo } from '#/home/content.ts'
import { useSeason } from '#/season/use-season.ts'
import { Go } from '#/shell/Go.tsx'

import { nextRace } from './next-race.ts'

export function NextRace({ photo }: { photo: Photo }) {
  const race = nextRace(useSeason().data, new Date())

  return (
    <section className="next next-weekend" aria-labelledby="next">
      <div className="shot">
        <img src={photo.src} srcSet={photo.srcSet} sizes={photo.srcSet ? '100vw' : undefined} alt="" loading="lazy" />
      </div>
      <div className="caption">
        <p className="mono">{race ? `Next · Round ${race.round} · ${race.when}` : 'Next'}</p>
        <h2 id="next" className="display">
          {race ? (
            <>
              <span className="hl">{`${race.place},`}</span>
              <span className="hl">{`${race.when}.`}</span>
            </>
          ) : (
            'All chapters.'
          )}
        </h2>
        {race ? (
          <Go to="/weekend" className="read">
            Times, the track and the pole lap →
          </Go>
        ) : (
          <Go to="/chapters" className="read">
            Back to the chapter list →
          </Go>
        )}
      </div>
      <p className="mono muted credit">{`${photo.place} · ${photo.credit}`}</p>
    </section>
  )
}
