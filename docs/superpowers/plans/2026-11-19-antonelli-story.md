# Antonelli story page: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/people/antonelli` renders the approved story page, with a real 3D Monza band that marks pole and his grid 19 slot, while every other driver keeps the template.

**Architecture:**
- **Monza becomes a modelled circuit.** The Blender build gains optional `marks` (named points in metres past the finish line), written as `mark-<name>` empties and pins. Circuits with marks also get a label-free poster.
- **The stage gains marks and a bare mode.**
  - `CircuitStage` draws a place tag on a mark as well as on a turn, with an `accent` flag for the purple pill.
  - With `bare`, it hides the sector-label meshes and shows the label-free poster.
- **The story is mostly fixed copy.** It lives in `src/people/story.ts`. A small `storyPage(snapshot, now)` view model reuses `career()` and `driverPage()` for the live numbers and the race list. `StoryPage.tsx` reuses the template's `Hero`, `Races` and the shared `Next`.

**Tech Stack:** TanStack Start, React, three.js (R3F), plain CSS, Effect Schema, bun test with happy-dom, Playwright, Blender 4 (Python).

**Spec:** `docs/superpowers/specs/2026-11-19-antonelli-story-design.md`

## Global Constraints

- **Code style:**
  - No code comments anywhere.
  - No `as` casts except `as const`. No `any`, no non-null `!`, no lazy `unknown`.
  - Prettier only as `--single-quote --no-semi --print-width 200`, on changed hunks only.
  - `bun run lint` (oxlint, tsc, no-comments) stays clean.
- **Copy:**
  - Story strings are exactly as written in the spec, sections 1–8: `·` separators, `Read  →` with two spaces where the template uses it, and purple payoff rows.
  - The story uses "he". The template's pronoun-free rule does not apply to this page.
- **Data:**
  - Never invent numbers. The live numbers come from the snapshot; history is fixed copy.
  - Hide the "in 2026" pieces once `driverStandings.season !== 2026`.
- **Monza values:**
  - Marks: `{"pole": 276.3, "grid-19": 125.4}`.
  - Cuts: `(0.3303, 0.6425)`. Turns: `[5, 15, 28, 40, 45, 55, 64, 79, 86, 93, 106]`.
  - Facts: `turns: 11`, `direction: 'clockwise'`, `distanceKm: '306.720'`.
  - OpenF1 name: `'Monza'`. Model: `it-1922`.
- **Photos:**
  - Commons only. Captions name the subject, the place and the year.
  - Credits parse as `Photo <by> · <licence>`.
  - Commons requests use the UA `LightsOutResearch/1.0 (personal non-commercial project)`, at least 2 s apart. Each download goes in its own new scratchpad directory, and Python reading downloads runs with `-I`.
- **Commits and side effects:**
  - Commits are local on `feat/antonelli`, with conventional present-tense titles and no Co-Authored-By trailer.
  - Don't touch `.playwright-mcp/`.
  - Never run `tools/refresh-season.ts`, because it writes production KV.

## Review Focus

1. **Monza outside the story.** A Monza weekend band in 2027 and `/lap/monza` pass no places, so they must not draw empty mark dots. Task 3 pins this: a stage draws a mark only when a place names it.
2. **Phone at 390 px.** Crowded turn chips are hidden there. The two tags must stay visible, inside the stage and clear of the visible chips, and `declutter()` must never hide a tag. Task 6 checks this on the phone project.
3. **Loading and a 503 from `/api/season`.** The story's fixed sections still render. No blank number, no "waiting" line mid-story, and no thrown error. Task 6 stubs a 503.
4. **The 2027 rollover.** "nine Grands Prix" and "Nine of them in 2026" disappear, and the career totals stay. Task 5 tests a snapshot whose standings season is 2027.
5. **Hash navigation through the shell.** `Read  →` must land on `/people#legends` at the Legends heading, not at the top. Every other `go()` keeps scrolling to the top. Task 6 checks the landing; the existing suites cover the rest.

---

### Task 1: Monza marks and a label-free poster from the Blender build

