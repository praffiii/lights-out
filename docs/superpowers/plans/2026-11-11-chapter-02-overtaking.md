# Chapter 02, How overtaking works: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/chapters/overtaking`. It is the approved Figma mock with its sample replay replaced by a real 2026 São Paulo pass into Turn 1. The pass plays on the broadcast circuit stage and is scrubbed by scroll, drag and keys. Then wire Chapter 01, Home, the Menu and the weekend teaser to the new page.

**Architecture:**
- **The pass.** A one-off tool picks a qualifying pass from OpenF1 using pure, unit-tested rules. It aligns both cars to the Interlagos model with the existing `alignLap` and bakes a small JSON file into the repo.
- **The model.** A pure module turns that file and a few track constants into the four steps and the per-moment readouts, also unit-tested.
- **The stage.** The shared `CircuitStage` gains a HUD slot, so the chapter mounts its own two-dot overlay without touching the weekend band or Chapter 01's pole band.
- **The page.** Static copy and photos, reusing Chapter 01's words and next-chapter pieces.

One planned deviation from the spec, marked as a ruling in Task 4: without WebGL the replay shows no dots, because the dots' trace only exists in the GL projection.

**Tech Stack:** TanStack Start file routes, React 19, GSAP + ScrollTrigger (`#/motion/motion.ts`), Lenis (`lenis/react`), Effect (schema and `OpenF1Client`), `bun test`, Playwright (`e2e/`).

**Spec:** `docs/superpowers/specs/2026-11-11-chapter-02-overtaking-design.md`. Figma `IPkJZWQnY0IKdIjf6Nuugl`, nodes 39:2 (light) and 39:54 (dark).

## Global Constraints

- **Code:** no comments anywhere; no `as` casts except `as const`; no `any`; no non-null `!`. `bun run lint` must pass. There is no formatter, so match the existing style by hand: single quotes, no semicolons, a blank line between statements as in `src/weekend/*`.
- **Commits:** conventional, present-tense titles, with **no Co-Authored-By trailer**. Local commits only. No push, PR or deploy without Praffi's word.
- **Safety:** never write production KV. Never use bare `git stash`. The shell `head` command is broken, so use `sed -n`.
- **Media:** Wikimedia Commons CC0 / CC BY / CC BY-SA / public domain only, credited with the place and year. No OpenF1 `headshot_url`. No F1, FIA or team logos as graphics.
- **Never invent numbers.** Every number on the replay comes from the baked pass. The gap is shown to 0.1 s. The brake difference is rounded to 5 m and written "about N metres". There is no Battery column.
- **Rulebook copy (2026):**
  - Overtake Mode: within 1 s at the single detection point; +0.5 MJ; the energy comes on the next lap. The chaser keeps 350 kW to 337 km/h, while the leader tapers above 290 km/h.
  - Straight mode: front and rear wings open on the straights, for every car.
  - DRS: 2011 to 2025, fifteen seasons.
  - Interlagos: detection at the exit of Turn 12, activation after the Turn 13 kink, two straight-mode zones.
- **Display:** both themes; 390 px phones with no horizontal overflow; reduced motion hides nothing and pins nothing; one ease family (`launch`, `brake`). The replay section is `data-theme="dark"` in both themes.

## Review Focus

1. **Scroll and input fighting.** A visitor drags the handle mid-pin, then scrolls. Expected: the replay continues from where the drag left it and never jumps back. *(Task 4 e2e "a drag then a scroll continue from the same moment")*
2. **Arriving mid-pin.** Back navigation or a reload can restore the scroll position inside the pinned range. Expected: the dots, table and slider show that moment, not t = 0. *(Task 4 e2e "a reload inside the pin shows that moment")*
3. **No WebGL.** Expected: the poster still shows, the callouts, table and timeline still work, and there are no console errors. *(Task 4 e2e "without WebGL the replay still steps")*
4. **The baked file is edited or truncated.** Expected: decoding fails loudly at test time, never a silent empty replay. *(Task 2 test "the baked pass decodes and every step exists")*
5. **The weekend band and Chapter 01's pole band after the HUD slot.** Expected: unchanged. *(Task 4: `e2e/weekend.spec.ts` and `e2e/chapter.spec.ts` stay green)*

