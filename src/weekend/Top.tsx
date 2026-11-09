import { opposite, useTheme } from '#/shell/theme.ts'

import type { WeekendPage } from './page-model.ts'

export function Top({ page }: { page: WeekendPage }) {
  const theme = useTheme().theme ?? 'light'
  const { photo } = page

  return (
    <header className="top">
      {photo ? <img className="shot" src={photo.large} srcSet={`${photo.small} 720w, ${photo.large} 2400w`} sizes="100vw" alt={page.place} fetchPriority="high" /> : null}
      <div className="title" data-theme={opposite(theme)}>
        <p className="mono label">{page.label}</p>
        <h1 className="display">{page.title}</h1>
        <p className="mono dates">{page.dates}</p>
      </div>
      {photo ? <p className="mono credit">{`${photo.place} · ${photo.credit}`}</p> : null}
    </header>
  )
}