**Files:**
- Modify: `blender/circuits/circuit.py` (the `it-1922` entry is already there, uncommitted; add `"marks"`)
- Modify: `blender/circuits/build.py`
- Add the build outputs, all for `it-1922`:
  - `blender/circuits/data/it-1922-{m,elevation,terrain}.json`
  - `blender/circuits/it-1922.blend`
  - `public/circuits/it-1922{.glb,.webp,-1440.webp,-map.webp,-map-2048.webp,-bare.webp,-bare-1440.webp}`
  - `src/circuits/{pins,lines}/it-1922.json`
- Test: `test/circuits/marks.test.ts`

**Interfaces:**
- Produces: in `src/circuits/pins/it-1922.json`, the keys `"mark-pole"` and `"mark-grid-19"` as `[x, y]` (normalised to the 2880×1800 poster), next to the `turn-N` keys.
- Produces: glb nodes named `mark-pole` and `mark-grid-19`.
- Produces: `public/circuits/<model>-bare.webp` and `-bare-1440.webp`, only for circuits with marks.

- [ ] **Step 1: Write the failing test** in `test/circuits/marks.test.ts`:
  - `'pins the Monza marks where the 2026 grid stood'`: read the pins JSON.
    - `mark-pole` is within 0.003 of `[0.4231, 0.5719]`.
    - `mark-grid-19` is within 0.003 of `[0.3913, 0.5907]`.
    - These are the projections measured by `scratchpad/antonelli/tools/marks.py`.
  - `'ships the marks as model nodes'`: the it-1922 glb's JSON chunk (parse it like `assets.test.ts` does) has nodes named `mark-pole` and `mark-grid-19`.
  - `'ships a label-free poster for a circuit with marks, within the poster budget'`:
    - `it-1922-bare.webp` is under 220 KB and `it-1922-bare-1440.webp` under 90 KB.
    - No other `*-bare*.webp` exists in `public/circuits`.

- [ ] **Step 2: Run it and watch it fail.** Run `bun test test/circuits/marks.test.ts`. Expected: FAIL, because the keys, nodes and files don't exist yet.

- [ ] **Step 3: Implement marks and the bare render.**
  - `circuit.py`: the `it-1922` entry gains `"marks": {"pole": 276.3, "grid-19": 125.4}`. No other entry changes.
  - `build.py`:
    - After the turn empties, create `marks = [empty(f"mark-{name}", track.at(s) + Vector((0, 0, HEIGHT))) for name, s in CFG.get("marks", {}).items()]`. This is the same point `marks.py` measured. Keep marks out of `frame()`, `fit()` and `crop()`.
    - Change `project(scene, cam, turns)` to `project(scene, cam, turns + marks)`.
    - After the two poster renders, if `marks` is non-empty:
      - set `hide_render = True` on every object whose name contains `-label`;
      - render `{CID}-bare.webp` at 100 % and `{CID}-bare-1440.webp` at 50 %;
      - set `hide_render = False` on the same objects before `export(...)`.
  - Rebuild only Monza with `blender/circuits/build.sh it-1922`. `data/it-1922-osm.json` is already on disk, so nothing is fetched.

- [ ] **Step 4: Run the tests and watch them pass.**
  - Run `bun test test/circuits`. Expected: PASS.
  - Run `git status --short public/circuits src/circuits`. Expected: only `it-1922` paths. Every other circuit stays byte-identical.
  - Look at `it-1922-bare.webp`. It must show no S1/S2/S3 labels, and must otherwise match `it-1922.webp`.

- [ ] **Step 5: Commit.**

```bash
git add blender/circuits/circuit.py blender/circuits/build.py blender/circuits/data/it-1922-m.json blender/circuits/data/it-1922-elevation.json blender/circuits/data/it-1922-terrain.json blender/circuits/it-1922.blend public/circuits/it-1922* src/circuits/pins/it-1922.json src/circuits/lines/it-1922.json test/circuits/marks.test.ts
git commit -m "feat(circuits): the Monza model marks pole and the 19th grid slot and ships a poster without sector labels"
```

### Task 2: Monza joins the modelled circuits

**Files:**
- Modify: `src/circuits/modelled.ts` (append `'monza'` to `MODELLED`)
- Modify: `src/circuits/registry.ts`
- Test: `test/circuits/registry.test.ts`

**Interfaces:**
- Consumes: the Task 1 pins JSON.
- Produces:
  - `export type Mark = { name: string; x: number; y: number }`;
  - `CircuitInfo.marks?: ReadonlyArray<Mark>`, set only on Monza;
  - `circuitFor('monza')`.