---

### Task 1: Pick and bake the pass

**Files:**
- Create: `src/pass/schema.ts`, `src/pass/pick.ts`, `src/pass/interlagos.ts`, `tools/pass.ts`, `src/pass/pass.json` (generated), `test/pass/pick.test.ts`, `test/fixtures/pass/` (trimmed OpenF1 responses)
- Modify: `src/season/openf1-client.ts` (add `overtakes`, `pits`, `intervals`), `src/pole/schema.ts` (export the row tuple schema as `TelemetryRow`)

**Interfaces:**
- Produces:
  - `src/pass/schema.ts`: `PassFile`, an Effect `Schema.Struct`:
    ```
    { session: number, race: string, year: number, lap: number, position: number,
      lengthM: number,
      chaser: Car, leader: Car }
    Car = { code: string, name: string, team: string, rows: Array<TelemetryRow> }
    ```
    `TelemetryRow` is `[t, u, speed, gear, throttle, brake]`. `t` is in seconds from the window start. `u` is unwrapped: it goes above 1 after the line.
  - `PassFileJson = Schema.fromJsonString(PassFile)`. Also the OpenF1 response schemas `OvertakesResponse`, `PitResponse` and `IntervalsResponse`.
  - `src/pass/interlagos.ts`: `MARKS = { detection, activation, zones, apex } as const`, all in unwrapped `u` on the `br-1940` line:
    - `zones`: `ReadonlyArray<readonly [number, number]>`, the two straight-mode zones;
    - `apex`: the Turn 1 apex, which is > 1.
  - `src/pass/pick.ts`:
    - `type Candidate = { lap, position, chaser: Side, leader: Side, gapAtDetection: number | null, intervalNear: number | null, levelT: number | null, brakeT: { chaser: number, leader: number } | null, brakeGapM: number | null, aligned: boolean }`
    - `type Side = { number, team, pitted: boolean, slicks: boolean }`
    - `reject(c: Candidate): string | null`, which returns the first failing rule's reason;
    - `best(cs: ReadonlyArray<Candidate>): Candidate | null`, which returns the passing candidate with the lowest `position`.

- [ ] **Step 1: Check the rules first.** Read the 2026 FIA Sporting and Technical Regulations, and the São Paulo 2026 event notes if they are public. Confirm:
  - the 1 s threshold;
  - that the energy comes on the next lap;
  - the detection and activation points, and the two straight-mode zones.

  Write one `Ruling:` ledger line per fact that differs from the Global Constraints. If a step of the story cannot be true (for example, the energy only arrives a full lap after detection), **stop and ask Praffi**.

- [ ] **Step 2: Write the failing tests** in `test/pass/pick.test.ts`, on a hand-built passing `Candidate` plus one-field variations:
  - `accepts a clean pass` → `reject(ok)` is `null`
  - `rejects lap 1` → `/lap/`
  - `rejects a pit on the lap or the lap before` → `/pit/`
  - `rejects intermediates or wets` → `/slicks/`
  - `rejects team-mates` → `/team/`
  - `rejects a gap over 0.9 s at detection` → for 0.91, `/detection/`; 0.9 passes
  - `rejects a gap that disagrees with intervals by more than 0.3 s` → `/intervals/`
  - `rejects drawing level after braking` → `levelT > brakeT.chaser`, `/level/`
  - `rejects braking less than 15 m later` → 14.9 m, `/brake/`; 15 passes
  - `rejects a lap that does not align` → `/align/`
  - `best picks the highest position` → [P9, P4, P7] all passing → P4; all failing → `null`

- [ ] **Step 3: Run it and watch it fail**

  Run: `bun test test/pass/pick.test.ts`. Expected: FAIL, because the module is missing.

