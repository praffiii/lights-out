import { Schema, SchemaGetter } from 'effect'

export const SessionName = Schema.Literals(['FP1', 'FP2', 'FP3', 'SprintQualifying', 'Sprint', 'Qualifying', 'Race'])

export type SessionName = typeof SessionName.Type

export const Session = Schema.Struct({ name: SessionName, startsAt: Schema.String, timeConfirmed: Schema.Boolean })

export type Session = typeof Session.Type

export const Circuit = Schema.Struct({
  circuitId: Schema.String,
  circuitName: Schema.String,
  locality: Schema.String,
  country: Schema.String,
})

export const Race = Schema.Struct({
  season: Schema.Number,
  round: Schema.Number,
  raceName: Schema.String,
  circuit: Circuit,
  sessions: Schema.Array(Session),
})

export type Race = typeof Race.Type

export const RaceRef = Schema.Struct({ season: Schema.Number, round: Schema.Number, raceName: Schema.String })

export const DriverRef = Schema.Struct({
  driverId: Schema.String,
  code: Schema.NullOr(Schema.String),
  number: Schema.NullOr(Schema.Number),
  givenName: Schema.String,
  familyName: Schema.String,
  nationality: Schema.NullOr(Schema.String),
})

export type DriverRef = typeof DriverRef.Type

export const ConstructorRef = Schema.Struct({ constructorId: Schema.String, name: Schema.String, nationality: Schema.String })

export const ResultRow = Schema.Struct({
  position: Schema.Number,
  positionText: Schema.String,
  driver: DriverRef,
  constructor: ConstructorRef,
  points: Schema.Number,
  grid: Schema.Number,
  laps: Schema.Number,
  status: Schema.String,
  time: Schema.NullOr(Schema.String),
})

export const QualifyingRow = Schema.Struct({
  position: Schema.Number,
  driver: DriverRef,
  constructor: ConstructorRef,
  q1: Schema.NullOr(Schema.String),
  q2: Schema.NullOr(Schema.String),
  q3: Schema.NullOr(Schema.String),
})

export const DriverStandingRow = Schema.Struct({
  position: Schema.NullOr(Schema.Number),
  points: Schema.Number,
  wins: Schema.Number,
  driver: DriverRef,
  constructors: Schema.Array(ConstructorRef),
})

export const ConstructorStandingRow = Schema.Struct({
  position: Schema.NullOr(Schema.Number),
  points: Schema.Number,
  wins: Schema.Number,
  constructor: ConstructorRef,
})

const Count = Schema.FiniteFromString
const Slot = Schema.Struct({ date: Schema.String, time: Schema.optionalKey(Schema.String) })

const JolpicaDriver = Schema.Struct({
  driverId: Schema.String,
  permanentNumber: Schema.optionalKey(Count),
  code: Schema.optionalKey(Schema.String),
  givenName: Schema.String,
  familyName: Schema.String,
  nationality: Schema.optionalKey(Schema.String),
})

const JolpicaConstructor = Schema.Struct({ constructorId: Schema.String, name: Schema.String, nationality: Schema.String })

const JolpicaRaceHeader = {
  season: Count,
  round: Count,
  raceName: Schema.String,
}

const JolpicaRace = Schema.Struct({
  ...JolpicaRaceHeader,
  Circuit: Schema.Struct({
    circuitId: Schema.String,
    circuitName: Schema.String,
    Location: Schema.Struct({ locality: Schema.String, country: Schema.String }),
  }),
  date: Schema.String,
  time: Schema.optionalKey(Schema.String),
  FirstPractice: Schema.optionalKey(Slot),
  SecondPractice: Schema.optionalKey(Slot),
  ThirdPractice: Schema.optionalKey(Slot),
  SprintQualifying: Schema.optionalKey(Slot),
  Sprint: Schema.optionalKey(Slot),
  Qualifying: Schema.optionalKey(Slot),
})

