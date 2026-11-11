# Chapter 01, A race weekend: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/chapters/race-weekend`, the guide's first chapter: the approved Figma mock plus the real pole lap on its 3D circuit, a live line for this weekend, the latest real result under the posters, and inline word definitions. Then point "Start the guide" at it.

**Architecture:** One pure page-model function turns the season snapshot into the chapter's live bits. It is unit-tested against the real fixture, including Jolpica's glitches. The weekend band's circuit stage moves into a shared component and a shared stylesheet, so the chapter and `/weekend` render the same stage. The chapter page is static copy plus those live bits, and it still teaches when the snapshot is missing.

**Tech Stack:** TanStack Start (file routes), React 19, GSAP (`#/motion/motion.ts` helpers), Effect schema types, `bun test`, Playwright (`e2e/`, fixture clock at `SNAPSHOT_AT` = 2026-11-06T15:00Z).

**Spec:** `docs/superpowers/specs/2026-11-11-chapter-01-race-weekend-design.md`. Figma mock: file `IPkJZWQnY0IKdIjf6Nuugl`, nodes 89:2 (light) and 94:2 (dark).

## Global Constraints

- No code comments anywhere; no `as` casts except `as const`; no `any`; no non-null `!`; `bun run lint` must pass. No formatter: match the existing style by hand (single quotes, no semicolons, blank line between statements as in `src/weekend/*`).
- Commits: conventional, present-tense titles, **no Co-Authored-By trailer**. Local commits only. No push, PR or deploy without Praffi's word.
- Never write production KV. Never use bare `git stash`. The shell `head` command is broken; use `sed -n`.
- Media: Wikimedia Commons CC0 / CC BY / CC BY-SA / PD only, credited with place and year. No OpenF1 `headshot_url`. No F1, FIA or team logos as graphics.
- Rulebook copy (2026): Q1 18 min, Q2 15 min, Q3 **13 min**; six out after Q1 and after Q2, ten in Q3. Sprint qualifying 12 / 10 / 8 min. Sprint 100 km, 8 to 1 for the top eight. Race 25 18 15 12 10 8 6 4 2 1, with no fastest-lap point since 2025. Practice 60 min.
- Never invent numbers: a live line whose data is missing or inconsistent is left out, never estimated.
- Both themes; 390 px phones with no horizontal overflow; reduced motion hides nothing; one ease family (`launch`, `brake`).

## Review Focus

1. **Glitchy Jolpica qualifying data.** The fixture has two drivers at P8, empty-string times, and 11 drivers with a Q3 time. Expected: a knockout line whose group isn't exactly six is left out. The pole line still shows. *(Task 1 test "drops a knockout line whose group is not six")*
2. **The visitor's days differ from the track's.** In Jakarta the São Paulo race is on Monday. Expected: `Fri–Sun at the track, Fri–Mon your time`. *(Task 1 tests on São Paulo and Las Vegas)*
3. **No snapshot (503 or cold KV).** Expected: the chapter still renders every poster with no data lines, no weekend line and no pole section, and the loader lifts. *(Task 3 e2e "a 503 still teaches the weekend")*
4. **Unconfirmed session times.** Expected: the line still renders, with days taken in UTC as `src/weekend/page-model.ts` does. *(Task 1 test "reads days in UTC for unconfirmed sessions")*
5. **The weekend band after the stage extraction.** Expected: `/weekend` looks and behaves exactly as before. *(Task 2: the whole `e2e/weekend.spec.ts` suite stays green)*

---

### Task 1: Chapter page model

**Files:**
- Create: `src/chapter/page-model.ts`
- Test: `test/chapter/page-model.test.ts`