- [ ] **Step 4: Implement `reject` and `best`** in `src/pass/pick.ts`, with the limits as named constants: `LAP_MIN = 2`, `GAP_MAX = 0.9`, `INTERVAL_TOLERANCE = 0.3`, `BRAKE_MIN_M = 15`. Then run the tests. Expected: PASS.

- [ ] **Step 5: Place `MARKS` on the model.** Use the `br-1940` line (`src/circuits/lines/br-1940.json`) and the turn positions the stage computes (`replay.turns`, in `turnLaps` order). Set:
  - `detection` at the Turn 12 exit;
  - `activation` just after the Turn 13 kink;
  - the two zones from the FIA map, or, if no map is published, the main straight (Turn 15 exit to Turn 1 braking) and the back straight (Turn 3 exit to Turn 4 braking), with a `Ruling:` line;
  - `apex` at Turn 1 (+1).

  Values that need the stage running wait for Task 4. Log them in the ledger.

- [ ] **Step 6: Add the OpenF1 reads** to `OpenF1Client`, following the existing `empty(get(...))` pattern:
  - `overtakes(key)` → `/overtakes?session_key=`
  - `pits(key)` → `/pit?session_key=`
  - `intervals(key, driver, from, to)` → `/intervals?session_key=&driver_number=&<window>`

- [ ] **Step 7: Write `tools/pass.ts`** (style of `tools/pole-laps.ts`). It has two modes:
  - `bun tools/pass.ts --list` builds a `Candidate` for every session-11412 overtake whose position change lands between the line and Turn 2. That is 0.5–9 s after the overtaking driver's `date_start` on the lap; the 2026-11-11 recon found these at about 4–5 s. It prints one line per candidate: the `reject` reason or `ok`, then the `best` one.
  - `bun tools/pass.ts --lap N --chaser A --leader B --out src/pass/pass.json` aligns both cars and writes the file.

  Details:
  - Align each car's lap N−1 and lap N with `alignLap`, using `info.line` and `info.cuts` for `br-1940`.
  - Join the two laps: lap N's `t` + lap N−1's time, and lap N's `u` + 1.
  - Cut the window from `crossTime(chaser, MARKS.detection) − 1` to `crossTime(chaser, MARKS.apex) + 0.5`, and rebase `t` to 0.
  - `lengthM` is `info.facts.lengthKm × 1000`.
  - The tool uses the Task 2 helpers `crossTime` and `brakeOnset` to fill a `Candidate`. Write those two helpers first if needed: they are Task 2's code, so move them forward and record the move as a ledger `Ruling:`.

- [ ] **Step 8: Run `--list`, pick the pass, bake it.** If no candidate is `ok`, **stop and ask Praffi**, with the printed list.

  Otherwise, before baking, check the pass against a race report or the broadcast: same lap, same drivers, into Turn 1. Then bake it and record the chosen pass and its numbers in the ledger.

- [ ] **Step 9: Commit**

```bash
git add src/pass src/season/openf1-client.ts src/pole/schema.ts tools/pass.ts test/pass test/fixtures/pass
git commit -m "feat(guide): a real São Paulo 2026 pass into Turn 1 is picked by the rules and baked for chapter 02"
```

---

### Task 2: The replay model

**Files:**
- Create: `src/pass/model.ts`, `test/pass/model.test.ts`
- Modify: `src/pole/replay.ts` (extract `sampleRows`)

