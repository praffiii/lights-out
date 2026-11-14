# Chapter 03, Tyres and strategy: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/chapters/tyres-and-strategy`. It is the approved Figma frames, with the real Miami 2026 undercut (Antonelli on Norris, laps 26 to 28) replayed on the Miami broadcast stage, then wired into Chapter 02, Home and the Menu.

**Architecture:**
- **Miami becomes a full modelled circuit.** It joins the registry, the stage and the lap explorer.
- **A one-off tool bakes the window.** It takes both cars' OpenF1 location, laps, stints, pit stops and race positions, and writes them into `src/tyres/miami.json`. The positions go along the racing line, plus a pit-lane path and a lane fraction.
- **A pure model** turns that file into the four steps, the tower readouts and the camera framing.
- **One scrub engine.** Chapter 02's pin/scroll/drag/keys engine is extracted into one hook, which both replays use.
- **The stage learns to project a pit-lane path.**

**Tech Stack:** TanStack Start file routes, React 19, GSAP + ScrollTrigger (`#/motion/motion.ts`), Lenis, React Three Fiber, Effect 4 (Schema, `OpenF1Client`), `bun test`, Playwright (`e2e/`).

**Spec:** `docs/superpowers/specs/2026-11-14-chapter-03-tyres-design.md` (approved 2026-11-14).

**Figma** `IPkJZWQnY0IKdIjf6Nuugl`:

| Frame | Node | Where |
|---|---|---|
| Desktop light | 360:785 | — |
| Desktop dark | 364:794 | — |
| Phone light | 365:803 | board 131:2 |
| Phone dark | 366:828 | board 135:2 |

**Planned deviation, the same ruling as Chapter 02:** without WebGL the replay shows no car dots, because the dots' screen positions only exist in the GL projection. The poster, the tower, the step card and the progress bar still work.

## Global Constraints

- **Code.** `bun run lint` must pass. There is no formatter, so match the existing style by hand: single quotes, no semicolons, a blank line between statements.
  - No comments anywhere.
  - No `as` casts except `as const`.
  - No `any`, and no non-null `!`.
- **Commits.**
  - Titles are conventional, present tense.
  - **No Co-Authored-By trailer.**
  - Local commits on `feat/tyres` only. No push, PR or deploy without Praffi's word.
- **Safety.**
  - Never write production KV.
  - Never use bare `git stash`.
  - The shell `head` is broken, so use `sed -n`.
- **Media.**
  - Only Wikimedia Commons files under CC0, CC BY, CC BY-SA or public domain.
  - Each is credited with its place and year.
  - No OpenF1 headshots, and no F1, FIA, Pirelli or team logos as graphics.
- **Never invent numbers.** Every replay number comes from `miami.json`, with gaps shown to 0.1 s. Pit-loss figures carry the label `MultiViewer estimate`.
- **The story.**
  - Mercedes stopped first, and McLaren's stop was slower.
  - Never claim the new tyres alone won it.
  - Step 4 ends "Every tenth in the pit lane counted."
  - The payoff row reads "Antonelli got ahead of Norris without passing him on track."
- **Display.**
  - Both themes, and 390 px phones with no horizontal overflow.
  - Reduced motion hides nothing and pins nothing.
  - One ease family (`launch`, `brake`), and nothing counts up.
  - The replay section is `data-theme="dark"` in both themes, with the HUD, tower, step card and bar on the stage at every breakpoint.
- **Never change Chapter 02's behaviour.** `e2e/overtaking.spec.ts`, `e2e/weekend.spec.ts` and `e2e/chapter.spec.ts` stay green after every task.

## Review Focus

1. **Arriving mid-pin.** A reload or back navigation can restore the scroll inside the pin. The dots, tower, step card and bar must show that moment, not the start. *(Task 7 e2e "a reload inside the pin shows that moment")*
2. **Scrubbing backwards through a stop.** The tyre badge, the age, the status and the position must revert. For example, ANT goes back to `M` with `Old tyres` cleared, and the camera pulls back out. *(Task 3 test "the readouts are a pure function of time")*
3. **Interpolating across the lane boundary.** A car between an on-track sample and an in-lane sample must never be drawn halfway between the ribbon and the pit lane. *(Task 3 test "a car snaps to the side of the lane boundary it is nearest in time")*
4. **A drag, then a scroll.** The replay continues from where the drag left it, with no jump back. The engine moved, so this must hold for both chapters. *(Task 4 e2e "a drag then a scroll continue from the same moment", in both specs)*
5. **The baked file is edited or truncated.** Decoding fails loudly at test time, never a silent empty replay. *(Task 2 test "the baked undercut decodes and has four steps")*

---

### Task 0: Fact check (gate)

The spec says "this check runs first". I do it myself in this session; it is not delegated.

**Files:** Modify `docs/superpowers/specs/2026-11-14-chapter-03-tyres-design.md` ("Facts to verify before ship").

