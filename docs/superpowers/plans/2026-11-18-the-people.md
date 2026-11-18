# The people: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/people` and `/people/<driverId>` render the approved index and the data-built driver template for the 22 race drivers of 2026.

**Architecture:**
- The hourly season run builds a new `people` field inside the season snapshot.
  - It reuses the season's race and sprint pages that `history()` already fetches, and adds one paged season-qualifying fetch.
  - Past careers are fetched per driver within a 60-request budget per run, then carried forward from `previous`.
- `src/people/page-model.ts` turns the snapshot into view models, with all copy rules as pure functions.
- Two routes render those models. They follow `TrackPage`'s hero and the season page's loading states.

**Tech Stack:** TanStack Start, React, Effect Schema, bun test, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-18-the-people-design.md`

## Global Constraints

- **Code style:**
  - No code comments anywhere.
  - No `as` casts except `as const`. No `any`, no non-null `!`, and no lazy `unknown`.
  - Prettier only as `--single-quote --no-semi --print-width 200`. Don't reformat unrelated lines.
- **Data:**
  - Never invent numbers. Missing data hides a section, or a row reads "Did not race".
  - "The season" always means `driverStandings.season`, never `snapshot.season`.
  - Jolpica requests keep the client's user agent, 250 ms spacing and semaphore. The past-career budget is `PAST_BUDGET = 60` requests per run.
  - New snapshot fields are `Schema.optionalKey`, so stored snapshots keep decoding.
- **Copy:**
  - Driver copy is pronoun-free.
  - Strings are exactly as written in this plan or the spec: en dash in `4–13`, `·` separators, and two spaces in `Read  →`.
- **Photos:**
  - Credits parse as `Photo <by> · <licence>`.
  - Captions name the subject, place and year.
- **Commits and files:**
  - Commits are local only, on `feat/people`. Titles are conventional, in present-tense behaviour, with no Co-Authored-By trailer.
  - Don't touch `.playwright-mcp/`.
- **Jolpica scripts:** any request in a script uses the user agent `LightsOutResearch/1.0 (personal non-commercial project)`, spaces requests by at least 400 ms, and writes only under `test/fixtures/jolpica/people/` or the scratchpad.

## Review Focus

1. **Stored snapshots must keep decoding.** Production KV holds `season:v1` without `people`, and its `DriverRef`s have no `dateOfBirth`. Task 2 decodes `test/fixtures/season-snapshot.json`, which predates `people`, after the schema change.
2. **The hourly run's cost.**
   - The season's race and sprint pages must be fetched once, not once for history and again for people.
   - Past careers must stop starting new drivers once 60 requests are spent.
   - Task 2 counts the calls.
3. **Phone rows at 390 px.** "Bahrain in Malaysia" and "United States" must sit on one line, with no sideways scroll. Task 6 checks every race-by-race row's height on the phone project.
4. **`/people` while the snapshot is warming** (`/api/season` answers 503). Both routes show the same loading and warming states as `/season`, with no thrown error. Tasks 6 and 7 stub a 503.
5. **Ages depend on the clock.** Every age is computed from a `now` the model receives. The e2e tests fix the clock at `SNAPSHOT_AT`.

---

### Task 1: Jolpica fixtures, schemas and client endpoints

**Files:**
- Create: `test/fixtures/jolpica/people/` (recorded responses, listed in Step 1)
- Modify: `src/season/jolpica-schema.ts`
- Modify: `src/season/jolpica-client.ts`
- Modify: `test/season/fake-jolpica.ts`
- Test: `test/season/jolpica-schema.test.ts`

**Interfaces:**
- Produces:
  - `DriverRef.dateOfBirth?: string` (`optionalKey`), filled from Jolpica's `Driver.dateOfBirth`.
  - `SeasonResults['races'][number]` gains `raceName: string`, `locality: string` and `country: string`. It is filled from `raceName` and `Circuit.Location`. This applies to both `SeasonResultsResponse` and `SeasonSprintsResponse`.
  - `SeasonQualifying = { total: number; races: ReadonlyArray<{ round: number; rows: ReadonlyArray<{ driverId: string; constructorId: string; position: number }> }> }`, and `SeasonQualifyingResponse`.
  - `DriverRaces = { total: number; races: ReadonlyArray<{ season: number; round: number; country: string; row: ResultRow }> }`.
    - `DriverResultsResponse` decodes `Results[0]`.
    - `DriverSprintsResponse` decodes `SprintResults[0]`.
  - `DriverPoles = { total: number; seasons: ReadonlyArray<number> }`, and `DriverPolesResponse`, one season entry per pole.
  - `JolpicaClient` gains these paths:
    - `seasonQualifying(season, offset)`: `/${season}/qualifying/?limit=100&offset=${offset}`
    - `driverResults(driverId, offset)`: `/drivers/${driverId}/results/?limit=100&offset=${offset}`
    - `driverSprints(driverId, offset)`: `/drivers/${driverId}/sprint/?limit=100&offset=${offset}`
    - `driverPoles(driverId, offset)`: `/drivers/${driverId}/qualifying/1/?limit=100&offset=${offset}`
  - Past seasons' final tables reuse the existing `driverStandings(season)`.
  - `test/season/fake-jolpica.ts` exports these:
    - `results2026r20`, `sprints2026r20`, `qualifying2026r20` and `drivers2026r20` (decoded people fixtures).
    - `driverFixture(driverId)` returns `{ results, sprints, poles } | null` for `ocon`, `bearman` and `antonelli`.
    - `standingsFor(season)` covers 2016, 2017, 2018 and 2020–2025.
    - A `peopleFake` service that serves all of the above. It answers `JolpicaError` for any driver without a fixture.

- [ ] **Step 1: Record the fixtures.** Use a scratchpad Python script run with `python3 -I`, following the Global Constraints' Jolpica rule. Save each paged endpoint as **one** file in Jolpica's shape, with `MRData.total` and all `Races` concatenated. When a round is split across two pages, merge its `Results`, `SprintResults` or `QualifyingResults`.
  - `results-2026.json` from `/2026/results`
  - `sprint-2026.json` from `/2026/sprint`
  - `qualifying-2026.json` from `/2026/qualifying`
  - `driverstandings-2026.json` from `/2026/driverstandings`, which must be round 20
  - `<id>-results.json`, `<id>-sprint.json` and `<id>-poles.json` for `ocon`, `bearman` and `antonelli`
  - `driverstandings-<season>.json` for 2016, 2017, 2018, 2020, 2021, 2022, 2023, 2024 and 2025

  If `/2026/driverstandings` reports a round other than 20, stop and ledger it. Round 21 has run, and every 2026 number in this plan moves.

- [ ] **Step 2: Write the failing schema tests** in `test/season/jolpica-schema.test.ts`.

```ts
it('season results carry the race name, locality, country and dates of birth', () => {
  const r15 = results2026r20.races.find((race) => race.round === 15)
  expect(r15?.raceName).toBe('Azerbaijan Grand Prix')
  expect(r15?.locality).toBe('Baku')
  expect(r15?.country).toBe('Azerbaijan')
  expect(r15?.rows.find((row) => row.driver.driverId === 'ocon')?.driver.dateOfBirth).toBe('1996-09-17')
})