- [ ] **Step 1: Write the failing tests** in `test/circuits/registry.test.ts`:
  - Add `'monza'` to the id list in `'names every circuit by its registry id'`.
  - `'models Monza from the it-1922 build, with its two grid marks'`:
    - `model` is `'it-1922'`, `openf1` is `'Monza'` and `cuts` equal `[0.3303, 0.6425]`.
    - `facts` match `{ turns: 11, direction: 'clockwise', distanceKm: '306.720', lengthKm: '5.793', laps: 53, firstGp: 1950 }`.
    - `pins` has length 11.
    - The sorted `marks.map((m) => m.name)` equals `['grid-19', 'pole']`, and every mark has `0 < x < 1` and `0 < y < 1`.
  - `'gives marks only to the circuits that have them'`: every circuit except Monza has `marks` undefined.

- [ ] **Step 2: Run them and watch them fail.** Run `bun test test/circuits/registry.test.ts`. Expected: FAIL, because `circuitFor('monza')` is undefined.

- [ ] **Step 3: Implement the registry entry.**
  - Add `marksOf(json: PinsJson): ReadonlyArray<Mark>`, which reads every `mark-*` key whose value is a point and strips the prefix.
  - The `monza` entry follows the Miami entry's shape: `fromCalendar(CALENDAR.monza)`, `factsOf(CALENDAR.monza, …)`, `pinsOf`, `lapsOf`, `line`, `cropOf`, `cuts`, and `marks: marksOf(it1922)`.

- [ ] **Step 4: Run all unit tests.** Run `bun test`. Expected: PASS. `assets.test.ts` and `fit.test.ts` now include Monza.

- [ ] **Step 5: Commit.**

```bash
git add src/circuits/modelled.ts src/circuits/registry.ts test/circuits/registry.test.ts
git commit -m "feat(circuits): Monza is a modelled circuit, with its 3D lap and pole replay"
```

### Task 3: The stage draws tags on marks and can hide the sector labels

**Files:**
- Create: `src/circuits/labels.ts`
- Modify: `src/circuits/Circuit.tsx`:
  - `bare` becomes a prop, and `Replay.bare` is removed;
  - `mark-*` objects are positioned.
- Modify: `src/weekend/CircuitStage.tsx` (the `Place` type, a `bare` prop, mark spans, the poster suffix)
- Modify: `src/tracks/pages.ts` (import `Place` from `CircuitStage.tsx`, no longer declare it)
- Modify: `src/styles/stage.css`
- Test: `test/circuits/labels.test.ts`
- Test: `test/weekend/circuit-band.test.tsx`

**Interfaces:**
- Consumes: `CircuitInfo.marks` from Task 2.
- Produces:
  - `export const hideLabels = (scene: THREE.Object3D): (() => void)` in `labels.ts`. It hides every visible object whose name matches `/-label/` and returns a function that shows them again.
  - `Circuit` props gain `bare?: boolean`.
  - The `Place` type, exported from `src/weekend/CircuitStage.tsx`:
    `export type Place = { label: string; up?: true; accent?: true } & ({ turn: number; mark?: undefined } | { mark: string; turn?: undefined })`
  - `CircuitStage` props gain `bare?: true`, and `places` becomes `ReadonlyArray<Place>`.
  - **Markup:** for each `info.marks` entry named by a place, a `<span className="mark" data-pin="mark-<name>" style="--px, --py">` holds that place's `<span className="place" data-accent?>`.

- [ ] **Step 1: Write the failing tests.**
  - `test/circuits/labels.test.ts`, `'hides only the sector labels and shows them again'`:
    - Build a `THREE.Group` with `S1-label`, `S1-label-halo`, `turn-1` and `road`.
    - After `hideLabels`, only the two labels are invisible.
    - After calling the returned function, all four are visible.
  - `test/weekend/circuit-band.test.tsx`:
    - `'rides each mark tag on its mark pin, the purple one marked accent'`:
      - Render the Monza stage with `places={[{ label: 'Pole', mark: 'pole' }, { label: 'Grid 19 · his start', mark: 'grid-19', accent: true }]}`.
      - `.pins .mark .place` maps to `[['mark-pole', 'Pole', false], ['mark-grid-19', 'Grid 19 · his start', true]]` as `[data-pin, text, has data-accent]`.
      - Each `.mark`'s `--px` and `--py` equal its registry mark.
      - `.pins .turn` still counts 11.
    - `'draws no mark that no place names'`: the Monza stage with no places has no `.pins .mark`.
    - `'a bare stage shows the poster without sector labels'`:
      - With `bare`, `img.poster` has `src` `/circuits/it-1922-bare.webp`, and its `srcset` contains `/circuits/it-1922-bare-1440.webp 1440w`.
      - Without `bare`, `src` is `/circuits/it-1922.webp`.
  - Existing tests there stay unchanged. They prove turn places still work.