- [ ] **Step 1: Research every listed fact.** Use web search and primary sources: Pirelli's 2026 material, the FIA 2026 Sporting and Technical Regulations, F1 and Pirelli Miami previews, and race reports.
  - **The 2026 tyres:**
    - C1–C5, three per race;
    - C6 dropped;
    - 18-inch rims;
    - −25 mm front and −30 mm rear width.
  - **The two-compound rule** in 2026.
  - **Pit loss** of 19.5 s, 12.7 s (SC) and 13.5 s (VSC) for Miami.
  - **The Miami story:**
    - stop laps 26 and 27;
    - stops of 2.2 s and 2.8 s;
    - NOR rejoined behind;
    - ANT passed VER on lap 29;
    - VER's strategy.
  - **Miami's facts:**
    - 5.412 km;
    - 57 laps;
    - race distance 308.326 km;
    - 19 turns;
    - anticlockwise.
- [ ] **Step 2: Record each fact as `confirmed` / `changed to X` with a source URL**, under the spec's section.
- [ ] **Step 3: Decide whether to continue.**
  - If a fact changes copy, update the copy line in the spec, and use that copy in later tasks.
  - If the two-compound rule is gone, drop the `Two-compound rule` chip.
  - If the story fails (ANT did not stop first, or NOR did not rejoin behind), **stop and bring it to Praffi**.
- [ ] **Step 4: Commit** `docs(spec): chapter 03 facts are checked against 2026 sources`.

### Task 1: Miami joins the circuit registry

**Files:**
- Commit as-is: the untracked Miami build outputs.
  - `blender/circuits/circuit.py` (us-2022 entry);
  - `blender/circuits/data/us-2022-{elevation,m,terrain}.json`;
  - `blender/circuits/us-2022.blend`;
  - `public/circuits/us-2022{.glb,.webp,-1440.webp,-map.webp,-map-2048.webp}`;
  - `src/circuits/lines/us-2022.json`;
  - `src/circuits/pins/us-2022.json`.
- Modify:
  - `src/circuits/modelled.ts`: add `'miami'` to `MODELLED`.
  - `src/circuits/registry.ts`: imports, and a `miami` entry.
- Test:
  - `test/circuits/registry.test.ts`;
  - `e2e/lap.spec.ts`.

**Interfaces:** Produces `circuitFor('miami'): CircuitInfo` with `model: 'us-2022'`.

- [ ] **Step 1: Write the failing test.** In `registry.test.ts`, extend "names every circuit by its registry id" with `'miami'`, and add:

```ts
it('models Miami from the us-2022 build', () => {
  const miami = circuitFor('miami')

  expect(miami?.model).toBe('us-2022')
  expect(miami?.cuts).toEqual([0.309, 0.648])
  expect(miami?.facts.turns).toBe(19)
  expect(miami?.pins).toHaveLength(19)
})
```

- [ ] **Step 2: Run it.** `bun test test/circuits/registry.test.ts`. It should FAIL, because `miami` is undefined.
- [ ] **Step 3: Add the registry entry**, after `albert_park`:

```ts
miami: {
  ...fromCalendar(CALENDAR.miami),
  openf1: 'Miami',
  facts: factsOf(CALENDAR.miami, { distanceKm: '308.326', turns: 19, direction: 'anticlockwise' }),
  pins: pinsOf(us2022),
  line: us2022Line,
  crop: cropOf(us2022),
  cuts: [0.309, 0.648],
},
```

  Use the values Task 0 confirmed. Add `'miami'` to `MODELLED`.
- [ ] **Step 4: Run `bun test`.** It should PASS everywhere. That includes `test/circuits/assets.test.ts`, which checks the us-2022 budgets: glb 475 KB < 800 KB, poster 123 KB < 220 KB.
- [ ] **Step 5: Add an e2e test** to `e2e/lap.spec.ts`: "the Miami lap explorer renders the 2026 pole lap". It loads `/lap/miami`, waits for the loader to clear, expects the circuit name `Miami`, and expects no console errors. Follow the existing lap tests' pattern for the pole lap data.
  - Run `bunx playwright test e2e/lap.spec.ts`. It should PASS.
  - If the pole pipeline cannot produce Miami's lap, **stop and bring it to Praffi** (spec).
- [ ] **Step 6: Commit** the build outputs plus the registry change: `feat(circuits): Miami is a modelled circuit with its broadcast stage and lap explorer`.

### Task 2: Bake the undercut

**Files:**
- Create:
  - `src/tyres/schema.ts`;
  - `tools/undercut.ts`;
  - `src/tyres/miami.json` (generated);
  - `test/tyres/schema.test.ts`.
