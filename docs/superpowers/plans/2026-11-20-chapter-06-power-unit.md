# Chapter 06, The power unit: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/chapters/power-unit`. It shows a Blender-built 2026 power unit in five parts, then a pinned band where scroll drives the latest dry pole lap at a modelled circuit:
- speed, rpm and gear are real;
- MGU-K and battery state are estimated and labelled;
- the lit part follows the lap's phase.

**Architecture:**
- **Data first.**
  - The stored pole lap gains rpm, team and date. The hourly refresh backfills old laps.
  - A new `GET /api/pole/latest` picks the newest dry lap that carries rpm.
  - A pure `src/engine/phase.ts` turns lap time into phase, states and readouts.
- **Blender** (`blender/engine/`) builds the model, the stills and a rig. A new `blender/circuits/inset.py` renders label-free inset posters from the saved circuit `.blend` files, and nothing else.
- **The page is poster-first.** The band scrubs the lap with no WebGL. The live R3F engine (baked clay, the Chapter 05 shader) replaces the still only after Praffi passes the bake checkpoint.

**Tech Stack:** React 19, TanStack Start (Cloudflare Workers), Effect 4 Schema, three.js 0.187 + @react-three/fiber 9, GSAP ScrollTrigger + Lenis (`useScrub`), Blender 5.2 headless (`bpy`, Cycles bake), `@gltf-transform/cli`, Bun test, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-20-chapter-06-power-unit-design.md`. Read it with this plan. Copy, phase words, facts and credits come from it verbatim.

## Global Constraints

**Code**
- No code comments anywhere, Python and shell included (`tools/no_comments.py` fails the lint).
- No `as` casts except `as const`; no `any`; no non-null `!`; no lazy `unknown`. Prettier only on changed hunks.
- `bun run lint`, `bun test` and `bunx playwright test` are green before every commit that touches `src/`.

**Git and safety**
- Commits are local on `feat/power-unit`, with conventional, present-tense changelog titles and **no `Co-Authored-By` trailer**. Never push, deploy or merge.
- Never run `tools/refresh-season.ts` and never write production KV.
- OpenF1 requests use UA `LightsOutResearch/1.0 (personal non-commercial project)`, at least 2 s apart. Never put Praffi's name or email in a request.
- Leave `.playwright-mcp/` alone. Stop every dev server you start.

**Data and copy**
- Zero cost: one new Worker route (`/api/pole/latest`), no new KV keys, no paid services.
- Never invent a number: every number is real telemetry from the stored lap or a published rule in the spec. Every estimate says `est.` or `Estimated`.

**3D and media**
- 3D is made in Blender: matte clay, no glow, no real-time lights, and the stills match the live end frame.
- No drag-to-spin, no synthesized sound, no charts.
- Budgets:
  - `public/engine/engine.glb` ≤ 400 KB after meshopt;
  - each engine still < 200 KB;
  - each `public/circuits/<model>-inset.webp` < 80 KB.
- Stills: `-light` is rendered for paper and `-dark` for tarmac. The band is in the opposite theme (`.flip`), so it shows `opposite(theme)`'s still. `band-light` is edge-faded into `#F4F3EF`.
- Photos: `public/img/ch06.jpg`, `ch06-mguh.jpg`, `ch06-1967.jpg`, `ch06-1986.jpg`, `ch06-2001.jpg`, `ch06-2014.jpg`, each about 1400 px wide, credits exactly as the spec.

## Review Focus

1. **Stored laps from before this change** (six columns, no team or date) still decode and still drive the existing pole bands and `/lap`. Only `/api/pole/latest` skips them. Pinned in Task 1 (decode the committed `test/fixtures/pole/vegas.json`, unchanged) and Task 2.
2. **Scrubbing backwards across a phase change**: the phase at a time `t` is a pure function of the lap. Scrolling up gives the same lit part, list states and MGU-K word as scrolling down, with no flicker inside the 0.3 s hold. Pinned in Task 3 (`phaseAt` has no state, and both directions agree).
3. **The latest lap is not Monza** (Las Vegas qualifies 2026-11-21): the band's label, inset, ticks, `T<n> ahead`, `Explore <Circuit> in 3D` link and footnote all come from `circuitFor(circuit)` and the lap. Nothing is hard-coded to Monza. Pinned in Task 7's e2e with a `vegas` latest response.
4. **360 px phones**: the readouts (`11,520 rpm`, `Peak 342 · throttle 100%`) and strip labels never overflow the band. Pinned in Task 7's e2e at 360 wide.
5. **Theme toggled with the band on screen**: the band flips to the new opposite theme, the still swaps, and the live clay colour uniform updates without reloading the glb. Pinned in Task 9's e2e.