const JolpicaResult = Schema.Struct({
  position: Count,
  positionText: Schema.String,
  points: Count,
  grid: Count,
  laps: Count,
  status: Schema.String,
  Driver: JolpicaDriver,
  Constructor: JolpicaConstructor,
  Time: Schema.optionalKey(Schema.Struct({ time: Schema.String })),
})

const JolpicaQualifying = Schema.Struct({
  position: Count,
  Driver: JolpicaDriver,
  Constructor: JolpicaConstructor,
  Q1: Schema.optionalKey(Schema.String),
  Q2: Schema.optionalKey(Schema.String),
  Q3: Schema.optionalKey(Schema.String),
})

const JolpicaStanding = {
  position: Schema.optionalKey(Count),
  points: Count,
  wins: Count,
}

const driver = (d: typeof JolpicaDriver.Type): DriverRef => ({
  driverId: d.driverId,
  code: d.code ?? null,
  number: d.permanentNumber ?? null,
  givenName: d.givenName,
  familyName: d.familyName,
  nationality: d.nationality ?? null,
})

const slot = (name: SessionName, date: string, time: string | undefined): Session => ({
  name,
  startsAt: `${date}T${time ?? '00:00:00Z'}`,
  timeConfirmed: time !== undefined,
})

const SLOTS = [
  ['FirstPractice', 'FP1'],
  ['SecondPractice', 'FP2'],
  ['ThirdPractice', 'FP3'],
  ['SprintQualifying', 'SprintQualifying'],
  ['Sprint', 'Sprint'],
  ['Qualifying', 'Qualifying'],
] as const

const race = (r: typeof JolpicaRace.Type): Race => ({
  season: r.season,
  round: r.round,
  raceName: r.raceName,
  circuit: {
    circuitId: r.Circuit.circuitId,
    circuitName: r.Circuit.circuitName,
    locality: r.Circuit.Location.locality,
    country: r.Circuit.Location.country,
  },
  sessions: [
    ...SLOTS.flatMap(([key, name]) => {
      const s = r[key]

      return s ? [slot(name, s.date, s.time)] : []
    }),
    slot('Race', r.date, r.time),
  ].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
})

const noEncode = <T, E>() => SchemaGetter.forbidden<T, E>(() => 'Jolpica responses are decode-only')

const raceTable = <Fields extends Schema.Struct.Fields>(fields: Fields) =>
  Schema.Struct({ MRData: Schema.Struct({ RaceTable: Schema.Struct(fields) }) })

const standingsTable = <Fields extends Schema.Struct.Fields>(fields: Fields) =>
  Schema.Struct({
    MRData: Schema.Struct({ StandingsTable: Schema.Struct({ StandingsLists: Schema.Array(Schema.Struct({ season: Count, round: Count, ...fields })) }) }),
  })

const sessionResults = <Row extends Schema.Top>(row: Row) => Schema.Struct({ race: Schema.NullOr(RaceRef), rows: Schema.Array(row) })

const standingsOf = <Row extends Schema.Top>(row: Row) =>
  Schema.NullOr(Schema.Struct({ season: Schema.Number, round: Schema.Number, rows: Schema.Array(row) }))

export const RaceResults = sessionResults(ResultRow)

export const QualifyingResults = sessionResults(QualifyingRow)

export const DriverStandings = standingsOf(DriverStandingRow)

export const ConstructorStandings = standingsOf(ConstructorStandingRow)

const firstRace = <R extends typeof RaceRef.Type, Row>(races: ReadonlyArray<R>, rows: (race: R) => ReadonlyArray<Row>) => {
  const first = races[0]

  return first ? { race: { season: first.season, round: first.round, raceName: first.raceName }, rows: rows(first) } : { race: null, rows: [] }
}