- Modify:
  - `src/pole/align.ts`: export the existing `fit`, `apply`, `resample` and `project`, plus `type Fit`, with no behaviour change.
  - `src/pole/schema.ts`: `Stint` gains `tyre_age_at_start: Schema.NullOr(Schema.Number)`.
  - `src/pass/schema.ts`: `PitResponse` items gain `date: Schema.String`, plus `stop_duration` and `lane_duration` as optional nullable numbers. Use the Effect 4 optional API, and check it with context7.
  - `src/season/openf1-client.ts`: add `positions: ReadWindow<typeof PositionResponse>`, which reads `/position?session_key&driver_number&window`.

**Interfaces:**
- Produces (`src/tyres/schema.ts`):

```ts
export const Compound = Schema.Literals(['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET'])
export const PositionResponse = Schema.Array(Schema.Struct({ date: Schema.String, driver_number: Schema.Number, position: Schema.Number }))
const Row = Schema.Tuple([Schema.Number, Schema.Number, Schema.Number])
const Car = Schema.Struct({
  number: Schema.Number, code: Schema.String, name: Schema.String, team: Schema.String,
  rows: Schema.Array(Row),
  laps: Schema.Array(Schema.Tuple([Schema.Number, Schema.Number])),
  stints: Schema.Array(Schema.Struct({ compound: Compound, lapStart: Schema.Number, ageAtStart: Schema.Number })),
  stop: Schema.Struct({ lap: Schema.Number, entry: Schema.Number, exit: Schema.Number, stopS: Schema.Number, laneS: Schema.Number }),
})
export const UndercutFile = Schema.Struct({
  session: Schema.Number, race: Schema.String, year: Schema.Number, totalLaps: Schema.Number, lengthM: Schema.Number,
  pit: Schema.Struct({ points: Schema.Array(Schema.Tuple([Schema.Number, Schema.Number, Schema.Number])), u: Schema.Number }),
  positions: Schema.Array(Schema.Tuple([Schema.Number, Schema.Number, Schema.Number])),
  early: Car, late: Car,
})
export type UndercutFile = typeof UndercutFile.Type
export type UndercutCar = typeof Car.Type
export type Compound = typeof Compound.Type
```

- **Field meanings:**
  - **`Row`** is `[t, u, lane]`.
    - `t` is seconds from the window start.
    - `u` is race distance in laps along the racing line: `(lap − 1) + fraction`. It keeps rising, even in the pit lane.
    - `lane` is `-1` on track, and `0..1` along the pit-lane path when in the lane.
  - **`laps`** is `[lapNumber, t]` lap starts inside the window.
  - **`stop`** has `entry` and `exit` as `t` of the lane boundary crossings, `stopS` as the stationary time, and `laneS` as the lane time.
  - **`pit.points`** is the lane path in scene coordinates `[x, y, z]`, the same space as `CircuitInfo.line`, from entry to exit.
  - **`pit.u`** is the racing-line fraction (0..1) beside the lane midpoint.
  - **`positions`** is `[t, driverNumber, position]`, sorted by `t`.
  - **`early`** is the car that stops first (ANT, 12). **`late`** is NOR (1).

**How `tools/undercut.ts` decides:**

| What | How |
|---|---|
| Constants | `SESSION = 11280`, `EARLY = 12`, `LATE = 1`, `LEAD_IN = 15` s before EARLY's lane entry, `LEAD_OUT = 8` s after LATE's lane exit, `MAX_RMS_M = 10`, `LANE_M = 12` |
| Fit | Fit a clean EARLY lap (lap 25) onto `info.line` mapped to `{ x: p.x, y: p.z }`, with the exported `fit` and `resample`, as `alignLap` does. Metres per unit = `lengthM / line perimeter`. If `fit.rms × metresPerUnit > MAX_RMS_M`, print it and exit 1. |
| On track | Each location sample → `apply` → `project`, then unwrap to a rising `u`, the way `alignLap` builds `raw`. Offset by `lap − 1` from the lap whose `date_start` precedes the sample. |
| In the lane | A sample is in the lane when it is more than `LANE_M` from the line, within ±40 s of that car's pit `date`. Entry and exit are the interpolated crossing times. |
| Lane path | The mean of both cars' lane traces, resampled to 60 points by fraction of lane length. `y` comes from the nearest line point's `y`. |
| Lane fraction | Each in-lane sample is projected onto that path. |
| `stopS`, `laneS` | Taken from the pit records. |

**The swing printout.** This is the spec's story check. Time both cars crossing a fixed track point before EARLY's entry (`u = 25.8`), and a fixed point after LATE's exit (the first `u` at least 0.1 lap past the lane's rejoin). Print:
- the gap before and after;
- the swing;
- `laneS(late) − laneS(early)`;
- `stopS(late) − stopS(early)`;
- the remainder.

The story holds only if the late car's `laneS` is the larger, and the early car is ahead after.

- [ ] **Step 1: Write the failing test** in `test/tyres/schema.test.ts`:

