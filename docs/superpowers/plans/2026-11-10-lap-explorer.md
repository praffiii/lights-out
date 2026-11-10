# Lap Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every circuit with a model gets a full-screen lap explorer at `/lap/<circuit>`, where a glowing light cruises the lap by itself and the visitor drives it with scroll, swipe, the timeline or the arrow keys.

**Architecture:**
- A pure drive model (`src/lap/drive.ts`) holds position, target and who is in control, and is unit-tested without WebGL.
- A lazy client component (`src/lap/Explorer.tsx`) loads the circuit's existing glb and map, paints them with `broadcast()`, and on every GSAP tick:
  - steps the drive model,
  - places a chase camera and the light,
  - writes the HUD through refs, with no React render per frame.
- The route page renders the static frame: poster, name, facts and close.
- The shell drops its header, menu, footer and Lenis on `/lap/*`.

**Tech Stack:** TanStack Start / Router, React 19, R3F 9 + three 0.187, GSAP ticker, Bun tests, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-10-lap-explorer-design.md`. The behaviour reference is the approved spike at `spikes/lap-explorer/` (untracked; read `main.ts` and `style.css` before Tasks 3–4).

## Global Constraints

- **Circuits:** interlagos, vegas, losail, yas_marina, albert_park (registry ids). There are no new assets and no Blender changes.
- **Drive constants** (from the spike Praffi approved):
  - `LAP_PX = 14000` (px of scroll per lap)
  - `SETTLE = 6` (per second)
  - `SNAP = 0.012` (lap fraction)
  - `SNAP_AFTER = 0.35` (s)
  - `PLAY_SECONDS = 48` (auto lap)
  - the cruise starts `1` s after the loader lifts and the model is ready
- **Camera:** 250 m back, 125 m up, 30 m to the side, looking 0.03 lap ahead, 44° FOV, 2.2 s intro swoop from the glb camera.
- **Control:** auto until the first scroll, swipe, timeline drag, tick tap or arrow key. It never resumes by itself; only the pill does that.
- **Copy:**
  - kicker `Lap explorer`
  - pill `Auto` / `You` / `Resume` (on hover while `You`)
  - hint `Scroll to drive · Tap a number to jump`, or `Swipe to drive · Tap a number to jump` without a fine pointer
  - speed label `Est. speed`
  - callout `T07` plus the corner name, or `Turn 7`
  - unknown page `No 3D lap for this circuit yet`
  - band link `Explore the lap in 3D`
- **Colours:** sector colours stay `S1 #A43BFF`, `S2 #2BD45E`, `S3 #F5C400` on background `#06080E`. Fonts are Archivo (expanded) and Martian Mono.
- The hero and band must render exactly as before.
- No code comments, no `as` (except `as const`), no `any`, no `!`. `bun run lint` is clean.
- Commits are conventional, present tense, with no Co-Authored-By trailer. Local only until Praffi says push.

## Review Focus

1. **The wheel on `/lap/*` must never scroll the page.** No Lenis, `overflow: hidden`, and `preventDefault` on wheel. Pinned in Task 2 (scrollY stays 0).
2. **Leaving mid-cruise and coming back.** The ticker and listeners are removed on unmount, so a second visit cruises at normal speed with no errors. Pinned in Task 3.
3. **Crossing the finish line in either direction.** Position wraps, the timeline head returns to the start, and S1 flashes again. Pinned in Task 1 (unit) and Task 3 (e2e backwards scroll across 0).
4. **Phone rotation or resize mid-lap.** The canvas and HUD follow, the light keeps its place, and there are no errors. Pinned in Task 4.
5. **Touch drag on the 3D view must never pull the page or trigger browser gestures.** `touch-action: none` on the stage. Pinned in Task 4.

---

### Task 1: The drive model and lap speeds

**Files:**
- Create: `src/lap/drive.ts`
- Modify: `src/circuits/lap.ts` (add `speed`)
- Test: `test/lap/drive.test.ts`, `test/circuits/lap.test.ts`

