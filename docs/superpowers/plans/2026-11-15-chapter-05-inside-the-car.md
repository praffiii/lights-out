# Chapter 05, Inside the car: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/chapters/inside-the-car`: the eight parts of a 2026 car taken apart in live 3D by scroll, wings that move, a self-updating season top speed, and a Next band that leads to the race weekend.

**Architecture:** The season refresh gains an optional `topSpeed` field built like the Chapter 04 flag tally. Blender (`blender/car/`) turns MaG80's model into one unlit meshopt glb with baked clay light, a `parts.json` rig and WEBP posters. The page is built poster-first (it works as approach B on its own); the live R3F scenes replace the posters only after Praffi passes the bake checkpoint.

**Tech Stack:** React 19, TanStack Start, Effect 4 Schema, three.js 0.187 + @react-three/fiber 9, GSAP ScrollTrigger + Lenis (`useScrub`), Blender 4 headless (`bpy`, Cycles bake), `@gltf-transform/cli`, Bun test, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-15-chapter-05-inside-the-car-design.md` (ac82f53). Read it with this plan; copy, facts and credits come from it verbatim.

## Global Constraints

- No code comments anywhere, Python and shell included (`tools/no_comments.py` fails the lint).
- No `as` casts except `as const`; no `any`; no non-null `!`; no lazy `unknown`.
- `bun run lint`, `bun test` and `bunx playwright test` green before every commit that touches `src/`.
- Commits are local on `feat/car`, conventional, present-tense changelog titles, **no `Co-Authored-By` trailer**. Never push.
- Zero cost: no new Worker routes, KV keys or paid services; the refresh adds two OpenF1 requests per new race.
- Never invent a number: every number on the page comes from the snapshot or a published rule in the spec.
- 3D is made in Blender; matte clay, no glow, no real-time lights; posters match the 3D end frames.
- No drag-to-spin, no synthesized sound, no intro.
- Budgets: `public/car/car.glb` ≤ 1.6 MB after meshopt, about 100k triangles; each poster < 200 KB; the glb ships no images.
- Poster naming: `-light` is rendered for paper, `-dark` for tarmac. The take-apart band sits in the opposite theme (`.flip`), so it shows `opposite(theme)`'s poster.
- Photos: `public/img/ch05-1950.jpg`, `ch05-1978.jpg`, `ch05-2026.jpg`, about 1400 px wide, Commons files and credits exactly as the spec's History item.
- MaG80 credit line under the band, verbatim: `3D car by MaG80 · CC BY 4.0 · a fan design to the 2026 rules, not any team's car · front and rear wing flaps move`.

## Review Focus

1. **`/api/season` fails or the snapshot has no `topSpeed`:** the Wings number block keeps its space and shows nothing; the car still shows. Pinned in Task 5's e2e.
2. **The season is over (after the last race closes, no next calendar):** the Next band shows the "All chapters" fallback, never `Round 23 · season finale` with a dead link. Pinned in Task 3.
3. **A race whose laps have no `st_speed` at all, or an empty laps reply right after the flag:** no row is written for it, a previous row survives, and the snapshot is still written. Pinned in Task 2.
4. **Scrolling back up through the pin and clicking a row while the scrub is mid-glide:** the lit part, the open row, the rail and `Part 0N of 08` agree at every stop. Pinned in Task 7's e2e (click row 06, then row 02).
5. **Theme toggled while the 3D band is on screen:** the clay colour uniform and the poster swap to the new opposite theme without reloading the glb. Pinned in Task 7's e2e.

---

### Task 1: Pick the top speed from laps

**Files:**
- Create: `src/speed/schema.ts`, `src/speed/top.ts`, `src/season/finished.ts`
- Modify: `src/flags/tally.ts` (move `finishedRaces`, `frozen`, `LIVE_MS`, `FROZEN_MS` out), `src/flags/build.ts` (import from `#/season/finished.ts`)
- Create fixture: `test/fixtures/openf1/laps-11404.json` (real Mexico City race, all drivers, trimmed to `driver_number`, `lap_number`, `st_speed`)
- Test: `test/speed/top.test.ts`