---

### Task 1: The pole lap carries rpm, team and date

**Files:**
- Modify:
  - `src/pole/schema.ts` (`CarSample.rpm`, an optional 7th row column, optional `team` and `date` on `PoleLap`);
  - `src/pole/align.ts` (carry rpm);
  - `src/pole/pole-lap.ts` (team from `driver.team_name`, date from `session.date_start`);
  - `src/pole/refresh-poles.ts` (the stale rule).
- Re-capture fixture: `test/fixtures/openf1/pole/11357-car.json`, with rpm.
- Create fixture: `test/fixtures/pole/monza.json`.
- Test: `test/pole/schema.test.ts`, `test/pole/align.test.ts`, `test/pole/refresh-poles.test.ts`.

**Interfaces:**
- Produces:
  - `CarSample = Struct({ date, speed, n_gear, throttle, brake, rpm: Schema.optionalKey(Schema.Number) })`. Old fixtures without rpm still decode.
  - `TelemetryRow` takes 6 or 7 numbers: `[t, u, speed, gear, throttle, brake, rpm?]`. `PoleRow` users (`replay.ts`, `Circuit.tsx`, `/lap`) keep reading indices 0–5 unchanged.
  - `PoleLap` gains `team: Schema.optionalKey(Schema.String)` and `date: Schema.optionalKey(Schema.String)`, both ISO strings from OpenF1.
  - `alignLap` writes rpm as the 7th column only when every in-lap car sample has rpm: interpolated like speed, rounded to an integer.
  - `isComplete(lap: PoleLap): boolean`, exported from `src/pole/schema.ts`. It is true when `team` and `date` are present and every row has 7 columns.
  - In `refreshOne`, the skip becomes `previous?.sessionKey === session.session_key && isComplete(previous)`.

- [ ] **Step 1: Re-capture** `11357-car.json`.
  - Read the first and last `date` of the existing file.
  - `curl -A 'LightsOutResearch/1.0 (personal non-commercial project)' 'https://api.openf1.org/v1/car_data?session_key=11357&driver_number=10&date>=<first>&date<=<last>'`.
  - Overwrite the file and check that every row now has `rpm`.
- [ ] **Step 2: Write the failing tests.**
  - `schema.test.ts`:
    - `test/fixtures/pole/vegas.json` (six columns, no team or date) still decodes, and `isComplete` is false;
    - a 7-column lap with team and date decodes, and `isComplete` is true.
  - `align.test.ts`:
    - the Monza fixture lap has 7 columns and its rpm stays within 4,000–15,000;
    - a car stream with one sample missing rpm gives 6-column rows.
  - `refresh-poles.test.ts`:
    - Monza is stored with `team: 'Alpine'`, `date` equal to session 11357's `date_start`, and rpm;
    - a stored Monza lap with the same session key but no rpm is rebuilt (`written`);
    - a complete one is `unchanged`;
    - a rebuild that returns `skip` keeps the old lap and reports `kept`.
- [ ] **Step 3: Run** `bun test test/pole`. Expected: FAIL.
- [ ] **Step 4: Implement.** `alignLap`'s `row` takes an optional rpm; `value(t)` interpolates rpm with `at` like speed.
- [ ] **Step 5: Build the fixture.** Write `test/fixtures/pole/monza.json` by running `poleLap(circuitFor('monza'), session11357)` against `fakeOpenF1` from a scratchpad script and encoding with `PoleLapJson`.
  - Expected around t = 6.8 s: about 336 km/h, rpm about 11,520, gear 8, throttle 100.
  - Record the exact values the fixture gives. Tasks 3 and 7 assert those values, not the mock's.
- [ ] **Step 6: Run** `bun test && bun run lint`. Expected: PASS.
- [ ] **Step 7: Commit** `feat(pole): stored pole laps carry rpm, the team and the session date, and old laps are rebuilt`.

### Task 2: `GET /api/pole/latest`

**Files:**
- Create:
  - `src/pole/latest.ts`;
  - `src/routes/api/pole.latest.ts`;
  - `src/engine/use-latest-pole.ts`.
- Modify:
  - `src/routeTree.gen.ts` (regenerated);
  - `e2e/fixtures.ts` (`stubLatest`).
- Test: `test/pole/latest.test.ts`.