it('season qualifying keeps driver, team and position per round', () => {
  expect(qualifying2026r20.races[0]?.rows).toContainEqual({ driverId: 'ocon', constructorId: 'haas', position: 13 })
})

it('driver results list every entry with its season, round and country', () => {
  const ocon = driverFixture('ocon')
  expect(ocon?.results.races.length).toBe(198)
  expect(ocon?.results.races[0]).toMatchObject({ season: 2016, round: 13, country: 'Belgium' })
})

it('driver poles list one season per pole', () => {
  expect(driverFixture('antonelli')?.poles.seasons).toEqual([2026, 2026, 2026, 2026, 2026, 2026, 2026])
})
```

- [ ] **Step 3: Run the tests and watch them fail.** Run `bun test test/season/jolpica-schema.test.ts`. Expected: FAIL, because the exports don't exist yet.

- [ ] **Step 4: Implement the schemas, client endpoints and fakes.**
  - Extend `seasonRace` to take the race header.
  - Update `pageOf` in the fake to carry `raceName`, `locality` and `country`. It needs a paged variant for `SeasonQualifying` and `DriverRaces`; one generic helper over `{ total, races }` is fine.

- [ ] **Step 5: Run the tests and watch them pass.** Run `bun test test/season`. Expected: everything passes, including the existing history and build tests on the old fixtures.

- [ ] **Step 6: Lint and commit.** Run `bun run lint`. Expected: clean.

```bash
git add src/season/jolpica-schema.ts src/season/jolpica-client.ts test/season test/fixtures/jolpica/people
git commit -m "feat(season): the Jolpica client reads season qualifying, driver careers and dates of birth"
```

### Task 2: Build `people` in the hourly snapshot

**Files:**
- Create: `src/people/schema.ts`
- Create: `src/people/build.ts`
- Modify: `src/season/build-snapshot.ts`
- Modify: `src/season/snapshot-schema.ts`
- Modify: `src/season/history.ts` (the `SeasonRace` type only)
- Test: `test/people/build.test.ts`
- Test: `test/season/api-season.test.ts`

**Interfaces:**
- Consumes everything Task 1 produces.
- Produces, in `src/people/schema.ts`:
  - `PersonRow = { round: number; grid: number; position: number; positionText: string; points: number; constructorId: string }`
  - `Team = { constructorId: string; name: string }`
  - `Past = { through: number; starts: number; wins: number; podiums: number; poles: number; points: number; seasons: ReadonlyArray<number>; teams: ReadonlyArray<Team>; firstWin: { season: number; country: string } | null; finals: ReadonlyArray<{ season: number; position: number | null }> }`
  - `People`:
    ```ts
    { season: number; rounds: ReadonlyArray<{ round: number; raceName: string; locality: string; country: string }>; results: Record<string, ReadonlyArray<PersonRow>>; sprintPoints: Record<string, number>; qualifying: SeasonQualifying['races']; born: Record<string, string>; past: Record<string, Past> }
    ```
  - Each is exported as a Schema and a type. Use `Schema.Record(Schema.String, …)`, as in `src/car/parts.ts`.
- Produces, in `src/people/build.ts`:
  - `PAST_BUDGET = 60`
  - `isStart(row: { positionText: string; status: string }): boolean`. This is false for `positionText` `W` or `F`, and for status `Did not start`, `Withdrew`, `Withdrawn`, `Did not qualify` or `Did not prequalify`.
  - `buildPeople(season: number, races: ReadonlyArray<SeasonRace>, sprints: ReadonlyArray<SeasonRace>, previous: People | undefined): Effect.Effect<People | undefined, never, JolpicaClient>`
- Produces in the snapshot: `SeasonSnapshot.people: optionalKey(People)`. `buildSnapshot`'s `previous` becomes `Pick<SeasonSnapshot, 'flags' | 'topSpeed' | 'people'>`.

**Rules:**
- **Past:**
  - A driver's past is fresh when `previous.past[id]?.through === season - 1`. Fresh pasts are copied over.
  - The others are built in **standings order** until `PAST_BUDGET` requests have been made. A started driver is finished even if that overruns the budget.
  - Season final tables are fetched at most once per run. Keep a `Map` of them.
  - `finals[].position` is the driver's row position in that season's table.
  - Only seasons `≤ through` count.
- **Errors:**
  - A driver whose fetch fails is skipped, and keeps any previous entry.
  - If the season-qualifying fetch fails, return `previous` when `previous.season === season`, else `undefined`. Log a warning, as flags do.
- **Fetching once:** `build-snapshot.ts` fetches the race and sprint pages once (`seasonPages`) and passes them to both `seasonHistory` and `buildPeople`.

- [ ] **Step 1: Write the failing tests** in `test/people/build.test.ts`, using `peopleFake`.

```ts
it('keeps every 2026 race row per driver', async () => {
  const people = await build()
  expect(people?.season).toBe(2026)
  expect(people?.rounds).toHaveLength(20)
  expect(people?.results.ocon).toHaveLength(18)
  expect(people?.results.ocon?.[14]).toEqual({ round: 15, grid: 13, position: 8, positionText: '8', points: 4, constructorId: 'haas' })
  expect(people?.sprintPoints.antonelli).toBe(31)
  expect(people?.born.ocon).toBe('1996-09-17')
})