**Interfaces:**
- Produces (`src/speed/schema.ts`):
  - `SpeedLap = Schema.Struct({ driver_number: Number, lap_number: Number, st_speed: NullOr(Number) })`, `SpeedLapsResponse = Schema.Array(SpeedLap)`
  - `SpeedRace = Schema.Struct({ sessionKey, circuit: String, dateEnd: String, kmh, driverNumber, surname: String, lap })` (numbers as `Schema.Number`)
  - `TopSpeed = Schema.Struct({ season: Number, races: Schema.Array(SpeedRace) })`
- Produces (`src/speed/top.ts`):
  - `fastestLap(laps: ReadonlyArray<SpeedLap>): SpeedLap | undefined`
  - `raceRow(session: OpenF1Session, laps: ReadonlyArray<SpeedLap>, drivers: ReadonlyArray<OpenF1Driver>): SpeedRace | undefined`
  - `seasonBest(races: ReadonlyArray<SpeedRace>): SpeedRace | undefined`
  - `speedLine(race: SpeedRace): string`
- Produces (`src/season/finished.ts`): `finishedRaces(sessions, now)` and `frozen(race, now)`, moved unchanged.

- [ ] **Step 1: Save the fixture.** `curl 'https://api.openf1.org/v1/laps?session_key=11404'`, keep only the three fields, write `test/fixtures/openf1/laps-11404.json`. `drivers-11404.json` already exists.

- [ ] **Step 2: Write the failing tests** in `test/speed/top.test.ts`:

```ts
it('takes the highest speed trap reading in the race, earlier lap on a tie', () => {
  expect(fastestLap(mexico)).toMatchObject({ driver_number: 10, lap_number: 48, st_speed: 361 })
})

it('skips laps without a speed trap reading', () => {
  expect(fastestLap([{ driver_number: 1, lap_number: 1, st_speed: null }])).toBeUndefined()
})

it('writes the Mexico City row with the driver surname', () => {
  expect(raceRow(mexicoSession, mexico, driversOf(11404))).toEqual({ sessionKey: 11404, circuit: 'Mexico City', dateEnd: mexicoSession.date_end, kmh: 361, driverNumber: 10, surname: 'Gasly', lap: 48 })
})

it('the season best is the highest row, earlier race on a tie', () => {
  expect(seasonBest([row(340, 1), row(361, 2), row(361, 3)])?.sessionKey).toBe(2)
})

it('reads the line from the mock', () => {
  expect(speedLine(mexicoRow)).toBe('Car 10, Gasly, through the Mexico City speed trap on lap 48. Flaps open.')
})
```

`mexicoSession` is `sessions2026.find((s) => s.session_key === 11404)` from `test/season/fake-openf1.ts`; `row(kmh, key)` builds a `SpeedRace`.

- [ ] **Step 3: Run** `bun test test/speed/top.test.ts`. Expected: FAIL, module not found.

- [ ] **Step 4: Implement** the schema and the four functions. `raceRow` returns `undefined` when `fastestLap` does or the driver is missing from `drivers`. Move `finishedRaces`/`frozen` to `src/season/finished.ts` and repoint `src/flags/build.ts` and `test/flags/tally.test.ts`.

- [ ] **Step 5: Run** `bun test test/speed test/flags && bun run lint`. Expected: PASS.

- [ ] **Step 6: Commit** `feat(speed): the fastest speed trap reading of a race and a season is picked from its laps`.

### Task 2: The hourly refresh carries `topSpeed`

**Files:**
- Create: `src/speed/build.ts`
- Modify: `src/season/openf1-client.ts` (add `sessionLaps`), `src/season/snapshot-schema.ts` (`topSpeed: Schema.optionalKey(TopSpeed)`), `src/season/build-snapshot.ts`, `src/season/refresh.ts`, `test/season/fake-openf1.ts`, `test/fixtures/season-snapshot.json`
- Test: `test/speed/build.test.ts`, `test/season/refresh.test.ts` (one case)

