# Chapter 07, Defending: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/chapters/defending`: the one-move rule, a scroll-driven replay of Russell and Leclerc's real fight for the lead at Melbourne 2026, the switchback and divebomb as clay stills, and the penalty prices.

**Architecture:** The fight is baked once from OpenF1 into `src/fight/melbourne.json` and read by a pure model (`src/fight/model.ts`). `Fight.tsx` + `FightHud.tsx` play it on the existing `CircuitStage` through `useScrub`, reusing Chapter 02's `.cast` stage styles. Two Blender stills with projected pins and plain HTML sections make up the rest.

**Tech Stack:** React 19, TanStack Start (Cloudflare Workers), Effect 4 Schema, three.js 0.187 + @react-three/fiber 9, GSAP ScrollTrigger + Lenis, Blender 5.2 headless, Bun test, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-24-chapter-07-defending-design.md`. Read it with this plan. Copy, credits and word definitions come from it verbatim; this plan does not repeat them.

## Global Constraints

- No code comments anywhere, Python and shell included. No `as` casts except `as const`; no `any`; no non-null `!`; no lazy `unknown`. Prettier only on changed hunks.
- `bun run lint` and `bun test` pass before every commit; the Playwright specs a task names pass too.
- Commits are local on `feat/defending`, conventional present-tense titles, **no `Co-Authored-By` trailer**. Never push, deploy, merge, run `tools/refresh-season.ts` or write production KV.
- OpenF1 and Commons requests use a generic client name, at least 2 s apart, with no personal details.
- Leave `.playwright-mcp/` alone. Stop every dev server you start.
- Zero cost: no new Worker route, no KV, no third-party call at runtime.
- Never invent a number. No copy in the fight claims a line or a defensive move; the word "inside" does not appear in that section.
- The circuit stage is `#06080E` in both themes. One ease family (`launch`, `brake`). No sound, no charts, no drag-to-spin.
- Stills: 8 WEBP files in `public/defend/`, each under 200 KB.
- Chapters 02, 03, 05 and 06 behave exactly as today; their specs stay green unchanged (apart from Chapter 06's links in Task 6).

## Review Focus

1. **Dragging or clicking the "Who leads" bar** lands on the time under the pointer although scroll is not linear in time. Pinned in Task 2 (unit) and Task 5 (e2e).
2. **Scrolling back through a lead change**: the board order, step, bar and camera at a time `t` are the same in both directions. Pinned in Task 1 (pure functions) and Task 5 (e2e goes forward, then back).
3. **Crossing the start line** (`u` runs through 0 and 1): dots, trails and camera never jump across the map. Pinned in Task 1 (`camAt` continuity) and Task 5 (dot movement per frame across 85 to 87 s).
4. **360 px phones**: the board, bar codes, step pins 3 and 4 and the giant prices never overflow or overlap. Pinned in Tasks 4 and 5.
5. **A term popover opened over a neighbouring section or the purple block** is not covered by it. Pinned in Task 4.

---

### Task 1: The fight's data and model

**Files:**
- Create: `tools/fight.ts`, `src/fight/schema.ts`, `src/fight/melbourne.json`, `src/fight/model.ts`
- Modify: `src/pass/schema.ts` (export `Car`)
- Test: `test/fight/model.test.ts`

**Interfaces:**
- Produces, in `src/fight/schema.ts`: `FightFile = Struct({ session: Number, race: String, year: Number, laps: Tuple([Number, Number]), lengthM: Number, cars: Tuple([Car, Car]) })`, `type FightFile`. `cars[0]` is Leclerc, `cars[1]` is Russell.
- Produces, in `src/fight/model.ts`:
  - `END = 96`, `HOLD = 1`, `LEVEL_M = 5`
  - `type Which = 0 | 1`
  - `type Lead = { who: Which; from: number; to: number }`
  - `type Step = { n: 1 | 2 | 3 | 4; t: number; title: string; text: string; mark: string }`, where `mark` is the bar caption from the spec
  - `type Row = { speed: number; gear: number; gap: string; cells: number; brake: boolean; u: number }`
  - `leads(file: FightFile): ReadonlyArray<Lead>`
  - `steps(file: FightFile): readonly [Step, Step, Step, Step] | null` (null unless there are exactly four changes)
  - `leaderAt(all: ReadonlyArray<Lead>, t: number): Which`
  - `readout(file: FightFile, all: ReadonlyArray<Lead>, t: number): { leader: Which; rows: readonly [Row, Row] }`
  - `stepAt(all: ReadonlyArray<Step>, t: number): number`
  - `sliderText(file: FightFile, all: ReadonlyArray<Step>, lead: ReadonlyArray<Lead>, t: number): string`
  - `camAt(file: FightFile, t: number): Focus` (`Focus` from `#/pass/model.ts`)

- [ ] **Step 1: Write `tools/fight.ts`**, following `tools/pass.ts` (same client layer, `alignLap`, `--out`). Session 11234, drivers 16 and 63, laps 7, 8, 9, model `au-1953`. Per lap, subtract `Math.round(u)` of its first row and add `lap - 8`. The clock's zero is when Leclerc's `u` first reaches 0. Keep rows from one sample before 0 to one sample after 96, with `t` rounded to 3 places and throttle clamped to 0–100. Print the four changes.
- [ ] **Step 2: Run** `bun tools/fight.ts --out src/fight/melbourne.json`. Expected: about 350 rows per car; changes near 12.9, 46.5, 89.9 and 91.9 s, to Russell, Leclerc, Russell, Leclerc. If they differ, stop and tell Praffi.
- [ ] **Step 3: Write the failing tests** in `test/fight/model.test.ts`:

```ts
test('the baked fight has five stretches and four changes', () => {
  const all = leads(file)
  expect(all.map((l) => file.cars[l.who].code)).toEqual(['LEC', 'RUS', 'LEC', 'RUS', 'LEC'])
  expect(all[0]?.from).toBe(0)
  expect(all.at(-1)?.to).toBe(END)
  const span = (all[4]?.from ?? 0) - (all[1]?.from ?? 0)
  expect(span).toBeGreaterThan(75)
  expect(span).toBeLessThan(85)
})

test('changes fall where the telemetry puts them', () => {
  const at = leads(file).slice(1).map((l) => l.from)
  for (const [i, t] of [12.92, 46.47, 89.87, 91.93].entries()) expect(Math.abs((at[i] ?? 0) - t)).toBeLessThan(0.3)
})

test('a lead shorter than a second does not count', () => {
  expect(leads(flicker(0.5)).length).toBe(1)
  expect(leads(flicker(1.5)).length).toBe(3)
})

test('steps name who takes the lead and read their speeds from the data', () => {
  const all = steps(file)
  expect(all?.map((s) => s.title)).toEqual(['Russell dives', 'Leclerc answers', 'Too deep', 'The cut-back'])
  expect(all?.[0].text).toMatch(/^(29\d|30\d) against 26\d km\/h on the run to Turn 3\./)
  expect(all?.[1].text).toMatch(/^(31\d|32\d) against 29\d km\/h on the straight to Turn 9\./)
  expect(all?.map((s) => s.text).join(' ')).not.toContain('inside')
})

test('the car behind reads its gap in metres, and Level inside the error', () => {
  const all = leads(file)
  expect(readout(file, all, 30).rows[1].gap).toBe('Leader')
  expect(readout(file, all, 30).rows[0].gap).toMatch(/^\+(1|2)\d m$/)
  expect(readout(file, all, 90.5).rows[0].gap).toBe('Level')
  expect(readout(file, all, END).rows[0].gap).toBe('Leader')
  expect(readout(file, all, END).rows[1].gap).toMatch(/^\+1\d m$|^\+2\d m$/)
})

test('throttle stays within 0 to 100', () => {
  for (const car of file.cars) for (const r of car.rows) expect(r[4] >= 0 && r[4] <= 100).toBe(true)
})

test('the slider says the time, the step and who leads', () => {
  expect(text(0)).toBe('0.0 s, before the first change, Leclerc leads')
  expect(text(92.5)).toBe('92.5 s, step 4 of 4, The cut-back, Leclerc leads')
})

test('the camera opens on the whole circuit, is close at Turn 3 and closest at Turn 1, and never jumps', () => {
  expect(camAt(file, 0)).toMatchObject({ k: 1, w: 0 })
  expect(camAt(file, 12).w).toBe(1)
  expect(camAt(file, 91).k).toBeGreaterThan(camAt(file, 30).k)
  for (let t = 0.05; t <= END; t += 0.05) {
    const a = camAt(file, t - 0.05)
    const b = camAt(file, t)
    expect(Math.abs(b.k - a.k)).toBeLessThan(0.15)
    expect(Math.abs(b.u - a.u)).toBeLessThan(0.002)
  }
})
```

  `text(t)` calls `sliderText` with the file's own steps and leads. `flicker(s)` builds a `FightFile` where car 1 pokes 10 m ahead for `s` seconds.
- [ ] **Step 4: Run** `bun test test/fight`. Expected: FAIL, modules missing.
- [ ] **Step 5: Implement** the schema and model. `leads` scans the union of both cars' row times with `sampleRows`, finds sign changes of the `u` difference by interpolation, drops any stretch shorter than `HOLD` by merging it into its neighbours, and ends at `END`. `camAt.u` is the cars' mean `u`, unwrapped.
- [ ] **Step 6: Run** `bun test && bun run lint`. Expected: PASS.
- [ ] **Step 7: Commit** `feat(fight): Russell and Leclerc's laps 8 and 9 at Melbourne are baked with the moments the lead changes`

### Task 2: `useScrub` can read its bar on another scale

**Files:**
- Modify: `src/chapter/useScrub.ts`
- Test: `test/chapter/use-scrub-options.test.ts`

**Interfaces:**
- Produces: `ScrubOptions` gains `scale?: Pace`. `scrubOptions(end, pace, options?)` returns `{ length, rest, initial, scale }`, where `scale` defaults to `pace`. `fromX` maps with `scale`; scroll and seek keep using `pace`.

- [ ] **Step 1: Update the tests.** The two existing cases pass `linearPace(8)` and `linearPace(81.786)`, and expect `scale` to be that same object. Add: with `stepPace([12.92, 46.47, 89.87, 91.93], 96)` as pace and `{ scale: linearPace(96) }`, `timeAt(scrubOptions(96, pace, o).scale, 0.5)` is 48, and `timeAt(pace, 0.6)` is 89.87.
- [ ] **Step 2: Run** `bun test test/chapter`. Expected: FAIL.
- [ ] **Step 3: Implement.** Add `scale` to the `useGSAP` dependencies.
- [ ] **Step 4: Run** `bun test && bun run lint && bunx playwright test e2e/overtaking.spec.ts e2e/tyres.spec.ts e2e/car.spec.ts e2e/power-unit.spec.ts`. Expected: PASS, with no spec edited.
- [ ] **Step 5: Commit** `feat(guide): a replay's bar can keep true time while the scroll slows down`

### Task 3: The clay stills

**Files:**
- Create: `blender/car/duel.py`, `src/fight/pins.json`, `src/fight/pins.ts`, `public/defend/{switch,dive}-{light,dark}.webp`, `public/defend/{switch,dive}-phone-{light,dark}.webp`
- Modify: `blender/car/build.sh`, `blender/car/post.py`
- Test: `test/fight/assets.test.ts`

**Interfaces:**
- Produces: `pins: Record<'switch' | 'switchPhone' | 'dive' | 'divePhone', Record<string, readonly [number, number]>>` from `src/fight/pins.ts`, decoded with an Effect schema. Keys used later: `wide`, `dive`, `att`, `def` (switch); `mirror`, `axle` (dive).

Port `~/Developments/personal/lights-out-private/defending-2026-11-24/clay.py` without its comments; it made the approved renders. The approved settings, which replace the environment variables:

| View | Size | Settings |
|---|---|---|
| switch | 2880 × 1500 | DIST 80, TX 6, TY 0, IA 90, ID 92, CS 1.5 |
| switch-phone | 1170 × 1260 | DIST 72, TX 17, TY 2, IA 90, ID 94, CS 1.9 |
| dive | 2880 × 1900 | ortho 9.4 |
| dive-phone | 1170 × 1260 | ortho 9, camera turned −90° |

- [ ] **Step 1: Write the failing test** `test/fight/assets.test.ts`: all 8 files exist and are under 200 KB; `switch-*` have an alpha channel whose corner at (0, 0) is 0 (with `sharp`); every pin in `pins` is within 0 to 1, except `switchPhone`, which only needs `att` and `def`.
- [ ] **Step 2: Run** `bun test test/fight`. Expected: FAIL.
- [ ] **Step 3: Write `duel.py`** (`duel.py -- <view> <theme>` and `duel.py -- pins`) and extend `post.py` so `switch` keeps its alpha, `dive` is flattened, and both write WEBP at their render width (desktop 2400, phone 1170) into `public/defend`. `build.sh` runs the eight renders, the pins and the posts.
- [ ] **Step 4: Render only these** (`duel.py` runs, not the whole `build.sh`). Confirm `git status` shows no change under `public/car` or in `src/car/parts.json`.
- [ ] **Step 5: Look at** each still beside the Figma frames 489:1109 and 492:1118. They must match.
- [ ] **Step 6: Run** `bun test && bun run lint`. Expected: PASS.
- [ ] **Step 7: Commit** `feat(defending): Blender renders the switchback and the mirror rule in clay`

### Task 4: The page without the fight

**Files:**
- Create: `src/chapter/Defending.tsx`, `src/styles/defending.css`, `src/routes/chapters.defending.tsx`, `public/img/ch07.jpg`, `public/img/ch07-2800.jpg`, `public/img/ch07-podium.jpg`
- Modify: `src/chapter/words.ts`, `src/home/content.ts` (`PHOTOS.ch07`, `PHOTOS.ch07Podium`, `CHAPTERS`), `src/glossary/index.ts` (`LISTS`), `src/credits/photos.ts`, `src/routeTree.gen.ts` (regenerated)
- Test: `e2e/defending.spec.ts`, `e2e/home.spec.ts`, `e2e/power-unit.spec.ts` (the six-chapters checks), `test/glossary/index.test.ts`

The glossary test counts every word, so the words, `CHAPTERS` and `LISTS` land together here.

**Interfaces:**
- Consumes: Task 3's `pins`.
- Produces: `Defending()`; `DEFENDING_WORDS`; the nine new `WORDS` keys from the spec. `USED_ON` gets `ch07: 'Home, Chapters 06 and 07'` and `ch07Podium: 'Chapter 07'`.

- [ ] **Step 1: Find the photos.** Download the four `Lewis Hamilton George Russell F1 Cars (…).jpg` (Commons) and the "Podium celebration at the 2026 Australian Grand Prix" candidates at 500 px, match each to its Figma fill, then fetch the originals. `ch07.jpg` 1400 px, `ch07-2800.jpg` 2800 px, `ch07-podium.jpg` 2000 px wide. Record file page, author and licence in `PHOTOS`. Any licence other than the spec's: stop and tell Praffi.
- [ ] **Step 2: Write the failing e2e** (`desktop` and `phone` projects, after `loaded(page)` as in `power-unit.spec.ts`):
  - loads with no errors in light and dark; title `Defending · Lights Out`; h1 text `One move to defend.Then it's a race.`;
  - no horizontal overflow at the project's width and at 360 × 780; `hiddenText` is empty after `scrollToEnd`; every `.credit` is non-empty;
  - three rule rows, the third with class `payoff`; prices `['5', '10', '12']` from `.price .num` after `scrollToEnd`;
  - chips in `DEFENDING_WORDS` order with the spec's terms;
  - both stills have an `alt` and the current theme's file, and swap when the theme is toggled;
  - desktop shows four switch chips and the phone two, none overlapping another (`crowdedChips` pattern) and none outside the viewport;
  - opening each inline term shows a definition whose centre point belongs to the popover (`document.elementFromPoint`);
  - the last card reads `Next · Chapter 08 · 6 min` and has the `Soon` mark and no link; the hero nav links to `/chapters/power-unit`, and `08 The two championships` is marked `Soon`;
  - `?reduced`: nothing hidden;
  - Home reads `Seven chapters · 41 min` and its seventh row links to `/chapters/defending`; the menu has 7 chapter links with the theme switch fully in view (these replace the six-chapters checks in `home.spec.ts` and `power-unit.spec.ts`);
  - unit: `ENTRIES` gives `switchback` chapter `07`, `brakingZone` still `02`, `trackLimits` still `04`.
- [ ] **Step 3: Run** `bunx playwright test e2e/defending.spec.ts`. Expected: FAIL (404).
- [ ] **Step 4: Implement** the sections in the spec's order, leaving out the fight, with Chapter 06's `hero`/`motion` pattern. The motion is in the spec's "Rules that apply". Prices use `roll`. Chips are positioned with CSS custom properties from `pins`. Layout numbers come from the four Figma frames.
- [ ] **Step 5: Run** `bunx playwright test e2e/defending.spec.ts e2e/credits.spec.ts e2e/glossary.spec.ts && bun test && bun run lint`. Also `e2e/home.spec.ts` and `e2e/power-unit.spec.ts`. Expected: PASS. If the menu no longer fits, tighten its chapter rows; do not hide the theme switch.
- [ ] **Step 6: Check in the browser** at 1440 and 390 in both themes, against the frames and the 7 rules.
- [ ] **Step 7: Commit** `feat(guide): Chapter 07 explains the one-move rule, the switchback, the divebomb and what they cost`

### Task 5: The fight on the stage

**Files:**
- Create: `src/chapter/Fight.tsx`, `src/chapter/FightHud.tsx`
- Modify: `src/chapter/Defending.tsx`, `src/styles/defending.css`, `src/routes/chapters.defending.tsx` (adds `overtakingCss` for `.cast`)
- Test: `e2e/defending.spec.ts`

**Interfaces:**
- Consumes: all of Task 1; `useScrub(root, END, stops, pace, paint, { scale: linearPace(END), length: '+=500%' })`, `stops` = the step times and `pace = stepPace(stops, END)`; `CircuitStage` with `circuitFor('albert_park')`, `focus`, `turns: [{ turn: 1 }, { turn: 2 }, { turn: 3 }, { turn: 9 }]` and a `hud`.
- Produces: `Fight({ file, all, lead, info })`; root class `fight cast circuit`, `data-theme="dark"`.

- [ ] **Step 1: Write the failing e2e**, reusing `pinSpan`, `scrollTo`, `slider` and `now` from `overtaking.spec.ts` (move them to `e2e/fixtures.ts` and import them in both):
  - the label, headline and who-line match the spec; the credit names OpenF1 and race reports;
  - desktop: scrolling to 0.2, 0.4, 0.6, 0.8 and 1.0 of the pin lights 1, 2, 3, 4, 4 steps, and the board's first row reads `RUS`, `LEC`, `RUS`, `LEC`, `LEC` just past each; scrolling back to 0.3 gives step 1 and `RUS` again;
  - clicking the bar at its middle sets `aria-valuenow` to 48 ± 1; clicking at 10 % gives 9.6 ± 1;
  - keys: `End` gives `/step 4 of 4, The cut-back, Leclerc leads/`; `Home` gives `/^0\.0 s, before the first change/`; → reaches step 1;
  - the bar has five stretches whose widths are within 1 % of their share of 96 s; the pins are numbered 1 to 4 and do not overlap at 1470, 390 and 360;
  - the board and bar are inside the stage and the viewport at 390 and 360, and the pin's height equals the viewport's;
  - crossing the line: seeking 85, 85.5 … 87 s moves the Leclerc dot less than 200 px each time once `data-gl` is set;
  - `?reduced`: no `.pin-spacer`, 4 lit steps, value 96.0; without WebGL the poster shows and `End` works;
  - `.fight` text does not contain "inside".
- [ ] **Step 2: Run** it. Expected: FAIL.
- [ ] **Step 3: Implement `FightHud`** after `PassHud`: two dots, trails, tags, side-by-side within a car length (`CAR_M`), and the gap chip; no gates, no dashed line. Extract what is identical in `PassHud` (`normalAt`, the trail painter) to `src/chapter/hud.ts` and use it in both.
- [ ] **Step 4: Implement `Fight`** after `Replay`: the same `.cast` markup (title, chyron, board, slider). The bar replaces the timeline; the leader's row moves on top with `insertBefore`, as `Undercut` does. Every piece of text comes from the model.
- [ ] **Step 5: Run** `bunx playwright test e2e/defending.spec.ts e2e/overtaking.spec.ts && bun test && bun run lint`. Expected: PASS.
- [ ] **Step 6: Bar check, yourself, in the browser:** scroll it at 1440 and 390; compare with Chapter 02 and the references. One continuous camera, nothing colliding, 60 fps on the pin. Tune `camAt` and the HUD until it holds. **Checkpoint: send Praffi screenshots at 12.9, 46.5, 90 and 93.5 s at both sizes, and stop for their verdict.**
- [ ] **Step 7: Commit** `feat(guide): scrolling drives Russell and Leclerc's fight for the lead at Melbourne`

### Task 6: Chapter 06 leads on to Chapter 07

**Files:**
- Modify: `src/chapter/PowerUnit.tsx` (nav, `Next`), `src/credits/photos.ts` (`heroDark` becomes `Menu`)
- Test: `e2e/power-unit.spec.ts`, `test/credits/photos.test.ts`

- [ ] **Step 1: Update the tests first:** Chapter 06's nav links to `/chapters/defending` with `07 Defending`; its last card reads `Next · Chapter 07 · 6 min`, `Defending.`, link `/chapters/defending` (this replaces "ends with the weekend band"); `heroDark` is credited to `Menu` only.
- [ ] **Step 2: Run** `bunx playwright test e2e/power-unit.spec.ts && bun test test/credits`. Expected: FAIL.
- [ ] **Step 3: Implement** with the spec's "Wiring the guide in". `NextRace` stays: the glossary uses it.
- [ ] **Step 4: Run** `bunx playwright test && bun test && bun run lint && bun run build`. Expected: PASS; the build prerenders `/chapters/defending`. Known flakes under load (`home.spec:144`, `hero.spec:233`, `season.spec:141`) must pass alone.
- [ ] **Step 5: Commit** `feat(guide): The power unit leads on to Defending`

### Task 7: The crack at Turn 1

**Files:**
- Modify (only if needed): `blender/circuits/circuit.py`, `blender/circuits/broadcast.py`; `public/circuits/au-1953*`
- Test: an assertion in the build itself (the shipped glb is meshopt-packed, so Bun cannot read its vertices)

- [ ] **Step 1: Look** at the live stage at 90 to 92 s, at 1440 on a 2× screen. If no crack shows, skip to Step 6 and note it for the PR.
- [ ] **Step 2: Write the failing check:** after building the road, `build.py` asserts that every top face of the ribbon has an upward normal (`polygon.normal.z > 0`). Run it on a copy of the output paths for `au-1953`; it must fail.
- [ ] **Step 3: Fix the fold at its source:** where the local radius is smaller than the offset, the inner edge vertices collapse to the corner's inner point instead of crossing. Apply it in `ribbon` and, if it folds, in `strips`.
- [ ] **Step 4: Rebuild only** `./build.sh au-1953`, then the `au-1953` line of `inset.sh`. Expected: `git diff --stat` touches only `public/circuits/au-1953*`, `blender/circuits/au-1953.blend` and the scripts. `src/circuits/{lines,pins,insets}/au-1953.json` are byte-identical. If they are not, revert and stop.
- [ ] **Step 5: Run** `bun test && bunx playwright test e2e/lap.spec.ts e2e/hero.spec.ts e2e/weekend.spec.ts e2e/defending.spec.ts`. Look at `/lap/albert_park`. Expected: PASS and no visual change elsewhere on the lap.
- [ ] **Step 6: Commit** (if changed) `fix(circuits): Albert Park's road no longer cracks inside Turn 1`

### Task 8: Docs and the final check

**Files:**
- Modify: `DESIGN.md`, `docs/motion-map.md`, `docs/superpowers/specs/2026-11-07-f1-fan-site-design.md` (§8)

- [ ] **Step 1: Write** the DESIGN.md "The fight (Chapter 07)" entry, the motion-map switchback row (a still) and a fight row, and §8's note.
- [ ] **Step 2: Run** everything: `bun run lint && bun test && bun run build && bunx playwright test`. Record the counts.
- [ ] **Step 3: Final bar check** at 1440 and 390 in both themes, against landonorris.com and mercedesamgf1.com, with screenshots for Praffi.
- [ ] **Step 4: Commit** `docs(guide): the fight for the lead lives in Chapter 07`
- [ ] **Step 5: Hand back** with the facts list from the spec for sign-off. `sol-loop`, push and PR only on Praffi's word.