**Interfaces:**
- Consumes: Task 1's `PoleLap`, `isComplete`; `MODELLED`; `PoleStore`.
- Produces:
  - `type Latest = { circuit: ModelledId; lap: PoleLap }`, and `LatestJson = Schema.fromJsonString(Schema.Struct({ circuit: Schema.Literals(MODELLED), lap: PoleLap }))`.
  - `latestDry(laps: ReadonlyArray<{ circuit: ModelledId; lap: PoleLap | null }>): Latest | null`. It keeps laps that are not `wet` and pass `isComplete`, picks the latest `Date.parse(lap.date)`, and breaks a tie by `MODELLED` order.
  - `handleLatestRequest(store: PoleStore['Service']): Effect<Response>`. 200 sends the JSON with `cache-control: public, max-age=300` and `content-type: application/json`. 204 sends no body, with `max-age=300`.
  - `useLatestPole(near: boolean): Latest | null | 'loading'`, which fetches `/api/pole/latest` once `near` is true. Any status other than 200, or a decode failure, gives `null`.
  - `stubLatest(page: Page, id: string | null)`, registered after `stubPole` so it wins for `**/api/pole/latest`. It serves `{ circuit: id, lap: <test/fixtures/pole/monza.json> }`. `id` names the circuit, and the lap is always the Monza fixture.

- [ ] **Step 1: Write the failing tests:**

```ts
it('skips wet, incomplete and missing laps', () => expect(latestDry([{ circuit: 'interlagos', lap: { ...monza, wet: true } }, { circuit: 'vegas', lap: oldVegas }, { circuit: 'miami', lap: null }])).toBeNull())
it('picks the newest date even when an older lap has a higher session key', () => expect(latestDry([{ circuit: 'monza', lap: { ...monza, sessionKey: 11730, date: '2026-09-05T14:00:00Z' } }, { circuit: 'vegas', lap: { ...monza, sessionKey: 11416, date: '2026-11-21T04:00:00Z' } }])?.circuit).toBe('vegas'))
it('breaks a date tie by MODELLED order', () => expect(latestDry([{ circuit: 'monza', lap: monza }, { circuit: 'vegas', lap: monza }])?.circuit).toBe('vegas'))
it('answers 204 when nothing qualifies and 200 with the circuit when one does', async () => {})
```

  The 200/204 case uses `fakeKV` with Monza stored. In the tie test, `vegas` comes before `monza` in `MODELLED`.

  That the static route wins over `pole.$circuit` is checked in Task 6's e2e: `page.request.get('/api/pole/latest')` against the dev server is never 404 and never `{"status":"none"}`.
- [ ] **Step 2: Run** `bun test test/pole/latest.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** The handler reads every `MODELLED` id through `store.read` (corrupt laps already come back `null`), then calls `latestDry`. The route file follows `pole.$circuit.ts`.
- [ ] **Step 4: Run** `bun test && bun run lint`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(pole): /api/pole/latest serves the newest dry pole lap at a modelled circuit`.

### Task 3: Phases, readouts and the battery estimate

**Files:**
- Create: `src/engine/phase.ts`.
- Test: `test/engine/phase.test.ts`.

**Interfaces:**
- Consumes: Task 1's `PoleLap`; `sampleAt` from `src/pole/replay.ts`.
- Produces:
  - `type Phase = 'push' | 'fade' | 'brake' | 'part'`.
  - `PART_IDS = ['v6', 'turbo', 'mguK', 'energyStore', 'electronics'] as const` and `type PartId`.
  - `STATES: Record<Phase, { lit: PartId; states: Record<PartId, string>; mguK: { word: string; note: string }; battery: string; sentence: string }>`. All of it is the spec's Phases table and open-row sentences, verbatim. The Fade sentence has a `{gear}` slot.
  - `rawPhase(lap: PoleLap, t: number): Phase`:
    - `brake` when brake > 0;
    - `fade` when throttle ≥ 90 and speed ≤ `runPeak(lap, t) − 3`;
    - `push` when throttle ≥ 90;
    - else `part`.
  - `runPeak(lap: PoleLap, t: number): number`: the highest speed since the last row before `t` whose throttle was below 90.
  - `phaseAt(lap: PoleLap, t: number): Phase` with the 0.3 s hold. It returns `rawPhase` at the latest `t' ≤ t` such that the raw phase holds over all rows in `[t' − 0.3, t']`, and `rawPhase(lap, 0)` if there is none. It is pure, with no stored state.
  - `firstFrame(lap: PoleLap): { t: number; headline: 'Flat out, and slowing.' | 'Flat out.' }`. `t` is the first row time where `phaseAt` is `fade`, or else where it is `push`. The headline depends on whether a fade exists.
  - `readouts(lap: PoleLap, t: number): { speed: string; peak: string; rpm: string; gear: string; phase: Phase }`. It uses `en-GB` grouping, so values read `336 km/h`, `Peak 342 · throttle 100%`, `11,520 rpm`, `Gear 8 · limit 15,000`. With no rpm column, `rpm` is `''`.
  - `gearWord(n: number): string`: `first` … `eighth`.
  - `batteryAt(lap: PoleLap, t: number): number`: integrates from 0.5 at t = 0 in 0.1 s steps over `phaseAt`:
    - push and fade at `−DRAIN` per second;
    - brake at `+CHARGE` per second;
    - part holds;
    - clamped to 0.05–1.

    Start with `DRAIN = 0.06`, `CHARGE = 0.12`. Tune so the bar moves visibly on the Monza fixture and is at most 0.35 at `firstFrame`.