**Interfaces:**
- Consumes: Task 1's `SpeedLapsResponse`, `raceRow`, `TopSpeed`, `finishedRaces`, `frozen`.
- Produces:
  - `OpenF1Client['Service'].sessionLaps: Read<typeof SpeedLapsResponse>`, path `/laps?session_key=${key}`, wrapped in `empty(...)`.
  - `topSpeed(season: number, now: Date, previous: TopSpeed | undefined): Effect.Effect<TopSpeed | undefined, never, OpenF1Client>`, the same shape as `flagTally` in `src/flags/build.ts`: season fallback to `season - 1` before the first finished race, frozen rows carried forward, an empty laps reply keeps the old row, 60-second timeout, `OpenF1Error`/`TimeoutError` log a warning and return `previous`.
  - `buildSnapshot(now: Date, previous?: Pick<SeasonSnapshot, 'flags' | 'topSpeed'>)`; `refreshSnapshot` passes `previous` whole.

- [ ] **Step 1: Write the failing tests** in `test/speed/build.test.ts`, using a recorder like `test/flags/build.test.ts`. The fake's `sessionLaps` returns the Mexico fixture for 11404 and `[]` for anything else:

```ts
it('builds the 2026 rows and the season best is Gasly in Mexico City', async () => {
  const result = await speed(2026, '2026-11-15T00:00:00Z', undefined, service)
  expect(result?.season).toBe(2026)
  expect(seasonBest(result?.races ?? [])).toMatchObject({ kmh: 361, surname: 'Gasly', circuit: 'Mexico City', lap: 48 })
})

it('a race older than 48 hours makes no laps request and is carried forward', async () => {
  expect(keys).toEqual([])
  expect(result?.races).toEqual(previous.races)
})

it('a race under 48 hours old is fetched again', async () => {
  expect(keys).toEqual([11412])
})

it('before the first race of the season, last season is used', async () => {
  expect((await speed(2026, '2026-02-01T00:00:00Z', undefined, service))?.season).toBe(2025)
})

it('an OpenF1 failure keeps the previous value', async () => {
  expect(await speed(2026, at, previous, { sessionLaps: () => broken })).toEqual(previous)
})

it('a race with no speed trap readings writes no row and keeps an old one', async () => {
  const blank = { sessionLaps: () => Effect.succeed([{ driver_number: 10, lap_number: 1, st_speed: null }]) }
  expect((await speed(2026, interlagosPlus1h, undefined, blank))?.races ?? []).toHaveLength(0)
  expect((await speed(2026, interlagosPlus1h, previous, blank))?.races).toEqual(previous.races)
})
```

In `test/season/refresh.test.ts`, add: a refresh whose `sessionLaps` fails still writes the snapshot, and a stored snapshot without `topSpeed` still decodes.

- [ ] **Step 2: Run** `bun test test/speed/build.test.ts test/season/refresh.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement** `sessionLaps`, `topSpeed`, the snapshot key and the `buildSnapshot`/`refreshSnapshot` change. In `buildSnapshot`, call `topSpeed` after the flag tally, through the same client gate, and spread `...(speed && { topSpeed: speed })`.

- [ ] **Step 4: Add `topSpeed` to `test/fixtures/season-snapshot.json`.** Run `topSpeed(2026, new Date(), undefined)` once against live OpenF1 from a scratchpad script and paste the result in. Expected best: 361, car 10, Gasly, Mexico City, lap 48.

- [ ] **Step 5: Run** `bun test && bun run lint`. Expected: PASS.

- [ ] **Step 6: Commit** `feat(season): the snapshot carries each race's top speed and keeps it after 48 hours`.

### Task 3: The Next band leads to the race weekend

**Files:**
- Create: `src/chapter/next-race.ts`, `src/chapter/NextRace.tsx`
- Test: `test/chapter/next-race.test.ts`