**Interfaces:**
- Consumes: `pickRace`, `gpName`, `PickedRace['kind']` from `#/season/weekend.ts`; `circuitFor` from `#/circuits/registry.ts`; `isModelled` from `#/circuits/modelled.ts`; `calendarCircuit` from `#/circuits/calendar.ts` (track tz, falling back to `circuitFor(id)?.tz`, then `'UTC'`, as `zoneOf` does in `src/weekend/page-model.ts`).
- Produces:
  ```ts
  export type Format = 'standard' | 'sprint'
  export type Knockout = { q1: string | null; q2: string | null; pole: string | null }
  export type Ladder = { caption: string; codes: ReadonlyArray<string> }
  export type ChapterLive = { circuit: CircuitInfo | undefined; weekend: string | null; format: Format; knockout: Knockout; ladder: Ladder | null }
  export function chapterLive(snapshot: SeasonSnapshot, now: Date, zone: string): ChapterLive
  ```

Rules the tests pin:
- **circuit:** take `circuitFor` of the circuit of `snapshot.latest.qualifying.race`, matched to a `snapshot.calendar` race by season and round, if it is modelled. Otherwise, `pickRace`'s race circuit if modelled. Otherwise, the modelled circuit of the calendar race whose `Race` session started most recently before `now`. Otherwise `undefined`.
- **weekend:** `${label} · ${gpName(race)} · ${trackDays}` for `pickRace`'s race, with `label` = `This weekend` / `Next` / `Last race` for kind `this-weekend` / `next` / `finale`. Days run from the first session's weekday to the `Race` session's weekday, short English (`Thu–Sat`), read in the track tz, or in UTC when that session's `timeConfirmed` is false. If the visitor's days differ, append `, ${yourDays} your time` and make the track part `${trackDays} at the track`. `null` when `pickRace` is `null`.
- **format:** `'sprint'` when `pickRace`'s race has a `Sprint` session, else `'standard'` (also when there is no race).
- **knockout:** the race name is `gpName` of the calendar race matching `latest.qualifying.race`. `q2` = the drivers with `q2 !== null && q3 === null`; `q1` = the drivers with `q2 === null`. Each is `${name} · out: ${codes joined by ' '}` only when the group has exactly 6, else `null`. `pole` = the row with `position === 1`: `${name} · pole: ${code} ${time}`, where `time` is its first non-empty of `q3`, `q2`, `q1`; `null` if there is no such row or time. A driver's code is `driver.code ?? familyName.slice(0, 3).toUpperCase()`. All three are `null` when `latest` or `latest.qualifying` is null.
- **ladder:** from `latest.race`: `codes[i]` = the code of the row with `position === i + 1`, or `''` if missing; `caption` = `Scored at the ${gpName(race)}`. `null` when `latest` is null.

- [ ] **Step 1: Write the failing tests** (decode the fixture as `test/weekend/page-model.test.ts` does, and set `process.env.TZ = 'UTC'` in `beforeAll`)

