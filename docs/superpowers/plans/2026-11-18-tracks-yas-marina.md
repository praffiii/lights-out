# The tracks, Yas Marina: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/tracks/yas_marina` renders the approved Yas Marina page, built from data only on top of the Las Vegas and Lusail page code.

**Architecture:** The change is one `TRACK_PAGES.yas_marina` entry in `src/tracks/pages.ts`, eight JPEGs in `public/img/tracks/`, and one prerender path. `TrackPage`, `CircuitStage`, `Braking`, the index and the credits page already read everything from `TRACK_PAGES`, so no component changes.

**Tech Stack:** TanStack Start, React, bun test, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-18-tracks-yas-marina-design.md`

## Global Constraints

- No code comments anywhere.
- No `as` casts except `as const`, no `any`, no non-null `!`.
- Prettier only as `--single-quote --no-semi --print-width 200`.
- Copy is exactly the spec's strings:
  - Use en dashes in `T13–14` and `day–night`.
  - Use straight apostrophes (`F1's`).
  - Use the umlaut in `Räikkönen`.
- Never invent numbers.
- Photo credits must parse as `Photo <by> · <licence>`:
  - `Photo JiteshJagadish · CC BY 2.0`
  - `Photo Play Among Friends Paf · CC BY 2.0`
  - `Photo Willo2173 · CC BY 2.0`
  - `Photo Yuriy Lapitskiy · CC BY-SA 3.0`
- Commits are local only. Titles are conventional and in present-tense behaviour, with no Co-Authored-By trailer.
- Don't touch `.playwright-mcp/` (untracked, the user's).

## Review Focus

1. **The place tag on the live 3D band.**
   - "Under the W hotel · T13–14" is long, and Turn 13 sits inside the S3 cluster.
   - At 390 px and 1440 px it must sit fully inside the stage and stay 12 px clear of the replay readout.
   - Task 3 adds Yas Marina to the place-tag test.
2. **The index link test.**
   - `.sizes a.cell` now matches three links.
   - The test asserts all three, in calendar order.
3. **The hero crop.**
   - On desktop the cars must stay to the right of the title block.
   - The live page's hero box may crop differently from the mock (`object-fit: cover`). Check it live at 1440 and 1280.
4. **Long country label on phone.**
   - `The tracks · Round 23 · United Arab Emirates` is the longest hero label yet.
   - The Yas e2e test's `noOverflow` check covers sideways scroll at 390 px.
5. **A vacuous credit check.**
   - The credited loop must keep its minimum of 5 images, so an empty or missing page fails.

---

### Task 1: Pin the Yas Marina braking numbers the copy relies on

**Files:**
- Test: `test/tracks/braking.test.ts`

**Interfaces:**
- Consumes:
  - `braking(lap, turns)`;
  - the `yasLap` constant already in the test file;
  - `circuitFor('yas_marina')?.laps`.
- Produces: nothing new.

- [ ] **Step 1: Add the test after "reads a dry lap too"**

```ts
it('finds six stops on the 2025 Yas Marina pole lap, the biggest into Turn 6', () => {
  const b = braking(yasLap, circuitFor('yas_marina')?.laps ?? [])

  expect(b?.zones.map((z) => z.turn)).toEqual([1, 5, 6, 9, 12, 16])
  expect(b?.biggest).toMatchObject({ turn: 6, entry: 316, min: 68, metres: 130 })
  expect(b?.longestRun).toMatchObject({ from: 6, to: 9 })
  expect(b?.flatSeconds.toFixed(1)).toBe('54.2')
})
```

- [ ] **Step 2: Run it**

Run: `bun test test/tracks/braking.test.ts`
Expected: PASS.

This is a characterization test: it pins the fixture numbers the spec's copy depends on ("Six stops", "from Turn 6 to Turn 9"). Ledger that it passes before any change, by design.

- [ ] **Step 3: Commit**