**Interfaces:**
- Consumes: `pickRace`, `RACE_WHEN` from `src/season/weekend.ts`; `Photo` and `PHOTOS.heroDark` from `src/home/content.ts`.
- Produces:
  - `type NextRace = { round: number; place: string; when: string }`
  - `nextRace(snapshot: SeasonSnapshot | undefined, now: Date): NextRace | null`. It returns `null` when there is no snapshot, `pickRace` returns `null`, or `pickRace` returns `kind: 'finale'`. `pickRace` only returns `finale` once every race in the window has closed, which is the spec's "finished and nothing follows" case. `place` is `race.circuit.locality`.
  - `<NextRace photo={PHOTOS.heroDark} />` reads `useSeason()` itself. This is a split from `Next` (the spec lets the builder split), so the four existing `Next` callers stay untouched. It uses the same `.next` markup and classes as `src/chapter/Next.tsx`.
- Copy:
  - With a race: label `Next · Round ${round} · ${when}`; `<h2>` with two `.hl` lines, `${place},` and `${when}.`; `<Go to="/weekend" className="read">Times, the track and the pole lap →</Go>`.
  - Fallback: label `Next`; headline `All chapters.`; link `<a href="/#start" className="read">Back to the chapter list →</a>`. A plain anchor, because `/#start` is not a router `To`.
  - Credit line: `${photo.place} · ${photo.credit}`.

- [ ] **Step 1: Write the failing tests:**

```ts
it('the fixture week is Round 20, São Paulo, this weekend', () => {
  expect(nextRace(fixture, new Date('2026-11-06T15:00:00Z'))).toEqual({ round: 20, place: 'São Paulo', when: 'this weekend' })
})
it('between weekends it is the next race', () => {
  expect(nextRace(fixture, new Date('2026-11-12T12:00:00Z'))).toEqual({ round: 21, place: 'Las Vegas', when: 'next race' })
})
it('after the last race closes with no next calendar it falls back', () => {
  expect(nextRace({ ...fixture, nextCalendar: [] }, new Date('2026-12-20T00:00:00Z'))).toBeNull()
})
it('between seasons, Round 1 of the next calendar is the next race', () => {
  expect(nextRace({ ...fixture, calendar: [], nextCalendar: fixture.calendar }, new Date('2026-01-01T00:00:00Z'))).toEqual({ round: 1, place: 'Melbourne', when: 'next race' })
})
it('no snapshot falls back', () => expect(nextRace(undefined, new Date())).toBeNull())
```

The spec's e2e line says `Round 21`; the fixture's clock (2026-11-06) is Brazil week, so the test reads Round 20. That is a correction, not a change of behaviour.

- [ ] **Step 2: Run** `bun test test/chapter/next-race.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `nextRace` and `NextRace.tsx`.
- [ ] **Step 4: Run** `bun test test/chapter && bun run lint`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(guide): the last chapter's Next band leads to the race weekend`.

### Task 4: Blender turns MaG80's car into parts, a rig and posters

**Files:**
- Create: `blender/car/prep.py`, `blender/car/render.py`, `blender/car/build.sh`, `blender/car/car.blend` (saved by `prep.py`), `src/car/parts.json`, `public/car/{exploded,exploded-phone,top,top-phone,side}-{light,dark}.webp`
- Create: `src/car/parts.ts`
- Test: `test/car/assets.test.ts`, `test/car/parts.test.ts`

**Interfaces:**
- Produces `src/car/parts.json`, with glTF coordinates (Y up, metres):

```json
{
  "parts": [{ "id": "frontWing", "node": "part:FrontWing", "offset": [0, 0, 0], "anchor": [0, 0, 0], "camera": { "position": [0, 0, 0], "target": [0, 0, 0] } }],
  "assembled": { "position": [0, 0, 0], "target": [0, 0, 0] },
  "side": { "position": [0, 0, 0], "target": [0, 0, 0] },
  "flaps": [{ "node": "flap:Front", "axis": [0, 0, 1], "angle": -0.2618 }, { "node": "flap:Rear", "axis": [0, 0, 1], "angle": -0.6109 }]
}
```

  The eight `id`s, in order: `frontWing`, `survivalCell`, `halo`, `sidepods`, `floor`, `powerUnit`, `rearWing`, `tyres`. The flap angles are −15° and −35°.