- [ ] **Step 1: Write the failing tests** (crafted rows, plus the Monza fixture):

```ts
it('full throttle with speed rising is push', () => expect(phaseAt(lap(rising), 2)).toBe('push'))
it('full throttle 3 km/h under the run peak is fade, 2 km/h is not', () => {})
it('brake on is brake, part throttle is part', () => {})
it('a raw phase shorter than 0.3 s does not show', () => expect(phaseAt(lap(blip), 5.2)).toBe('push'))
it('scrubbing backwards gives the same phase as forwards', () => {
  const ts = Array.from({ length: 800 }, (_, i) => i * 0.1)
  expect(ts.map((t) => phaseAt(monza, t))).toEqual([...ts].reverse().map((t) => phaseAt(monza, t)).reverse())
})
it('the Monza first frame is the fade before T1', () => {
  const f = firstFrame(monza)
  expect(f.headline).toBe('Flat out, and slowing.')
  expect(f.t).toBeCloseTo(FIXTURE_T, 1)
  expect(readouts(monza, f.t)).toMatchObject({ speed: FIXTURE_SPEED, rpm: FIXTURE_RPM, gear: 'Gear 8 · limit 15,000', phase: 'fade' })
})
it('a lap with no fade starts on its first push with the short headline', () => {})
it('the battery falls in push, rises in brake, holds in part, stays in 0.05–1', () => {})
it('the fade sentence names the gear', () => expect(STATES.fade.sentence.replace('{gear}', gearWord(8))).toBe('Flat out in eighth. The only push left before the brakes.'))
```

  `FIXTURE_*` are the values recorded in Task 1 Step 5.
- [ ] **Step 2: Run** `bun test test/engine/phase.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `src/engine/phase.ts`.
- [ ] **Step 4: Run** `bun test test/engine && bun run lint`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(engine): each moment of a pole lap reads as push, fade, brake or part throttle`.

### Task 4: Label-free inset posters for every modelled circuit

**Files:**
- Create:
  - `blender/circuits/inset.py`, `blender/circuits/inset.sh`;
  - `public/circuits/{us-2022,us-2023,qa-2004,ae-2009,au-1953,br-1940,it-1922}-inset.webp`;
  - `src/circuits/insets/<model>.json` × 7;
  - `src/engine/inset.ts`.
- Test: `test/engine/inset.test.ts`, `test/circuits/inset-assets.test.ts`.

**Interfaces:**
- `inset.py` runs as `Blender -b <model>.blend -P inset.py`, from `inset.sh`, which loops over the seven models. It:
  - hides every object whose name contains `-label`;
  - renders the scene camera at 720 px wide to `public/circuits/<model>-inset.webp`, then restores the labels;
  - projects the `Track()` racing line from `circuit.py` through the same camera into `src/circuits/insets/<model>.json`, as `{ "line": [[u, x, y], …] }`, about 400 points, with `u` and `x, y` in 0–1;
  - **never saves the .blend** and writes no other file.
- Produces:
  - `INSETS: Record<ModelledId, { src: string; line: ReadonlyArray<readonly [number, number, number]> }>`, decoded with Schema;
  - `insetPoint(line, u: number): { x: number; y: number }`. It wraps `u` into [0, 1) and interpolates linearly between neighbours, across the seam.

- [ ] **Step 1: Write the failing tests:**
  - `insetPoint(line, 0)` is the first point;
  - `insetPoint(line, 1)` equals `insetPoint(line, 0)`;
  - `insetPoint(line, 0.999)` lies between the last and first points;
  - every `MODELLED` id has an inset whose image exists and is < 80 KB;
  - every inset line has ≥ 200 points with x and y in [0, 1].