```ts
test('the baked undercut decodes and has four steps', () => {
  const file = Schema.decodeUnknownSync(UndercutFile)(baked)

  expect(file.early.code).toBe('ANT')
  expect(file.late.code).toBe('NOR')
  expect(file.early.stop.lap).toBe(26)
  expect(file.late.stop.lap).toBe(27)
  expect(file.early.stop.stopS).toBeCloseTo(2.2, 1)
  expect(file.late.stop.stopS).toBeCloseTo(2.8, 1)
  expect(file.early.stop.entry).toBeLessThan(file.early.stop.exit)
  expect(file.early.stop.exit).toBeLessThan(file.late.stop.entry)
  expect(file.pit.points.length).toBeGreaterThanOrEqual(20)
})

test('a truncated file fails to decode', () => {
  expect(() => Schema.decodeUnknownSync(UndercutFile)({ ...baked, late: undefined })).toThrow()
})
```

  The "four steps" assertion lands in Task 3, once `steps` exists.
- [ ] **Step 2: Run it.** `bun test test/tyres/schema.test.ts`. It should FAIL, because the module and the JSON are missing.
- [ ] **Step 3: Implement the schema, the exports, the client method and the tool.**
- [ ] **Step 4: Run the tool.** `bun tools/undercut.ts --out src/tyres/miami.json`. Expected output:
  - the fit RMS in metres (below 10);
  - lane entry and exit for both cars, each lane about 22 s;
  - the swing printout;
  - `wrote src/tyres/miami.json`.

  The file should be under 150 KB. If the swing contradicts the story, **stop and bring the numbers to Praffi**.
- [ ] **Step 5: Run the checks.** `bun test` should PASS, including `test/pass/*`, so ch02 is unaffected by the schema changes. `bun run lint` should PASS.
- [ ] **Step 6: Commit** `feat(tyres): the Miami undercut is baked from OpenF1 with its pit-lane path`.

### Task 3: The undercut model

**Files:**
- Create `src/tyres/model.ts` and `test/tyres/model.test.ts`.
- Modify `src/pass/model.ts`: widen `crossTime`'s row type to `ReadonlyArray<readonly [number, number, ...ReadonlyArray<number>]>`, so 3-tuples fit. Its behaviour does not change.

**Interfaces:**
- Consumes:
  - `UndercutFile` and `UndercutCar` (Task 2);
  - `crossTime`, `Step`, `stepAt`, `prevStep`, `nextStep` and `Focus` from `#/pass/model.ts`.
- Produces, from `src/tyres/model.ts`:

```ts
export type Which = 'early' | 'late'
export const carAt: (car: UndercutCar, t: number) => { u: number; lane: number | null }
export const gapBehind: (file: UndercutFile, t: number) => { behind: Which; seconds: number }
export const tyreAt: (car: UndercutCar, t: number) => { compound: Compound; letter: 'S' | 'M' | 'H' | 'I' | 'W'; age: number }
export const statusAt: (file: UndercutFile, which: Which, t: number) => 'In pit' | 'Out-lap' | 'Old tyres' | ''
export const positionAt: (file: UndercutFile, which: Which, t: number) => number
export const lapAt: (file: UndercutFile, t: number) => number
export const steps: (file: UndercutFile) => readonly [Step, Step, Step, Step] | null
export const sliderText: (file: UndercutFile, all: ReadonlyArray<Step>, t: number) => string
export const camAt: (file: UndercutFile, all: ReadonlyArray<Step>, t: number) => Focus
export const windowLaps: (file: UndercutFile) => readonly [number, number]
```

**Rules the tests pin:**

| Function | Rule |
|---|---|
| `carAt` | Interpolates `u`. `lane` is interpolated only between two in-lane samples. Otherwise it takes the state of the sample nearer in time. |
| `gapBehind` | The car with the smaller `u` is behind. `seconds = t − crossTime(other.rows, carAt(behind).u)`. |
| `tyreAt` | Before `stop.exit`, the stint in force at the current lap. From `stop.exit`, the next stint, with age `0`. Age rises by 1 at each lap start after that. |
| `statusAt` | `In pit` inside `[entry, exit]`. `Out-lap` from `exit` until that car's next lap start. `Old tyres` when this car has not exited yet and the other car has. `''` otherwise. If more than one applies, the first in that order wins. |
| `positionAt` | The last `positions` row for that car's number at or before `t`. Before the first row, the first row's value. |
| `lapAt` | The highest lap number among both cars' lap starts at or before `t`. |
| `steps` | Returns `null` unless `early.stop.exit < late.stop.entry`, `late` is ahead at step 1, and `early` is ahead at step 4. |

**The steps** (titles and text are exact; numbers have 1 decimal; surnames are the last word of `name`; compound words are lowercase plurals such as `mediums` and `hards`):
1. At `early.stop.entry`: `Box first.` / `` `${gap} s behind ${L}, on the same worn ${c}. ${early.team} call him in.` ``
2. At `early.stop.exit`: `New tyres, one lap early.` / `` `${E} is out on fresh ${c2}. ${L} does one more lap on worn ${c}.` ``
3. At `late.stop.entry`: `` `${L} boxes.` `` / `` `${L} stops one lap later. His stop takes ${late.stopS} s, against ${E}'s ${early.stopS} s.` ``
4. At `late.stop.exit`: `Out behind.` / `` `${L} rejoins ${gap} s behind. Every tenth in the pit lane counted.` ``