const firstList = <L extends { season: number; round: number }, Row>(lists: ReadonlyArray<L>, rows: (list: L) => ReadonlyArray<Row>) => {
  const first = lists[0]

  return first ? { season: first.season, round: first.round, rows: rows(first) } : null
}

const result = (r: typeof JolpicaResult.Type): typeof ResultRow.Type => ({
  position: r.position,
  positionText: r.positionText,
  driver: driver(r.Driver),
  constructor: r.Constructor,
  points: r.points,
  grid: r.grid,
  laps: r.laps,
  status: r.status,
  time: r.Time?.time ?? null,
})

const qualifying = (q: typeof JolpicaQualifying.Type): typeof QualifyingRow.Type => ({
  position: q.position,
  driver: driver(q.Driver),
  constructor: q.Constructor,
  q1: q.Q1 ?? null,
  q2: q.Q2 ?? null,
  q3: q.Q3 ?? null,
})

export const RacesResponse = raceTable({ season: Count, Races: Schema.Array(JolpicaRace) }).pipe(
  Schema.decodeTo(Schema.Struct({ season: Schema.Number, races: Schema.Array(Race) }), {
    decode: SchemaGetter.transform(({ MRData }) => ({ season: MRData.RaceTable.season, races: MRData.RaceTable.Races.map(race) })),
    encode: noEncode(),
  }),
)

export const RaceResultsResponse = raceTable({ Races: Schema.Array(Schema.Struct({ ...JolpicaRaceHeader, Results: Schema.Array(JolpicaResult) })) }).pipe(
  Schema.decodeTo(RaceResults, {
    decode: SchemaGetter.transform(({ MRData }) => firstRace(MRData.RaceTable.Races, (r) => r.Results.map(result))),
    encode: noEncode(),
  }),
)

export const SprintResponse = raceTable({ Races: Schema.Array(Schema.Struct({ ...JolpicaRaceHeader, SprintResults: Schema.Array(JolpicaResult) })) }).pipe(
  Schema.decodeTo(RaceResults, {
    decode: SchemaGetter.transform(({ MRData }) => firstRace(MRData.RaceTable.Races, (r) => r.SprintResults.map(result))),
    encode: noEncode(),
  }),
)

export const QualifyingResponse = raceTable({
  Races: Schema.Array(Schema.Struct({ ...JolpicaRaceHeader, QualifyingResults: Schema.Array(JolpicaQualifying) })),
}).pipe(
  Schema.decodeTo(QualifyingResults, {
    decode: SchemaGetter.transform(({ MRData }) => firstRace(MRData.RaceTable.Races, (r) => r.QualifyingResults.map(qualifying))),
    encode: noEncode(),
  }),
)

export const DriverStandingsResponse = standingsTable({
  DriverStandings: Schema.Array(Schema.Struct({ ...JolpicaStanding, Driver: JolpicaDriver, Constructors: Schema.Array(JolpicaConstructor) })),
}).pipe(
  Schema.decodeTo(DriverStandings, {
    decode: SchemaGetter.transform(({ MRData }) =>
      firstList(MRData.StandingsTable.StandingsLists, (list) =>
        list.DriverStandings.map((s) => ({
          position: s.position ?? null,
          points: s.points,
          wins: s.wins,
          driver: driver(s.Driver),
          constructors: s.Constructors,
        })),
      ),
    ),
    encode: noEncode(),
  }),
)

export const ConstructorStandingsResponse = standingsTable({
  ConstructorStandings: Schema.Array(Schema.Struct({ ...JolpicaStanding, Constructor: JolpicaConstructor })),
}).pipe(
  Schema.decodeTo(ConstructorStandings, {
    decode: SchemaGetter.transform(({ MRData }) =>
      firstList(MRData.StandingsTable.StandingsLists, (list) =>
        list.ConstructorStandings.map((s) => ({ position: s.position ?? null, points: s.points, wins: s.wins, constructor: s.Constructor })),
      ),
    ),
    encode: noEncode(),
  }),
)