- Produces `src/car/parts.ts`:
  - `PARTS`: `as const`, the spec's table verbatim, `{ id, n: '01', name, fact, job }` × 8;
  - `CarRig`, an Effect Schema of the JSON above (`Schema.Tuple` for vectors);
  - `rig = Schema.decodeUnknownSync(CarRig)(json)`;
  - `type PartId = (typeof PARTS)[number]['id']`.

- [ ] **Step 1: Port** `../lights-out-private/pipeline-2026-11-08/mag/prep.py` (plus `flap.py`, `wings.py` logic) to `blender/car/prep.py` with every comment removed:
  - metre frame, nose +x, rear axle x 0, ground z 0;
  - loose islands sorted into the eight parts; the engine cover joins `Sidepods`; rods and wishbones go into a hidden `Suspension` collection;
  - adds the simple power unit;
  - flap objects with their origin at the leading-edge pivot;
  - decimate to about 100k triangles (wing and halo edges crisp, floor and survival cell take the cut);
  - explode offsets and per-part cameras as Blender objects named `cam:<id>`, `cam:assembled`, `cam:side`;
  - saves `car.blend`.
- [ ] **Step 2: Port** `render.py` to Cycles clay stills from those cameras, both themes, desktop and phone framings (top: nose left on desktop, nose up on phone; side with flaps open). Export WEBP under 200 KB. It also writes `src/car/parts.json` from the scene.
- [ ] **Step 3: Write** `build.sh` in the `blender/circuits/build.sh` shape, reading `$MAG80` (default `../../../lights-out-private/car-mag80/scene.gltf`) and `$BLENDER`.
- [ ] **Step 4: Write the failing tests:**
  - `test/car/parts.test.ts`: `rig.parts.map((p) => p.id)` equals `PARTS.map((p) => p.id)`; `survivalCell` is the explode's anchor and stays still (my call), every other part has a non-zero offset; two flaps.
  - `test/car/assets.test.ts`: every poster file exists and is < 200 KB.
- [ ] **Step 5: Run** `blender/car/build.sh`, then `bun test test/car`. Expected: PASS.
- [ ] **Step 6: Look at every poster** at full size next to the Figma frames (394:857, 398:866, 400:74, 400:284). Fix framing or clay until they read as the mock.
- [ ] **Step 7: Commit** `feat(car): Blender splits MaG80's car into eight parts and renders the chapter's stills`.

### Task 5: The chapter page, poster-first

**Files:**
- Create: `src/routes/chapters.inside-the-car.tsx`, `src/chapter/Car.tsx`, `src/chapter/CarParts.tsx`, `src/chapter/CarWings.tsx`, `src/styles/car.css`, `public/img/ch05-{1950,1978,2026}.jpg`
- Modify:
  - `src/chapter/words.ts` (six entries + `CAR_WORDS`);
  - `src/home/content.ts` (`PHOTOS.ch05History1950/1978/2026`, `CHAPTERS[4].to = '/chapters/inside-the-car'`);
  - `src/chapter/Flags.tsx` (hero `Soon` → `<Go to="/chapters/inside-the-car">05 Inside the car →</Go>`, Next `to="/chapters/inside-the-car"`);
  - `src/routeTree.gen.ts` (regenerated by `vite dev`).
- Test: `e2e/car.spec.ts`, plus updates to `e2e/flags.spec.ts`, `e2e/home.spec.ts` and the menu test for five linked chapters.

**Interfaces:**
- Consumes:
  - Task 1's `seasonBest`, `speedLine`;
  - Task 3's `NextRace`;
  - Task 4's `PARTS`, the posters;
  - `Words`, `Term`, `Go`, `useTheme`, `opposite`;
  - the `Flags.tsx` motion helpers (`sweep`, `reveal`, `rise`).
- Produces:
  - `CarParts`, props `{ live: boolean }`. It renders the band header, the stage slot `.stage` (poster `<img>`), the part list `<ol className="parts">` of `<li><button data-part={id}>`, the rail `.rail` and the counter `.count`. When `live` is false, every row shows its job and there is no pin. Task 7 fills `live`.
  - `CarWings`, props `{ live: boolean }`. It renders the switch `role="tablist"` with two `role="tab"`, the stage slot with the `side` poster, the number block `.speed` and the payoff row. Task 8 fills `live`.