**The other outputs:**
- **`sliderText`:** `` `Lap ${lap}, step ${n} of 4, ${title}` ``, or `` `Lap ${lap}, before the first stop` `` before step 1.
- **`camAt`:**
  - `u` is `file.pit.u` within `RAMP = 6` s of any step time.
  - `k = 1 + (K_PIT − 1) × w`, with `K_PIT = 3`.
  - `w` is the smoothstep of nearness to the nearest step, `1` at the step and `0` beyond `RAMP`.
  - Far from every step: `{ u: wrap(midpoint of both cars' u), k: 1, w: 0 }`.
  - `K_PIT` and `RAMP` are the starting values for the bar check.
- **`windowLaps`:** the first and last lap numbers in the window. They feed the label `` `The replay · Miami, laps ${a} to ${b}` ``.

- [ ] **Step 1: Write the failing tests** in `test/tyres/model.test.ts`. They run against the decoded `miami.json`, plus synthetic files built by spreading it.
  - `'the baked undercut has four steps in order'`:
    - `steps(file)` is not null;
    - its `t` values strictly increase;
    - its titles are `['Box first.', 'New tyres, one lap early.', 'Norris boxes.', 'Out behind.']`.
  - `'step 1 puts Antonelli about two seconds behind'`: the number in the text parses to between 1.5 and 2.6.
  - `'step 3 states both stop times'`: the text contains `2.8 s` and `2.2 s`.
  - `'step 4 ends on the pit lane, not the tyres'`:
    - the text ends `Every tenth in the pit lane counted.`;
    - the gap is between 0 and 1.5.
  - `'tyres change at lane exit'`:
    - `tyreAt(early, early.stop.exit − 0.1).letter` is `'M'`;
    - at `+0.1` it is `'H'`, with age `0`.
  - `'statuses follow the stops'`:
    - `'In pit'` mid-lane;
    - `'Out-lap'` just after exit;
    - for the late car, `'Old tyres'` between `early.stop.exit` and `late.stop.entry`.
  - `'Antonelli drops then climbs'`: `positionAt(file, 'early', t)` is 2 before step 1, greater than 2 just after step 2, and below the late car's after step 4.
  - `'the readouts are a pure function of time'`: compute every readout at step 4's `t`, then at 0, then at step 4's `t` again. The results are deep-equal.
  - `'a car snaps to the side of the lane boundary it is nearest in time'`: on a synthetic car whose rows go `[10, 25.9, -1]`, `[11, 25.95, 0.02]`, `carAt(…, 10.4).lane` is `null`, and `carAt(…, 10.6).lane` is `0.02`.
  - `'steps is null when the early car is not ahead at the end'`: a synthetic file with `late.rows` shifted 3 s earlier.
  - `'the camera pushes in at each step and is wide between them'`:
    - `camAt` at a step has `k === 3`;
    - at the midpoint between steps 2 and 3, `k === 1`.
  - `'the slider names the lap and step'`: `sliderText` at step 2's `t` matches `/^Lap 2[67], step 2 of 4, New tyres, one lap early\.$/`.
- [ ] **Step 2: Run them.** `bun test test/tyres/model.test.ts`. They should FAIL.
- [ ] **Step 3: Implement `src/tyres/model.ts`** and the `crossTime` widening.
- [ ] **Step 4: Run them again.** `bun test` should PASS, including `test/pass/model.test.ts`.
- [ ] **Step 5: Commit** `feat(tyres): the undercut model derives steps, tyres, statuses and camera from the baked race`.

### Task 4: One scrub engine for both replays

**Files:**
- Create `src/chapter/useScrub.ts`.
- Modify `src/chapter/Replay.tsx`, to use the hook with linear pacing.
- Test:
  - `test/chapter/pace.test.ts`;
  - `e2e/overtaking.spec.ts`, adding one test.

**Interfaces:**
- Produces:

```ts
export type Pace = ReadonlyArray<readonly [progress: number, t: number]>
export const linearPace: (end: number) => Pace
export const stepPace: (stepTimes: ReadonlyArray<number>, end: number) => Pace
export const timeAt: (pace: Pace, progress: number) => number
export const progressAt: (pace: Pace, t: number) => number
export function useScrub(root: RefObject<HTMLElement | null>, end: number, stops: ReadonlyArray<number>, pace: Pace, show: (t: number) => void): RefObject<number>
```

**What `useScrub` owns.** Everything in `Replay.tsx`'s `useGSAP` except `show`:
- the `.pin` ScrollTrigger (`end: '+=300%'`);
- `fromScroll`, with its snap-to-target;
- `follow` on the ticker;
- `seek`, through Lenis;
- pointer drag on `[role="slider"]`;
- keys: ← / ↓ go to the previous stop, → / ↑ to the next, and Home / End;
- reduced motion: no pin, `show(end)`.