```ts
const live = (iso: string, snapshot = fixture, zone = 'Asia/Jakarta') => chapterLive(snapshot, new Date(iso), zone)

it('names this weekend with the visitor days when they differ', () => {
  expect(live('2026-11-06T15:00:00Z').weekend).toBe('This weekend · São Paulo GP · Fri–Sun at the track, Fri–Mon your time')
})

it('reads Las Vegas as Thursday to Saturday at the track', () => {
  expect(live('2026-11-15T00:00:00Z').weekend).toBe('Next · Las Vegas GP · Thu–Sat at the track, Fri–Sun your time')
  expect(live('2026-11-15T00:00:00Z', fixture, 'America/Los_Angeles').weekend).toBe('Next · Las Vegas GP · Thu–Sat')
})

it('reads days in UTC for unconfirmed sessions', () => {
  expect(live('2026-11-15T00:00:00Z', unconfirm(fixture, 21)).weekend).toMatch(/^Next · Las Vegas GP · /)
})

it('names the last race once the season is over', () => {
  expect(live('2026-12-20T00:00:00Z').weekend).toMatch(/^Last race · Abu Dhabi GP · /)
})

it('defaults to the sprint format on a sprint weekend', () => {
  expect(live('2026-10-09T00:00:00Z').format).toBe('sprint')
  expect(live('2026-11-06T15:00:00Z').format).toBe('standard')
})

it('follows the latest qualifying circuit when it has a model', () => {
  expect(live('2026-11-15T00:00:00Z', qualifiedAt(fixture, 20, 'São Paulo Grand Prix')).circuit?.id).toBe('interlagos')
})

it('falls back to the weekend circuit, then the latest modelled one raced', () => {
  expect(live('2026-11-06T15:00:00Z').circuit?.id).toBe('interlagos')
  expect(live('2026-10-09T00:00:00Z').circuit?.id).toBe('albert_park')
})

it('writes the knockout and pole lines from the latest qualifying', () => {
  expect(live('2026-11-06T15:00:00Z').knockout).toEqual({ q1: null, q2: 'Mexico City GP · out: COL PIA BOR BEA SAI ALB', pole: 'Mexico City GP · pole: HAM 1:16.514' })
})

it('drops a knockout line whose group is not six', () => {
  expect(live('2026-11-06T15:00:00Z').knockout.q1).toBeNull()
})

it('puts the latest race top ten under the ladder', () => {
  expect(live('2026-11-06T15:00:00Z').ladder).toEqual({ caption: 'Scored at the Mexico City GP', codes: ['VER', 'HAM', 'ANT', 'LEC', 'NOR', 'RUS', 'LAW', 'BOR', 'HAD', 'HIR'] })
})

it('leaves every data line out with no latest results', () => {
  const bare = live('2026-11-06T15:00:00Z', { ...fixture, latest: null })

  expect(bare.knockout).toEqual({ q1: null, q2: null, pole: null })
  expect(bare.ladder).toBeNull()
})
```

`unconfirm(snapshot, round)` sets every session of that round to `timeConfirmed: false`. `qualifiedAt(snapshot, round, raceName)` sets `latest.qualifying.race` to `{ season: 2026, round, raceName }`. Both are local helpers in the test file, built with spreads like `unconfirm` in `test/weekend/page-model.test.ts`.

- [ ] **Step 2: Run them and watch them fail**

Run: `bun test test/chapter/page-model.test.ts`
Expected: FAIL, because `src/chapter/page-model.ts` does not exist.

- [ ] **Step 3: Implement `chapterLive` in `src/chapter/page-model.ts`** to the rules above. Reuse `pickRace` and `gpName`; do not copy them. Weekdays come from `Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short' })`.

- [ ] **Step 4: Run the tests**

Run: `bun test test/chapter/page-model.test.ts && bun run lint`
Expected: all pass, lint clean.

- [ ] **Step 5: Commit**

```bash
git add src/chapter/page-model.ts test/chapter/page-model.test.ts
git commit -m "feat(guide): the chapter model reads this weekend, the pole circuit and the latest knockout from the season"
```

---

### Task 2: A shared circuit stage

**Files:**
- Create: `src/weekend/CircuitStage.tsx`, `src/styles/stage.css`
- Modify: `src/weekend/CircuitBand.tsx` (remove `Stage`, `CREDIT`, `TELEMETRY`; use the new exports), `src/styles/weekend.css` (stage rules move out), `src/routes/weekend.tsx` (links `stage.css` too)

**Interfaces:**
- Produces:
  ```ts
  export function CircuitStage({ info, near, lap, onNear }: { info: CircuitInfo; near: boolean; lap: PoleLap | null; onNear: () => void }): JSX.Element
  export function useNearLap(id: string): { near: boolean; onNear: () => void; lap: PoleLap | null }
  export const stageCredit: (lap: PoleLap | null) => string
  ```
  `CircuitStage` is today's `Stage`, moved unchanged: stage, pins, PoleHud, toggles and the "Explore the lap in 3D" link. `useNearLap` is the `near` state, the `onNear` callback and the `usePoleLap(id, near)` call now inside `CircuitBand`. `stageCredit` returns `CREDIT` or `CREDIT + TELEMETRY`.