- Copy: everything from the spec's top-to-bottom list, Take it apart, Wings that move, History and Words, verbatim. The `Smaller for 2026` dimension lines are HTML/CSS over the `top` poster.
- The number block, with no data: the label, number, line and source render empty, and the block keeps its `min-height`.

- [ ] **Step 1: Download the three history photos** from the Commons files named in the spec, resize to about 1400 px wide, save as `public/img/ch05-{1950,1978,2026}.jpg`. Re-read each file page's licence and author first.
- [ ] **Step 2: Write `e2e/car.spec.ts`** (desktop 1470 and phone 390 projects):
  - loads with no errors in both themes; title `Inside the car · Lights Out`; `h1` text `Eight parts.One car.`;
  - no horizontal overflow at either width; every `figure` and photo has a credit line;
  - the band has eight rows with the spec's facts (`2 flaps`, `Carbon tub`, `Titanium`, `Radiators`, `Most grip`, `350 kW`, `Flap opens`, `18 in`);
  - the band's background differs from `body` in both themes;
  - top speed reads `361`, `km/h` and the line `Car 10, Gasly, through the Mexico City speed trap on lap 48. Flaps open.`; with `stubSeason(page, { status: 500, body: '' })`, `.speed .num` is empty and the side poster still shows;
  - the Next band reads `Next · Round 20 · this weekend`, headline `São Paulo,this weekend.`, and links to `/weekend`;
  - Chapter 04's hero link, its Next card, Home row 05 and the menu all lead here; the menu shows five linked chapters;
  - the "All chapters" hero link goes to `/#start`.
- [ ] **Step 3: Run** `bunx playwright test e2e/car.spec.ts`. Expected: FAIL (404).
- [ ] **Step 4: Implement** the route (`chapterCss` + `carCss`, the `chapters.flags.tsx` pattern), `Car.tsx` in the `Flags.tsx` structure, `CarParts`/`CarWings` with `live={false}`, the words, the photos and the wiring.
- [ ] **Step 5: Run** `bun test && bun run lint && bunx playwright test`. Expected: PASS.
- [ ] **Step 6: Look** at the page at 1440 and 390 in both themes against the four Figma frames; fix spacing and type.
- [ ] **Step 7: Commit** `feat(guide): Chapter 05 shows what every part of a 2026 car does`.

### Task 6: Bake the clay light and pass Praffi's checkpoint

**Files:**
- Create: `blender/car/bake.py`, `public/car/car.glb`, `src/car/model.ts`
- Modify: `blender/car/build.sh` (bake + export + meshopt step)
- Create, throwaway and **not committed**: `src/routes/car-check.tsx`
- Test: `test/car/assets.test.ts` (the glb budget and nodes)

**Interfaces:**
- Produces `public/car/car.glb`:
  - nodes `part:<Name>` × 8 and `flap:Front`, `flap:Rear`, with the flap origin at its pivot;
  - `COLOR_0`, where R is the light baked with the car assembled and G the light baked exploded, plain light values;
  - no normals, no textures, no images; meshopt with 16-bit positions.
- Produces `src/car/model.ts`:
  - `CAR_URL = '/car/car.glb'`;
  - `useCar()`, which loads the glb with `useLoader(GLTFLoader, CAR_URL, meshopt)`. The meshopt setup moves from `src/circuits/Circuit.tsx` to a shared `src/three/meshopt.ts` that both import;
  - `clayMaterial(): ShaderMaterial` with uniforms `uClay: Color`, `uMix: number` (0 assembled → 1 exploded), `uTint: Color`, `uLit: number`. The fragment is `mix(color.r, color.g, uMix) * mix(uClay, uTint, uLit)`.
  - `CLAY = { light: '#…', dark: '#…' }`, values read from the posters' mid-grey.
  - `SECTOR_PURPLE`, from the existing CSS token.