- [ ] **Step 2: Run them and watch them fail.** Run `bun test test/circuits/labels.test.ts test/weekend/circuit-band.test.tsx`. Expected: FAIL.

- [ ] **Step 3: Implement.**
  - **`Circuit.tsx`:**
    - The label effect becomes `useEffect(() => (bare ? hideLabels(gltf.scene) : undefined), [gltf, bare])`.
    - Collect `mark-*` objects into their own list in the same traverse that collects `turn-` markers.
    - Each frame, position marks exactly like turn pins (`pinEls`, `screen`, transform, visibility). Never add them to `shown`, so `declutter` never sees them, and never sort them with the turns.
  - **`CircuitStage.tsx`:**
    - `poster` is `/circuits/${info.model}${bare ? '-bare' : ''}`.
    - Pass `bare={bare === true || hud !== undefined}` to `Circuit`. This keeps today's replay-HUD behaviour.
    - Turn places filter on `p.turn === pin.turn`, as now.
  - **`stage.css`:**
    - `.circuit .mark` is a dot on the track: 10 px, 8 px below 761 px.
    - Its `.place` hangs below on a 1 px line whose length is `var(--drop, 14px)`.
    - `.place[data-accent] b` is purple (`var(--purple)` fill, light ink), with a purple dot.
    - The white pill stays the existing `.place b` look.

- [ ] **Step 4: Run the tests and watch them pass.**
  - Run `bun test`. Expected: PASS.
  - Run `bunx playwright test e2e/tracks.spec.ts e2e/weekend.spec.ts e2e/lap.spec.ts`. Expected: PASS. Track place tags and the replay HUD still hide labels as before.

- [ ] **Step 5: Lint and commit.**

```bash
git add src/circuits src/weekend/CircuitStage.tsx src/tracks/pages.ts src/styles/stage.css test/circuits/labels.test.ts test/weekend/circuit-band.test.tsx
git commit -m "feat(stage): place tags can mark a point on the lap, and a bare stage hides the sector labels"
```

### Task 4: Story copy and photos

**Files:**
- Create: `src/people/story.ts`
- Create: `public/img/people/antonelli-story.jpg`, `antonelli-story-phone.jpg`, `antonelli-w17.jpg`, `senna-1989.jpg`
- Modify: `src/credits/photos.ts` (add each `STORY_PHOTOS` entry with `usedOn: 'The people'`)
- Test: `test/people/story.test.ts`
- Test: `test/credits/photos.test.ts`

**Interfaces:**
- Produces, from `story.ts`, all `as const` and holding the spec's copy verbatim:
  - `HERO = { given: 'Kimi', family: 'Antonelli', sub: '2026 world champion. Born in Bologna, 25 August 2006.', photo: Photo }`;
  - `NUMBERS`: fixed label pieces, the payoff and the fixed stat notes;
  - `RECORD = { number: '20', unit: 'years and 68 days old', headline, body, payoff: '3 years and 66 days younger.', ages: ReadonlyArray<{ name: string; season: number; years: number; days: number }>, credit }`;
  - `MONZA = { label, headline, body, stats, tags, explain, footnote }`:
    - `tags` is a `ReadonlyArray<Place>` of `[{ label: 'Pole', mark: 'pole' }, { label: 'Grid 19 · his start', mark: 'grid-19', accent: true }]`.
    - `explain` uses the toggle's real name: `'Sectors: the lap in three timed parts. Turns: the eleven numbered turns. He started 19th, about 150 m behind the car on pole.'`.
  - `W17: Photo`;
  - `MILESTONES: ReadonlyArray<{ year: number; line: string }>` (six rows);
  - `NEXT_LEGENDS = { label: 'Next · Legends', title: 'Where the 12 came from.', line: 'Read', to: '/people#legends', photo: Photo }`;
  - `STORY_PHOTOS = [HERO.photo, W17, NEXT_LEGENDS.photo]`.