- CSS contract: every rule that styles the stage itself moves from `.weekend-page .band X` to `.circuit X` in `stage.css`. That covers `.stage`, `.poster`, `.gl`, `.pins`, `.turn`, `.toggles`, `.explore`, `.credit`, `.replay`, `.car`, `.readout`, plus their `hover: none`, reduced-motion, 1199 px and 760 px media rules. Weekend-only layout stays in `weekend.css`: the stage's `grid-column` and its `-150px` top margin, the `.card` grid, `.figures` and `.schedule`. The weekend band's `<section>` becomes `className="band circuit"`.

- [ ] **Step 1: Move the code and CSS** as specified. Behaviour does not change.
- [ ] **Step 2: Prove the weekend band is unchanged**

Run: `bun run lint && bunx playwright test e2e/weekend.spec.ts`
Expected: lint clean, and every weekend test passes with no test edited.

- [ ] **Step 3: Commit**

```bash
git add src/weekend src/styles/stage.css src/styles/weekend.css src/routes/weekend.tsx
git commit -m "refactor(weekend): the circuit stage and its styles stand alone so other pages can show it"
```

---

### Task 3: The chapter page

**Files:**
- Create: `src/routes/chapters.race-weekend.tsx`, `src/chapter/RaceWeekend.tsx` (page, motion, hero, photo, words, next), `src/chapter/Days.tsx` (the weekend section and its toggle), `src/chapter/Posters.tsx` (knockout, pole band, ladder), `src/chapter/words.ts`, `src/chapter/Term.tsx`, `src/styles/chapter.css`, `e2e/chapter.spec.ts`
- Generated: `src/routeTree.gen.ts` (regenerate with `bun run build`; commit it)

**Interfaces:**
- Consumes: `chapterLive` (Task 1); `CircuitStage`, `useNearLap`, `stageCredit` (Task 2); `useSeason`, `seasonQueryOptions` (`#/season/use-season.ts`); `waitFor` (`#/shell/Loader.tsx`); `useSecond`, `useZone` (`#/motion/client.ts`); `useTheme`, `opposite` (`#/shell/theme.ts`); `PHOTOS.ch01`, `PHOTOS.ch02` (`#/home/content.ts`); `Soon` (`#/shell/Go.tsx`).
- Produces: the route `/chapters/race-weekend`, whose head is `{ title: 'A race weekend · Lights Out', description: 'How a Formula 1 weekend works: practice on Friday, qualifying on Saturday, the race and its points on Sunday.' }` and whose links are `stage.css` and `chapter.css`. Also `export type WordKey = keyof typeof WORDS` and `Term({ k, chip, children }: { k: WordKey; chip?: boolean; children: React.ReactNode })`.

