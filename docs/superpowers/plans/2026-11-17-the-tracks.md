# The tracks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/tracks`, an index of every 2026 circuit drawn at one scale with this weekend's circuit lit, and `/tracks/vegas`, the first circuit page. Its braking numbers are read live from the stored pole lap.

**Architecture:**
- **The index** is a Blender still: one cool base image plus a small hot patch per circuit. The page lays this weekend's patch over the base, using pixel boxes from `src/tracks/sizes.json`, and adds HTML labels.
- **The circuit page** reuses the weekend band's `CircuitStage`. It adds place tags and a braking section that a pure module (`src/tracks/braking.ts`) computes from the pole lap, which the site already serves at `/api/pole/<circuit>`.
- **Turn positions:** braking names turns by lap position, so each circuit's pins JSON gains a `laps` map that Blender writes. No new Worker route, KV key or request.

**Tech Stack:** TanStack Start routes, React, plain CSS, GSAP via `#/motion/motion.ts`, Effect Schema, Blender 5.2 headless (`/Applications/Blender.app/Contents/MacOS/Blender -b -P`), `bun test`, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-17-the-tracks-design.md`.
- Mocks are in Figma `IPkJZWQnY0IKdIjf6Nuugl`:
  - index: 201:434 / 202:443 (desktop), 205:461 / 205:814 (phone);
  - Las Vegas: 416:893 / 420:902 (desktop), 421:911 / 421:1149 (phone).
- The 2026-11-17 pipeline files are in `~/Developments/personal/lights-out-private/pipeline-2026-11-17/`: `sizes_glow.py`, plus `vegas/` with `commons-meta.json`, `ph-pins.json` and the mock crops.

## Global Constraints

- Zero cost: no new dependency, Worker route, KV key, OpenF1 request or service.
- **Code rules:**
  - No comments in any file, Python included.
  - No `as` casts except `as const`, no `any`, no non-null `!`.
  - `bun run lint` passes.
- **Never invent a number.** Every number comes from `CALENDAR`, the registry, the season snapshot or the pole lap, or it is a dated historic fact listed in the spec's "Facts to verify".
- **Circuit sections stay dark (`#06080E`) in both themes.** These are the sizes band and the Read the lap band.
- **Reduced motion:** everything is visible and nothing moves. Stats show their final values.
- **No sideways page scroll** at 390 px or 1470 px.
- **Prerender:** add `/tracks` and `/tracks/vegas` to `pages` in `vite.config.ts`.
- **Commits:** local only, conventional, written as the new behaviour, with no Claude trailer. Commit on branch `feat/tracks`. No push without Praffi's word.
- **Deviations from the spec, all small:**
  - **Unknown circuit ids.** The site has no 404 page, so `/tracks/<id>` with no page renders a "missing" section, following `LapPage`.
  - **The Warwick credit** is stored as `Video still, author unknown · Public domain`, so that `creditParts` can read it.
  - **Braking thresholds** are a 0.5 s join and a 0.3 s floor. These give 6 zones on the stored wet 2025 Las Vegas pole lap.
  - **The braking credit has no car number,** because `PoleLap` stores the driver's name, not the number.

## Review Focus

1. **A pole lap whose zones wrap across the start line.** For example, braking for Turn 1 starts before the line at u 0.9999. The zone must be named Turn 1 and its duration counted once. (Task 2 test.)
2. **No pole lap, or one that fails to decode.** The braking section and the explain's second sentence are absent, nothing throws, and the band still draws. (Task 7 e2e.)
3. **Between seasons, or with no snapshot.** No circuit is lit, every index label is plain, and the circuit page hero has no round. (Task 3 and Task 6 tests.)
4. **This weekend's circuit has no patch,** because the calendar changed before the season-start rebuild. The index shows the plain base and the chip, never a broken image. (Task 3 test.)
5. **A circuit with a page whose race is next week, not this week.** The live history row and the chip use the `RACE_WHEN` phrase `next race`, not `this weekend`. (Task 6 test.)

---

### Task 1: Each turn knows where it is on the lap

**Files:**
- Create: `blender/circuits/turn_laps.py`
- Modify: `blender/circuits/build.py`, `blender/circuits/build.sh`, `src/circuits/pins/*.json` (6 files, regenerated), `src/circuits/registry.ts`
- Test: `test/circuits/registry.test.ts`

**Interfaces:**
- Produces: in `registry.ts`, `type TurnLap = { turn: number; u: number }`, and `CircuitInfo` gains `laps: ReadonlyArray<TurnLap>`, sorted by turn.
- Produces: each pins JSON gains `"laps": { "1": 0.0123, … }`. `u` is the turn's arc length over the lap, in the same frame as `centreline(track)`: `track.s[track.starts[TURNS[n - 1]]] / track.lap`, rounded to 4 places.