Scroll progress maps through `timeAt(pace, …)`, and `seek` maps back through `progressAt`. It returns the `time` ref.

**`stepPace`.** The knots are `[0, 0]`, then each step time at progress `i / (n + 1)`, then `[1, end]`. So each step gets an equal share of the scroll, and the stretches between steps fast-forward.

- [ ] **Step 1: Write the failing tests** in `pace.test.ts`:
  - `'linear pace is the identity scaled to end'`;
  - `'step pace gives each step an equal share of the scroll'`: `stepPace([10, 30, 120, 140], 160)` puts `t = 30` at progress `0.4`;
  - `'progressAt inverts timeAt'`: a round trip at 7 points, to within 1e-9.
- [ ] **Step 2: Run them.** `bun test test/chapter/pace.test.ts`. They should FAIL.
- [ ] **Step 3: Extract the hook,** and make `Replay.tsx` call `useScrub(root, end, all.map((s) => s.t), linearPace(end), show)`. `Replay.tsx` keeps only `show` and its markup.
- [ ] **Step 4: Add an e2e test** to `overtaking.spec.ts`: `'a drag then a scroll continue from the same moment'`.
  - Drag the handle to 50%, then scroll 40 px down.
  - `aria-valuenow` should be within 1 s above the dragged value, not back at the scroll-derived start.
- [ ] **Step 5: Run the checks.** These should PASS unchanged apart from the new test:
  - `bun test`;
  - `bunx playwright test e2e/overtaking.spec.ts e2e/weekend.spec.ts e2e/chapter.spec.ts`.
- [ ] **Step 6: Commit** `refactor(chapter): both replays share one scroll, drag and key engine`.

### Task 5: The chapter page

**Files:**
- Create:
  - `src/chapter/Tyres.tsx`;
  - `src/routes/chapters.tyres-and-strategy.tsx`;
  - `src/styles/tyres.css`;
  - `public/img/ch03-medium.jpg`;
  - `public/img/ch03-sc.jpg`;
  - `e2e/tyres.spec.ts`.
- Modify:
  - `src/home/content.ts`: add `PHOTOS.ch03Medium` and `PHOTOS.ch03Sc`.
  - `src/chapter/words.ts`: add ten words and `TYRES_WORDS`.

**Interfaces:**
- Consumes `Next`, `Words`, `Term`, `PHOTOS`, `Go`/`Soon`, and the motion helpers (`sweep`, `reveal`, `block`, `onEnter`), in the same pattern as `Overtaking.tsx`.
- Produces `export function Tyres()`, and the route `/chapters/tyres-and-strategy` with title `Tyres and strategy · Lights Out`.
- The replay section is a placeholder `<section className="replay">` until Task 7.

**The sections**, in order (the spec, "Starting point", items 1–4 and 6–10, with exact copy):
1. the hero, with its nav;
2. the ch03 photo band;
3. the tyres;
4. what a stop costs;
5. (the replay, in Task 7);
6. two ways to use a stop, with the payoff reading "Antonelli got ahead of Norris without passing him on track.";
7. the cheap stop;
8. the words;
9. Next (Chapter 04, `to={null}`);
10. the footer.

The page root is `<div className="chapter-page tyres-page">`.

**Photos.** Find them on Wikimedia Commons, check the licence on each file page, and save them at about 2400 px wide, under 350 KB:

| File | Commons source | Credit |
|---|---|---|
| `ch03-medium.jpg` | the Pirelli 2026 medium slick | `Photo TaurusEmerald · CC BY-SA 4.0` |
| `ch03-sc.jpg` | the Suzuka 2026 safety car | `Photo Ysys3455 · CC0` |

- If a licence differs, stop and swap the photo, then tell Praffi.
- The driver cards use `/img/cars/nor.webp` and `/img/cars/ant.webp`, with the credit from `CARS`. Their `commons` URLs must say Chinese GP Qualifying.

**The words.** Add these keys and definitions, short and plain, in the guide's voice, checked against Task 0:
- `compound`
- `stint`
- `degradation`
- `pitLoss`
- `pitWindow`
- `boxBox`
- `undercut`
- `overcut`
- `safetyCar`
- `twoCompound`

Drop `twoCompound` if Task 0 says the rule is gone.

