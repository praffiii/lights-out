import type { CircuitInfo } from '#/circuits/registry.ts'
import { CircuitStage, stageCredit, useNearLap } from '#/weekend/CircuitStage.tsx'

import { KNOCKOUT, POINTS } from './content.ts'
import type { Knockout as KnockoutLines, Ladder as LadderLine } from './page-model.ts'
import { Term } from './Term.tsx'

export function Knockout({ lines }: { lines: KnockoutLines }) {
  return (
    <section className="knockout poster" aria-labelledby="knockout">
      <div className="head">
        <p className="mono muted label">Saturday · Qualifying · Knockout</p>
        <h2 id="knockout" className="display headline">
          <span className="hl">Six out. Six out.</span>
          <span className="hl">Ten fight for pole.</span>
        </h2>
        <p className="body">
          Every driver chases one clean lap against the clock. When each part ends, the slowest six start from the back. The last ten set the front of the <Term k="grid">grid</Term>. From qualifying on,{' '}
          <Term k="parcFerme">parc fermé</Term> locks the car's set-up.
        </p>
      </div>
      <ol className="numbers">
        {KNOCKOUT.map((q) => (
          <li key={q.n} className={q.n === 10 ? 'is-pole' : undefined}>
            <span className="display num">{q.n}</span>
            <span className="mono label">
              {q.label}
              {q.key === 'pole' ? (
                <>
                  {' '}
                  <Term k="pole">pole</Term>
                </>
              ) : null}
            </span>
            <span className="mono data">{lines[q.key] ?? ''}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function PoleBand({ info }: { info: CircuitInfo }) {
  const { near, onNear, lap } = useNearLap(info.id)

  return (
    <section className="band circuit" data-theme="dark" aria-labelledby="pole">
      <div className="card">
        <p className="mono muted label">Saturday · Qualifying · The lap</p>
        <h2 id="pole" className="display headline">
          The lap that wins pole.
        </h2>
        <CircuitStage info={info} near={near} lap={lap} onNear={onNear} />
      </div>
      <p className="mono credit">{stageCredit(lap)}</p>
    </section>
  )
}

export function Ladder({ line }: { line: LadderLine | null }) {
  return (
    <section className="ladder poster" aria-labelledby="ladder">
      <div className="head">
        <p className="mono muted label">Sunday · Points</p>
        <h2 id="ladder" className="display headline">
          Top ten score.
        </h2>
        <p className="body">
          Each point counts twice, for the driver and for their team: the <Term k="constructors">constructors</Term>. Two titles, settled over 23 races.
        </p>
      </div>
      <ol className="rungs">
        {POINTS.map((p, i) => (
          <li key={p}>
            <span className="display num">{p}</span>
            <span className="mono label">{`P${i + 1}`}</span>
            {line?.codes[i] ? <span className="mono code">{line.codes[i]}</span> : null}
          </li>
        ))}
      </ol>
      <p className="mono muted foot">{line ? `${line.caption} · ` : ''}No bonus point for fastest lap since 2025 · Sprints pay 8 to 1 to the top eight</p>
    </section>
  )
}