- [ ] **Step 1: Write the failing tests** in `test/circuits/registry.test.ts`:

```ts
it('places every turn on the lap', () => {
  for (const info of allCircuits()) {
    expect(info.laps.map((t) => t.turn)).toEqual(info.pins.map((p) => p.turn))
    for (const { u } of info.laps) expect(u >= 0 && u < 1).toBe(true)
  }
})

it('runs the turns in lap order from the start line, wrapping at most once', () => {
  for (const info of allCircuits()) {
    const drops = info.laps.filter((t, i) => i > 0 && t.u < (info.laps[i - 1]?.u ?? 0)).length
    expect(drops).toBeLessThanOrEqual(1)
  }
})
```

- [ ] **Step 2: Run** `bun test test/circuits/registry.test.ts`. Expected: FAIL, `laps` is undefined.
- [ ] **Step 3: Write `blender/circuits/turn_laps.py`.**
  - It takes the circuit id after `--`, builds `Track` the way `build.py` does (it needs no OSM data), and merges `"laps"` into `src/circuits/pins/<cid>.json`. The other keys must be left byte-identical.
  - `build.py` writes the same `laps` when it writes pins, so a rebuild keeps them.
  - `build.sh` runs nothing new.
- [ ] **Step 4: Run it** for `br-1940 us-2023 qa-2004 ae-2009 au-1953 us-2022`. Check `git diff --stat src/circuits/pins`: 6 files changed, and only `laps` was added.
- [ ] **Step 5: Implement `lapsOf(json): ReadonlyArray<TurnLap>`** in `registry.ts`, next to `pinsOf`, and add `laps` to every entry. It throws if any pin has no lap.
- [ ] **Step 6: Run** `bun test test/circuits && bun run lint`. Expected: PASS.
- [ ] **Step 7: Commit:** `feat(circuits): every turn pin carries its place on the lap`.

### Task 2: Braking, read from a pole lap

**Files:**
- Create: `src/tracks/braking.ts`
- Test: `test/tracks/braking.test.ts`

**Interfaces:**
- Consumes: `PoleLap` (`#/pole/schema.ts`; rows are `[t, u, speed, gear, throttle, brake]`, with `u` unwrapped) and `TurnLap[]` from Task 1.
- Produces:

```ts
export type Zone = { turn: number; start: number; seconds: number; metres: number; entry: number; min: number }
export type Braking = {
  zones: ReadonlyArray<Zone>
  biggest: Zone
  brakingSeconds: number
  flatSeconds: number
  flatShare: number
  longestRun: { seconds: number; from: number; to: number }
}
export const braking: (lap: PoleLap, laps: ReadonlyArray<TurnLap>) => Braking | null
```