**Interfaces:**
- Consumes: `PassFile`, `TelemetryRow`, `MARKS` (Task 1).
- Produces, in `src/pass/model.ts`:
  - `crossTime(rows, u: number): number | null`, the interpolated `t` where unwrapped `u` first reaches the target;
  - `brakeOnset(rows, from: number, to: number): { t: number; u: number } | null`, the first brake-on row between `from` and `to`, taken at the midpoint with the row before it;
  - `type Step = { n: 1 | 2 | 3 | 4; t: number; title: string; text: string }`;
  - `steps(pass: PassFile): readonly [Step, Step, Step, Step] | null`;
  - `type Readout = { speed: number; gear: number; gap: string; mode: 'Straight' | 'Corner' | 'Overtake'; cells: number; brake: boolean }`;
  - `readout(pass, t): { chaser: Readout; leader: Readout; u: { chaser: number; leader: number } }`;
  - `stepAt(steps, t): 0 | 1 | 2 | 3 | 4`, where 0 means before step 1;
  - `prevStep(steps, t): number` and `nextStep(steps, t): number`, which return the target `t`;
  - `sliderText(steps, t): string`, for example `13.6 s, step 3 of 4, Out of the tow`;
  - `CAR_M = 5.5`, the car length in metres.
- In `src/pole/replay.ts`: `sampleRows(rows, t)` returns `{ u, speed, gear, throttle, brake }` with `u` unwrapped. `sampleAt` calls it and wraps `u`, so its behaviour is unchanged.

- [ ] **Step 1: Write the failing tests** in `test/pass/model.test.ts`, on small synthetic rows plus the baked file:
  - `crossTime interpolates between samples`: rows u 0.5 at t 0 and 0.6 at t 1 → `crossTime(rows, 0.55)` is 0.5. A target beyond the rows gives `null`.
  - `brakeOnset takes the midpoint of the first brake-on row`: rows `[t 1, brake 0]`, `[t 1.27, brake 100]` → t 1.135.
  - `step 1 copy carries the detection gap to 0.1 s`: `"0.6 s behind at the detection point. That unlocks Overtake Mode for the straight."` for a 0.62 s gap.
  - `step 4 rounds the brake gap to 5 m`: 17 m → `"Inside line for Turn 1, braking about 15 metres after the leader."`
  - `steps run in order`: `t1 < t2 < t3 < t4`.
  - `the gap shows on the car behind and flips at the pass`: before step 3 the leader reads `Ahead` and the chaser reads `0.4 s`; after the pass the reverse.
  - `mode`: `Straight` inside a zone; `Corner` outside one; `Overtake` for the chaser between `activation` and `apex` (only when the detection gap ≤ 1.0, and never for the leader).
  - `cells`: throttle 0 / 50 / 100 → 0 / 3 / 5 (`Math.round(throttle / 20)`). `brake: true` when brake > 0.
  - `prevStep / nextStep`: from just after step 2 → step 2's t and step 3's t; before step 1 → 0 and step 1's t; after step 4 → step 4's t and the last row's t.
  - `sampleAt is unchanged`: the existing `test/pole/replay.test.ts` stays green.
  - `the baked pass decodes and every step exists`: `Schema.decodeUnknownSync(PassFile)` on `src/pass/pass.json` succeeds and `steps(pass)` is not `null`.

- [ ] **Step 2: Run it and watch it fail**

  Run: `bun test test/pass/model.test.ts`. Expected: FAIL, because the module is missing.

- [ ] **Step 3: Implement it.** The step copy is fixed by the spec:
  1. `Within one second` · `${gap.toFixed(1)} s behind at the detection point. That unlocks Overtake Mode for the straight.`
  2. `Overtake Mode` · `Extra electric power, for longer, all the way up the hill.`
  3. `Out of the tow` · `Clean air, nose alongside.`
  4. `Brake later` · `Inside line for Turn 1, braking about ${Math.round(m / 5) * 5} metres after the leader.`

  Step times:
  - step 3 is the first `t` where `(leaderU − chaserU) × lengthM ≤ CAR_M`, with `CAR_M = 5.5`;
  - step 4 is the chaser's `brakeOnset` between `1` and `MARKS.apex`.

  `gap`: whichever car has the smaller `u` gets `t − crossTime(other, its u)`, as `x.x s`. The other gets `Ahead`.