- [ ] **Step 1: Write the failing test.** The glb exists and is < 1.6 MB, has no `images`, has the eight `part:` nodes and two `flap:` nodes, and its triangle count (summed from the accessors) is ≤ 110,000.
- [ ] **Step 2: Implement `bake.py`.** Cycles AO plus the poster key light, baked to a colour attribute twice (assembled into R, exploded into G), then glTF export with `export_normals=False`. `build.sh` runs meshopt as in the circuits.
- [ ] **Step 3: Run** `blender/car/build.sh && bun test test/car`. Expected: PASS.
- [ ] **Step 4: Build `/car-check`.** For both themes, it shows the live glb (unlit `clayMaterial`) beside `exploded-*.webp` at the same camera, with a `uMix` slider.
- [ ] **Step 5: STOP. Praffi's checkpoint.** Show both themes side by side.
  - If rejected, first raise the triangle budget or bake to a lightmap texture, then show again.
  - If it is still rejected, Praffi chooses between B (ship Task 5 as-is) and C. Tasks 7 and 8 wait for the verdict.
- [ ] **Step 6: Delete** `src/routes/car-check.tsx`. **Commit** `feat(car): the car ships as one glb with its clay light baked in`.

### Task 7: Take it apart, live

**Files:**
- Create: `src/car/stage.ts`, `src/car/PartsScene.tsx`
- Modify: `src/chapter/useScrub.ts` (it returns `{ time, seek }`), `src/chapter/Replay.tsx` and `src/chapter/Undercut.tsx` (`const { time } = useScrub(...)`), `src/chapter/CarParts.tsx`
- Test: `test/car/stage.test.ts`, `e2e/car.spec.ts`

**Interfaces:**
- Consumes:
  - Task 6's `useCar`, `clayMaterial`, `CLAY`, `SECTOR_PURPLE`;
  - Task 4's `rig`, `PARTS`;
  - `useScrub`, `linearPace`.
- Produces:
  - `useScrub(...)` returns `{ time: RefObject<number>; seek: RefObject<(t: number) => void> }`. `seek` is the existing inner `seek`, stored in a ref.
  - `END = 8`, `STOPS = [1, 2, 3, 4, 5, 6, 7, 8]`.
  - `stageAt(t: number): { explode: number; lit: number | null; from: number | null; to: number; blend: number }`:
    - `explode = clamp(t, 0, 1)`;
    - `lit` is the index of the part, `Math.round(t) - 1`, clamped to 0..7, or `null` while `t < 0.5`;
    - the camera blends from framing `from` to framing `to` by `blend`, where `from = null` means `rig.assembled`.
- Behaviour:
  - Each frame, `PartsScene` places every part at `offset × explode` and sets `uMix = explode`. The lit part has `uLit = 1`.
  - The camera lerps position and target between framings. It never cuts.
  - The tag `01`–`08` and the pin chip `0N · Name` are HTML, projected from `anchor`.
  - Idle: while `t === 0` the car turns on its spot. The applied angle is `idle × (1 − explode)`, so the framings stay exact.
  - Rendering: `frameloop="demand"`, invalidated by the scrub paint and the idle turn. Paused off screen (IntersectionObserver) and in a hidden tab.
  - Loading: the scene mounts within about one viewport (`rootMargin: '100% 0px'`), and the poster fades once the first frame is drawn.
  - Fallbacks: with reduced motion, `live` is false. With no WebGL or a load failure, a `CircuitGuard`-style boundary falls back to the poster with `The 3D car could not load.`
  - Rows: a click calls `seek.current(i + 1)`. ↑/↓ on a focused row moves focus and seeks. The rail is the `role="slider"` track, and `aria-valuetext` reads `Part 0N of 08 · Name`.

- [ ] **Step 1: Write the failing tests:**