it('builds a past career through the season before', async () => {
  const ocon = (await build())?.past.ocon
  expect(ocon).toMatchObject({ through: 2025, starts: 180, wins: 1, podiums: 4, poles: 0, points: 483, seasons: [2016, 2017, 2018, 2020, 2021, 2022, 2023, 2024, 2025], firstWin: { season: 2021, country: 'Hungary' } })
  expect(ocon?.teams.map((t) => t.constructorId)).toEqual(['manor', 'force_india', 'renault', 'alpine', 'haas'])
  expect(ocon?.finals).toEqual([2016, 2017, 2018, 2020, 2021, 2022, 2023, 2024, 2025].map((season, i) => ({ season, position: [23, 8, 12, 12, 11, 8, 12, 14, 15][i] })))
  expect((await build())?.past.antonelli).toMatchObject({ starts: 24, podiums: 3, points: 150, finals: [{ season: 2025, position: 7 }] })
})

it('skips drivers whose career fetch fails and keeps their previous entry', async () => { /* previous.past.bearman = stale marker; fake fails for bearman; expect past.bearman toEqual the marker, past.ocon fresh */ })
it('copies fresh pasts without a request', async () => { /* previous built once; second build counts 0 driver* calls */ })
it('stops starting new drivers after 60 requests', async () => { /* fake where every driver endpoint answers one tiny page; expect total driver* + standings calls ≤ 60 + one driver's calls, and fewer pasts than drivers */ })
it('keeps the previous people when season qualifying fails', async () => { /* expect result toBe previous */ })
```

Add to the existing snapshot build tests:

```ts
it('fetches the season results and sprints once', async () => { /* count seasonResults and seasonSprints calls; each equals Math.ceil(total / 100) */ })
```

Add to `test/season/api-season.test.ts`:

```ts
it('still decodes a stored snapshot from before people existed', async () => {
  expect(Schema.decodeUnknownSync(SeasonSnapshotJson)(await Bun.file('test/fixtures/season-snapshot.json').text()).people).toBeUndefined()
})
```

- [ ] **Step 2: Run the tests and watch them fail.** Run `bun test test/people test/season`. Expected: FAIL, because `buildPeople` is missing.

- [ ] **Step 3: Implement `src/people/schema.ts`, `src/people/build.ts` and the snapshot wiring.**

- [ ] **Step 4: Run the tests and watch them pass.** Run `bun test`. Expected: every test passes.

- [ ] **Step 5: Lint and commit.** Run `bun run lint`. Expected: clean.

```bash
git add src/people src/season test/people test/season
git commit -m "feat(season): the hourly snapshot keeps every driver's season and fills past careers sixty requests at a time"
```

### Task 3: The driver page model

**Files:**
- Create: `src/people/people.ts` (the `PEOPLE` list, with the Ocon hero only; Task 5 adds the rest)
- Create: `src/people/page-model.ts`
- Create: `test/people/fixture.ts` (builds a round-20 snapshot with `people` from the Task 1 fakes)
- Test: `test/people/page-model.test.ts`

**Interfaces:**
- Consumes: `People` and `buildPeople` from Task 2, and `person()`, `team()` and `titleFight()` from `src/season/page-model.ts`.
- Produces, in `src/people/people.ts`:
  - `type Person = { driverId: string; code: string; hero: Photo }`
  - `PEOPLE: ReadonlyArray<Person>`, which holds all 22 ids. Task 5 fills in the photos.
  - `personFor(driverId: string): Person | undefined`
  - The ids, in the 2026 standings order:
    `antonelli, max_verstappen, russell, hamilton, leclerc, norris, piastri, hadjar, lawson, gasly, arvid_lindblad, colapinto, bearman, bortoleto, hulkenberg, ocon, alonso, sainz, albon, stroll, bottas, perez`
- Produces, in `src/people/page-model.ts`:
  - `career(people: People, driverId: string): Career | null`. It is null when the past is missing, or `through !== people.season - 1`.
  - `driverPage(snapshot: SeasonSnapshot, driverId: string, now: Date): DriverPage | null`. It is null for an id that is not in `PEOPLE`.
  - The `DriverPage` type:
    ```ts
    {
      hero: { label; given; family; sub; photo: Photo }
      season: { label; headline; body; stats: ReadonlyArray<{ label; value; note }>; payoff; credit } | null
      career: { label; number; unit; headline; body; payoff; ladder: ReadonlyArray<{ label; value }>; credit } | null
      races: { label: string; rows: ReadonlyArray<RaceRow>; footnote: string } | null
      next: { label: string; name: string; to: string; portrait: Photo | undefined }
    }
    ```
    Every field without a stated type is a `string`.
  - `RaceRow = { round: string; grandPrix: string; city: string; start: string | null; finish: string; short: string; points: string | null; best: boolean; dnr: boolean }`

- [ ] **Step 1: Write the failing tests** in `test/people/page-model.test.ts`. Use `now = new Date('2026-11-18T12:00:00Z')`.

```ts
it('builds Ocon\'s hero, season and career from data', () => {
  const page = driverPage(snapshot, 'ocon', now)
  expect(page?.hero).toMatchObject({ label: 'The people · Haas · No. 31', given: 'Esteban', family: 'Ocon', sub: 'French, 30. In Formula 1 since 2016, with five teams.' })
  expect(page?.season).toEqual({
    label: '2026 · After round 20',
    headline: 'Sixteenth in 2026.',
    body: 'Seven points from 18 races. Haas teammate Oliver Bearman has 23.',
    stats: [
      { label: 'Points', value: '7', note: 'P16 in the championship' },
      { label: 'Best finish', value: '8th', note: 'Azerbaijan, round 15' },
      { label: 'Qualifying vs Bearman', value: '4–13', note: 'Ahead in 4 of 17' },
      { label: 'Races', value: '18', note: 'Of 20 so far' },
    ],
    payoff: 'Best of 2026: 8th in Baku, for 4 points.',
    credit: 'Figures: Jolpica F1 API, after round 20, São Paulo',
  })
  expect(page?.career).toEqual({
    label: 'Career · Since 2016',
    number: '198',
    unit: 'starts in Formula 1',
    headline: 'One win: Hungary, 2021.',
    body: 'With Manor Marussia, Force India, Renault, Alpine and Haas. Best season: 8th, in 2017 and 2022.',
    payoff: 'Ten seasons, five teams.',
    ladder: [
      { label: 'Wins', value: '1' },
      { label: 'Podiums', value: '4' },
      { label: 'Pole positions', value: '0' },
      { label: 'Points', value: '490' },
      { label: 'Best season', value: '8th' },
    ],
    credit: 'Career figures: Jolpica F1 API, after round 20 · points include sprints',
  })
})