- [ ] **Step 4: Run `bun test`.** Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/pass/model.ts src/pole/replay.ts test/pass/model.test.ts
git commit -m "feat(guide): the overtaking replay derives its four steps and readouts from the baked pass"
```

---

### Task 3: The chapter page

**Files:**
- Create:
  - `src/chapter/Overtaking.tsx` (the page);
  - `src/chapter/Words.tsx` (moved out of `RaceWeekend.tsx`, taking `keys`);
  - `src/chapter/Next.tsx` (the next-chapter card);
  - `src/routes/chapters.overtaking.tsx`;
  - `src/styles/overtaking.css`;
  - `public/img/ch02-straight.jpg`, `ch02-turn1.jpg`, `ch02-exit.jpg`, `ch02-tow.jpg`;
  - `e2e/overtaking.spec.ts`.
- Modify:
  - `src/chapter/words.ts` (add the ten terms; `CHAPTER_WORDS` becomes `RACE_WEEKEND_WORDS`, plus `OVERTAKING_WORDS`);
  - `src/chapter/RaceWeekend.tsx` (use `Words` and `Next`);
  - `src/home/content.ts` (`PHOTOS.ch02Straight`, `ch02Turn1`, `ch02Exit`, `ch02Tow`).

**Interfaces:**
- Produces:
  - `Words({ keys }: { keys: ReadonlyArray<WordKey> })`;
  - `Next({ n, min, title, line, photo, to }: { n: string; min: number; title: string; line: string; photo: Photo; to: ChapterPath | null })`, which renders `Soon` when `to` is `null`;
  - the route `/chapters/overtaking` with title `How overtaking works · Lights Out`.
- The `<section className="replay">` placeholder is filled by Task 4.

- [ ] **Step 1: Find the photos** on Commons, checking that each licence is CC BY or CC BY-SA:
  - Morio's 2017 Malaysian GP set: Verstappen and Hamilton side by side with sparks on the straight, the Turn 1 pass, and the exit;
  - Der Alf's 2026 Spa shot of two Haas cars nose to tail.

  The Figma fills on 39:2 (`photo:ot-1/2/3`, `photo:haas-tow`) show which shots they are. Resize to the site's existing JPEG sizes. If a shot isn't on Commons under a valid licence, use the closest valid one and add a `Ruling:` line.

- [ ] **Step 2: Write the failing e2e tests** in `e2e/overtaking.spec.ts` (same `loaded` / `chapter` helpers as `e2e/chapter.spec.ts`):
  - `loads with no errors, light | dark` → h1 text `Every pass starts longbefore the corner.`; `errors` is empty.
  - `no horizontal overflow at 390` (phone project) → `scrollWidth − clientWidth ≤ 0`.
  - `every photo is credited` → `.chapter-page figure` and the frames each have a credit line containing `CC BY`.
  - `a word chip opens its definition` → click the `Overtake Mode` chip → the note contains `Overtake Mode`.
  - `the hero nav leads back to chapter 01` → `← 01 A race weekend` has href `/chapters/race-weekend`, and `03 Tyres and strategy` is `Soon`.
  - `the DRS table lists three tools` → rows `DRS`, `Straight mode`, `Overtake Mode`.

- [ ] **Step 3: Run it and watch it fail**

  Run: `bunx playwright test e2e/overtaking.spec.ts`. Expected: FAIL (404).

- [ ] **Step 4: Build the page**, top to bottom with the spec's copy. Root is `<div className="chapter-page overtaking-page">`.
  - **Hero** `.opening`: the label; the nav (`Go` to Chapter 01, `Soon` for 03); the headline in two `.hl` spans; the intro.
  - **Baku** `figure.photo-band` (`PHOTOS.ch02`).
  - **`.frames`**: one big photo and two small ones, each with a `01 · The straight`-style mono label and caption, plus the side copy and one credit line.
  - **`section.replay`**: a placeholder with the header copy only.
  - **`.air`**:
    - the Haas photo, with three `.callout` chips (dot, leader line, chip) at the mock's positions, as % of the photo;
    - the caption block;
    - the `Tow.`, `Dirty air.` and payoff rows (`.payoff` fills purple).
  - **`.rules`**:
    - the ghost `DRS` (`aria-hidden`), a strike bar `<i className="strike">`, the caption, and the headline with its copy;
    - a `<table>` with the three rows, `Until 2025` and `New` tags.
  - **Words** (`OVERTAKING_WORDS`).
  - **`Next`**: `n '03'`, `min 7`, `Tyres and strategy.`, `Why one pit stop can win a race`, `PHOTOS.ch03`, `to: null`.

  Body copy uses `Term` for: tow, slipstream, dirty air, detection point, Overtake Mode, straight mode, active aero, braking zone, inside line, DRS.

- [ ] **Step 5: Add motion** with the existing helpers, as in `RaceWeekend.tsx`'s `motion()`:
  - `sweep` the hero lines, then the label;
  - `reveal` the photos;
  - fade the bodies up 24 px;
  - the callouts one at a time: dot (`scale` from 0), leader line (`scaleY` from 0), chip (`block`);
  - the rows rise, and `.payoff` fills purple last (`block` with `delay`);
  - the strike bar draws with `scaleX` 0 → 1 over 0.9 s on the `brake` ease;
  - the table rows rise;
  - `wipe` the next photo.

  With `REDUCED`, everything is visible with no tweens.

- [ ] **Step 6: Add the CSS** in `src/styles/overtaking.css`, scoped to `.overtaking-page`, using the shared `chapter.css` rules for the hero, photo band, words and next card. The ghost `DRS` sits at the mega size in `--ghost`. At ≤ 760 px:
  - the frames stack;
  - the Haas callouts become numbered dots plus an `<ol>` under the photo;
  - the air rows stack;
  - the table becomes one card per tool (`display: grid` rows, with `th` hidden and a `data-label` per cell).

- [ ] **Step 7: Run all the checks.**

  Run: `bunx playwright test e2e/overtaking.spec.ts e2e/chapter.spec.ts && bun test && bun run lint`. Expected: all pass. Chapter 01 is unchanged by the `Words` and `Next` move.

- [ ] **Step 8: Commit**

```bash
git add src/chapter src/routes/chapters.overtaking.tsx src/routeTree.gen.ts src/styles/overtaking.css src/home/content.ts public/img e2e/overtaking.spec.ts
git commit -m "feat(guide): chapter 02 teaches overtaking with three frames, the tow and the end of DRS"
```

---

### Task 4: The replay section

**Files:**
- Create: `src/chapter/Replay.tsx` (header, stage, table, timeline, scroll/drag/keys) and `src/chapter/PassHud.tsx` (segment, detection mark, two dots, callouts)
- Modify:
  - `src/weekend/CircuitStage.tsx` (HUD slot and turn filter);
  - `src/chapter/Overtaking.tsx` (mount `Replay`);
  - `src/styles/overtaking.css`;
  - `src/pass/interlagos.ts` (any `MARKS` left from Task 1 step 5);
  - `e2e/overtaking.spec.ts`.

**Interfaces:**
- `CircuitStage` gains optional props, and its behaviour without them is unchanged:
  - `hud?: (ctx: { stage: RefObject<HTMLDivElement | null>; replay: Replay; ready: boolean }) => ReactNode`. When given, it renders in place of `PoleHud`. The toggles and the "Explore the lap in 3D" link are left out. `replay` goes to `Circuit` even without a lap, and the HUD owns `replay.running`.
  - `turns?: ReadonlyArray<{ turn: number; name?: string }>`. When given, only these pins render, each with its name (`12` · `Junção`, `1` · `S do Senna`).
- `PassHud({ pass, stage, replay, time }: { pass: PassFile; stage; replay: Replay; time: RefObject<number> })`:
  - It draws on rAF while `replay.running`, reading `time.current`.
  - It uses `pointAt(trace, u)` from `#/pole/replay.ts`. When the cars are within `CAR_M`, it offsets them ±6 px along the screen normal of the trace at that point.
  - It draws the dashed segment from `MARKS.detection − 0.03` to `MARKS.apex` as an SVG polyline over the trace.
  - The detection tick gets `data-on` once the chaser has crossed it. A `Start / finish` label sits at `u = 1`.
  - **Ruling (planned):** without WebGL there is no `trace`, because it only comes from the GL projection, so the dots and the segment are not drawn over the poster still. The callouts, table and timeline still work. The spec asked for dots there too. Drawing them would need a poster-space trace from the Blender pipeline, which is out of scope. Cost if wrong: a pipeline export later.
  - Each callout gets `data-step` and `data-lit` when `stepAt ≥ n`.