- [ ] **Step 2: Run** `bun test test/engine/inset.test.ts test/circuits/inset-assets.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement and run** `blender/circuits/inset.sh`.
- [ ] **Step 4: Check that nothing else changed.** `git status --short public/circuits src/circuits blender/circuits` shows only the new files and scripts: no `.blend`, glb, poster, pins or line diff.
- [ ] **Step 5: Look** at each inset beside the circuit's poster: the road glows on dark, there are no labels, and the line overlays the road.
- [ ] **Step 6: Run** `bun test && bun run lint`. Expected: PASS.
- [ ] **Step 7: Commit** `feat(circuits): every modelled circuit has a label-free inset poster and its racing line in 2D`.

### Task 5: Blender builds the power unit's stills and rig

**Files:**
- Create:
  - `blender/engine/engine.py`, ported from `../lights-out-private/engine-2026-11-20/engine.py` with its 4 comments removed;
  - `blender/engine/render.py`, `blender/engine/build.sh`, `blender/engine/engine.blend`;
  - `public/engine/{exploded,band}-{light,dark}.webp`;
  - `src/engine/rig.json`, `src/engine/rig.ts`.
- Test: `test/engine/rig.test.ts`, `test/engine/assets.test.ts`.

**Interfaces:**
- `engine.py` builds the scene. It names each object `<partId>:<tone>:<name>`, with `partId` from `PART_IDS` and tone one of `body | carbon | metal | dark`, and saves `engine.blend`.
- `render.py <view> <theme>` renders from the scene cameras with the mock's palette and clay:
  - `exploded`: front camera, 2880 × 1800;
  - `band`: assembled, front, V6 lit, 2880 × 1620. `band-light` is composited onto `#F4F3EF` with a 14% edge fade (the scratchpad `fade.py` logic); `band-dark` onto `#0E0F11`.
  - Stills are WEBP < 200 KB.
  - `render.py rig` writes `src/engine/rig.json`:

```json
{ "lens": 85, "band": { "position": [0, 0, 0], "target": [0, 0, 0] }, "turn": [0, 1, 0], "pins": { "v6": [0.5771, 0.3459] }, "shadow": { "centre": [0, 0, 0], "size": [0, 0], "drop": 0 } }
```

  `pins` holds all five parts. Coordinates are glTF, Y up.
- `src/engine/rig.ts` holds:
  - `PARTS`, `as const`: `{ id, n: '01', name, job }` × 5, with the spec's Five-parts table verbatim, and `terms` for the inline words (Task 6);
  - `EngineRig`, the Schema of the JSON;
  - `rig = Schema.decodeUnknownSync(EngineRig)(json)`.

- [ ] **Step 1: Port** `engine.py`, splitting it into `engine.py` (build and save) and `render.py` (cameras, clay, stills, rig) in the `blender/car/` shape.
- [ ] **Step 2: Write the failing tests:**
  - `rig.pins` has exactly the five `PART_IDS`, each in [0, 1];
  - every still exists and is < 200 KB;
  - `band-light`'s corner pixel is `#F4F3EF` within ±2.
- [ ] **Step 3: Run** `blender/engine/build.sh` (stills + rig only for now), then `bun test test/engine`. Expected: PASS.
- [ ] **Step 4: Look** at every still at full size beside the Figma frames (468:1073, 474:1082, 481:1091, 484:92), and fix framing or clay until they read as the mock.
- [ ] **Step 5: Commit** `feat(engine): Blender builds a generic 2026 power unit and renders the chapter's stills`.

### Task 6: The chapter page, poster-first

**Files:**
- Create:
  - `src/routes/chapters.power-unit.tsx`;
  - `src/chapter/PowerUnit.tsx`, `src/chapter/FiveParts.tsx`;
  - `src/styles/engine.css`;
  - the six `public/img/ch06*.jpg`.
- Modify:
  - `src/chapter/words.ts` (seven entries + `POWER_WORDS`);
  - `src/home/content.ts` (`PHOTOS.ch06`, `ch06MguH`, `ch06Y1967`, `ch06Y1986`, `ch06Y2001`, `ch06Y2014`, and the `CHAPTERS` row 06);
  - `src/home/Home.tsx` (`Six chapters · 35 min`, derived from `CHAPTERS`);
  - `src/shell/menu.ts` (`The engine` → `/chapters/power-unit`);
  - `src/chapter/Car.tsx` (the hero nav gains `<Go to="/chapters/power-unit">06 The power unit →</Go>` in the Flags pattern, and `NextRace` becomes `<Next label="Next · Chapter 06 · 6 min" title="The power unit." line="Half fuel, half battery, one real pole lap" photo={PHOTOS.ch06} to="/chapters/power-unit" />`);
  - `src/routeTree.gen.ts`.