```bash
git add test/tracks/braking.test.ts
git commit -m "test(tracks): the Yas Marina pole lap gives six stops, the biggest into Turn 6"
```

### Task 2: Yas Marina photos

**Files:**
- Create:
  - `public/img/tracks/yas_marina-hero.jpg` and `yas_marina-hero-phone.jpg`;
  - `yas_marina-t5.jpg` and `yas_marina-t5-phone.jpg`;
  - `yas_marina-hotel.jpg` and `yas_marina-hotel-phone.jpg`;
  - `yas_marina-2009.jpg` and `yas_marina-2009-phone.jpg`.

**Interfaces:**
- Produces: the eight paths above. Task 3's `src` values are `/img/tracks/yas_marina-<name>.jpg`, and `Shot` derives each `-phone.jpg`.

The crops are done and approved in the Figma frames. They are in `~/Developments/personal/lights-out-private/pipeline-2026-11-17/yas/out/`, made by `crop.py` in the same folder.

- [ ] **Step 1: Copy the eight files**

Run: `cp ~/Developments/personal/lights-out-private/pipeline-2026-11-17/yas/out/yas_marina-*.jpg public/img/tracks/`

- [ ] **Step 2: Check the sizes and the budget**

Run: `for f in public/img/tracks/yas_marina-*.jpg; do sips -g pixelWidth -g pixelHeight "$f" | tail -2 | tr '\n' ' '; ls -l "$f" | awk '{print $5}'; done`

Expected sizes:

| Name | Desktop | Phone |
|---|---|---|
| `hero` | 2880×1520 | 1170×780 |
| `t5` | 1632×1120 | 1170×804 |
| `hotel` | 960×660 | 1170×804 |
| `2009` | 864×648 | 1170×876 |

Expected budget: the four desktop files sum to under 1,000,000 bytes (about 770 KB).

- [ ] **Step 3: Commit**

```bash
git add public/img/tracks/yas_marina-*.jpg
git commit -m "feat(tracks): Yas Marina photos for the hero, two corners and 2009"
```

### Task 3: The Yas Marina page

**Files:**
- Modify: `src/tracks/pages.ts` (add `yas_marina` after `losail`)
- Modify: `vite.config.ts` (add `{ path: '/tracks/yas_marina' }` after `/tracks/losail`)
- Test: `test/tracks/index-model.test.ts:21`
- Test: `e2e/tracks.spec.ts`

**Interfaces:**
- Consumes: the `TrackPage` type, the `commons(file)` helper, and the Task 2 image paths.
- Produces: `TRACK_PAGES.yas_marina`.

- [ ] **Step 1: Change the index unit test**

```ts
expect(cells.filter((c) => c.to !== null).map((c) => c.id)).toEqual(['vegas', 'losail', 'yas_marina'])
```

- [ ] **Step 2: Change and add the e2e tests in `e2e/tracks.spec.ts`**

1. **Index test.**
   - `toHaveCount(3)`.
   - `links.nth(2)` has `href` `/tracks/yas_marina`.
2. **New test, in both themes:** `` `the Yas Marina page reads the lap from the stored pole lap, ${colorScheme}` ``, shaped like the Lusail test.
   - Setup: `stubPole(page, 'yas_marina')`, then `loaded(page, '/tracks/yas_marina')`.
   - Title: `Yas Marina · The tracks · Lights Out`.
   - The h1 is `Yas Marina.`.
   - `The tracks · Round 23 · United Arab Emirates` is visible.
   - `.place` has the text `['Under the W hotel · T13–14']`.
   - `Sixteen turns.` is visible.
   - After scrolling to `.braking`:
     - `Six stops.` is visible.
     - The first `.braking .stat dt` contains `Into Turn 6`.
     - The first `.braking .stat` contains `316`.
     - `/Verstappen's pole lap, 2025, 1:22\.207/` is visible.
     - `.braking .wet` has count 0.
   - `/from Turn 6 to Turn 9/` is visible.
   - `noOverflow` is true, and `errors` is empty.
