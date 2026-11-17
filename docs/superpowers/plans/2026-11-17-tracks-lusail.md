# The tracks, Lusail: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/tracks/losail` renders the approved Lusail page, built from data only on top of the Las Vegas page code.

**Architecture:** One `TRACK_PAGES.losail` entry in `src/tracks/pages.ts`, eight JPEGs in `public/img/tracks/`, and one prerender path. `TrackPage`, `CircuitStage`, `Braking`, the index and the credits page already read everything from `TRACK_PAGES`, so no component changes.

**Tech Stack:** TanStack Start, React, bun test, Playwright, Python + Pillow (photo crops, scratchpad only).

**Spec:** `docs/superpowers/specs/2026-11-17-tracks-lusail-design.md`

## Global Constraints

- No code comments anywhere, Python included.
- No `as` casts except `as const`, no `any`, no non-null `!`.
- Prettier only as `--single-quote --no-semi --print-width 200`.
- Copy is exactly the spec's strings: an en dash in `T12–14`, straight apostrophes (`MotoGP's`).
- Never invent numbers: the T1 line has no km/h.
- Photo credits read `Photo Box Repsol · CC BY 2.0` and `Photo Cecep Gorbachev · CC BY 2.0` (the credits page parses `Photo <by> · <licence>`).
- Commits are local only, conventional titles in present-tense behaviour, and no Co-Authored-By trailer.
- Don't touch `.playwright-mcp/` (untracked, the user's).

## Review Focus

1. **A vacuous credit check.** The parametrized "every photo is credited" test passes on a page with no images (for example the "No page" section). It must also assert that the page has at least 5 images.
2. **The index link test hits strict mode.** `.sizes a.cell` now matches two links, so the test asserts both, in calendar order.
3. **Place tags at phone width.** "Main straight · 1,068 m" is centred on the T1 pin, near the band's left edge, and "Fast rights · T12–14, no braking" is long. Both tags must sit fully inside the stage box at 390 px.
4. **Hero crop.** On desktop the 2012 start sits behind a cream title block on the left. Riders and the floodlights must stay visible to the right of it.
5. **The 2008 photo is never upscaled.** Its source is 824 px wide.

---

### Task 1: Pin the Lusail braking numbers the copy relies on

**Files:**
- Test: `test/tracks/braking.test.ts`

**Interfaces:**
- Consumes: `braking(lap, turns)` and the `read(id)` helper already in the test file; `circuitFor('losail')?.laps`.
- Produces: nothing new.

- [ ] **Step 1: Add the test**

```ts
const losailLap = await read('losail')