- Test: `e2e/power-unit.spec.ts`, plus updates to `e2e/home.spec.ts` (five → six chapters, both checks), `e2e/car.spec.ts` (Next card and nav) and the menu test.

**Interfaces:**
- Consumes: Task 5's `PARTS`, `rig.pins`, stills; `Words`, `Term`, `Go`, `NextRace`, `useTheme`, `opposite`; the `Car.tsx` motion helpers.
- Produces:
  - `FiveParts`: the still `<img>` and pins. On desktop, each pin is a `.pin` with a dot, a stem, a tag, a name and a job. On a phone, a numbered `.tag` sits on the still, followed by `<ol className="part-rows">`. The phone crop maps anchors through `object-fit: cover` at 390 × 340.
  - `PowerUnit.tsx`, in the `Car.tsx` structure. Its band is `<LapBand />` from Task 7. Until then, a placeholder section holds the band header and the `band-*` still.
- Copy: everything in the spec's top-to-bottom list, Five parts, The numbers, The MGU-H, History and Words, verbatim.
  - The MGU-H chip and dot are HTML over the photo, placed in photo coordinates (0–1); on a phone the chip is right-aligned.
  - History: four columns on desktop, staggered 270 px cards on a phone.

- [ ] **Step 1: Download the six photos.** Find each Commons file by its credit (Yu Chu Chin's Audi R26 at Melbourne 2026; Liauzh's Honda RA621H at the Honda Racing Gallery; Hullian111's DFV in London; Jiří Sedláček's BMW M12/13 in Munich; Morio's Ferrari 050 at Maranello; David Merrett's PU106 at Silverstone). Confirm each licence and author on the file page, resize to about 1400 px, and record each `source` URL in `PHOTOS`.
- [ ] **Step 2: Write `e2e/power-unit.spec.ts`** (desktop 1440 and phone 390):
  - loads with no errors in both themes; title `The power unit · Lights Out`; `h1` `Half fuel.Half battery.`;
  - no horizontal overflow; every photo has its credit;
  - Five parts shows five pins (desktop) or five tags and five rows (phone), with the spec's jobs;
  - the numbers `400`, `350`, `1.6`, `0`, the payoff row, and the plus row linking to `/chapters/overtaking`;
  - nine glossary chips in the spec's order;
  - the page ends with the weekend band (`Next · Round 20 · this weekend` at the fixture clock);
  - the menu's "The engine", Home row 06 and Chapter 05's hero link and Next card lead here; Home reads `Six chapters · 35 min`;
  - `page.request.get('/api/pole/latest')` is 200 or 204, never 404 and never `{"status":"none"}`.
- [ ] **Step 3: Run** `bunx playwright test e2e/power-unit.spec.ts`. Expected: FAIL (404).
- [ ] **Step 4: Implement** the route (`chapterCss` + `engineCss`), the page, `FiveParts`, words, photos and wiring.
- [ ] **Step 5: Run** `bun test && bun run lint && bunx playwright test`. Expected: PASS.
- [ ] **Step 6: Look** at the page at 1440 and 390, both themes, against the four frames; fix spacing and type.
- [ ] **Step 7: Commit** `feat(guide): Chapter 06 shows the five parts of a 2026 power unit`.

### Task 7: The band rides the lap (no 3D yet)

**Files:**
- Create:
  - `src/chapter/LapBand.tsx`;
  - `src/engine/LapStrip.tsx`, `src/engine/Inset.tsx`, `src/engine/Readouts.tsx`.
- Modify:
  - `src/chapter/useScrub.ts` (an optional options argument);
  - `src/chapter/PowerUnit.tsx`;
  - `src/styles/engine.css`.
- Test: `test/chapter/use-scrub-options.test.ts` (pure helpers only), `e2e/power-unit.spec.ts`.