3. **Place-tag loop.** Add `['yas_marina', 'Yas Marina']`.
4. **Credited loop.** Add `['yas_marina', 'Yas Marina']`. Keep the ≥ 5 image minimum.

- [ ] **Step 3: Run the tests and watch them fail**

Run: `bun test test/tracks/index-model.test.ts`
Expected: FAIL, received `['vegas', 'losail']`.

Run: `bunx playwright test e2e/tracks.spec.ts -g "Yas Marina|the index"`
Expected: FAIL.
- The h1 shows `No page for this track yet`.
- The credited test fails on the image count.
- The place-tag test fails on its tag count.
- The index test fails on `toHaveCount(3)`.

- [ ] **Step 4: Add `TRACK_PAGES.yas_marina`**

- **Strings:** use the exact strings from the spec's table, corners and history rows.
- **Corner order:** `corners[0]` is T5, the big photo. `corners[1]` is T13–14.
- **`src` values:** `/img/tracks/yas_marina-hero.jpg`, `yas_marina-t5.jpg`, `yas_marina-hotel.jpg` and `yas_marina-2009.jpg`.
- **`source` values:**
  - `commons('Yas_Marina_circuit_by_night.jpg')`
  - `commons('2012_Abu_Dhabi_GP_Winner.jpg')`
  - `commons('Firework_Abu_Dhabi_Grand_Prix_2015.jpg')`
  - `commons('Jenson_Button_(Brawn_BGP_001)_on_Sunday_at_2009_Abu_Dhabi_Grand_Prix.jpg')`
- **Credits:** no shared constant. Each credit is used once.

Then add `{ path: '/tracks/yas_marina' }` to the prerender list in `vite.config.ts`.

- [ ] **Step 5: Run the tests and watch them pass**

Run: `bun test test/tracks` and `bunx playwright test e2e/tracks.spec.ts`
Expected: everything passes on both the desktop and phone projects.

If the place-tag test fails for Yas Marina:
- Stop and ledger the tag's box against the stage and the replay readout.
- The spec says to raise it with Praffi, not to drop the tag silently.

- [ ] **Step 6: Lint and commit**

Run: `bun run lint`
Expected: clean.

```bash
git add src/tracks/pages.ts vite.config.ts test/tracks/index-model.test.ts e2e/tracks.spec.ts
git commit -m "feat(tracks): /tracks/yas_marina reads the lap, its hairpin, the hotel and the titles decided there"
```

### Task 4: Full checks and live look

**Files:** none, unless a check finds something.

- [ ] **Step 1: Run the full suite in the background**

Run: `bun test > <ws>/unit.log 2>&1; tail -5 <ws>/unit.log` and `bunx playwright test > <ws>/e2e.log 2>&1; tail -15 <ws>/e2e.log`

Expected: 0 fail. Known load flakes are allowed only if they pass when rerun with `--workers 1`:
- `lap.spec.ts:91`;
- `tracks.spec.ts:68`;
- `weekend.spec.ts:363` and `:457`;
- `car.spec.ts:295`.

- [ ] **Step 2: Live check in the browser**

1. Seed the local KV: `bunx wrangler kv key put --local --binding SEASON_KV 'pole:v1:yas_marina' --path test/fixtures/pole/yas_marina.json`.
2. Start the dev server.
3. Scroll `/tracks/yas_marina` at 1440, 1280 and 390, in light and dark.
4. Compare with Figma 436:965, 436:1166, 438:1387 and 438:1589.
5. Check:
   - the replay clock runs;
   - the place tag doesn't sit under the replay readout;
   - the hero cars stay clear of the title block;
   - there are no layout gaps.

- [ ] **Step 3: Save screenshots for the PR**

Save to the scratchpad:
- desktop top, light;
- the band, dark;
- braking and history, dark;
- phone, light.

Stop the dev server when done.