it('reads every round, the best one purple and the missed ones as did not race', () => {
  const rows = driverPage(snapshot, 'ocon', now)?.races?.rows ?? []
  expect(rows).toHaveLength(20)
  expect(rows[0]).toEqual({ round: '01', grandPrix: 'Australian', city: 'Melbourne', start: 'P13', finish: 'P11', short: 'P11', points: '0', best: false, dnr: false })
  expect(rows[11]).toMatchObject({ finish: 'Retired', short: 'Out' })
  expect(rows.filter((r) => r.best).map((r) => r.round)).toEqual(['15'])
  expect(rows[15]?.grandPrix).toBe('Bahrain in Malaysia')
  expect(rows[18]).toMatchObject({ grandPrix: 'Mexico City', start: null, finish: 'Did not race', points: null, dnr: true })
})

it('writes a champion with several wins', () => {
  const page = driverPage(snapshot, 'antonelli', now)
  expect(page?.hero.sub).toBe('Italian, 20. In Formula 1 since 2025, with Mercedes.')
  expect(page?.season?.headline).toBe('Champion in 2026.')
  expect(page?.season?.payoff).toBe('9 wins in 2026, the first in Shanghai.')
  expect(page?.career).toMatchObject({ number: '44', headline: '9 wins. The first: China, 2026.', body: 'With Mercedes. Best season: 7th, in 2025.', payoff: 'Two seasons, one team.' })
})