**Rules** (from the spec, plus the plan's thresholds):
- **Zones.** `start` is the zone's first row `t`, in seconds. A zone is a run of rows with `brake > 0`. It ends at the `t` of the first row after the run, or at `lap.time`. Runs less than 0.5 s apart join into one zone, and a zone shorter than 0.3 s is dropped.
- **Speeds.** `entry` is the zone's first row's speed. `min` is the lowest speed from there until the speed first rises.
- **Distance.** `metres` is Σ speed/3.6 · Δt over the zone, rounded to 10.
- **Turn.** `turn` is the first `TurnLap` with `u >= wrap(start u)`. If there is none, it wraps to the first turn.
- **Biggest.** `biggest` is the zone with the largest `entry − min`; on a tie, the earlier zone.
- **Flat out.** `flatSeconds` is Σ Δt over rows with `throttle >= 99`, and `flatShare = flatSeconds / lap.time`.
- **Longest run.** `longestRun` is the largest gap from one zone's end to the next zone's start. It wraps through `lap.time`. `from` is the turn of the zone before the gap and `to` is the turn of the zone after it.
- **Null result.** Return `null` when there are no zones.

- [ ] **Step 1: Write the failing tests.** Fixtures are `test/fixtures/pole/vegas.json` (Norris, 2025, wet, 107.934 s) and `yas_marina.json`. Read them with `Schema.decodeUnknownSync(PoleLap)`.

```ts
it('finds six stops on the wet 2025 Las Vegas pole lap', () => {
  const b = braking(vegasLap, circuitFor('vegas')?.laps ?? [])
  expect(b?.zones.length).toBe(6)
  expect(b?.brakingSeconds).toBeCloseTo(20.4, 1)
  expect(b?.flatSeconds).toBeCloseTo(51.5, 1)
  expect(Math.round((b?.flatShare ?? 0) * 100)).toBe(48)
})

it('names the biggest stop: into Turn 14 at the end of the Strip, 327 down to 69', () => {
  const b = braking(vegasLap, circuitFor('vegas')?.laps ?? [])
  expect(b?.biggest).toMatchObject({ turn: 14, entry: 327, min: 69, metres: 240 })
  expect(b?.biggest.seconds).toBeCloseTo(5.36, 2)
})

it('finds the longest run without braking, Turn 12 to Turn 14', () => {
  const b = braking(vegasLap, circuitFor('vegas')?.laps ?? [])
  expect(b?.longestRun).toMatchObject({ from: 12, to: 14 })
  expect(b?.longestRun.seconds).toBeCloseTo(23.6, 1)
})

it('names the Turn 1 stop that starts before the line', () => {
  expect(braking(vegasLap, circuitFor('vegas')?.laps ?? [])?.zones[0]?.turn).toBe(1)
})

it('joins taps under half a second apart and drops blips under 0.3 s', () => { })

it('reads a dry lap too', () => {
  const b = braking(yasLap, circuitFor('yas_marina')?.laps ?? [])
  expect(b?.zones.length).toBe(6)
  expect(Math.round((b?.flatShare ?? 0) * 100)).toBe(66)
})

it('returns null for a lap with no braking', () => { })
```

  - The join/drop test builds a 10-row lap by hand: two taps 0.4 s apart become one zone, and a 0.2 s blip is dropped.
  - The no-braking test uses a lap with every `brake` at 0.
  - The `turn: 14`, `from: 12` and Turn 1 expectations depend on Task 1's `laps`. If they fail, check the turn's `u` against the zone start (`u` 0.7753, 0.4663 and 0.9999) before changing any rule.

- [ ] **Step 2: Run** `bun test test/tracks/braking.test.ts`. Expected: FAIL, the module is missing.
- [ ] **Step 3: Implement** `braking.ts`. Reuse `wrap` and `clock` from `#/pole/replay.ts`; export `wrap` from there if it is not already exported.
- [ ] **Step 4: Run** `bun test test/tracks && bun run lint`. Expected: PASS.
- [ ] **Step 5: Commit:** `feat(tracks): a pole lap tells where and how hard a circuit makes drivers brake`.

### Task 3: The index model

**Files:**
- Create: `src/tracks/index-model.ts`
- Modify: `src/circuits/calendar.ts`
- Test: `test/tracks/index-model.test.ts`

**Interfaces:**
- Produces: `CalendarCircuit.short?: string`. The values are `villeneuve` Montréal, `catalunya` Barcelona, `spa` Spa, `americas` Austin and `rodriguez` Mexico City. Also `labelOf(c: CalendarCircuit): string` returns `c.short ?? c.name`.
- Produces:

```ts
export type IndexCell = { id: string; tile: string; round: number; label: string; lengthKm: string; to: string | null; lit: boolean }
export type IndexFacts = { count: number; longest: { label: string; km: string }; shortest: { label: string; km: string }; newest: { label: string; line: string } }
export const indexFacts: (snapshot: SeasonSnapshot | undefined) => IndexFacts
export const indexCells: (snapshot: SeasonSnapshot | undefined, now: Date) => ReadonlyArray<IndexCell>
```

- **`indexCells` rows.** Rows follow `CALENDAR` key order, and `round` is the index + 1.
- **`to`.** It is `/tracks/<id>` when `TRACK_PAGES` (Task 6) has the id. Until Task 6 lands, use an exported `PAGED: ReadonlySet<string>` of `['vegas']` in `index-model.ts`; Task 6 replaces it with `TRACK_PAGES` keys.
- **`lit`.** It is true for the circuit of `pickRace(snapshot, now)` when the kind is `this-weekend` or `next`.
- **`newest.line`.** It is `<locality>, <firstGp>`, with the locality from the snapshot calendar race whose `circuitId` matches. With no snapshot it is just `<firstGp>`.

- [ ] **Step 1: Write the failing tests**, using `test/fixtures/season-snapshot.json` at `SNAPSHOT_AT` `2026-11-06T15:00:00Z`:

```ts
it('works out the hero facts from the calendar', () => {
  expect(indexFacts(snapshot)).toEqual({ count: 23, longest: { label: 'Spa', km: '7.004' }, shortest: { label: 'Monaco', km: '3.337' }, newest: { label: 'Madring', line: 'Madrid, 2026' } })
  expect(indexFacts(undefined).newest.line).toBe('2026')
})

it('lists 23 cells in calendar order with short names', () => {
  const cells = indexCells(snapshot, at)
  expect(cells.length).toBe(23)
  expect(cells[4]).toMatchObject({ round: 5, label: 'Montréal' })
  expect(cells.find((c) => c.id === 'vegas')).toMatchObject({ round: 21, to: '/tracks/vegas' })
  expect(cells.filter((c) => c.to !== null).map((c) => c.id)).toEqual(['vegas'])
})

it("lights the menu's race and nothing else", () => {
  expect(indexCells(snapshot, at).filter((c) => c.lit).map((c) => c.id)).toEqual(['interlagos'])
})

it('lights nothing with no snapshot or once the season is over', () => {
  expect(indexCells(undefined, at).some((c) => c.lit)).toBe(false)
  expect(indexCells(snapshot, new Date('2026-12-31T00:00:00Z')).some((c) => c.lit)).toBe(false)
})
```

  - Check that the fixture's lit circuit really is `interlagos` with `pickRace`. If the fixture says otherwise, use what it says.
  - The `locality` for Madring must come from the fixture. If the fixture's Madrid race is named differently, assert the fixture's value.

- [ ] **Step 2: Run** `bun test test/tracks/index-model.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `short` and `labelOf` in `calendar.ts`, then `index-model.ts`.
- [ ] **Step 4: Run** `bun test test/tracks test/circuits && bun run lint`. Expected: PASS.
- [ ] **Step 5: Commit:** `feat(tracks): the index knows every circuit's facts and which one races next`.

### Task 4: The sizes band render

**Files:**
- Create: `blender/circuits/sizes.py`, `blender/circuits/sizes.sh`, `public/circuits/sizes/*.webp`, `src/tracks/sizes.json`
- Test: `test/tracks/sizes.test.ts`

**Interfaces:**
- Produces `src/tracks/sizes.json`. Every box is in output pixels of its layout's base image:

```json
{ "desk": { "w": 2880, "h": 2000, "cells": { "au-1953": { "patch": [x, y, w, h], "label": [x, y] }, … } },
  "phone": { "w": 1170, "h": 3261, "cells": { … } } }
```

- Produces the images `public/circuits/sizes/{desk,phone}.webp` and `public/circuits/sizes/{desk,phone}-<tile>.webp`.

Port `sizes_glow.py` from the private pipeline. Keep its `LAYOUTS`, `PITCH`, colours, `faded`, `emit`, `ribbon`, `at_pixel` and `grid`, and remove its comments. Changes:
- **Tile ids** come from `CALENDAR` order: `sizes.sh` passes them in, read with `bun -e` from `src/circuits/calendar.ts`.
- **One base pass** with `HOT` empty.
- **One patch pass per tile.** Each pass sets `HOT = {tile}` and renders only the padded cell, using `render.use_border` and `use_crop_to_border`.
  - The padded cell is the label column box grown by half the halo width (80 px × `WIDEN` × `SS`) on every side.
  - The cell runs from `COL0 + col * COL_STEP` to `+ COL_STEP`, and from the row's label y minus `ABOVE_LABEL * 2` to the label y.
  - Clamp the box to the image.
- **WEBP output.** PNGs go to WEBP with `cwebp -q 82` (already used by the circuit posters).
- **The proof** is a PIL check at the end of `sizes.py`. It pastes each patch onto the base at its box and asserts that the result differs from the base only where that circuit's hot render is brighter than its cool render (a mean absolute difference over 6 inside the circuit's mask, and 0 outside within ±2 levels).