- `Replay({ pass }: { pass: PassFile })`: the whole section. `time` is the single source of truth (`useRef(0)`).

**How time moves:**
- **Without `REDUCED`:** a `ScrollTrigger` pins `.replay .pin` (`end: '+=250%'`, `scrub: true`). `onUpdate` sets `time.current = progress × end` and the slider text.
- **Drag and keys:** dragging the handle, or pressing ←/→ (`prevStep` / `nextStep`) or Home/End, turns the target `t` into a scroll position (`st.start + (t / end) × (st.end − st.start)`). It scrolls there with `lenis.scrollTo(y, { immediate: true, force: true })`, falling back to `window.scrollTo` when there's no Lenis. So the scroll stays the only writer, and nothing fights.
- **With `REDUCED`:** no pin; inputs write `time.current` directly; it starts at the last row's `t`, with every callout lit.
- **Table and slider:** written from `readout` on each update. The slider is `role="slider"` with `aria-valuemin 0`, `aria-valuemax end` (to 0.1), `aria-valuenow` and `aria-valuetext = sliderText`.

- [ ] **Step 1: Write the failing e2e tests** in `e2e/overtaking.spec.ts`:
  - `the replay names the real pass` → the label contains `São Paulo 2026 · Lap`, and the credit contains `Telemetry: OpenF1 (unofficial)`.
  - `scrolling through the pin lights the steps in order` (desktop) → scroll in 4 increments. `[data-step][data-lit]` counts never decrease and reach 4. The chaser dot's `translate` changes.
  - `the slider steps with the keys` → focus the slider, press `End`, and `aria-valuetext` contains `step 4 of 4, Brake later`. Then `Home` → `0.0 s`. Then `ArrowRight` → `step 1 of 4, Within one second`.
  - `a drag then a scroll continue from the same moment` → drag the handle to 50 %, read `aria-valuenow` = a, scroll 40 px down, and `aria-valuenow` ≥ a.
  - `a reload inside the pin shows that moment` → scroll to 60 % of the pin, reload, and `aria-valuenow` > 0.
  - `reduced motion opens on the last frame, unpinned` (`?reduced`) → 4 lit callouts, `aria-valuetext` contains `step 4 of 4`, and no `.pin-spacer` in `.replay`.
  - `without WebGL the replay still steps` → `page.addInitScript` makes `HTMLCanvasElement.prototype.getContext` return `null` for `webgl`/`webgl2`. The poster is visible, `End` gives `step 4 of 4`, and `errors` is empty.
  - `the table drops Battery and footnotes Overtake Mode` → no `Battery` header, and the footnote contains `Teams don't publish when a driver presses it.`