```ts
it('starts assembled with nothing lit', () => expect(stageAt(0)).toMatchObject({ explode: 0, lit: null, from: null }))
it('lights part 01 when apart', () => expect(stageAt(1)).toMatchObject({ explode: 1, lit: 0, to: 0, blend: 1 }))
it('glides between parts 03 and 04', () => expect(stageAt(3.4)).toMatchObject({ lit: 2, from: 2, to: 3, blend: 0.4 }))
it('ends on the tyres', () => expect(stageAt(8)).toMatchObject({ lit: 7, to: 7, blend: 1 }))
```

  Add to `e2e/car.spec.ts` (desktop, no reduced motion):
  - the canvas draws non-blank pixels once the band is near;
  - clicking row 06 gives row 06 `aria-expanded="true"` and `.count` `Part 06 of 08`; clicking row 02 then gives `Part 02 of 08`, with exactly one open row;
  - toggling the theme with the band on screen changes the band background, and the canvas still draws;
  - with WebGL disabled (`--disable-webgl` project or `HTMLCanvasElement.prototype.getContext` stub), the exploded poster shows and the rows work;
  - with reduced motion: no `.pin-spacer`, every job visible.
- [ ] **Step 2: Run** `bun test test/car/stage.test.ts && bunx playwright test e2e/car.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `stageAt`, the `useScrub` return change, `PartsScene` and `CarParts` with `live`.
- [ ] **Step 4: Run** `bun test && bun run lint && bunx playwright test`. Expected: PASS, including the Chapter 02 and 03 e2e after the `useScrub` change.
- [ ] **Step 5: Live check.** Scroll the band at 1440 and 390 in both themes; the glide must be seamless (Praffi's replay feedback, 2026-11-11).
- [ ] **Step 6: Commit** `feat(guide): scrolling takes the car apart one part at a time`.

### Task 8: Wings that move, live

**Files:**
- Create: `src/car/WingsScene.tsx`
- Modify: `src/chapter/CarWings.tsx`
- Test: `e2e/car.spec.ts`

**Interfaces:**
- Consumes: `useCar` (the same loaded glb, so there is one download and one parse), `clayMaterial`, `rig.side`, `rig.flaps`.
- Behaviour:
  - A scroll-linked tween with no pin, over the section's scroll: `open` goes 0 → 1, and each flap's rotation is `axis × angle × open`.
  - The two flaps have `uLit = 1`. The tabs follow: `open < 0.5` is Corner Mode, otherwise Straight Mode.
  - Clicking a tab tweens to 0 or 1 with the site's ease.
  - With reduced motion or no WebGL: the `side` poster, Straight Mode selected, tabs clickable and nothing animates.

- [ ] **Step 1: Add e2e tests:**
  - scrolling the section to its end selects the `Straight Mode` tab (`aria-selected="true"`);
  - clicking `Corner Mode` selects it;
  - with reduced motion, `Straight Mode` is selected on load.
- [ ] **Step 2: Run** the tests. Expected: FAIL.
- [ ] **Step 3: Implement** `WingsScene` and wire it into `CarWings`.
- [ ] **Step 4: Run** `bun test && bun run lint && bunx playwright test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(guide): the wings open on the straights as you scroll`.

### Task 9: Docs and the final proof

**Files:**
- Modify: `DESIGN.md` (the "The car" 3D bullet), `docs/superpowers/specs/2026-11-07-f1-fan-site-design.md` (§7.2 and §8 note that the car page is Chapter 05), and the site's source credits list (wherever Chapter 04's photo credits are listed; add MaG80).

- [ ] **Step 1:** Update the docs as above.
- [ ] **Step 2:** Run `blender/car/build.sh` from clean, then `git status`. Expected: no diff in `public/car/` or `src/car/parts.json` beyond float noise.
- [ ] **Step 3:** Run `bun test && bun run lint && bunx playwright test`. Expected: all green.
- [ ] **Step 4:** Live pass at 1440 and 390, both themes: the take-apart, the flaps, the Next band, the photos. Record a short screen capture of the band for the PR.
- [ ] **Step 5:** Commit `docs(guide): the car lives in Chapter 05`.
- [ ] **Step 6:** Final Opus whole-branch review, then `sol-loop`. Record each round's changes. The PR waits for Praffi's word.