- [ ] **Step 1: Write the failing asset test:**

```ts
it('has a base and 23 patches per layout, within budget', () => {
  for (const layout of ['desk', 'phone'] as const) {
    expect(statSync(`public/circuits/sizes/${layout}.webp`).size).toBeLessThan(400_000)
    expect(Object.keys(SIZES[layout].cells)).toEqual(Object.values(CALENDAR).map((c) => c.tile))
    for (const tile of Object.keys(SIZES[layout].cells)) expect(statSync(`public/circuits/sizes/${layout}-${tile}.webp`).size).toBeLessThan(40_000)
  }
})

it('keeps every patch inside its base image', () => { })
```

  The second test checks that each `patch` box has x ≥ 0, y ≥ 0, x + w ≤ w and y + h ≤ h.

- [ ] **Step 2: Run** `bun test test/tracks/sizes.test.ts`. Expected: FAIL, the files are missing.
- [ ] **Step 3: Write `sizes.py` and `sizes.sh`,** then run `blender/circuits/sizes.sh`. Expected: the PIL proof passes and 48 images are written.
- [ ] **Step 4: Look at it.** Open `desk.webp` beside the Figma render node 201:649 (desktop) and `phone.webp` beside 205:658. They should match. Lay `desk-us-2023.webp` over the base and check there is no seam.
- [ ] **Step 5: Run** `bun test test/tracks && bun run lint`. Expected: PASS.
- [ ] **Step 6: Commit:** `feat(tracks): Blender draws every circuit to one scale, with a lit patch per circuit`.