it('finds seven stops on the 2025 Lusail pole lap, the biggest into Turn 6', () => {
  const b = braking(losailLap, circuitFor('losail')?.laps ?? [])

  expect(b?.zones.map((z) => z.turn)).toEqual([1, 2, 4, 6, 7, 10, 16])
  expect(b?.biggest).toMatchObject({ turn: 6, entry: 250, min: 99, metres: 90 })
  expect(b?.longestRun).toMatchObject({ from: 10, to: 16 })
  expect(b?.flatSeconds.toFixed(1)).toBe('54.1')
})
```

- [ ] **Step 2: Run it**

Run: `bun test test/tracks/braking.test.ts`
Expected: PASS. This is a characterization test: it pins the fixture numbers that the spec's copy ("Seven stops", "Turn 10 to Turn 16") depends on. Write a ledger note that it passes before any change, by design.

- [ ] **Step 3: Commit**

```bash
git add test/tracks/braking.test.ts
git commit -m "test(tracks): the Lusail pole lap gives seven stops, the biggest into Turn 6"
```

### Task 2: Lusail photos

**Files:**
- Create: `public/img/tracks/losail-hero.jpg`, `losail-hero-phone.jpg`, `losail-t1.jpg`, `losail-t1-phone.jpg`, `losail-rights.jpg`, `losail-rights-phone.jpg`, `losail-2008.jpg`, `losail-2008-phone.jpg`
- Scratch: `<scratchpad>/lusail/crop.py` (not committed)

**Interfaces:**
- Produces: the eight paths above. Task 3's `src` values are `/img/tracks/losail-<name>.jpg`, and `Shot` derives each `-phone.jpg`.

Originals are already in `<scratchpad>/lusail/img/`:
- `hero2012.jpg`: `2012 Qatar Grand Prix start.jpg`, 5616×3744.
- `t1.jpg`: `Marc Márquez leads the pack 2014 Losail.jpeg`.
- `rights.jpg`: `Pol Espargaró 2021 Doha 4.jpg`.
- `y2008.jpg`: `CaseyStoner-01.jpg`, 824×570.

The Figma crops in `<scratchpad>/lusail/out/*-desk.jpg` show the approved framing.

- [ ] **Step 1: Write `crop.py`**

Use Pillow: crop, resize with LANCZOS, then save as a progressive JPEG at quality 82. The target sizes:

| Name | Desktop | Phone |
|---|---|---|
| `hero` | 2880×1520 (crop top = (H−h)·0.3, as in the mock) | 1170×780 |
| `t1` | 1632×1120 | 1170×804 |
| `rights` | 960×660 | 1170×804 |
| `2008` | 760×570 | 760×570 (same crop, never upscaled) |

Run it with `python3 -I`.

- [ ] **Step 2: Check the sizes and the budget**

Run: `for f in public/img/tracks/losail-*.jpg; do sips -g pixelWidth -g pixelHeight "$f" | tail -2 | tr '\n' ' '; ls -l "$f" | awk '{print $5}'; done`
Expected:
- The dimensions match the table.
- The four desktop files sum to under 1,000,000 bytes.

- [ ] **Step 3: Look at each file**

Read each JPEG and compare it with its Figma crop in `out/`:
- The hero's riders and floodlights are visible right of x ≈ 1150.
- No black padding.

- [ ] **Step 4: Commit**

```bash
git add public/img/tracks/losail-*.jpg
git commit -m "feat(tracks): Lusail photos for the hero, two corners and 2008"
```

### Task 3: The Lusail page

**Files:**
- Modify: `src/tracks/pages.ts` (add `losail` after `vegas`)
- Modify: `vite.config.ts:11` (add `{ path: '/tracks/losail' }` after `/tracks/vegas`)
- Test: `test/tracks/index-model.test.ts:21`
- Test: `e2e/tracks.spec.ts`

**Interfaces:**
- Consumes: the `TrackPage` type, the `commons(file)` helper, and the Task 2 image paths.
- Produces: `TRACK_PAGES.losail`.

- [ ] **Step 1: Change the index unit test**

In `test/tracks/index-model.test.ts`, the linked-cells assertion becomes:

```ts
expect(cells.filter((c) => c.to !== null).map((c) => c.id)).toEqual(['vegas', 'losail'])
```

- [ ] **Step 2: Change and add the e2e tests**

Make these changes in `e2e/tracks.spec.ts`:

1. **Index test.** The fixture's lit race is Interlagos, which has no page, so its chip is not a link. Replace the `.sizes a.cell` line with:
   ```ts
   const links = page.locator('.sizes a.cell').filter({ visible: true })
   await expect(links).toHaveCount(2)
   await expect(links.nth(0)).toHaveAttribute('href', '/tracks/vegas')
   await expect(links.nth(1)).toHaveAttribute('href', '/tracks/losail')
   ```

2. **New test, in both themes.** Name: `` `the Lusail page reads the lap from the stored pole lap, ${colorScheme}` ``.
   - Setup: `stubPole(page, 'losail')`, then `loaded(page, '/tracks/losail')`.
   - Assertions:
     - title `Lusail · The tracks · Lights Out`;
     - the h1 is `Lusail.`;
     - `The tracks · Round 22 · Qatar` is visible;
     - `.place` contains `Main straight · 1,068 m` and `Fast rights · T12–14, no braking`;
     - `Sixteen turns.` is visible;
     - after scrolling to `.braking`: `Seven stops.`, the first `.braking .stat` contains `250`, and `/Piastri's pole lap, 2025, 1:19\.387/`;
     - `.braking .wet` has count 0;
     - `/from Turn 10 to Turn 16/` is visible;
     - `noOverflow` is true;
     - `errors` is empty.

3. **New test.** Name: `the Lusail place tags sit inside the band`.
   - Load `/tracks/losail` and wait for `data-gl` on the stage, as the place-tag test does.
   - Get the stage's bounding box.
   - For each `.place`, assert its box is inside the stage box: left ≥ stage left, right ≤ stage right, top ≥ stage top.
   - This runs on both the desktop and phone projects.

4. **Credited test.** Turn `every photo on the Las Vegas page is credited` into a loop over `[['vegas', 'Las Vegas'], ['losail', 'Lusail']]`, named `` `every photo on the ${name} page is credited` ``.
   - Add: `expect(await page.locator('main img:not(.stage img, .sizes img)').count()).toBeGreaterThanOrEqual(5)`.

- [ ] **Step 3: Run the tests and watch them fail**

Run: `bun test test/tracks/index-model.test.ts`
Expected: FAIL, received `['vegas']`.

Run: `bunx playwright test e2e/tracks.spec.ts -g "Lusail"`
Expected: FAIL. The h1 shows `No page for this track yet`, and the credited test fails on the image count.

- [ ] **Step 4: Add `TRACK_PAGES.losail`**

Use the exact strings from the spec's table, corners and history rows:
- `src` values: `/img/tracks/losail-hero.jpg`, `losail-t1.jpg`, `losail-rights.jpg`, `losail-2008.jpg`.
- `source` values: `commons('2012_Qatar_Grand_Prix_start.jpg')`, `commons('Marc_Márquez_leads_the_pack_2014_Losail.jpeg')`, `commons('Pol_Espargaró_2021_Doha_4.jpg')` and `commons('CaseyStoner-01.jpg')`.
- If repeating it, a `const REPSOL = 'Photo Box Repsol · CC BY 2.0'` next to `DHS`.

Then add `{ path: '/tracks/losail' }` to the prerender list in `vite.config.ts`.

- [ ] **Step 5: Run the tests and watch them pass**

Run: `bun test test/tracks` and `bunx playwright test e2e/tracks.spec.ts`
Expected: all PASS on both the desktop and phone projects.

- [ ] **Step 6: Lint and commit**

Run: `bun run lint`
Expected: clean.

```bash
git add src/tracks/pages.ts vite.config.ts test/tracks/index-model.test.ts e2e/tracks.spec.ts
git commit -m "feat(tracks): /tracks/losail reads the lap, its fast rights, its braking and how bikes came first"
```

### Task 4: Full checks and live look

**Files:** none, unless a check finds something.

- [ ] **Step 1: Run the full suite**

Run: `bun test > <ws>/unit.log 2>&1; tail -5 <ws>/unit.log` and `bunx playwright test > <ws>/e2e.log 2>&1; tail -15 <ws>/e2e.log`
Expected:
- 0 fail.
- The known phone flake `car.spec.ts:295` is allowed only if it passes when repeated alone.

- [ ] **Step 2: Live check in the browser**

1. Seed the local KV with the Lusail pole lap: `bunx wrangler kv key put --local --binding SEASON_KV 'pole:v1:losail' --path test/fixtures/pole/losail.json`.
2. Start the dev server.
3. Scroll `/tracks/losail` at 1440 and 390, in light and dark.
4. Compare with Figma 429:1539, 429:1804, 429:2069 and 429:2329.
5. Check: the replay clock runs, the place tags don't sit under the replay HUD, the hero title doesn't cover the riders, and there are no layout gaps.

- [ ] **Step 3: Save screenshots for the PR**

Save desktop top (light), braking and history (dark), and phone light and dark to the scratchpad.