**Page, top to bottom** (root `<div className="chapter-page">`, layout per the Figma mock):
1. **Hero.** Label `How F1 works · Chapter 01 · 5 min`; right link `02 How overtaking works` shown as `Soon`. `<h1>` with two lines, "Three days." and "One race.". Side line: "Friday is practice, Saturday sets the order, Sunday pays the points."
2. **Photo.** `PHOTOS.ch01`, full bleed, with a caption block `01 · The grid · Shanghai, 2024` / "Norris, Hamilton and Alonso wait for the Sprint start.", and the credit underneath.
3. **Days** (`<section className="days" data-theme={theme ? opposite(theme) : undefined}>`, plus the root `.flip` ScrollTrigger exactly as Home's `.car`, `src/home/Home.tsx:69-74, 113`).
   - Label `The weekend · Standard format` / `· Sprint format`. Toggle buttons `Standard` and `Sprint` with `aria-pressed`, starting at `live.format`.
   - Columns `Fri.`, `Sat.`, `Sun.` (Sun. filled purple):
     - Standard: Fri "Practice. Nothing counts yet." Practice 1 `60 min`, Practice 2 `60 min`. Sat "One lap decides where you start." Practice 3 `60 min`, Qualifying `About 1 h`. Sun "The race pays the points." Formation lap `1 lap`, Race `Up to 2 h`.
     - Sprint: Fri "Practice, then the sprint grid." Practice 1 `60 min`, Sprint qualifying `About 45 min`. Sat "A short race, then the long grid." Sprint `100 km`, Qualifying `About 1 h`. Sun as Standard.
   - Footnote (standard): "Sprint weekends keep one practice. Friday adds sprint qualifying, Saturday a 100 km sprint before qualifying." Footnote (sprint): "Six weekends a year. Parc fermé opens after the sprint, then locks again for qualifying."
   - Under the footnote, when `live.weekend` is set: `<p className="mono now">{live.weekend} · <Go to="/weekend">Full weekend →</Go></p>`.
4. **Knockout** (`.knockout`, paper). Label `Saturday · Qualifying · Knockout`; headline "Six out. Six out." / "Ten fight for pole.". Paragraph: "Every driver chases one clean lap against the clock. When each part ends, the slowest six start from the back. The last ten set the front of the <Term k="grid">grid</Term>. From qualifying on, <Term k="parcFerme">parc fermé</Term> locks the car's set-up." Numbers `22` / `16` / `10` (10 purple), with captions `Q1 · 18 min · Slowest six out`, `Q2 · 15 min · Slowest six out`, `Q3 · 13 min · Fastest takes <Term k="pole">pole</Term>`. Under each number, its `live.knockout` line (`q1`, `q2`, `pole`) when not null.
5. **Pole band** (only when `live.circuit`): `<section className="band circuit" data-theme="dark">`, label `Saturday · Qualifying · The lap`, `<h2>` "The lap that wins pole.", then `CircuitStage`, then the credit `stageCredit(lap)`. No stats card, no schedule.
6. **Ladder** (`.ladder`, paper). Label `Sunday · Points`; headline "Top ten score."; paragraph "Each point counts twice, for the driver and for their team: the <Term k="constructors">constructors</Term>. Two titles, settled over 23 races." Numbers 25 … 1, with 25 purple, labels `P1` … `P10`, and `live.ladder.codes[i]` under each when the ladder is set, plus `live.ladder.caption`. Footnote: "No bonus point for fastest lap since 2025 · Sprints pay 8 to 1 to the top eight".
7. **Words** (`.words`). Label `Words from this chapter`, then `Full glossary` as `Soon`, then a chip per `WORDS` key in this order: practice, qualifying, knockout, pole, grid, formationLap, lightsOut, sprint, points, constructors, parcFerme.
8. **Next** (`.next`). `PHOTOS.ch02` full bleed, with a caption card `Next · Chapter 02 · 5 min`, "How overtaking works.", "Why a pass starts a lap early" as `Soon`, and the credit underneath.

**`WORDS`** (`src/chapter/words.ts`, `as const`, each entry `{ term, def }`):
- practice: Practice. "An hour on track to try set-ups. Times hint, they don't count."
- qualifying: Qualifying. "The knockout session that sets the starting order for the race."
- knockout: Knockout. "After each part of qualifying, the slowest six are out and their grid places are fixed."
- pole: Pole position. "First place on the grid, earned by the fastest lap in Q3."
- grid: Grid. "The starting order, painted as two columns of boxes on the straight."
- formationLap: Formation lap. "One slow lap to warm tyres and brakes, then every car stops in its grid box."
- lightsOut: Lights out. "Five red lights come on one by one. When they all go out, the race starts."
- sprint: Sprint. "A 100 km race on six weekends a year, with points for the top eight."
- points: Points. "Paid to the top ten: 25 for the win, down to 1 for tenth."
- constructors: Constructors. "The teams. Both drivers' points add up to a second championship."
- parcFerme: Parc fermé. "French for 'closed park'. From qualifying on, the set-up is locked, so Saturday's car is Sunday's car."

**`Term`**: a `<button type="button" className="term" aria-expanded>` holding the children, followed by `<span className="def" role="note">` with the definition, rendered only while open. On a fine pointer, hover opens it and leaving closes it; a click or tap toggles it. Inline terms use a dotted underline that turns solid when open, and the definition pops in under the term in 0.24 s on the `brake` ease. With `chip`, it renders as a bordered mono chip (the mock's chips), and the definition opens beneath the chip row.

**Data:** `const { data } = useSeason()`, `waitFor(client.fetchQuery(seasonQueryOptions))` in an effect as in `src/weekend/Weekend.tsx`. `const live = data ? chapterLive(data, useSecond(), useZone()) : null`. With `live === null`, render everything except the data lines, the `.now` line and the pole band, with format `standard`.

**Motion** (existing helpers only; per `docs/motion-map.md` "How F1 works and the chapters"):
- hero `h1` lines `sweep`, then the label;
- photo and next photo `reveal` (drift on);
- Days columns `block` with a 0.06 s stagger;
- `22 / 16 / 10` and the ladder numbers `roll`; the ladder rows rise and `25` fills purple last (`block` with delay);
- paragraphs fade up 24 px;
- headings `sweep`.

Nothing animates under `REDUCED`.

**CSS** (`src/styles/chapter.css`, everything scoped under `.chapter-page`): the type scale and grid from DESIGN.md; `Fri.`/`Sat.`/`Sun.` at the mega size, numbers at the mock's sizes. At ≤ 760 px the day columns stack, the knockout numbers stack, and the ladder wraps to two rows of five. The pole band uses `.circuit` from `stage.css` and gives the stage the weekend band's full-bleed 16:9 (4:5 on phones).

- [ ] **Step 1: Write the failing e2e tests** in `e2e/chapter.spec.ts` (with `test.use({ timezoneId: 'Asia/Jakarta' })`, the fixtures from `./fixtures.ts`, and a `loaded(page, path)` helper as in `e2e/weekend.spec.ts`):

```ts
for (const colorScheme of ['light', 'dark'] as const) {
  test(`loads with no errors, ${colorScheme}`, async ({ page, errors }) => {
    await page.emulateMedia({ colorScheme })
    await loaded(page, '/chapters/race-weekend')
    await expect(page.locator('.chapter-page h1')).toHaveText('Three days.One race.')
    await expect(page.locator('.chapter-page .days')).toHaveAttribute('data-theme', colorScheme === 'light' ? 'dark' : 'light')
    expect(errors).toEqual([])
  })
}

test('the weekend line names São Paulo in track and visitor days', ...)
// expect(page.locator('.chapter-page .days .now')).toContainText('This weekend · São Paulo GP · Fri–Sun at the track, Fri–Mon your time')

test('the Sprint toggle swaps the sessions', ...)
// click 'Sprint' → aria-pressed true; '.days' contains 'Sprint qualifying' and no 'Practice 2'

test('a word chip opens its definition', ...)
// click chip 'Parc fermé' → getByRole('note') toContainText("Saturday's car is Sunday's car")

test('the knockout carries the latest qualifying, without the broken Q1 group', ...)
// '.knockout' contains 'out: COL PIA BOR BEA SAI ALB' and 'pole: HAM 1:16.514'; it does not contain 'out: ALO'

test('the pole band replays Interlagos and shows a still under reduced motion', ...)
// stubPole(page, 'interlagos'); loaded('/chapters/race-weekend?reduced'); '.chapter-page .band .replay' visible; '.chapter-page .band .car' hidden

test('a 503 still teaches the weekend', ...)
// stubSeason 503; h1 visible; '.chapter-page .band' count 0; '.days .now' count 0; '.knockout' visible; errors without '503' empty

test('after scrolling to the end no text is hidden', ...)
// scrollToEnd; hiddenText == []; visibleBars == 0

test('no horizontal overflow at 390 px', ...)
// phone only; scrollWidth <= 390
```

- [ ] **Step 2: Run them and watch them fail**

Run: `bunx playwright test e2e/chapter.spec.ts`
Expected: FAIL (404 / no `.chapter-page`).

- [ ] **Step 3: Build the route, sections, words and CSS** as specified, then `bun run build` to regenerate `src/routeTree.gen.ts`.

- [ ] **Step 4: Run the tests**

Run: `bun run lint && bun test && bunx playwright test e2e/chapter.spec.ts e2e/weekend.spec.ts`
Expected: all pass.

- [ ] **Step 5: Look at it.** Open `bun run dev` at 1440 and 390, light and dark, and compare section by section with Figma nodes 89:2 and 94:2. Check DESIGN.md's 7 rules: every section is a poster; one dense widget (the circuit); captions with place and year; the signature section in the opposite theme; no repeated blocks. Fix anything off before committing.

- [ ] **Step 6: Commit**

```bash
git add src/chapter src/routes/chapters.race-weekend.tsx src/routeTree.gen.ts src/styles/chapter.css e2e/chapter.spec.ts
git commit -m "feat(guide): chapter 01 teaches the race weekend with the real pole lap and this weekend's days"
```

---

### Task 4: Wire the guide in

**Files:**
- Modify: `src/home/Hero.tsx` ("Start the guide" becomes `<Go to="/chapters/race-weekend" className="cta">`); `src/home/content.ts` (`CHAPTERS[0]`: `min: 5`, `to: '/chapters/race-weekend'`); `src/weekend/Teaser.tsx` (label `Next · How F1 works · Chapter 01`, headline "Three days. / One race.", photo `PHOTOS.ch01`, a `Go` "Read" to the chapter instead of `Soon`); `docs/motion-map.md` (the "Chapter hero *(spike: stub)*" row loses "spike: stub"); `e2e/home.spec.ts`, `e2e/weekend.spec.ts`
- The Menu needs no edit: its How F1 works subs come from `CHAPTERS`.

**Interfaces:**
- Consumes: the route from Task 3.

- [ ] **Step 1: Write the failing e2e tests**

```ts
// e2e/home.spec.ts
test('Start the guide opens chapter 01', async ({ page, errors }) => {
  await page.goto('/')
  await expect(page.locator('.loader')).toHaveCount(0, { timeout: LOADER_MS })
  await page.getByRole('link', { name: /Start the guide/ }).click()
  await expect(page).toHaveURL(/\/chapters\/race-weekend$/)
  await expect(page.locator('.chapter-page h1')).toBeVisible()
  expect(errors).toEqual([])
})

// e2e/weekend.spec.ts
test('the teaser leads to chapter 01', ...)
// '.weekend-page .teaser' getByRole('link', { name: /Read/ }) has href '/chapters/race-weekend'
```

- [ ] **Step 2: Run them and watch them fail**

Run: `bunx playwright test e2e/home.spec.ts e2e/weekend.spec.ts -g "chapter 01"`
Expected: FAIL (the CTA is a `Soon` span).

- [ ] **Step 3: Make the edits** listed under Files.

- [ ] **Step 4: Run every check**

Run: `bun run lint && bun test && bunx playwright test`
Expected: all pass. Any existing test that asserted "Start the guide" was `Soon` is updated to the new behaviour, not deleted.

- [ ] **Step 5: Commit**

```bash
git add src/home src/weekend/Teaser.tsx docs/motion-map.md e2e
git commit -m "feat(guide): Start the guide, Home's chapter 01 row and the weekend teaser open chapter 01"
```

---

### Task 5: Proof and review

- [ ] **Step 1:** `bun run lint && bun test && bunx playwright test`: all green. Save the output.
- [ ] **Step 2:** Take live screenshots of `/chapters/race-weekend` at 1440 and 390, light and dark, top to bottom. Include the pole band running the Interlagos lap, and Home's "Start the guide". Put them in the scratchpad, not the repo, and delete any `.playwright-mcp/` folder the browser tools leave in the worktree.
- [ ] **Step 3:** Run the `sol-loop` skill on the branch, and record what each round changed. The final round re-checks the head with no code changes.
- [ ] **Step 4:** Report to Praffi with the screenshots, then stop. Push, PR and deploy wait for Praffi's word.