it('names the next driver one place down and wraps the last to the leader', () => {
  expect(driverPage(snapshot, 'ocon', now)?.next).toMatchObject({ label: 'Next · P17', name: 'Fernando Alonso', to: '/people/alonso' })
  expect(driverPage(snapshot, 'perez', now)?.next).toMatchObject({ label: 'Next · P1', to: '/people/antonelli' })
})

it('hides the career while the past is missing or stale', () => { /* ocon past through 2024 → career null; 'gasly' (no fixture) → career null, season present */ })
it('writes a rookie and a winless driver', () => { /* synthetic People: past {through:2025, starts:0, seasons:[], teams:[]} for arvid_lindblad → sub 'British, 19. First season in Formula 1, with Racing Bulls.', payoff 'First season.'; bearman career headline 'No wins yet.' */ })
it('returns null for a driver without a page', () => { expect(driverPage(snapshot, 'tsunoda', now)).toBeNull() })
```

- [ ] **Step 2: Run the tests and watch them fail.** Run `bun test test/people/page-model.test.ts`. Expected: FAIL, because the module is missing.

- [ ] **Step 3: Implement `driverPage` and `career`** by the spec's definitions.
  - **Number and ordinal words:** use `words()` and `capital()` from `src/season/words.ts`. Add `ordinalWord(n)` there ("Sixteenth"), and an `ordinal(n)` for digits ("8th").
  - **Team names:** use `team()` for current ids. Otherwise use Jolpica's name with a trailing ` F1 Team` removed.
  - **"Best season" years:** "2017 and 2022". With three or more years, join with commas and "and".
  - **Champion:** a driver is champion when `titleFight(snapshot)?.state` is `decided` or `over` and they are P1.
  - **Grand Prix and Finish:** the Grand Prix column is `raceName.replace(' Grand Prix', '')`. Finish strings follow the spec. `short` equals `finish` except for `Retired`, which becomes `Out`.

- [ ] **Step 4: Run the tests and watch them pass.** Run `bun test test/people`. Expected: everything passes.

- [ ] **Step 5: Lint and commit.**

```bash
git add src/people src/season/words.ts test/people
git commit -m "feat(people): each driver's season, career and race-by-race rows come from the snapshot"
```

### Task 4: The index page model

**Files:**
- Modify: `src/people/page-model.ts`
- Create: `src/people/legends.ts` (the band and Legends copy, verbatim from frame 210:488)
- Test: `test/people/index-model.test.ts`

**Interfaces:**
- Produces: `peopleIndex(snapshot: SeasonSnapshot, now: Date): PeopleIndex | null`. It is null without standings.
- The `PeopleIndex` type:
  ```ts
  {
    hero: { label; count: number; body; facts: ReadonlyArray<{ label; value; note }> }
    band: { visible: boolean }
    tower: { label; meta; rows: ReadonlyArray<TowerRow>; footnote: string | null }
  }
  ```
  - `TowerRow = { position: string; number: string; name: string; team: string; nationality: string; points: string; to: string | null; champion: boolean; thumb: Photo | null }`
  - Every field without a stated type is a `string`.

- [ ] **Step 1: Write the failing tests** (`now` = 2026-11-18).

```ts
it('counts the grid and names the champion, the youngest and the oldest', () => {
  const index = peopleIndex(snapshot, now)
  expect(index?.hero).toMatchObject({ label: 'The people · 2026 season', count: 22, body: 'Eleven teams, two cars each. Who drives for whom, how they stand after São Paulo, and the ones they chase.' })
  expect(index?.hero.facts).toEqual([
    { label: 'Champion', value: 'Antonelli', note: 'Aged 20' },
    { label: 'Youngest', value: 'Lindblad', note: 'Aged 19' },
    { label: 'Oldest', value: 'Alonso', note: 'Aged 45' },
  ])
})