**Interfaces:**
- Consumes: Task 2's `useLatestPole`; Task 3's `phaseAt`, `firstFrame`, `readouts`, `batteryAt`, `STATES`, `gearWord`; Task 4's `INSETS`, `insetPoint`; Task 5's `PARTS`, `band-*` stills; `circuitFor`, `SECTORS`, `sampleAt`, `timeAt`, `linearPace`.
- Produces:
  - `useScrub(root, end, stops, pace, paint, options?: { length?: string; rest?: number })`. `length` defaults to `'+=300%'`; `rest`, the time shown under reduced motion, defaults to `end`. With no options, today's behaviour is unchanged.
  - `LapBand`: `<section className="band flip lap-band">` with:
    - the header;
    - the stage slot `.stage` (still `<img>`, Task 9 adds the canvas);
    - `<ol className="parts">` with `data-part` and `aria-expanded` on the active row;
    - `Inset`;
    - `LapStrip`, the `role="slider"` track: `aria-valuemin 0`, `aria-valuemax` the lap time, `aria-valuenow` = t, `aria-valuetext` `0:06.8, 336 km/h`;
    - `Readouts`, the footer row and the footnote.
  - The band uses `end = lap.time`, `stops = circuit.laps.map((l) => timeAt(lap, l.u))`, `length: '+=500%'` and `rest = firstFrame(lap).t`. Before the pin starts, it paints `firstFrame(lap).t`.
  - Paint writes text and styles straight to the DOM (no React re-render per frame), as `CarParts` does.
  - Labels come from `circuitFor(latest.circuit)`: `Ride a pole lap · <name>, <year>`, `<name> · T<n> ahead`, `Explore <name> in 3D →` to `/lap/<id>`, and the footnote `… Pole lap: <driver>, <team>, <year> <gp> …`.
  - **No lap** (`null`): the header, still and list in Push states, then `<p className="mono">No pole lap to ride yet.</p>`. No hint, inset, strip, readouts or footer row, and the footnote keeps only its model and estimate clauses.
  - **Loading:** the same as no lap, but with the space reserved and no message.

- [ ] **Step 1: Write the failing e2e** (default `stubLatest(page, 'monza')` unless stated):
  - the first frame reads the Task 1 fixture values for speed, rpm and `Gear 8`, plus `↓ Fading`, `Low` and row 01 open, with the headline `Flat out, and slowing.`;
  - pressing `→` on the strip until the readout shows `Harvesting` opens row 03 MGU-K, and the battery word is `Charging · est.`;
  - scrolling down through the pin then back up to the same scroll position shows the same readouts;
  - `stubLatest(page, 'vegas')`: the label reads `circuitFor('vegas').name`, the link goes to `/lap/vegas`, and the inset image is `` `${circuitFor('vegas').model}-inset.webp` ``;
  - the strip shows one tick per `circuit.laps` turn, labelled `T<n>`, and the inset label names the next turn (`T1 ahead` at the Monza first frame);
  - `stubLatest(page, null)`: `No pole lap to ride yet.` shows, and the band has no `km/h` or `rpm` text;
  - reduced motion: no `.pin-spacer`, and the first frame is shown;
  - at 360 px wide: no element in `.lap-band` overflows the band's box;
  - Chapters 02, 03 and 05 e2e pass unchanged (the `useScrub` defaults).
- [ ] **Step 2: Run** `bunx playwright test e2e/power-unit.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the `useScrub` options, `LapBand` and its parts, and wire them into `PowerUnit.tsx`.
- [ ] **Step 4: Run** `bun test && bun run lint && bunx playwright test`. Expected: PASS.
- [ ] **Step 5: Live check.** Scroll the lap at 1440 and 390, both themes, and with WebGL off. The strip, dot and numbers move continuously, with no stepping (Praffi's replay feedback, 2026-11-11).
- [ ] **Step 6: Commit** `feat(guide): scrolling drives the latest dry pole lap through the power unit's phases`.

### Task 8: Bake the clay and pass Praffi's checkpoint

**Files:**
- Create: `blender/engine/bake.py`, `public/engine/engine.glb`, `src/three/clay.ts`.
- Modify:
  - `blender/engine/build.sh` (bake + export + meshopt);
  - `src/car/model.ts`, `src/car/PartsScene.tsx`, `src/car/WingsScene.tsx` (import `clayMaterial`, `shadowMaterial` and `SECTOR_PURPLE` from `src/three/clay.ts`; Chapter 05 behaviour unchanged).
- Throwaway, **not committed**: `src/routes/engine-check.tsx`.
- Test: `test/engine/assets.test.ts` (the glb).

**Interfaces:**
- Produces `public/engine/engine.glb`:
  - nodes `part:<partId>`, with child meshes named `<partId>_<tone>`;
  - `COLOR_0.r`: the assembled bake (AO + key light, plain light values);
  - no normals, no textures, no images; meshopt with 16-bit positions.
- Produces `src/three/clay.ts`, holding `clayMaterial(clay: string)`, `shadowMaterial(...)` and `SECTOR_PURPLE`, moved unchanged from `src/car/model.ts`. Chapter 05 keeps its `CLAY` and `clayOf`.
- Produces `ENGINE_CLAY = { light: { body: '#D6D4CD', carbon: '#8F9298', metal: '#A6A8AD', dark: '#4A4D53' }, dark: { body: '#5E6168', carbon: '#3C3F45', metal: '#7E8188', dark: '#26282D' } } as const` in `src/engine/model.ts`, with `useEngine()` and `toneOf(name)`.

