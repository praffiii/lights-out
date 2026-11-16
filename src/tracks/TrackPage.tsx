import { Go } from '#/shell/Go.tsx'

export function Missing() {
  return (
    <section className="tracks-missing">
      <h1 className="mono">No page for this track yet</h1>
      <Go to="/tracks" className="mono">
        All the tracks
      </Go>
    </section>
  )
}

export function TrackPage({ circuit }: { circuit: string }) {
  return circuit ? <Missing /> : null
}