it('links the 22 race drivers and names the stand-ins below the tower', () => {
  const tower = peopleIndex(snapshot, now)?.tower
  expect(tower?.label).toBe('The grid · after round 20')
  expect(tower?.meta).toBe('22 drivers · 11 teams · points after São Paulo')
  expect(tower?.rows.filter((r) => r.to !== null)).toHaveLength(22)
  expect(tower?.rows[0]).toMatchObject({ position: '01', number: '12', name: 'Kimi Antonelli', team: 'Mercedes', nationality: 'Italian', points: '390', to: '/people/antonelli', champion: true })
  expect(tower?.rows.find((r) => r.name.includes('Tsunoda'))?.to).toBeNull()
  expect(tower?.footnote).toBe('Also raced in 2026: Yuki Tsunoda (Racing Bulls, rounds 12 to 14), Ryo Hirakawa (Haas, round 19) and Rafael Câmara (Haas, round 20).')
})

it('shows the leader, not a champion, while the title is open', () => { /* snapshot with p2 within reach → facts[0] { label: 'Leader' }, no row champion */ })
it('hides the 2026 champion band once the standings move to 2027', () => { /* driverStandings.season 2027 → band.visible false */ })
```

  - The footnote uses Jolpica's names. If the fixture spells Câmara differently, use the fixture's spelling and ledger it.
  - The rounds come from `people.results` with `constructorId`.

- [ ] **Step 2: Run the tests and watch them fail.** Run `bun test test/people/index-model.test.ts`. Expected: FAIL, because `peopleIndex` is missing.

- [ ] **Step 3: Implement `peopleIndex` and `legends.ts`.**
  - Read the band and Legends strings from frame 210:488 through Figma `use_figma` (read only).
  - Read the full Hamilton line; the spec shows it cut short.

- [ ] **Step 4: Run the tests and watch them pass.** Run `bun test test/people`. Expected: everything passes.

- [ ] **Step 5: Lint and commit.**

```bash
git add src/people test/people
git commit -m "feat(people): the index model counts the grid, names the stand-ins and links every race driver"
```

### Task 5: Photos

**Files:**
- Create: `public/img/people/<driverId>-hero.jpg` and `<driverId>-hero-phone.jpg`, for all 22
- Create: `public/img/drivers/GAS.webp` and `PER.webp`
- Modify: `src/people/people.ts`
- Modify: `src/drivers/portraits.ts`
- Modify: `src/credits/photos.ts`
- Test: `test/people/people.test.ts`
- Test: `test/credits/*` (extend the existing credit test)

- [ ] **Step 1: Write the failing tests.**
  - Every `PEOPLE` hero has a `source` starting with `https://commons.wikimedia.org/wiki/File:`.
  - Its `credit` parses with `creditParts`.
  - Its `place` matches `/ · .+, 20(24|25|26)$/`, or else the year is earlier and the entry is ledgered.
  - Both its files exist (`Bun.file(...).exists()`).
  - `portraitFor('GAS')` and `portraitFor('PER')` are defined.
  - The credits list includes every hero, with `usedOn: 'The people'`.

- [ ] **Step 2: Run the tests and watch them fail.** Run `bun test test/people/people.test.ts test/credits`. Expected: FAIL.

- [ ] **Step 3: Pick and prepare the photos.**
  - **Searching Commons:** query by driver name for 2024–2026 photos of the driver or their car, landscape.
    - Use the API `imageinfo` with `iiurlwidth=1920` for the thumbnail URL.
    - Space requests by 2 s. Commons answered 429 to fast direct thumbnail requests today.
    - Save each download into its own new directory in the scratchpad.
  - **Desktop crop:** 1440:760 aspect, at most 1920 px wide, never enlarged.
    - Keep the subject clear of the bottom-left 740 × 360 title block.
    - Check it the way the Yas Marina hero was checked: simulate 1000–1920 px with `object-fit: cover`.
  - **Phone crop:** 780 × 520.
  - Use PIL, in a scratchpad script run with `python3 -I`. Save JPEG at quality 82.
  - **Ocon** uses `2026_Chinese_GP_-_Haas_-_Esteban_Ocon_-_Qualifying.jpg`, placed as `'Esteban Ocon, Haas VF-26 · Shanghai, 2026'` with `'Photo Liauzh · CC BY 4.0'`.
  - **Gasly and Pérez portraits:** 840 × 1080 via `cwebp`, captioned like `SOURCES` in `portraits.ts`.
  - Ledger every file with its source, licence and crop box.

- [ ] **Step 4: Fill in `PEOPLE` and credits.** Then run the Step 1 tests. Expected: they pass.

- [ ] **Step 5: Lint and commit.**

```bash
git add public/img/people public/img/drivers src/people/people.ts src/drivers/portraits.ts src/credits/photos.ts test
git commit -m "feat(people): every race driver has a credited Commons hero photo, and Gasly and Pérez have portraits"
```

### Task 6: The driver page

**Files:**
- Create: `test/people/write-snapshot-fixture.ts`, which adds `people` to `test/fixtures/season-snapshot.json`, built with `peopleFake` and Ocon, Bearman and Antonelli pasts
- Modify: `test/fixtures/season-snapshot.json` (only the new `people` key)
- Create: `src/people/DriverPage.tsx`
- Create: `src/routes/people.$driver.tsx`
- Create: `src/styles/people.css`
- Modify: `vite.config.ts` (add `{ path: '/people/<id>' }` for every `PEOPLE` id)
- Test: `e2e/people.spec.ts`

**Interfaces:**
- Consumes: `driverPage` and `personFor`, plus `useSeason` and the Loader states used by `src/this-season/Season.tsx`.
- **Not found:** the route's `beforeLoad` throws `notFound()` when `personFor(params.driver)` is undefined.
- **Markup:**
  - The hero copies `TrackPage`'s hero markup, `<picture>` phone source and caption block.
  - "Next" reuses `src/chapter/Next.tsx`.
  - The race-by-race band is a `<table>`.
    - `tr.is-best` is the purple row and `tr.is-dnr` the dimmed ones.
    - A `.short` span holds the phone finish.
    - The City column is hidden below 761 px.

- [ ] **Step 1: Generate the e2e fixture.** Run `bun test/people/write-snapshot-fixture.ts`. Expected: `git diff --stat test/fixtures/season-snapshot.json` shows only additions, and the existing e2e suites still pass.

- [ ] **Step 2: Write the failing e2e tests** in `e2e/people.spec.ts`. Fix the clock at `SNAPSHOT_AT` with `page.clock.setFixedTime`, and use `stubSeason`. Run each in both colour schemes.
  - **Ocon:**
    - The title is `Esteban Ocon · The people · Lights Out`.
    - The h1 is `Esteban Ocon.`.
    - `French, 30. In Formula 1 since 2016, with five teams.` is visible.
    - `Sixteenth in 2026.` is visible.
    - The `.career` text contains `198` and `One win: Hungary, 2021.`.
    - The race-by-race table has 20 rows, exactly one `tr.is-best` containing `Azerbaijan`, and two `tr.is-dnr`.
    - The next link points to `/people/alonso`.
    - Nothing scrolls sideways, and there are no errors.
  - **Phone project:** every race-by-race row has the same height. This pins one-line names.
  - **`/people/gasly`:** the season shows; `.career` has count 0.
  - **`/people/tsunoda`:** shows the 404 page.
  - **503 from `/api/season`:** the page shows the same warming state as `/season`, with no page errors.
  - **Credits:** every `main img` sits in a figure with a credit, the same as the tracks credited test.

- [ ] **Step 3: Run the tests and watch them fail.** Run `bunx playwright test e2e/people.spec.ts`. Expected: FAIL, because the route doesn't exist.

- [ ] **Step 4: Build the page, its styles and the prerender paths** to frames 440:1001, 443:110, 445:74 and 445:387.
  - Use the existing tokens and the motion helpers from `src/motion/motion.ts`, with one ease family.

- [ ] **Step 5: Run the tests and watch them pass.** Run `bunx playwright test e2e/people.spec.ts`. Expected: everything passes on desktop and phone.

- [ ] **Step 6: Lint and commit.**

```bash
git add src/people src/routes/people.\$driver.tsx src/routeTree.gen.ts src/styles/people.css vite.config.ts e2e/people.spec.ts test/people test/fixtures/season-snapshot.json
git commit -m "feat(people): /people/<driver> reads the season, the career and every race from data"
```

### Task 7: The index, menu and links

**Files:**
- Create: `src/people/Index.tsx`
- Create: `src/routes/people.index.tsx`
- Modify: `src/styles/people.css`
- Modify: `vite.config.ts` (`{ path: '/people' }`)
- Modify: `src/shell/menu.ts` ("The people" → `/people`)
- Modify: `src/tracks/pages.ts` (`NEXT_PEOPLE.to = '/people'`)
- Test: `e2e/people.spec.ts`
- Test: existing menu and tracks e2e tests that expect "The people" to be `Soon`

- [ ] **Step 1: Write the failing e2e tests.**
  - **The index:**
    - The title is `The people · Lights Out`.
    - `22` and `drivers on the grid.` are visible.
    - The tower has 22 `a` rows. The Tsunoda row has no link.
    - The footnote contains `Ryo Hirakawa (Haas, round 19)`.
    - On desktop, hovering the Hamilton row shows `.tower .thumb img` and `Read  →`.
    - Clicking Ocon opens `/people/ocon`.
    - Nothing scrolls sideways, in both themes.
  - **The menu:** "The people" links to `/people`.
  - **Track pages:** the Next band links to `/people`.
  - **503:** the warming state, as in Task 6.
  - Flip any existing test that asserts "The people" is `Soon`.

- [ ] **Step 2: Run the tests and watch them fail.** Run `bunx playwright test e2e/people.spec.ts e2e/tracks.spec.ts e2e/home.spec.ts`. Expected: FAIL.

- [ ] **Step 3: Build the index** to frames 210:488, 211:497, 214:524 and 215:841.
  - The band's link reads `Read  →` and goes to `/people/antonelli`.

- [ ] **Step 4: Run the tests and watch them pass.** Run the same command. Expected: everything passes.

- [ ] **Step 5: Lint and commit.**

```bash
git add src/people src/routes/people.index.tsx src/routeTree.gen.ts src/styles/people.css vite.config.ts src/shell/menu.ts src/tracks/pages.ts e2e
git commit -m "feat(people): /people lists the grid as a timing tower and the menu opens it"
```

### Task 8: Full checks and a live look

- [ ] **Step 1: Run the checks.**
  - Run `bun run lint`, `bun test`, then the full Playwright suite (`bunx playwright test`).
  - Expected: all clean. Compare the pass counts against main: 459 unit and 481 e2e passed before this branch.

- [ ] **Step 2: A dry run of the snapshot builder against live Jolpica**, read-only, with no KV write.
  - Use a scratchpad script that runs `buildSnapshot(new Date())` with `JolpicaClient.layer` and `OpenF1Client.layer`, and prints the duration, the request count, the `JSON.stringify(snapshot).length` and `Object.keys(people.past).length`.
  - Expected:
    - It completes in under 3 minutes.
    - It makes no more than about 60 past requests plus the regular ones.
    - The snapshot is under 100 KB raw.
  - Never run `tools/refresh-season.ts`, because it writes production KV.

- [ ] **Step 3: Live look on the dev server** (`bun run dev`), with `/api/season` stubbed from the fixture.
  - Check `/people`, `/people/ocon`, `/people/antonelli` and `/people/gasly` at 1200, 1440 and 1920 px and at 390 px, in both themes. Nothing should scroll sideways.
  - Compare against the Figma frames, and screenshot for the PR.
  - Stop the dev server afterwards.
