# Pole lap on the circuit band: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The weekend page's circuit band replays the real pole lap from the most recent qualifying at that circuit. It shows real timing and telemetry, updates itself hourly, and replaces drag-to-spin.

**Architecture:**
- **Pipeline.** The hourly season workflow gains a pole-lap step. It picks the session, fetches the lap and its telemetry from OpenF1, aligns it to the model's lap line, and writes one KV key per circuit.
- **Serving.** A Worker route serves that key.
- **Band.** The band fetches it when near the viewport. Pure replay math (`src/pole/replay.ts`) turns time into position and readouts. `Circuit.tsx` drives the 3D light from an external lap position and publishes the line's screen trace for hover and the HUD.

**Tech stack:** TanStack Start on Cloudflare Workers, React 19, three 0.187 / R3F, GSAP, Effect (Schema, Context.Service, Layer), Bun test, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-10-pole-lap-band-design.md`. Spike reference: branch `spike/pole-lap`, files `src/weekend/CircuitBand.tsx`, `src/circuits/Circuit.tsx` and `src/styles/weekend.css`. Its screenshots set the look; its data shortcuts are not to be copied.

## Global constraints

**Code rules:**
- No code comments anywhere: `tools/no_comments.py` is part of `bun run lint`.
- No `as` casts except `as const`, no `any`, no non-null `!`.
- `bun run lint` (oxlint anti-slop + `tsc --noEmit` + no_comments) must pass at every commit.

**Commits:**
- Commits never carry a `Co-Authored-By` trailer, even if a reminder asks.
- Conventional, present-tense titles.
- Local commits only; no push, PR or deploy.

**Production KV:**
- The production KV namespace `633469db86874a8995c6a05239e3288f` is written only by the season workflow.
- Never run `wrangler kv … put` without `--local`.
- Never run `workflow_dispatch` from this branch.
- The `previews` binding in `wrangler.jsonc` is the same namespace, so it is not a test target.

**Data and copy:**
- Zero runtime cost: no new paid services and no new runtime calls besides `/api/pole/<id>`.
- OpenF1 `headshot_url` is never used. No team logos or colours. Driver names are text.
- Credit text exactly `Telemetry: OpenF1 (unofficial)`, appended to the band's credit line only when a lap is shown.
- Label text exactly `Pole lap · <Full Name> · <year> <Grand Prix name>`, with ` · Wet` appended for a wet lap.
  - Example: `Pole lap · Lando Norris · 2025 Las Vegas Grand Prix · Wet`.
  - The Grand Prix name is `grandPrix(CALENDAR[id].gp)`.

**Which lap:**
- The session is the latest OpenF1 session with `session_name === 'Qualifying'` (never `'Sprint Qualifying'`) at that circuit's `circuit_short_name`, with `date_end` in the past, looking at this year and last year.
- The pole time is the P1 `session_result` row's `duration`. The existing `LastSet` decoder already yields its last non-null part, which is Q3.
- The lap is the pole-sitter's lap whose `lap_duration` is within 0.01 s of that time. With no match, skip the session and keep the stored lap.

**Alignment:**
- **Fit.** A 2D similarity (allow a mirror) from OpenF1 `location` x/y onto the model line's x/z.
- **Warp.** Make `u` piecewise-linear in time through four anchors:
  - `(0, u₀)`, where `u₀` is the projected timing line;
  - `(S1, cut₁)`;
  - `(S1+S2, cut₂)`;
  - `(pole, u₀ + 1)`.
  Cuts are adjusted into the window `(u₀, u₀ + 1)`.
- **Sanity bound.** Reject the lap when the un-warped `u` at either split misses its cut by more than 0.03.

**Stored shape and keys:**
- KV key `pole:v1:<circuit id>`.
- Stored JSON is about 15 KB or less.

**Failures:**
- A pole failure is logged, never fails the hourly run, and never touches `season:v1`.
- `tools/refresh-season.ts` keeps its current exit code, which depends on the snapshot only.

**Behaviour:**
- **Hover.** Snaps within 56 px. Leaving resumes from the scrubbed time. The cursor is a pointer while snapped.
- **End of lap.** Holds for 1.6 s, then loops.
- **Phones.** Tapping a turn jumps the replay to 0.01 of a lap before that turn's `u`.
- **Reduced motion.** No car, no readout and no ticker. The clock shows the pole time and all three splits are filled.
- **Pausing.** The replay and the 3D frame loop pause when the band is off screen or `document.hidden`.
- **Removed.** Drag-to-spin, the Reset button, `data-yaw`, the yaw/coast code in `CircuitBand.tsx` and its e2e tests.

## Review focus

1. **The timing line sits near the model's u = 0** (Interlagos, Vegas). Rows cross the wrap, so `u` is stored unwrapped (monotonic, `u₀` to `u₀ + 1`) and wrapped only for display. The car must never jump backwards or skip a stretch at the line. Test: Task 2, "u is monotonic and spans exactly one lap", on every recorded circuit.
2. **A sparse or gappy `location` stream near the window edges.** OpenF1 samples at about 4 Hz and the window may start between samples. Test: Task 2, "aligns a lap whose first location sample is 0.4 s after the lap start".
3. **Qualifying not finished, or not published.**
   - `date_end` has passed but there is no P1 result yet.
   - P1 has no Q3 time because of a red flag or a cancelled Q3.
   - The session is cancelled.
   In every case the stored lap stays. Test: Task 3, "keeps the stored lap when the newest qualifying has no pole time yet".
4. **Resizing the window while hovering.** The screen trace is rebuilt every frame, and hover reads the current trace, never a stale length. Test: Task 6 e2e, "hover still snaps after the window is resized".
5. **A hidden tab coming back.** The clock must not jump by the hidden time. `dt` is clamped to 0.1 s, the same as the hero, and the ticker is removed while hidden. Test: Task 5, "advance clamps a long frame to 0.1 s".

---

## File structure

**Create:**
- `src/pole/schema.ts`: the stored `PoleLap` schema and the OpenF1 lap, car, location and weather schemas.
- `src/pole/align.ts`: pure alignment: fit, project, warp, sanity.
- `src/pole/pole-lap.ts`: the Effect that picks the session and builds a `PoleLap` for one circuit.
- `src/pole/store.ts`: `PoleStore` over `KVText`, key `pole:v1:<id>`.
- `src/pole/refresh-poles.ts`: refreshes every registry circuit and isolates failures.
- `src/pole/replay.ts`: pure client math.
- `src/pole/use-pole-lap.ts`: the fetch hook.
- `src/routes/api/pole.$circuit.ts` and `src/pole/handle-pole-request.ts`: serving.
- `src/weekend/PoleHud.tsx`: the clock, splits, label, readout and car marker.
- `tools/pole-laps.ts`: dry run that writes `<out>/<id>.json` without Cloudflare.

**Modify:**
- `src/season/openf1-schema.ts`: `circuit_short_name` on sessions.
- `src/season/openf1-client.ts`: four new reads.
- `src/circuits/registry.ts`: an `openf1` short name per circuit.
- `src/circuits/Circuit.tsx`: the `replay` prop.
- `src/weekend/CircuitBand.tsx` and `src/styles/weekend.css`.
- `src/lap/LapPage.tsx`, `src/lap/Explorer.tsx` and `src/routes/lap.$circuit.tsx`: `?at=`.
- `tools/refresh-season.ts`.
- `e2e/fixtures.ts`, `e2e/weekend.spec.ts` and `e2e/lap.spec.ts`.
- `DESIGN.md`.

**Test fixtures:**
- `test/fixtures/openf1/pole/<key>-*.json`: raw OpenF1 responses for the five sessions.
- `test/fixtures/pole/<id>.json`: built laps, used by the e2e stubs and local seeding.

**Recorded sessions:**

| Circuit id | `circuit_short_name` | Session key |
| --- | --- | --- |
| `vegas` | `Las Vegas` | 9854 (2025, wet, Norris #4, 107.934) |
| `interlagos` | `Interlagos` | 11408 (2026, #1, 87.47) |
| `albert_park` | `Melbourne` | 11230 (2026, #63, 78.518) |
| `losail` | `Lusail` | 9846 (2025) |
| `yas_marina` | `Yas Marina Circuit` | 9835 (2025) |

---

### Task 1: OpenF1 reads and recorded fixtures

**Files:**
- Modify: `src/season/openf1-schema.ts`, `src/season/openf1-client.ts`, `src/circuits/registry.ts`, `test/season/fake-openf1.ts`
- Create: `src/pole/schema.ts`, `test/fixtures/openf1/pole/*.json`, `test/pole/schema.test.ts`

**Interfaces:**
- Produces in `openf1-schema.ts`:
  - `OpenF1Session` gains `circuit_short_name: Schema.String`.
- Produces in `src/pole/schema.ts`:
  - `OpenF1Lap = { driver_number: number; lap_duration: number | null; date_start: string | null; duration_sector_1: number | null; duration_sector_2: number | null; duration_sector_3: number | null }`, plus `LapsResponse`.
  - `CarSample = { date: string; speed: number; n_gear: number; throttle: number; brake: number }`, plus `CarResponse`.
  - `LocationSample = { date: string; x: number; y: number }`, plus `LocationResponse`.
  - `WeatherSample = { date: string; rainfall: number }`, plus `WeatherResponse`.
  - `PoleLap = Schema.Struct({ sessionKey: Number, year: Number, driver: String, wet: Boolean, time: Number, sectors: Tuple([Number, Number, Number]), rows: Array(Tuple([Number, Number, Number, Number, Number, Number])) })`. Rows are `[t, u, speed, gear, throttle, brake]`, with `u` unwrapped.
  - `PoleLapJson = Schema.fromJsonString(PoleLap)`, following the `SeasonSnapshotJson` pattern.
- Produces in `OpenF1Client`:
  - `laps(key, driver)`
  - `carData(key, driver, from, to)`
  - `location(key, driver, from, to)`
  - `weather(key)`
  - Each returns `Effect<…, OpenF1Error>`. `from`/`to` are ISO strings sent as `date%3E=<from>&date%3C=<to>`.
- Produces in `registry.ts`: `CircuitInfo.openf1: string`, using the short names in the table above.
- Produces in `fake-openf1.ts`: `fakeOpenF1` serves the recorded pole fixtures by key, driver and date window.

- [ ] **Step 1: Record the fixtures.** For each session in the table:
  - `curl` `session_result?session_key=K&position=1`.
  - Read the driver `D` from it, then fetch `laps?session_key=K&driver_number=D` and `weather?session_key=K`.
  - Take the matching lap's `date_start` `S` and `lap_duration` `L`. Fetch `car_data` and `location` for `K`/`D` over `S − 1 s` to `S + L + 1 s`.
  - Save them as `test/fixtures/openf1/pole/<K>-{result,laps,weather,car,location}.json`.
  - Save `sessions-2025.json` (OpenF1 sessions for 2025).
  - In the existing `sessions-2026.json`, add each session's `circuit_short_name`, looked up live by `session_key`. Don't re-record it: new sessions would change the existing season tests.
  - Expected: 26 files, none empty.
- [ ] **Step 2: Write the failing test** in `test/pole/schema.test.ts`:
  - `it('decodes every recorded pole response')`: for each of the five keys, all five files decode with their schemas, and `laps` contains a row within 0.01 s of the result's pole time.
  - `it('round-trips a PoleLap through PoleLapJson')`.
- [ ] **Step 3: Run it.** `bun test test/pole/schema.test.ts`. Expected: FAIL, because `src/pole/schema.ts` does not exist.
- [ ] **Step 4: Implement** the schemas and client reads (same `get` helper and 400 ms spacing), the registry names and the fake. The `weather` and `laps` 404s become `[]`, like `result`.
- [ ] **Step 5: Run it.** Run `bun test test/pole test/season`, then `bun run lint`. Expected: PASS. Existing season tests still pass with the re-recorded sessions fixture.
- [ ] **Step 6: Commit.** `feat(pole): OpenF1 reads for the pole lap and its telemetry`

### Task 2: Alignment

**Files:**
- Create: `src/pole/align.ts`, `test/pole/align.test.ts`

**Interfaces:**
- Consumes: `CarSample`, `LocationSample` and `LinePoint` (`src/circuits/registry.ts`).
- Produces: `alignLap(input: { start: number; time: number; splits: readonly [number, number]; car: ReadonlyArray<CarSample>; location: ReadonlyArray<LocationSample>; line: ReadonlyArray<LinePoint>; cuts: readonly [number, number] }): { rows: PoleLap['rows']; miss: number } | null`.
  - `start` is the lap start in epoch ms; `splits` are the S1 and S1+S2 times in seconds.
  - It returns `null` when `miss > 0.03` or when there are too few samples (fewer than 50 car or 50 location samples).

**Algorithm (the tests don't fix it):**
1. Turn the location samples into time-stamped points, `t` in seconds from `start`. Resample the in-lap part `[0, time]` by arc length into 400 points `P`.
2. For each mirror `m` in {no mirror, mirror x} and each cyclic shift `k` from 0 to 399:
   - Pair `P[i]` with line point `(i + k) mod 400`, with the model line taken as x/z.
   - Solve the closed-form similarity (Umeyama/Procrustes) and keep the lowest RMS.
3. Transform every location sample with the best fit.
   - Project each one onto the model polyline to get `u`, searching only near the previous sample's `u` (±0.05) after the first.
   - Unwrap so `u` is monotonic.
   - `u₀` is the projected `u` at `t = 0`, interpolated.
4. Interpolate the location-derived raw `u(t)` at each car sample's `t`.
   - `miss = max(|raw(S1) − cut₁′|, |raw(S1+S2) − cut₂′|)`, where `cutₙ′` is the cut moved by whole laps into `(u₀, u₀ + 1)`.
5. Warp: within each anchor interval, map raw `u` linearly so the interval's endpoints land on the anchors (see Global constraints).
6. Emit rows rounded to 3 decimals for `t`, 5 for `u` and integers for the rest. Brake is clamped to 0–100.

- [ ] **Step 1: Write the failing tests:**
  - `it.each(FIVE)('aligns the %s pole lap')`: the result is non-null, `miss <= 0.03`, `rows[0][0] === 0` and the last row's `t` equals `time`.
  - `it('lands each split exactly on its sector cut')`: `u` at `t = S1` (interpolated) equals `cut₁′` within 1e-4, and likewise at `S1 + S2`.
  - `it('u is monotonic and spans exactly one lap')`: every `u[i+1] >= u[i]`, and `last.u − first.u` equals 1 within 1e-3.
  - `it('aligns a lap whose first location sample is 0.4 s after the lap start')`: drop the location samples before `start + 400 ms`; the result is still non-null and still passes the split test.
  - `it('rejects a lap whose positions belong to another circuit')`: feed Vegas location with the Interlagos line; expect `null`.
- [ ] **Step 2: Run it.** `bun test test/pole/align.test.ts`. Expected: FAIL, because the module is missing.
- [ ] **Step 3: Implement** `alignLap`.
- [ ] **Step 4: Run it.** `bun test test/pole/align.test.ts`. Expected: 9 pass (five from the `each`, then four).
  - If a real circuit fails the 0.03 bound, stop and investigate the fit. Raising the bound needs a ledger ruling.
- [ ] **Step 5: Commit.** `feat(pole): the pole lap lines up with the model's track and its sector cuts`

### Task 3: The hourly pipeline, the store and the dry run

**Files:**
- Create: `src/pole/pole-lap.ts`, `src/pole/store.ts`, `src/pole/refresh-poles.ts`, `tools/pole-laps.ts`, `test/pole/refresh-poles.test.ts`, `test/fixtures/pole/<id>.json`
- Modify: `tools/refresh-season.ts`

**Interfaces:**
- Consumes: Task 1's client and schemas, Task 2's `alignLap`, and `allCircuits()`.
- Produces:
  - `poleLap(info: CircuitInfo, now: Date): Effect<{ lap: PoleLap } | { skip: string }, OpenF1Error, OpenF1Client>`
  - `PoleStore` (a Context.Service), `PoleStore.fromKV(kv: KVText)` with `read(id): Effect<PoleLap | null>` and `write(id, lap): Effect<void>`. Corrupt JSON reads as `null` with a warning, as in `SnapshotStore`.
  - `refreshPoles(now: Date): Effect<ReadonlyArray<{ id: string; outcome: 'written' | 'unchanged' | 'kept' }>, never, OpenF1Client | PoleStore>`
- `tools/pole-laps.ts --out <dir>`: runs `refreshPoles` with `PoleStore.fromKV(fileKV(dir))`, where `put` writes `<dir>/<id>.json` with only the id from the key. It needs no Cloudflare variables.

- [ ] **Step 1: Write the failing tests:**
  - `it('stores this year\'s pole when this year\'s qualifying is done')`: at `now = 2026-11-10`, Interlagos stores `sessionKey` 11408 and `year` 2026.
  - `it('falls back to last year\'s pole before this year\'s qualifying')`: at the same `now`, Vegas stores 9854 and 2025.
  - `it('ignores Sprint Qualifying')`: a fake sessions list whose newest Interlagos session is a `Sprint Qualifying` still yields 11408.
  - `it('marks a lap wet when it rained during the lap')`: Vegas has `wet: true`; Melbourne 11230 has `wet: false`.
  - `it('writes nothing when the stored lap is already this session')`: the outcome is `'unchanged'` and the fake KV saw no `put`.
  - `it('keeps the stored lap when the newest qualifying has no pole time yet')`: `result` returns `[]` for 11408; the outcome is `'kept'` and the old value stays.
  - `it('one circuit failing keeps the others')`: `location` fails for Vegas only; Vegas is `'kept'` and the other four are `'written'`.
  - `it('stays under 15 KB per circuit')`.
- [ ] **Step 2: Run it.** `bun test test/pole/refresh-poles.test.ts`. Expected: FAIL, because the modules are missing.
- [ ] **Step 3: Implement.**
  - **Session choice.** Call `sessions` for `now.year` and `now.year − 1`. Filter by `circuit_short_name`, `session_name === 'Qualifying'`, not cancelled, and `date_end < now`; take the latest.
  - **Lap.** Match the lap (Global constraints), then fetch the telemetry for `date_start − 1 s` to `date_start + lap_duration + 1 s`.
  - **Wet.** Any weather sample with `rainfall > 0` between the lap's start and end.
  - **Driver name.** `drivers(key)` gives `first_name last_name`, using the existing read.
  - **Failures.** Wrap each circuit in `Effect.catch` → log with `Effect.logWarning` → `'kept'`.
  - **Wiring.** In `tools/refresh-season.ts`, run `refreshPoles(new Date())` after the snapshot with `PoleStore.fromKV(kv)`, provided the same layers. Log the outcomes and ignore them for the exit code.
- [ ] **Step 4: Run it.** `bun test test/pole test/season`. Expected: PASS.
- [ ] **Step 5: Generate the built fixtures.** Run `bun tools/pole-laps.ts --out test/fixtures/pole` against live OpenF1.
  - Expected: five files, `vegas.json` has `"wet":true`, and each is 15 KB or less.
  - This is the only live call in the plan, and it reads only.
- [ ] **Step 6: Commit.** `feat(pole): the hourly season job stores each circuit's latest pole lap`

### Task 4: The API route

**Files:**
- Create: `src/pole/handle-pole-request.ts`, `src/routes/api/pole.$circuit.ts`, `test/pole/api-pole.test.ts`

**Interfaces:**
- Produces: `handlePoleRequest(store: PoleStore['Service'], id: string): Effect<Response>`.
  - Unknown circuit (not `circuitFor(id)`): 404 with `cache-control: public, max-age=3600`.
  - Nothing stored: 404 with `max-age=300`.
  - Stored: 200, `application/json`, `max-age=300`, with the `PoleLapJson` body.
- Route `GET /api/pole/$circuit` reads `env.SEASON_KV`, like `/api/season`.

- [ ] **Step 1: Write the failing tests**, following `test/season/api-season.test.ts`:
  - `it('serves a stored lap')`: status 200, the body decodes and the `cache-control` is as above.
  - `it('404s a circuit with no model')`: `'monaco'`.
  - `it('404s a circuit with nothing stored')`.
  - `it('404s a corrupt stored lap')`.
- [ ] **Step 2: Run it.** `bun test test/pole/api-pole.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Make sure the route file doesn't pull `registry.ts` line JSON into the Worker beyond what `circuitFor` already does. Check the `bun run build` output size against `main` and note the delta in the ledger.
- [ ] **Step 4: Run it.** Run `bun test test/pole`, then `bun run build`. Expected: PASS, and the build succeeds.
- [ ] **Step 5: Commit.** `feat(pole): /api/pole serves a circuit's stored pole lap`

### Task 5: Replay math

**Files:**
- Create: `src/pole/replay.ts`, `test/pole/replay.test.ts`

**Interfaces:**
- Produces:
  - `sampleAt(lap: PoleLap, t: number): { u: number; speed: number; gear: number; throttle: number; brake: number }`. Linear interpolation for `u`, speed and throttle; the nearest row for gear and brake; `u` wrapped to [0, 1).
  - `timeAt(lap: PoleLap, u: number): number`. The inverse of `sampleAt(...).u` on the wrapped track.
  - `splits(lap: PoleLap, t: number): ReadonlyArray<{ state: 'idle' | 'live' | 'done'; text: string }>`. `done` shows 3 decimals, `live` shows 1 decimal, and `idle` shows `—`.
  - `clock(t: number): string`, formatted `m:ss.mmm`.
  - `apexes(lap: PoleLap, turns: ReadonlyArray<{ turn: number; u: number }>): ReadonlyMap<number, { speed: number; gear: number }>`. The minimum speed within ±0.02 of each turn's `u`, wrap-aware.
  - `advance(state: { t: number; hold: number }, dtSeconds: number, time: number): { t: number; hold: number }`. Clamps `dt` to 0.1, holds for 1.6 s at `time`, then restarts at 0.
  - `nearest(trace: Float32Array, x: number, y: number, maxPx: number): number | null`. Returns `u`.
  - `nearestTurn(trace: Float32Array, turns: ReadonlyArray<{ turn: number; u: number }>, x: number, y: number, maxPx: number): number | null`. Returns the turn's `u`.

- [ ] **Step 1: Write the failing tests** against `test/fixtures/pole/vegas.json`:
  - `sampleAt` at `t = 0` gives the first row's speed.
  - `timeAt(sampleAt(lap, 40).u)` is within 0.05 of 40.
  - `splits` at `t = 30` is `['done 30.430', 'live …', 'idle —']` (the Vegas S1 is 30.43).
  - `clock(107.934) === '1:47.934'`.
  - `advance({ t: 107.9, hold: 0 }, 0.05, 107.934)` holds at 107.934, and after 1.6 s more it restarts at 0.
  - `it('advance clamps a long frame to 0.1 s')`: `advance({ t: 10, hold: 0 }, 30, 107.934).t === 10.1`.
  - `nearest` on a hand-made 4-point trace returns the segment's `u`, and `null` beyond 56 px.
  - `apexes` for Vegas turn 14 is between 80 and 130 km/h.
- [ ] **Step 2: Run it.** `bun test test/pole/replay.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run it.** `bun test test/pole/replay.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit.** `feat(pole): replay math for the pole lap clock, splits and readouts`

### Task 6: The band replays the lap

**Files:**
- Modify: `src/circuits/Circuit.tsx`, `src/weekend/CircuitBand.tsx`, `src/styles/weekend.css`, `e2e/fixtures.ts`, `e2e/weekend.spec.ts`, `test/weekend/circuit-band.test.tsx`
- Create: `src/pole/use-pole-lap.ts`, `src/weekend/PoleHud.tsx`

**Interfaces:**
- Consumes: Tasks 4 and 5.
- Produces in `Circuit.tsx`:
  - `export type Replay = { at: RefObject<number>; running: RefObject<boolean>; trace: RefObject<Float32Array | null>; turns: RefObject<ReadonlyArray<{ turn: number; u: number }>> }`
  - A `replay?: Replay` prop. With it:
    - the 3D light is hidden (the HUD draws the car);
    - the frame loop renders only while `running.current`;
    - each rendered frame rewrites `trace` with the screen x/y of every line point;
    - `turns` is filled once from the model markers via `turnLaps`.
- Produces: `usePoleLap(id: string, near: boolean): PoleLap | null`, which fetches `/api/pole/<id>` once when near; a non-200 response or a decode failure gives `null`.
- Produces in `e2e/fixtures.ts`: `stubPole(page, id | null)`, which fulfils `**/api/pole/*` from `test/fixtures/pole/<id>.json`, or 404s for `null`.

**Spike look to keep** (see `spike/pole-lap`):
- The bottom-left label, the lap clock (Archivo 900, 72 px, `wdth` 125, tabular numbers) and the three sector boxes in a row.
- The readout card with a white left rule, offset down-right from the car.

**What changes from the spike:**
- The car marker is its own element centred exactly on the trace point, never offset by CSS.
- The label text follows the Global constraints.
- The pins get a `data-apex` slot.

- [ ] **Step 1: Write the failing tests.**
  - **Unit** (`circuit-band.test.tsx`, with `usePoleLap` fed by a fetch stub):
    - `it('labels a wet pole lap')`: the text `Pole lap · Lando Norris · 2025 Las Vegas Grand Prix · Wet`.
    - `it('credits OpenF1 only when a lap is shown')`.
    - `it('has no Reset button')`.
  - **e2e** (`weekend.spec.ts`; delete the three drag/spin tests and the `drag` helper; the vertical-swipe test keeps only its scroll assertion):
    - `the pole lap runs: the clock moves and S1 fills with its real split`: with `stubPole(page, <weekend circuit id>)` and `page.clock`, run 40 s and expect the first sector box `[data-state="done"]`.
    - `hovering the track snaps the car and the clock jumps` (desktop): move to turn 14's ring; the clock text changes and the stage has `[data-scrub]`.
    - `hover still snaps after the window is resized` (desktop).
    - `reduced motion shows the finished lap as a still`: the clock reads the pole time, three done boxes and no `.car`.
    - `tapping a turn on a phone jumps the replay to it` (phone).
    - `no stored lap keeps today's band`: `stubPole(page, null)`, then no `.replay` and no error.
    - `the replay pauses off screen`: scroll the band out of view, wait 2 s with `page.clock`, scroll it back, and the clock text equals what it was before scrolling away (within 0.1 s).
    - The existing "fits at … with nothing on top of anything" tests must stay green on phones. The readout card is smaller there and stays inside the stage.
- [ ] **Step 2: Run them.** Run `bun test test/weekend`, then `bunx playwright test e2e/weekend.spec.ts`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
  - **Running.** `running.current` is `near && intersecting && !document.hidden` (IntersectionObserver plus `visibilitychange`). The band's ticker is added only while running.
  - **Pins.** Pins light up through `data-hit`.
  - **Reduced motion.** `REDUCED` renders the still state and adds no ticker.
- [ ] **Step 4: Run them.** Run `bun test`, then `bunx playwright test e2e/weekend.spec.ts e2e/home.spec.ts e2e/hero.spec.ts` and `bun run lint`. Expected: PASS. The hero still runs its own light, since `lap` is untouched.
- [ ] **Step 5: Commit.** `feat(weekend): the circuit band replays the real pole lap and drag-to-spin is gone`

### Task 7: Clicking the track opens the explorer at that point

**Files:**
- Modify: `src/routes/lap.$circuit.tsx`, `src/lap/LapPage.tsx`, `src/lap/Explorer.tsx`, `src/weekend/CircuitBand.tsx`, `e2e/lap.spec.ts`, `e2e/weekend.spec.ts`

**Interfaces:**
- Produces:
  - The route's `validateSearch` gives `{ at?: number }`. It accepts only a finite number in [0, 1) and drops anything else.
  - `LapPage` passes `start` to `Explorer`. The Explorer's initial `Drive` becomes `{ pos: start, target: start, … }`, with the swoop landing there.
  - The band's `dive()` builder is extracted so the link and the track click share it. Clicking while snapped calls `go(`/lap/${id}?at=${u.toFixed(4)}`, dive())`.

- [ ] **Step 1: Write the failing tests:**
  - **lap.spec:** `opens at the requested point`. `/lap/vegas?at=0.5`, after the swoop, shows `[data-km]` between 2.9 and 3.3.
  - **lap.spec:** `ignores a bad at`. `?at=7` behaves like the start: `[data-km]` is below 0.3.
  - **weekend.spec (desktop):** `clicking the track opens the explorer there`. Hover turn 14 and click; the URL matches `/lap/<id>?at=0.` and `[data-km]` is above 4.
- [ ] **Step 2: Run them.** `bunx playwright test e2e/lap.spec.ts -g "requested point|bad at"`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run them.** `bunx playwright test e2e/lap.spec.ts e2e/weekend.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit.** `feat(lap): clicking the band's track opens the explorer at that point`

### Task 8: Record, proof and local preview

**Files:**
- Modify: `DESIGN.md`

- [ ] **Step 1: Add a "Pole lap on the band" entry to DESIGN.md.**
  - Cover the behaviour, the data rules (which lap, the wet tag, alignment and the warp anchors) and the pipeline (key, failures, dry run).
  - Note that the production namespace is written only by the workflow.
- [ ] **Step 2: Seed local storage only.** For each id, run `bunx wrangler kv key put --local --binding SEASON_KV pole:v1:<id> --path test/fixtures/pole/<id>.json`.
  - Confirm with `--local` `get`.
  - Never omit `--local`.
- [ ] **Step 3: Capture proof.**
  - Desktop 1470×830 and phone 390×844 screenshots of the band during the lap and while hovering (desktop only), plus one reduced-motion still.
  - Save them to the scratchpad.
- [ ] **Step 4: Run the full checks.** Run `bun run lint`, `bun test`, then `bunx playwright test`. Expected: green, apart from the known load flakes listed in memory. Re-run those alone and record the results in the ledger.
- [ ] **Step 5: Commit.** `docs(pole): the design record covers the pole lap on the band`