- [ ] **Step 2: Run them and watch them fail.**

  Run: `bunx playwright test e2e/overtaking.spec.ts -g "replay|pin|slider|drag|reload|reduced|WebGL|Battery"`. Expected: FAIL.

- [ ] **Step 3: Add the `CircuitStage` slot and filter**, then run `bunx playwright test e2e/weekend.spec.ts e2e/chapter.spec.ts`. Expected: still green.

- [ ] **Step 4: Build `PassHud` and `Replay`**, and finish `MARKS` with the stage running (log the values in the ledger).
  - **Callouts:** at the mock's spots, as % of the stage on desktop. At ≤ 760 px they become a numbered `<ol>` under the stage, with the stage using the band's 4:5 framing.
  - **Corner note:** `Flat out from Junção to Turn 1 · about 1.2 km`. Use the real distance `(MARKS.apex − MARKS.detection) × lengthM` rounded to 0.1 km if it isn't 1.2, and match the headline to it.
  - **Table:** Car, Speed, Gap, Gear, Mode, Throttle (five cells, or `Brake` in purple), plus the footnote.
  - **Timeline:** the played bar, the handle and the four step pins at `t / end`, plus the hint `Drag the timeline, or use ← → to step through it.`
- [ ] **Step 5: Run every check.**

  Run: `bun run lint && bun test && bunx playwright test`. Expected: all pass, apart from the known flakes on main (`weekend.spec.ts:363` phone, `lap.spec.ts` "closing returns…", `sections.spec.ts:71`). Re-run any of those alone to confirm they are flakes.