- [ ] **Step 1: Write the failing test.** The glb exists and is ≤ 400 KB, has no `images` and no `NORMAL` attributes, has the five `part:` nodes, and every mesh name ends in one of the four tones.
- [ ] **Step 2: Implement `bake.py`.** Port `blender/car/bake.py`, with one pose (assembled) into R.
- [ ] **Step 3: Run** `blender/engine/build.sh && bun test test/engine test/car`. Expected: PASS.
- [ ] **Step 4: Move** the shared material to `src/three/clay.ts`. `bunx playwright test e2e/car.spec.ts` stays green.
- [ ] **Step 5: Build `/engine-check`.** For both themes, it shows the live glb (unlit clay, V6 lit) beside `band-*.webp` at the rig's camera.
- [ ] **Step 6: STOP. Praffi's checkpoint.** Show both themes side by side.
  - If rejected, raise detail or bake to a lightmap texture, and show again.
  - If it is still rejected, the band ships on the stills (Task 7 as-is) and Task 9 is dropped. That is Praffi's call.
- [ ] **Step 7: Delete** `engine-check.tsx`. **Commit** `feat(engine): the power unit ships as one glb with its clay light baked in`.

### Task 9: The live engine in the band

**Files:**
- Create: `src/engine/EngineScene.tsx`.
- Modify: `src/chapter/LapBand.tsx`.
- Test: `e2e/power-unit.spec.ts`.

**Interfaces:**
- Consumes: Task 8's `useEngine`, `ENGINE_CLAY`, `toneOf`, `clayMaterial`, `SECTOR_PURPLE`; Task 5's `rig.band`, `rig.turn`, `rig.shadow`; Task 3's `phaseAt`, `STATES`.
- Behaviour:
  - Camera: `rig.band`, `rig.lens`.
  - Each paint sets the turn angle to `TURN × t / lap.time`, with `TURN = 30°` about `rig.turn`.
  - The lit part is `STATES[phaseAt(lap, t)].lit`. Each part's `uLit` eases toward 0 or 1 with a time constant of about 0.25 s. Dark-tone meshes never light.
  - The clay uniform follows `opposite(theme)` and updates in place on a theme change.
  - Rendering:
    - `frameloop="demand"`, invalidated by the scrub paint and the `uLit` ease;
    - paused off screen and in a hidden tab;
    - mounted within about one viewport;
    - the still fades out after the first frame.
  - Reduced motion: no scene.
  - With no WebGL or a load failure, a `CircuitGuard`-style boundary keeps the still silently. The lap still scrubs.

- [ ] **Step 1: Add e2e tests:**
  - the canvas draws non-blank pixels once the band is near;
  - with WebGL disabled (`NO_WEBGL` from `e2e/car.spec.ts`, moved to `e2e/fixtures.ts`), the still shows and the strip still moves the readouts;
  - toggling the theme with the band on screen changes the band background, and the canvas still draws non-blank pixels;
  - reduced motion: no canvas.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement** `EngineScene` and mount it in `LapBand`'s stage.
- [ ] **Step 4: Run** `bun test && bun run lint && bunx playwright test`. Expected: PASS.
- [ ] **Step 5: Live check** at 1440 and 390, both themes: the turn is one continuous move, the purple crossfades, and the live frame matches the still.
- [ ] **Step 6: Commit** `feat(guide): the power unit turns and lights up as the lap plays`.

### Task 10: Docs and the final proof

**Files:**
- Modify:
  - `DESIGN.md` (the 3D list gains the power unit built by `blender/engine`, shown in Chapter 06);
  - `docs/superpowers/specs/2026-11-07-f1-fan-site-design.md` (§7.3 notes the engine page is Chapter 06);
  - the credits page source list, if photos are listed there by chapter.

- [ ] **Step 1:** Update the docs.
- [ ] **Step 2:** Run `blender/engine/build.sh` from clean, then `git status`. Expected: no diff in `public/engine/` or `src/engine/rig.json` beyond float noise.
- [ ] **Step 3:** Run `bun test && bun run lint && bunx playwright test`. Expected: all green.
- [ ] **Step 4:** Live pass at 1440 and 390, both themes, through the whole chapter, and record a short capture of the band for the PR.
- [ ] **Step 5:** Commit `docs(guide): the engine lives in Chapter 06`.
- [ ] **Step 6:** Final whole-branch review on the most capable model, then `sol-loop`, recording each round. The PR body comes from the `pr` skill and must list:
  - the spec's Facts to verify;
  - the production-KV backfill the first hourly run will do.

  The PR waits for Praffi's word.