- **Photos:**

| Use | Commons file | File here | Crop | `place` | `credit` |
|---|---|---|---|---|---|
| Hero | `2026_Chinese_GP_-_Mercedes_-_Kimi_Antonelli_-_Post_Race_Celebration.jpg` | `antonelli-story.jpg` and `-phone.jpg` | 1440:760 at most 1920 wide; phone 780×520 | `'Antonelli after his first win · Shanghai, 2026'` | `'Photo Liauzh · CC BY 4.0'` |
| W17 band | one of `FIA_F1_Austria_2026_Nr._12_Antonelli_(1|3|4).jpg`, whichever keeps the car whole at 2:1 | `antonelli-w17.jpg` | 1920×960 | `'Kimi Antonelli, Mercedes W17 · Red Bull Ring, 2026'` | `'Photo Lukas Raich · CC BY-SA 4.0'` |
| Next | `Ayrton_Senna_1989_Belgian_GP_podium.jpg` | `senna-1989.jpg` | full height, 0.94:1 portrait, never enlarged | `'Ayrton Senna, Belgian Grand Prix podium · Spa, 1989'` | `'Photo madagascarica · CC BY 2.0'` |

- [ ] **Step 1: Write the failing tests.**
  - `test/people/story.test.ts`, `'credits every story photo from Commons, and the files exist'`:
    - Each `STORY_PHOTOS` entry has a `source` starting with `https://commons.wikimedia.org/wiki/File:`.
    - Its `credit` parses with `creditParts`.
    - Its `src` file exists, and so does the hero's `-phone.jpg`.
  - `test/people/story.test.ts`, `'the record copy agrees with itself'`:
    - Use a test-local `age(born, on)` that returns full years plus days since the last birthday.
    - Antonelli: 2006-08-25 to 2026-11-01 gives `{ years: 20, days: 68 }`, matching `RECORD.number` and `RECORD.unit`.
    - The other four `RECORD.ages` rows match:
      - Vettel 1987-07-03 to 2010-11-14;
      - Hamilton 1985-01-07 to 2008-11-02;
      - Alonso 1981-07-29 to 2005-09-25;
      - Verstappen 1997-09-30 to 2021-12-12.
    - Vettel minus Antonelli is 3 years and 66 days, matching `RECORD.payoff`.
    - Antonelli is first, and the rows are in ascending age.
  - `test/credits/photos.test.ts`: the credits list includes all three story photos with `usedOn` containing `'The people'`.

- [ ] **Step 2: Run them and watch them fail.** Run `bun test test/people/story.test.ts test/credits`. Expected: FAIL.

- [ ] **Step 3: Download and crop the photos.**
  - Fetch previews from `thumb.wikimedia.org` at a standard width. Use 3840 for the hero; the W17 frames use their own widths.
  - Fetch originals under 3840 px, such as the 1800 px Senna, through the Playwright browser. `upload.wikimedia.org` answers 429 to scripted clients.
  - Crop with PIL in a scratchpad script run with `python3 -I`. Save JPEG at quality 82.
  - Check the hero the way the people heroes were checked: the subject clear of the bottom-left 740 × 360 title block at 1000–1920 px with `object-fit: cover`.

- [ ] **Step 4: Write `story.ts` and the credits entry.** Then run the Step 1 tests. Expected: PASS.

- [ ] **Step 5: Lint and commit.**

```bash
git add src/people/story.ts src/credits/photos.ts public/img/people/antonelli-story.jpg public/img/people/antonelli-story-phone.jpg public/img/people/antonelli-w17.jpg public/img/people/senna-1989.jpg test/people/story.test.ts test/credits/photos.test.ts
git commit -m "feat(people): the Antonelli story's copy and three credited Commons photos"
```

### Task 5: The story's live numbers

**Files:**
- Modify: `src/people/page-model.ts` (add `storyPage` beside `driverPage`)
- Test: `test/people/story.test.ts`

**Interfaces:**
- Consumes: `career()`, `driverPage()`, `words`, `capital`, and `NUMBERS` from Task 4.
- Produces:

```ts
export type StoryPage = {
  label: string
  numbers: { label: string; body: string; stats: ReadonlyArray<{ label: string; value: string; note: string }>; credit: string }
  races: NonNullable<DriverPage['races']>
}
export function storyPage(snapshot: SeasonSnapshot, now: Date): StoryPage | null
```