- [ ] **Step 6: Commit**

```bash
git add src/chapter src/weekend/CircuitStage.tsx src/pass/interlagos.ts src/styles/overtaking.css e2e/overtaking.spec.ts
git commit -m "feat(guide): the overtaking replay scrubs a real pass on the Interlagos stage by scroll, drag and keys"
```

---

### Task 5: Wire the guide in

**Files:**
- Modify:
  - `src/home/content.ts`: `CHAPTERS[1].to = '/chapters/overtaking'`, `min: 5`.
  - `src/chapter/RaceWeekend.tsx`: the hero's `02 How overtaking works` and the `Next` card's link become `Go` to `/chapters/overtaking`.
  - `src/weekend/Teaser.tsx`: label `Next · How F1 works · Chapter 02`; headline "Watch the pass / at Turn 1."; photo `PHOTOS.ch02`; `Go` `Read` to `/chapters/overtaking`.
  - `docs/motion-map.md`: the "Overtaking replay map" row adds "Drag the timeline or ← → to step; the scroll follows."
  - `e2e/home.spec.ts`, `e2e/weekend.spec.ts`, `e2e/chapter.spec.ts`.

- [ ] **Step 1: Write the failing e2e tests**
  - `Home's chapter 02 row leads to chapter 02` → `.rows li:nth-child(2) a` has href `/chapters/overtaking`.
  - `chapter 01 leads on to chapter 02` → both the hero nav and the next card link to `/chapters/overtaking`, and clicking the card reaches the h1.
  - `the teaser leads to chapter 02` → `.weekend-page .teaser` `Read` has href `/chapters/overtaking`. This replaces "the teaser leads to chapter 01".
- [ ] **Step 2: Run them and watch them fail.**

  Run: `bunx playwright test e2e/home.spec.ts e2e/weekend.spec.ts e2e/chapter.spec.ts -g "chapter 02"`. Expected: FAIL.
- [ ] **Step 3: Make the edits** listed under Files.
- [ ] **Step 4: Run every check.**

  Run: `bun run lint && bun test && bunx playwright test`. Expected: all pass, apart from the known flakes.
- [ ] **Step 5: Commit**

```bash
git add src/home/content.ts src/chapter/RaceWeekend.tsx src/weekend/Teaser.tsx docs/motion-map.md e2e
git commit -m "feat(guide): chapter 01, Home's chapter 02 row and the weekend teaser open chapter 02"
```

---

### Task 6: Proof and review

- [ ] **Step 1:** Run `bun run lint && bun test && bunx playwright test`. Everything should be green. Save the output to the workspace.
- [ ] **Step 2:** Take live screenshots of `/chapters/overtaking` at 1440 and 390, in light and dark, top to bottom. Include the replay at steps 1 and 4 and the reduced-motion still. Save them in the scratchpad, not the repo, and delete any `.playwright-mcp/` folder the browser tools leave in the worktree.
- [ ] **Step 3:** Run the final whole-branch review (executing-plans), then the `sol-loop` skill. Record what each round changed. The final round re-checks the head with no code changes.
- [ ] **Step 4:** Report to Praffi with the screenshots and the chosen pass, then stop. Push, PR and deploy wait for Praffi's word.