**Interfaces:**
- Produces:
  - `lapProfile(line, metresPerUnit)` now returns `{ seconds, uAt, speed }`, where `speed(u: number): number` is the modelled km/h at lap fraction `u` (the square root of that point's speed², × 3.6).
  - `drive.ts` exports:
    - `LAP_PX`, `SETTLE`, `SNAP`, `SNAP_AFTER`
    - `type Drive = { pos: number; target: number; mine: boolean; quiet: number }`
    - `wrap(x: number): number`, which returns a value in [0, 1)
    - `toward(from: number, lap: number): number`, the unwrapped copy of `lap` nearest to `from`
    - `push(d: Drive, px: number): Drive`, which sets `target += px / LAP_PX`, `mine = true`, `quiet = 0`
    - `seek(d: Drive, lap: number): Drive`, which sets `target = toward(d.pos, lap)`, `mine = true`, `quiet = 0`
    - `resume(d: Drive): Drive`
    - `step(d: Drive, dt: number, o: { cruise: number; holding: boolean; turns: ReadonlyArray<number>; settle: number }): Drive`
    - `nextTurn(u: number, turns: ReadonlyArray<number>, dir: 1 | -1): number`, which returns a signed lap distance
    - `turnLaps(points: ReadonlyArray<{ x: number; z: number }>, line: ReadonlyArray<LinePoint>): number[]`, which gives the `u` of each point's nearest line point

- [ ] **Step 1: Write the failing tests** in `test/lap/drive.test.ts`:

```ts
const at = (pos: number, mine = true): Drive => ({ pos, target: pos, mine, quiet: 0 })
const calm = { cruise: 0, holding: false, turns: [] as number[], settle: SETTLE }

it('one lap of scroll moves the target one lap', () => expect(push(at(0.2), LAP_PX).target).toBeCloseTo(1.2))
it('a scroll takes the wheel', () => expect(push(at(0, false), 10).mine).toBe(true))
it('stops where the scroll stops, with no drift', () => {
  let d = push(at(0), 1400)
  for (let i = 0; i < 300; i++) d = step(d, 1 / 60, calm)
  const held = d.pos
  for (let i = 0; i < 300; i++) d = step(d, 1 / 60, calm)
  expect(held).toBeCloseTo(0.1, 4)
  expect(d.pos).toBeCloseTo(held, 9)
})
it('cruises only while auto', () => {
  expect(step(at(0, false), 1, { ...calm, cruise: 0.02 }).target).toBeCloseTo(0.02)
  expect(step(at(0, true), 1, { ...calm, cruise: 0.02 }).target).toBe(0)
})
it('never hands control back by itself', () => {
  let d = push(at(0), 10)
  for (let i = 0; i < 600; i++) d = step(d, 1 / 60, calm)
  expect(d.mine).toBe(true)
  expect(resume(d).mine).toBe(false)
})
it('settles onto a turn it stops near, but not while held', () => {
  const near = { ...at(0.5), target: 0.505, quiet: 1 }
  expect(step(near, 1 / 60, { ...calm, turns: [0.51] }).target).toBe(0.51)
  expect(step(near, 1 / 60, { ...calm, turns: [0.51], holding: true }).target).toBe(0.505)
  expect(step(near, 1 / 60, { ...calm, turns: [0.53] }).target).toBe(0.505)
})
it('glides the short way across the finish line', () => {
  expect(seek(at(0.98), 0.02).target).toBeCloseTo(1.02)
  expect(wrap(-0.01)).toBeCloseTo(0.99)
})
it('finds the next and previous turn around the lap', () => {
  expect(nextTurn(0.9, [0.1, 0.5], 1)).toBeCloseTo(0.2)
  expect(nextTurn(0.1, [0.1, 0.5], -1)).toBeCloseTo(-0.6)
})
it('jumps instantly when settle is infinite', () => expect(step(push(at(0), 1400), 1 / 60, { ...calm, settle: Infinity }).pos).toBeCloseTo(0.1))
```

In `test/circuits/lap.test.ts`, add `it('reads the grip-limited speed on a circle', ...)`: `lapProfile(circle(100), 1).speed(0.3)` ≈ `Math.sqrt(44 * 100) * 3.6` (precision 0), and `circle(10000)` gives `92 * 3.6`.

In `test/lap/drive.test.ts`, add `it('places each turn at its nearest point on the line', ...)`: for `circle(100)` from the lap test, `turnLaps([{ x: 0, z: 100 }, { x: -100, z: 0 }], circle(100))` equals `[0.25, 0.5]`.

- [ ] **Step 2: Run them.** Run `bun test test/lap test/circuits/lap.test.ts`. Expected: FAIL, with `drive.ts` not found and `speed` not a function.
- [ ] **Step 3: Implement `drive.ts`, and `speed` in `lap.ts`** with the signatures above.
  - `step` cruises `target += o.cruise * dt` only when `!d.mine`.
  - When `d.mine && !o.holding && d.quiet + dt > SNAP_AFTER`, it moves `target` to the nearest `toward(target, turn)` within `SNAP`.
  - It sets `pos += (target − pos) × (1 − e^(−dt·settle))`, so an infinite settle lands exactly on `target`.
  - It adds `dt` to `quiet`.
  - `speed(u)` uses the nearest line index: `round(u × n) mod n`.
- [ ] **Step 4: Run them again.** Same command. Expected: PASS.
- [ ] **Step 5: Commit.** `feat(lap): a drive model turns scroll into lap position and settles on turns`

### Task 2: The `/lap/<circuit>` page takes over the screen

**Files:**
- Create: `src/routes/lap.$circuit.tsx`, `src/lap/LapPage.tsx`, `src/styles/lap.css`, `e2e/lap.spec.ts`
- Modify:
  - `src/circuits/registry.ts` (add `id`)
  - `src/shell/Shell.tsx` (bare mode)
  - `src/weekend/CircuitBand.tsx` (real link)
  - `vite.config.ts` (prerender five pages)
  - `test/circuits/registry.test.ts`, `test/weekend/circuit-band.test.tsx`

**Interfaces:**
- Consumes: `circuitFor`, `allCircuits`.
- Produces:
  - `CircuitInfo.id: string`, the registry key.
  - `LapPage({ circuit }: { circuit: string })` renders the static frame:
    - `<main class="lap">` with `data-mode="auto"`
    - the poster `/circuits/<model>.webp`
    - the kicker, the `h1` circuit name, and the sub line `<full name> · <length> km · <turns> turns`
    - a close button `aria-label="Close"`
    - a slot where Task 3 mounts the explorer
  - The shell exports nothing new; it reads `path.startsWith('/lap/')`.

- [ ] **Step 1: Write the failing tests.**
  - Unit (registry test): `it('names every circuit by its registry id', ...)`. For each `[id, info]` of `['interlagos','vegas','losail','yas_marina','albert_park']`, `circuitFor(id)?.id` equals `id`.
  - Unit (band test): `it('links Explore the lap in 3D to its circuit', ...)`. The `a` with text `Explore the lap in 3D` has `href` `/lap/interlagos`, and no `.is-soon` remains on it.
  - e2e, in `e2e/lap.spec.ts`:
    - **`the band opens the lap explorer for its circuit`:** on `/weekend`, click `Explore the lap in 3D`. Expect the URL to end in `/lap/interlagos`, `h1` to read `Interlagos`, and `.header`, `.footer` and `.menu` to have count 0.
    - **`close and Escape go back to the weekend page`:** from `/weekend`, open the explorer, press Escape, and expect `/weekend`. Open it again, click `Close`, and expect `/weekend`.
    - **`a direct visit closes to the weekend page`:** go to `/lap/vegas`, click `Close`, and expect `/weekend`.
    - **`every circuit has its own lap page`:** loop over the five ids. Expect `h1` to equal the registry name, with no errors.
    - **`an unknown circuit says there is no 3D lap yet`:** go to `/lap/monaco`. Expect the text `No 3D lap for this circuit yet` and a link to `/weekend`.
    - **`the wheel never scrolls the lap page`** (Review Focus 1): on `/lap/vegas`, scroll the mouse wheel 2000 px and expect `scrollY` to be 0.
- [ ] **Step 2: Run them.** Run `bun test test/circuits/registry.test.ts test/weekend/circuit-band.test.tsx` and `bunx playwright test e2e/lap.spec.ts`. Expected: FAIL (no `id`, link still `Soon`, route 404).
- [ ] **Step 3: Implement.**
  - **Registry:** build `byId` from `Object.entries(CIRCUITS).map(([id, c]) => [id, { ...c, id }])`.
  - **Route:**
    - `createFileRoute('/lap/$circuit')`, with head title `<name> lap · Lights Out` and stylesheet `#/styles/lap.css?url`.
    - The component renders `LapPage`.
  - **Shell bare mode:** skip `ReactLenis`, `Header`, `Menu` and `Footer` when `bare`, and keep `Loader`, `main` and the sweep.
  - **Close:** close and Escape use `useCanGoBack()`: `router.history.back()` when it is true, and otherwise `navigate({ to: '/weekend' })`.
  - **Band link:** `<Link to="/lap/$circuit" params={{ circuit: info.id }} className="mono explore">`.
  - **Prerender:** add the five `{ path: '/lap/<id>' }` pages.
  - **`lap.css`:**
    - `.lap` is fixed at `inset: 0`, with `overflow: hidden`, `background: #06080e` and `touch-action: none`.
    - The poster fills the screen with `object-fit: cover`.
    - HUD positions and type come from the spike's `style.css`.
- [ ] **Step 4: Run them again.** Same commands, plus `bun run lint`. Expected: PASS.
- [ ] **Step 5: Commit.** `feat(lap): each circuit opens a full-screen lap page from the weekend band`

### Task 3: The lap cruises, and the visitor drives it

**Files:**
- Create: `src/lap/Explorer.tsx`
- Modify: `src/lap/LapPage.tsx` (lazy-mount the explorer in a `CircuitGuard`, as `Hero.tsx` does), `src/styles/lap.css`, `e2e/lap.spec.ts`

**Interfaces:**
- Consumes:
  - Task 1's whole `drive.ts`, plus `lapProfile(...).speed` and `uAt`
  - `broadcast`, `isSector`, `screen`, `SECTORS` (shaders)
  - `modelUrl`, `mapUrl` (Circuit.tsx)
  - `onEnter` (motion), `waitFor` (Loader)
- Produces:
  - `default function Explorer({ info, onReady }: { info: CircuitInfo; onReady: () => void })`
  - DOM hooks used by tests:
    - `.lap[data-mode]` reads `auto` or `you`
    - `[data-km]` shows the distance text, `[data-speed]` the speed, `[data-sector]` the sector
    - `.lap .ticks button`, whose text is `01`…
    - `.lap .callout`, which shows `T05`
    - `.lap .mode`, the pill button

- [ ] **Step 1: Write the failing e2e tests** in `e2e/lap.spec.ts`. All use `/lap/vegas`, then a `lifted(page)` defined in the spec file as in `e2e/hero.spec.ts:9`, then `page.clock.runFor`.
  - **`cruises by itself once the loader lifts`:** `data-mode` is `auto`, and `[data-km]` grows between two reads 3 s apart.
  - **`a scroll takes the wheel and the light holds still`:** scroll the wheel 1400 px, run 2 s, read `[data-km]`, run 3 s more. Expect the same text and `data-mode` `you`.
  - **`tapping a turn number glides to that corner`:** click the tick `05`, run 2 s. Expect `.callout` to contain `T05`.
  - **`the right arrow glides to the next turn`:** stop the cruise with one wheel step, press ArrowRight, run 2 s. Expect `.callout` to be visible.
  - **`Resume hands the lap back to auto`:** wheel, then click `.mode`. Expect `data-mode` `auto`, and `[data-km]` grows again.
  - **`scrolling back across the line wraps to the end of the lap`** (Review Focus 3): wheel −1400 px at the start. Expect `[data-sector]` `S3` and `[data-km]` above `5`.
  - **`a second visit cruises at the normal pace`** (Review Focus 2): open `/lap/vegas`, close it, open it again, run 3 s. Expect `[data-km]` to grow between two reads, and no page errors or console errors from the first visit's ticker.
- [ ] **Step 2: Run them.** Run `bunx playwright test e2e/lap.spec.ts`. Expected: the new tests FAIL (no explorer).
- [ ] **Step 3: Implement `Explorer.tsx`.**
  - **Loading and scene:**
    - R3F `Canvas` (`frameloop="never"`, `flat`, `dpr={[1, 2]}`), driven by `gsap.ticker` as `Circuit.tsx` does.
    - Load the glb and `mapUrl(model, innerWidth < 900)` exactly as `Circuit.tsx` does, and call `waitFor` on both.
    - `broadcast()` paints them. `turnLaps` uses the world positions of the glb's `turn-*` nodes.
    - Speed and cruise come from `lapProfile(info.line, 1)`.
    - Cruise rate: `speed(u) / 3.6 / lapMetres × seconds / PLAY_SECONDS`.
  - **Light:** additive sprites, using the spike's head (34) and trail (16 sprites) values.
  - **HUD, timeline, chips, callout and flash:** the spike's markup and behaviour, with class names from the Produces list.
    - Ticks stagger to a second row when within `0.018` of a lower-row neighbour.
    - The ticker writes their text, widths and transforms through refs.
  - **Input:**
    - Wheel on `window` (`passive: false`, `preventDefault`) feeds `push`. Use the larger axis, and turn `deltaMode` 1 and 2 into px as the spike does.
    - Pointer drag on the canvas feeds `push` with `delta × LAP_PX / 2600`, and `holding` is true while the pointer is down.
    - Dragging the timeline feeds `seek`. Ticks and arrows feed `seek(pos + nextTurn(...))`, and the pill calls `resume`.
  - **Start:** `onEnter` plus model readiness start a 1 s delay, then the swoop and `drive.mine = false` cruising.
  - **Cleanup:** remove every listener and the ticker on unmount.
- [ ] **Step 4: Run them again.** Run `bunx playwright test e2e/lap.spec.ts` and `bun run lint`. Expected: PASS.
- [ ] **Step 5: Commit.** `feat(lap): the light cruises the lap and scroll, timeline and arrows drive it`

### Task 4: Phones, reduced motion and failure

**Files:**
- Modify: `src/lap/Explorer.tsx`, `src/lap/LapPage.tsx`, `src/styles/lap.css`, `e2e/lap.spec.ts`

- [ ] **Step 1: Write the failing e2e tests.**
  - **`reduced motion opens still on the overhead view`:** with `emulateMedia({ reducedMotion: 'reduce' })`, run 3 s. Expect `data-mode` `you` and `[data-km]` `0.00`. Click tick `05`, run 0.1 s, and expect `.callout` to contain `T05`, which proves the jump is instant.
  - **`a phone swipes to drive and loads the small map`** (phone project only):
    - The hint reads `Swipe to drive · Tap a number to jump`.
    - The requests include `-map-2048.webp` and not `-map.webp`.
    - A touch drag of 200 px up on the stage sets `data-mode` to `you`.
    - `getComputedStyle(stage).touchAction` is `none` (Review Focus 5).
  - **`rotating mid-lap keeps the light and the HUD`** (Review Focus 4): run 2 s, set the viewport to 844×390, run 1 s. Expect `[data-km]` to keep growing, the canvas width to equal 844, and no errors.
  - **`keeps the poster when the model never loads`:** route `**/circuits/*.glb` to never respond. Expect the poster visible, the `h1` visible, the close button working, and no errors.
- [ ] **Step 2: Run them.** Run `bunx playwright test e2e/lap.spec.ts`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
  - **Reduced motion** (`REDUCED`): start with `mine = true`, `settle: Infinity`, no swoop, and no callout or flash animation (`@media (prefers-reduced-motion: reduce)`).
  - **Hint:** chosen with `HOVER`.
  - **Phone CSS** (`max-width: 760px`): only the sector and speed panels, the timeline on its own full-width row, and smaller callout and flash.
  - **Fallback:** the poster stays until `onReady`. `CircuitGuard` failure keeps the poster and adds the note `The 3D lap could not load.`
- [ ] **Step 4: Run them again.** Run the full `bunx playwright test e2e/lap.spec.ts`, plus `bun run lint` and `bun test`. Expected: PASS.
- [ ] **Step 5: Commit.** `feat(lap): phones swipe the lap and reduced motion opens it still`

### Task 5: Proof and the design record

**Files:**
- Modify: `DESIGN.md`
- Delete: `spikes/lap-explorer/` (untracked)

- [ ] **Step 1: Capture each circuit and check the feel.** Capture `/lap/<id>` at 1440×900 DPR 2, mid-cruise in each sector, for all five circuits, plus the phone at 390×844. Look at every capture. If a circuit's chase camera clips buildings or loses the track in a hairpin, tune that circuit's constants. Any tuning becomes an optional `chase?: { back: number; rise: number }` on its registry entry; otherwise nothing is added.
- [ ] **Step 2: Update `DESIGN.md`.** Add a "Lap explorer" entry: the route, the takeover, auto-then-yours control, scroll as position, snapping, and the HUD parts. Add the rejected options with Praffi's reasons: the play button, momentum control, and auto-resume after 2 s.
- [ ] **Step 3: Run the whole suite.** Run `bun run lint`, `bun test` and `bunx playwright test`. Expected: all green except the known flakes listed in memory, each rerun alone.
- [ ] **Step 4: Commit and clean up.** Commit as `docs(lap): the design record covers the lap explorer`, then delete `spikes/lap-explorer/`.