- [ ] **Step 1: Write the failing e2e tests** in `e2e/tyres.spec.ts`, modelled on `overtaking.spec.ts`:
  - `loads with no errors, ${scheme}`: the h1 has text `A race is won in the pit lane.`, allowing for line spans.
  - `'no horizontal overflow on the page'`: at desktop and at 390 px.
  - `'every photo is credited'`: `.photo-band`, `.tyres`, `.cheap`, `.cards` and `.next` credits each match `/CC/`.
  - `'five compounds, three dry and two wet'`: `.compounds li` has count 5, and the `Dry` tags have count 3.
  - `'pit loss is labelled an estimate'`: `.cost` contains `MultiViewer estimate`.
  - `'the payoff is true to the race'`: `.ways .payoff` contains `without passing him on track`.
  - `'a word chip opens its definition'`: `Undercut`.
  - `'the hero nav leads back to chapter 02'`:
    - the link `02 How overtaking works` has href `/chapters/overtaking`;
    - `.is-soon` contains `04 Flags and what they mean`.
- [ ] **Step 2: Run them.** `bunx playwright test e2e/tyres.spec.ts`. They should FAIL with 404.
- [ ] **Step 3: Build the page.**
  - Match the Figma frames section by section, in both themes and at 390 px.
  - Follow the motion list in the spec's "Rules that apply".
- [ ] **Step 4: Run them again.** They should PASS. `bun run lint` should PASS.
- [ ] **Step 5: Commit** `feat(guide): chapter 03 teaches tyres, pit loss and the undercut`.

### Task 6: The stage draws a pit lane

**Files:**
- Modify:
  - `src/circuits/Circuit.tsx`: the `Replay` type, and `project()`.
  - `src/weekend/CircuitStage.tsx`: a `pit` prop.
- Test:
  - `e2e/weekend.spec.ts` and `e2e/overtaking.spec.ts` stay green;
  - Task 7's e2e covers the new path.

**Interfaces:**
- Produces:
  - `Replay.pit?: { points: ReadonlyArray<readonly [number, number, number]>; trace: RefObject<Float32Array | null> }`. `project()` also fills `pit.trace` with screen x/y for each point, in the same way as the line.
  - `CircuitStage` gets the prop `pit?: ReadonlyArray<readonly [number, number, number]>`, and builds `replay.pit` when it is given.
  - Without the prop, nothing changes.

- [ ] **Step 1: Implement the change.**
- [ ] **Step 2: Run the checks.** These should PASS:
  - `bunx playwright test e2e/weekend.spec.ts e2e/overtaking.spec.ts e2e/chapter.spec.ts`;
  - `bun run lint`.
- [ ] **Step 3: Commit** `feat(circuits): the broadcast stage can project a pit-lane path`.

### Task 7: The replay section

**Files:**
- Create:
  - `src/chapter/Undercut.tsx` (the section);
  - `src/chapter/UndercutHud.tsx` (the dots, chips, dashed pit lane and its tag);
  - styles in `src/styles/tyres.css`.
- Modify `src/chapter/Tyres.tsx`: replace the placeholder.
- Test `e2e/tyres.spec.ts`.

**Interfaces:**
- Consumes:
  - `steps`, `carAt`, `tyreAt`, `statusAt`, `positionAt`, `lapAt`, `sliderText`, `camAt`, `windowLaps` (Task 3);
  - `useScrub` and `stepPace` (Task 4);
  - `CircuitStage` `pit` (Task 6);
  - `circuitFor('miami')` (Task 1);
  - `TEAMS` colours from `#/home/cars.ts`.
- Produces `export function Undercut({ file, all, info }: { file: UndercutFile; all: readonly [Step, Step, Step, Step]; info: CircuitInfo })`.