- [ ] **Step 1: Write the failing tests** in `test/people/story.test.ts`, using `snapshot` and `NOW` from `./fixture.ts`:
  - `'reads the story numbers from the snapshot'`. `storyPage(snapshot, NOW)` has:
    - `label`: `'The people · Mercedes · No. 12'`;
    - `numbers.label`: `'In Formula 1 · 44 starts'`;
    - `numbers.body`: `'He arrived in 2025 at 18, the third-youngest driver in F1 history. A year later he won nine Grands Prix.'`;
    - `numbers.stats` as `[label, value, note]`:
      - `['Wins', '9', 'Nine of them in 2026']`
      - `['Pole positions', '7', 'The first at 19, the youngest ever']`
      - `['Podiums', '19', 'From 44 starts']`
      - `['Car number', '12', 'Kept for his title defence']`
    - `numbers.credit`: `'Figures: Jolpica F1 API, after round 20, São Paulo'`;
    - `races.rows` of length 20, with exactly one `best` row, whose `grandPrix` is `'Chinese'`.
  - `'agrees with the career on the template'`: wins, poles, podiums and starts equal `career(snapshot.people, 'antonelli')`'s.
  - `'drops the 2026 win count once the standings move to 2027'`:
    - Use `{ ...snapshot, driverStandings: { ...standings, season: 2027 } }`.
    - `numbers.body` is only the first sentence.
    - The Wins note is `''`.
    - The values are still `'9'`, `'7'`, `'19'` and `'12'`.
  - `'is null without people data or without an Antonelli standings row'`.

- [ ] **Step 2: Run them and watch them fail.** Run `bun test test/people/story.test.ts`. Expected: FAIL, because `storyPage` is not exported.

- [ ] **Step 3: Implement `storyPage`.**
  - Take `label`, `races` and `season.credit` from `driverPage(snapshot, 'antonelli', now)`, and the totals from `career(people, 'antonelli')`.
  - Return null if either is null.
  - The 2026 win count is the classified wins in `people.results.antonelli`. It only shows when `driverStandings.season === 2026`.
  - Its words come from `words`/`capital`.

- [ ] **Step 4: Run the tests and watch them pass.** Run `bun test test/people`. Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/people/page-model.ts test/people/story.test.ts
git commit -m "feat(people): the Antonelli story reads its career numbers and race list from the season data"
```

### Task 6: The story page

**Files:**
- Create: `src/people/StoryPage.tsx`
- Modify: `src/people/DriverPage.tsx`:
  - export `Hero` and `Races`;
  - `Hero` renders the label paragraph only when `hero.label` is non-empty.
- Modify: `src/routes/people.$driver.tsx`:
  - `antonelli` renders `StoryPage`;
  - head title `Kimi Antonelli · The people · Lights Out` and description `Kimi Antonelli: the youngest champion in Formula 1 history, from Bologna to the 2026 title.`;
  - add the `stage.css` link.
- Modify: `src/shell/context.ts` (`To` gains `` `/people#${string}` ``)
- Modify: `src/shell/Shell.tsx`. After `router.navigate`, `go()` scrolls to the element whose id is the hash, immediately, when `to` has one. Otherwise it calls `scrollTop` as now.
- Modify: `src/styles/people.css`
- Test: `e2e/people.spec.ts`

**Interfaces:**
- Consumes: `storyPage` (Task 5), `story.ts` (Task 4), `CircuitStage` with `bare` and mark places (Task 3), `circuitFor('monza')` (Task 2), `Hero`, `Races` and `Next`.
- **Markup:** the root is `div.chapter-page.tracks-page.track-page.driver-page.story`. It renders, in order:
  1. `section.top`: `Hero` with `{ ...HERO, label: model?.label ?? '' }`;
  2. `section.story-numbers`, only with a model;
  3. `section.record`;
  4. `section.band.monza-band[data-theme=dark]` with `h2#monza`, holding `div.circuit > CircuitStage` with `bare`, `lap={null}` and `places={MONZA.tags}`;
  5. `section.w17`;
  6. `section.milestones`;
  7. `Races`, only with a model;
  8. `Next {...NEXT_LEGENDS}`.