### Task 5: The `/tracks` page

**Files:**
- Create: `src/routes/tracks.tsx`, `src/tracks/Index.tsx`, `src/tracks/SizesBand.tsx`, `src/styles/tracks.css`, `e2e/tracks.spec.ts`
- Modify: `src/chapter/Next.tsx` and its four callers (`RaceWeekend`, `Overtaking`, `Tyres`, `Flags`), `src/shell/menu.ts`, `vite.config.ts`
- Test: `test/shell/footer.test.tsx` (menu), `e2e/tracks.spec.ts`

**Interfaces:**
- Consumes: `indexFacts`, `indexCells` (Task 3), `sizes.json` (Task 4), `useSeason`, `useSecond`.
- Produces: `Next` props become `{ label: string; title: string; line: string; photo: Photo; to: To | null }`, with `To` from `#/shell/context.ts`. Callers pass `label={`Next · Chapter ${n} · ${min} min`}`. Chapter 05's `NextRace` is untouched.
- Produces: `SizesBand({ cells }: { cells: ReadonlyArray<IndexCell> })`, used on the index only.

**Page structure** (the spec's index section, top to bottom):
- **Hero, facts, sizes band, Next band.** Copy is verbatim from the spec.
- **The Next band:** `label="Next · The people"`, `title="Meet the grid."`, `line="Read"`, `to={null}`, and the photo is `portraitFor('ANT')` with place `Kimi Antonelli · Melbourne Walk, 2026`.
- **Sizes band layout:**
  - `<picture>`: the phone source at `(max-width: 719px)`, otherwise desk. The stage is `position: relative` with the aspect ratio of the chosen layout.
  - Each label, and the lit patch `<img>`, is placed in percent: `left = x / w`, `top = y / h`, and width and height the same way for the patch.
  - Two lists of absolutely placed labels are rendered, one per layout, and CSS shows the one that matches the `<picture>` breakpoint.
- **Labels:**
  - The format is `01  Albert Park` (round padded to 2, two spaces).
  - The lit label becomes the chip: `21 · Las Vegas · 6.201 km` on desktop, `21 Las Vegas` on a phone.
  - A cell with `to` is a `Go` link and ends with ` →`.
  - The hint reads "Pick a track with → to open it".
- **The scale bar** is 88 / 2880 of the desktop width, or 46 · 3 / 1170 of the phone width.
- **Motion:** `sweep` on the headlines, `roll` on the 23 and the km values, and `reveal` on the band.
- **Reduced motion:** static.
- **Menu:** "The tracks" gets `to: '/tracks'`.
- **Prerender:** add `{ path: '/tracks' }`.

- [ ] **Step 1: Write the failing tests.**
  - In `test/shell/footer.test.tsx`: the menu's "The tracks" links to `/tracks`, with no `Soon`.
  - In `e2e/tracks.spec.ts`, using the `test` fixture from `e2e/fixtures.ts`, at 1470 and at 390, in light and in dark:

```ts
test('the index shows every circuit at one scale with the next race lit', async ({ page, errors }) => {
  await page.goto('/tracks')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('tracks this')
  await expect(page.locator('.sizes .cell:visible')).toHaveCount(23)
  await expect(page.locator('.sizes .chip:visible')).toHaveText(/20 · Interlagos · 4\.309 km|20 Interlagos/)
  await expect(page.locator('.sizes img.patch')).toHaveAttribute('src', /-br-1940\.webp$/)
  await expect(page.getByRole('link', { name: /Las Vegas →/ })).toHaveAttribute('href', '/tracks/vegas')
  await expect(page.getByText('Pick a track with → to open it')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errors).toEqual([])
})

test('no snapshot: nothing lit, labels plain', async ({ page }) => { })

test('the menu leads to the tracks', async ({ page }) => { })
```

  - The no-snapshot test stubs `/api/season` with a 500 and expects 0 `.chip` and no `img.patch`.

- [ ] **Step 2: Run** `bun test test/shell && bunx playwright test e2e/tracks.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the `Next` label prop first, and check that `bun test` and `bunx playwright test e2e/chapter.spec.ts` are still green. Then build the route, `Index`, `SizesBand`, `tracks.css`, the menu entry and the prerender entry.
- [ ] **Step 4: Run** `bun test && bun run lint && bunx playwright test e2e/tracks.spec.ts e2e/chapter.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit:** `feat(tracks): /tracks lays every circuit side by side and lights the next race`.

### Task 6: The circuit page model

**Files:**
- Create: `src/tracks/pages.ts`, `src/tracks/page-model.ts`
- Modify: `src/tracks/index-model.ts` (replace `PAGED` with `TRACK_PAGES` keys)
- Test: `test/tracks/page-model.test.ts`

**Interfaces:**
- Produces, in `pages.ts`:

```ts
export type Place = { label: string; at: { turn: number } | { between: readonly [number, number] }; up?: true }
export type Corner = { tag: string; line: string; photo: Photo }
export type HistoryRow = { year: number; line: string }
export type TrackPage = {
  country: string; intro: string; hero: Photo; bandTitle: string; places: ReadonlyArray<Place>
  cornersBody: string; corners: readonly [Corner, Corner]
  historyTitle: string; history: ReadonlyArray<HistoryRow>; historyPhoto: Photo
}
export const TRACK_PAGES: Partial<Record<ModelledId, TrackPage>>
```

- Produces, in `page-model.ts`:

```ts
export const heroLabel: (id: ModelledId, page: TrackPage, snapshot: SeasonSnapshot | undefined) => string
export const liveRow: (id: ModelledId, snapshot: SeasonSnapshot | undefined, now: Date) => HistoryRow | null
export const placeAt: (place: Place, pins: ReadonlyArray<Pin>) => { x: number; y: number }
export const turnsWord: (n: number) => string
```

**Rules:**
- **`heroLabel`** is `The tracks · Round <n> · <country>`. The round is the snapshot calendar race whose `circuitId` is `id`. Without one, it is `The tracks · <country>`.
- **`liveRow`** is non-null only when `pickRace` returns this circuit with kind `this-weekend` or `next`.
  - Its line is `Round <n>, <RACE_WHEN[kind]>.`
  - When `titleFight(snapshot)` has state `decided` or `over`, add ` <Family> arrives as champion.`, with the family name from standings P1. Expose `state` and the family from `titleFight` if it does not return them already.
- **`placeAt`** for `{ turn }` returns that pin's x and y. For `{ between: [a, b] }` it returns the midpoint of the two pins.
- **`turnsWord(17)`** is `Seventeen`, built from `words` and `capital` in `#/season/words.ts`.

**The Las Vegas content is verbatim from the spec,** with these values:
- **Places:**
  - `{ label: 'The Sphere · 112 m of LEDs', at: { turn: 8 }, up: true }`;
  - `{ label: 'The Strip · Las Vegas Boulevard', at: { between: [12, 14] } }`.
- **Photos** come from Commons, in the order hero, Sphere corner, Strip corner, history:

  | Photo | Commons file | Credit |
  |---|---|---|
  | Hero, Ocon, Haas VF-25 | `File:Las Vegas Grand Prix (54942077056).jpg` | `Photo DHS · Public domain` |
  | Sphere corner, Leclerc, Ferrari SF-25 | `File:Las Vegas Grand Prix (54942077481).jpg` | `Photo DHS · Public domain` |
  | Strip corner, Red Bull RB21 | `File:Las Vegas Grand Prix (54941205212).jpg` | `Photo DHS · Public domain` |
  | History, Warwick | `File:Derek Warwick Las Vegas 1982.jpg` | `Video still, author unknown · Public domain` |

  Each `src` is `/img/tracks/vegas-{hero,sphere,strip,1982}.jpg`; Task 7 downloads the files.

- [ ] **Step 1: Write the failing tests:**

```ts
it('labels the hero with the round from the calendar', () => {
  expect(heroLabel('vegas', vegasPage, snapshot)).toBe('The tracks · Round 21 · United States')
  expect(heroLabel('vegas', vegasPage, undefined)).toBe('The tracks · United States')
})

it('adds the live row only while this race is the next one', () => {
  expect(liveRow('vegas', snapshot, new Date('2026-11-17T12:00:00Z'))).toEqual({ year: 2026, line: 'Round 21, this weekend. Antonelli arrives as champion.' })
  expect(liveRow('vegas', snapshot, new Date('2026-11-06T15:00:00Z'))).toBeNull()
  expect(liveRow('vegas', snapshot, new Date('2026-11-23T12:00:00Z'))).toBeNull()
})

it('says next race when the race is not this weekend', () => { })

it('leaves out the champion while the title is open', () => { })

it('places a tag on a turn or between two', () => {
  const pins = circuitFor('vegas')?.pins ?? []
  expect(placeAt({ label: '', at: { turn: 8 } }, pins)).toEqual({ x: pins[7]?.x, y: pins[7]?.y })
})

it('only modelled circuits can have a page', () => {
  for (const id of Object.keys(TRACK_PAGES)) expect(isModelled(id)).toBe(true)
})
```

  - **The live row dates.** The Las Vegas race is Saturday 21 Nov. The 17 Nov and 23 Nov dates must fall on the `this-weekend` and finished sides of `pickRace`. Adjust them to the fixture's calendar if its race-week window differs, and note the reason in the test name.
  - **The next-race test** uses a date in the week before Las Vegas weekend.
  - **The open-title test** builds a snapshot copy where P2 is within reach.

- [ ] **Step 2: Run** `bun test test/tracks/page-model.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `pages.ts` and `page-model.ts`, and switch `index-model.ts` to `TRACK_PAGES`.
- [ ] **Step 4: Run** `bun test test/tracks && bun run lint`. Expected: PASS.
- [ ] **Step 5: Commit:** `feat(tracks): the Las Vegas page knows its round, its places and its live history row`.

### Task 7: The `/tracks/vegas` page

**Files:**
- Create: `src/routes/tracks.$circuit.tsx`, `src/tracks/TrackPage.tsx`, `src/tracks/Braking.tsx`, `public/img/tracks/vegas-*.jpg` (and `-phone.jpg` crops)
- Modify: `src/weekend/CircuitStage.tsx`, `src/styles/stage.css`, `src/styles/tracks.css`, `src/credits/photos.ts`, `vite.config.ts`, `e2e/tracks.spec.ts`
- Test: `test/weekend/circuit-band.test.tsx`, `test/credits/photos.test.ts` (existing, must stay green), `e2e/tracks.spec.ts`

**Interfaces:**
- Consumes: `CircuitStage`, `usePoleLap`, `braking` (Task 2), `TRACK_PAGES`, `heroLabel`, `liveRow`, `placeAt` and `turnsWord` (Task 6), `clock` (`#/pole/replay.ts`), `Next` (Task 5).
- Produces: `CircuitStage` gains an optional `places?: ReadonlyArray<{ label: string; x: number; y: number; up?: true }>`.
  - Each place renders inside `.pins` as `<span className="place" style={{ '--px': x, '--py': y }}><b className="mono">{label}</b></span>`, with no `data-pin`, so `Circuit.tsx` leaves it alone.
  - `.place` follows the Turns toggle.
  - `up` adds a line from the band's top edge, as in the phone mock.

**The page:**
- **One pole lap fetch.** `TrackPage` calls `usePoleLap(id, true)` once and passes the result to `CircuitStage` (in place of `useNearLap`) and to `Braking`.
- **Hero.** The label from `heroLabel`, `<h1>` `Las Vegas.`, the intro, and the photo with its caption block (`place` + `credit`).
- **The band** (`data-theme="dark"`):
  - the label `Read the lap`, `<h2>` from `bandTitle`, and the stats column from `info.facts` (`First race here`, `Lap … km`, `Race laps`, `Race distance … km`);
  - `CircuitStage` with `places`;
  - the explain line `Three timed sectors: S1 purple, S2 green, S3 yellow.`, plus ` The longest run without braking: <s> seconds, from Turn <a> to Turn <b>.` when `braking` is non-null (seconds rounded to whole);
  - the footnote from the spec.
- **Corners.** `<h2>` `${turnsWord(info.facts.turns)} turns.` and the body `${capital(info.facts.direction)}, ${page.cornersBody}`. For Las Vegas, `cornersBody` is `on public roads closed for the sessions. Two corners worth knowing first.` Then the two cards.
- **Braking** renders only when `braking(lap, info.laps)` is non-null. Its copy is exactly the spec's:
  - the `<h2>` is `${capital(words(zones.length))} stops.`;
  - the body names `lap.driver`, `lap.year` and `clock(lap.time)`, with a `Wet` tag when `lap.wet`;
  - the stat values are whole km/h, whole %, and seconds to 1 decimal;
  - the phone label is `Into T<n>`, from a CSS-swapped `<span>`;
  - the payoff reads `${Math.round(brakingSeconds)} seconds a lap on the brakes, ${Math.round(flatSeconds)} flat out.`;
  - the credit reads `Telemetry: OpenF1 · ${lap.year} ${grandPrix(info.gp)} qualifying, pole lap · brake on/off, about four samples a second`.
- **History.** The page's rows, then `liveRow` when non-null (its year in purple), then the photo.
- **Next band:** the same as the index.
- **Unknown id:** a `section.tracks.missing` with `<h1>` `No page for this track yet` and a `Go` to `/tracks` reading `All the tracks`.
- **Photos.** Download the four Commons files at 2400 px wide with the Commons API (`iiurlwidth=2400`), save them as JPEG q 82, and make `-phone.jpg` crops matching the phone frames: hero 1170 × 780, corners 1170 × 804, history 1170 × 876.
  - Wire them with `<picture>`: the phone source at `(max-width: 719px)`.
  - Add the four photos to `src/credits/photos.ts` with `usedOn: 'The tracks'`, through a new `TRACK_PHOTOS` list collected the way `CARS` and `PORTRAITS` are.
- **Prerender:** add `{ path: '/tracks/vegas' }`. Head titles follow the spec.
- **Motion:** as in Task 5, plus `roll` on the band stats and the braking values, and `block` on the payoff row.

- [ ] **Step 1: Write the failing tests.**
  - In `test/weekend/circuit-band.test.tsx`: a `CircuitStage` given `places` renders each label inside `.pins`, with no `data-pin`.
  - In `e2e/tracks.spec.ts`:

```ts
test('the Las Vegas page reads the lap from the stored pole lap', async ({ page, errors }) => {
  await stubPole(page, 'vegas')
  await page.goto('/tracks/vegas')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Las Vegas.')
  await expect(page.getByText('The tracks · Round 21 · United States')).toBeVisible()
  await expect(page.getByText('Six stops.')).toBeVisible()
  await expect(page.locator('.braking .stat').first()).toContainText('327')
  await expect(page.getByText(/Norris's pole lap, 2025, 1:47\.934/)).toBeVisible()
  await expect(page.getByText('Wet')).toBeVisible()
  await expect(page.getByText(/from Turn 12 to Turn 14/)).toBeVisible()
  await expect(page.getByText('Seventeen turns.')).toBeVisible()
  expect(errors).toEqual([])
})

test('no pole lap: no braking section, the band still draws', async ({ page }) => { })

test('the band draws in WebGL and both toggles work', async ({ page }) => { })

test('an unknown track shows the missing section', async ({ page }) => { })

test('every photo on the page is credited', async ({ page }) => { })
```

  - **No pole lap:** with `stubPole(page, null)`, there is no `.braking`, no "longest run", and the canvas still draws non-blank pixels.
  - **The band:** check non-blank canvas pixels the way `e2e/weekend.spec.ts` does, then press `Turns` and `Sectors` and see `data-turns` / `data-sectors` flip.
  - **Unknown track:** `/tracks/nope` shows `No page for this track yet` and a link to `/tracks`.
  - **Photo credits:** every `img` in `main` outside `.stage` and `.sizes` has a caption or credit sibling containing `Public domain` or `CC`.
  - Run all of these at 1470 and 390, light and dark, and check for no overflow.

- [ ] **Step 2: Run** `bun test test/weekend && bunx playwright test e2e/tracks.spec.ts`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** in this order: photos, `CircuitStage` places, `Braking`, `TrackPage`, the route and the prerender entry.
- [ ] **Step 4: Run** `bun test && bun run lint && bunx playwright test`. Expected: all green.
- [ ] **Step 5: Commit:** `feat(tracks): /tracks/vegas reads the lap, its corners, its braking and its history`.

### Task 8: Docs, the full check and the live look

**Files:**
- Modify: `DESIGN.md` (3D section), `docs/superpowers/specs/2026-11-07-f1-fan-site-design.md` (§8)

- [ ] **Step 1: Update `DESIGN.md`.** Add one bullet under 3D for "Sizes band": the cool base plus a hot patch per circuit; this weekend's patch comes from the snapshot; `blender/circuits/sizes.sh` rebuilds it, and only at the season-start check. Also add one line saying turn pins carry their lap position (`laps`).
- [ ] **Step 2: Update spec §8:** The tracks shipped with the index and Las Vegas, and other circuits follow one spec each.
- [ ] **Step 3: Run** `bun test && bun run lint && bunx playwright test`. Expected: all green. Paste the counts into the PR body later.
- [ ] **Step 4: The live look.** Run `bun run dev`. Scroll `/tracks` and `/tracks/vegas` at 1440 and 390 in both themes, compare each section with its Figma frame, and screenshot every section for the PR.
- [ ] **Step 5: Commit:** `docs(tracks): DESIGN.md and the site spec know about The tracks`.
- [ ] **Step 6: Hand over.** Run sol-loop. The PR only goes up on Praffi's word, with its body written by the `pr` skill.
