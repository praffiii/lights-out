import type { Person } from '#/season/page-model.ts'

export function Shot({ person, className }: { person: Person; className?: string }) {
  const { portrait, car, colour } = person
  const classes = className ?? ''

  if (portrait) return <img className={`${classes} portrait`} src={portrait.src} alt="" loading="lazy" />

  if (car) return <img className={`${classes} car`} src={car.src} alt="" loading="lazy" />

  return <span className={`${classes} blank`} style={{ background: colour }} />
}

export const creditOf = (person: Person) => person.portrait?.credit ?? (person.car ? `Photo ${person.car.credit}` : null)