**The markup** (approved frames; the spec's item 5 and "What changes from the mock"):
- **The header.** Label `The replay · Miami, laps ${a} to ${b}`, the tag, the h2 `The undercut that won Miami.`, and the body copy.
- **The two driver cards.** `.cards`, with ghost numbers `1` and `12`, team colour bars, and chips `Boxes lap 27` and `Boxes lap 26` (from `stop.lap`).
- **The stage**, in `.pin`, with `turns` set to all Miami pins, `focus` from `camAt`, `pit={file.pit.points}`, and `hud` rendering `UndercutHud`. On the stage:
  - `● Replay · Miami · Lap ${lapAt} of ${totalLaps}`;
  - the step card (`[data-step]` items; the current one is shown);
  - the tower, `table.tower`, with rows `tr[data-car="early|late"]`:
    - **Pos:** `[data-pos]`;
    - **Driver:** a team bar and the code;
    - **Tyre:** `.badge[data-compound]` with the letter;
    - **Age:** `[data-age]`;
    - **Status:** `[data-status]`, with a pill styling for `Out-lap` (purple) and `Old tyres`;
  - the rows reorder by position;
  - the 4-segment bar: `[role="slider"]` with `aria-valuetext` from `sliderText`. Segments are `[data-seg]`, labelled `01 Box first` · `02 New tyres` · `03 Norris boxes` · `04 Out behind`. On a phone they read `01 Box` · `02 Tyres` · `03 Norris` · `04 Out`. The current segment fills by progress within it.
- **The footnote,** with the exact credit line from the spec.
- **On a phone,** follow the approved phone frame. One stage block holds the map, about 300 px, fading into the tower, the step card and the bar below it.

**`UndercutHud`:**
- **Dots.** Each car's dot is at `pointAt(replay.trace, wrap(u))` on track. In the lane, it is at the interpolated point of `replay.pit.trace` at `lane`.
- **Pit lane.** A dashed polyline is drawn through `replay.pit.trace`, with a `Pit lane` tag at its exit end.
- **Chips.** Each car has a chip reading `` `${Compound title} · ${age === 0 ? 'New' : `${age} laps`}` ``. The chip for `late` sits below its dot.

- [ ] **Step 1: Write the failing e2e tests** in `tyres.spec.ts`, reusing `overtaking.spec.ts`'s `pinSpan` and `scrollTo` helpers:
  - `'scrolling through the replay reaches step 4 with Norris behind'`:
    - scroll to the pin end;
    - `[data-step="4"]` has `data-current`;
    - `tr[data-car="late"] [data-pos]` is greater than `tr[data-car="early"] [data-pos]`;
    - the slider value text contains `step 4 of 4`.
  - `'keys and drag move the replay'`:
    - focus the slider and press → twice: the value text contains `step 2 of 4`;
    - Home: `before the first stop`;
    - End: `step 4 of 4`;
    - dragging to 30% changes `aria-valuenow`.
  - `'tyres change at the stop'`: seek to step 2 with keys. `tr[data-car="early"] .badge` has text `H`, `[data-status]` has `Out-lap`, and `tr[data-car="late"] [data-status]` has `Old tyres`.
  - `'reduced motion opens on step 4, unpinned'`: `emulateMedia({ reducedMotion: 'reduce' })`, there is no `.pin-spacer`, and `[data-step="4"]` has `data-current`.
  - `'a reload inside the pin shows that moment'`: scroll to 60% of the pin, reload, and `aria-valuenow` is greater than 0 and matches the step lit.
  - `'the HUD stays on the stage on a phone'`: at 390 px, the tower's and the bar's bounding boxes lie inside the `.pin` box.
  - `'without WebGL the replay still steps'`: use the existing no-WebGL fixture pattern from `overtaking.spec.ts`. The poster is visible, the keys reach step 4, and there are no errors.
  - `'a drag then a scroll continue from the same moment'`: the same as in Task 4.
- [ ] **Step 2: Run them.** `bunx playwright test e2e/tyres.spec.ts`. They should FAIL.
- [ ] **Step 3: Implement** `Undercut.tsx` and `UndercutHud.tsx`.
- [ ] **Step 4: Run the checks.** These should PASS:
  - `bunx playwright test e2e/tyres.spec.ts e2e/overtaking.spec.ts e2e/weekend.spec.ts`;
  - `bun run lint`.
- [ ] **Step 5: Bar check, done by me in the browser, not delegated.**
  1. Open the live page, both themes, at 1440 and 390.
  2. Compare each section against landonorris.com and mercedesamgf1.com, and against the Figma frames.
  3. Check DESIGN.md's 7 rules.
  4. Check that there are no drawn stand-ins, and that no neighbouring sections share a layout.
  5. Tune `K_PIT`, `RAMP` and the pin length here.

  Fix everything below the bar before closing.
- [ ] **Step 6: Commit** `feat(guide): the Miami undercut replays on the broadcast stage, scrubbed by scroll`.

### Task 8: Wire the guide in, then prove it

**Files:**
- Modify:
  - `src/home/content.ts`: `CHAPTERS[2].to = '/chapters/tyres-and-strategy'`.
  - `src/chapter/Overtaking.tsx`: the hero nav `<Go to="/chapters/tyres-and-strategy">03 Tyres and strategy →</Go>`, and the Next card's `to`.
  - `e2e/overtaking.spec.ts`: line 51 expects a link now, not `.is-soon`.
- Test:
  - `e2e/overtaking.spec.ts`;
  - `e2e/home.spec.ts`, adding one test.

- [ ] **Step 1: Write the failing tests.**
  - In `overtaking.spec.ts`, the hero link `03 Tyres and strategy` and the `.next .read` link both have href `/chapters/tyres-and-strategy`.
  - In `home.spec.ts`, Start here row 03 links to `/chapters/tyres-and-strategy`.
- [ ] **Step 2: Run them.** They should FAIL.
- [ ] **Step 3: Make the wiring edits.**
- [ ] **Step 4: Run the full suite.** `bun test`, `bunx playwright test` and `bun run lint` should all PASS.
- [ ] **Step 5: Commit** `feat(guide): chapter 02, Home and the menu lead to chapter 03`.
- [ ] **Step 6: Prove and review.**
  1. Take live screenshots of the whole page for Praffi: light and dark, at 1440 and 390, with the replay at each step.
  2. Run the `sol-loop` skill on the branch, with no council.
  3. Record each round's changes.
  4. Re-check the head with no code changes in the final round.
  5. Stop there. Push and PR wait for Praffi's word.