- **Loading the stage:** the stage loads on approach through `onNear`, using a `useCallback` setter. There is no pole replay.
- **Tag drops:** desktop pole 143 px and grid 19 186 px; below 761 px, 56 px and 82 px. Set them as `--drop` on `.story .mark[data-pin='mark-pole']` and `.story .mark[data-pin='mark-grid-19']`.

- [ ] **Step 1: Write the failing e2e tests** in `e2e/people.spec.ts`, with the `errors` fixture:
  - **`the Antonelli story tells the title, the record and Monza, ${colorScheme}`**, for each scheme:
    - The page title and h1 `Kimi Antonelli.` are right.
    - The h2s read, in order: `Second season, first title.`, `Youngest champion ever.`, `Nineteenth to first.`, `From Bologna to Mexico City.`, `Race by race.`, `Where the 12 came from.`.
    - `.story-numbers` contains `44 starts` and `nine Grands Prix`.
    - `.races tbody tr` counts 20, and one `tr.is-best` contains `Chinese`.
    - `.monza-band img.poster` has a `src` ending `/circuits/it-1922-bare.webp`.
    - Nothing scrolls sideways, and `errors` is `[]`.
  - **`the Monza tags sit inside the stage and clear of the chips and the headline`**:
    - Run at 1200 and 1440 px, and on the phone project.
    - Wait for `.monza-band .stage[data-gl]`.
    - Exactly 2 `.mark .place b` are visible.
    - Each lies inside the `.stage` box.
    - Each is at least 12 px clear of every visible `.turn b` without `data-crowd`.
    - On desktop, each is also 12 px clear of `#monza`'s word rects. Use the tracks spec's `--wdth: 112` method.
  - **`Read takes the story to the legends`**: clicking `.next .read` gives the URL `/people#legends`, and `#legends` is in the viewport.
  - **`a 503 keeps the story and hides only the live numbers`**:
    - Under `stubSeason` 503, h1 and `Youngest champion ever.` are visible.
    - `.story-numbers`, `.races` and `.people-empty` each count 0.
    - `errors` is `[]`.
  - **Ocon:** add to the existing Ocon test that `.story` counts 0.
  - **Credits:** add `/people/antonelli` to the `every photo on ${path} is credited` paths, and skip `img.closest('.stage')` there, as the tracks spec does.

- [ ] **Step 2: Run them and watch them fail.** Run `bunx playwright test e2e/people.spec.ts`. Expected: the new tests FAIL; the existing ones pass.

- [ ] **Step 3: Build the page and its styles** to frames 449:1037, 453:164, 455:83 and 456:92.
  - Use the existing tokens and the `src/motion/motion.ts` helpers (`sweep` on headings, `roll` on numbers), as `DriverPage` does.
  - The Monza band is `#06080E` in both themes, reusing the tracks band styles.

- [ ] **Step 4: Run the tests and watch them pass.**
  - Run `bunx playwright test e2e/people.spec.ts e2e/tracks.spec.ts e2e/home.spec.ts`. Expected: PASS on desktop and phone.
  - Run `bun run lint`. Expected: clean.

- [ ] **Step 5: Commit.**

```bash
git add src/people src/routes/people.\$driver.tsx src/shell/context.ts src/shell/Shell.tsx src/styles/people.css e2e/people.spec.ts
git commit -m "feat(people): Kimi Antonelli's page tells the youngest title, Monza from 19th and every race of 2026"
```

### Task 7: Full checks and a live look

- [ ] **Step 1: Run the checks.**
  - Run `bun run lint`, `bun test`, then the full Playwright suite in the background (`bunx playwright test`, about 15 minutes; wait with `t3_background_wait`).
  - Expected: all clean. Name any failure by test; known flakes are `weekend:95/:363` and `car.spec:295`.

- [ ] **Step 2: Run the build.** Run `bun run build`. Expected: the prerender list includes `/people/antonelli` and `/lap/monza`, the latter reached through the explore link.

- [ ] **Step 3: Live look on the dev server.**
  - Use the fixture snapshot stubbed. Check `/people/antonelli` at 1200, 1440 and 1920 px and at 390 px, in both themes. Nothing should scroll sideways.
  - Compare against frames 449:1037, 453:164, 455:83 and 456:92. Turn the Monza band and check that the tags follow the model.
  - Open `/lap/monza` once.
  - Screenshot for the PR, then stop the dev server.
