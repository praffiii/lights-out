# This Season Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the "This season" page at `/season` from the approved Figma frames. The live season snapshot drives every section:
- the title-fight poster;
- the calendar of 23 Blender circuit tiles;
- the drivers' and constructors' championships;
- "Who led, and when";
- the this-weekend band with its session countdown.

**Architecture:**
- **Pure page model.** The page is a pure function of `(SeasonSnapshot, now)`, like the weekend box. Every number and every data-driven sentence comes from small pure functions in `src/season/page-model.ts`, unit-tested with fixed snapshots and clocks. The components only lay them out.
- **One new piece of data: the season's history.** After the core snapshot is built, the refresh fetches the whole season's race and sprint results (7 paged requests, sequential and spaced). It sums them into who led after each round and each driver's points per team.
  - Checked against Jolpica on 2026-11-09: these sums reproduce the official points of all 25 drivers and all 11 constructors.
  - If the history fails, the snapshot is still written without it, and only "Who led" and the constructor split are left out.
- **Blender, never SVG.** Every circuit on the page is a Blender render: one tile per circuit, state and theme, rendered once by `blender/circuits/tiles.py` from the bacinger layouts.
- **Prerendered without data, like Home.** The sections render on the client once the snapshot is loaded. Before that, and on any failure, the page shows one waiting line.

**Tech Stack:** As Home: TanStack Start on Cloudflare Workers, TanStack Query, Effect 4 schemas, React 19.3, GSAP with the `src/motion/motion.ts` grammar, Lenis, `bun test` with happy-dom and Testing Library, Playwright (headed Chrome, 2 workers), and Blender 5.2 headless.

**Spec:** `docs/superpowers/specs/2026-11-07-f1-fan-site-design.md`, item 6 and §8. Also read `DESIGN.md`, plus `docs/motion-map.md` under "This season".

**Figma** (file `IPkJZWQnY0IKdIjf6Nuugl`, page 13:2). There is no phone frame (see Task 10).

| Section | Light (20:2) | Dark (20:283) |
|---|---|---|
| Title fight poster | y 136–830 | same layout |
| Calendar grid and hover card | 22:2 | same layout |
| Drivers' championship | y 1586–2870 | same layout |
| Constructors' championship | y 2995–4165 | same layout |
| Who led, and when (opposite-theme band) | 49:2, y 4236–5212 | same layout |
| This weekend (photo band and sessions card) | 20:248 to 20:282 | same layout |

Read each section with `get_design_context` before building it, and match type, spacing and colour to the frame. `site.css` tokens (`--bg`, `--ink`, `--muted`, `--line`, `--purple`, `.mono`, `.display`) already match the file.

**Scope, decided by Praffi on 2026-11-09:**
- Build the season mock as drawn.
- The latest results (race, qualifying and sprint) ship later with the Race weekend page (Figma 68:2), so "Full result" and "Full weekend schedule" in the weekend box stay "Soon".
- Every circuit is rendered in Blender.

## Global Constraints

- **Code style.** No code comments anywhere, no `as` assertions, no `any`, no non-null `!`. `bun run lint` passes before every commit.
- **Commits.** Commit locally after each task with a conventional, present-tense title. Never add a `Co-Authored-By` trailer. Never push, open a PR or deploy without Praffi's explicit word. Ask before any Cloudflare action.
- **Media.** Wikimedia Commons under CC0, CC BY or CC BY-SA, or public domain, with the credit on the page under the photo. Use 2024–2026 photos where possible. No F1, FIA or team logos.
- **Network.** Scripts and the refresh send `User-Agent: LightsOutFanSite/0.1 (personal project)`. Jolpica allows 4 requests per second and 500 per hour.
- **Themes and motion.** Light and dark both match their frames. Under reduced motion there is no motion and no hidden text.
- **Prerender-safe.** No `window`, `document`, `matchMedia` or `location` at module level or during render. `useTheme().theme` can be `null`; treat it as `'light'`.
- **Dropped.** No intro, no splash, no synthesized sound.
- **Every move comes from `src/motion/motion.ts`** (`sweep`, `reveal`, `block`, `draw`, `roll`). Never `once: true` on a ScrollTrigger; use `ONCE`.
  - Each section sets up its own `useGSAP` once its data has rendered. A parent-level setup misses content that arrives late.
- **Copy.** Every data-driven sentence is defined in Task 5 or Task 6, word for word. Praffi checks the copy and the circuit facts before deploy.
- **Display names and colours.**
  - **Drivers** come from `CARS` (`src/home/cars.ts`), matched on the Jolpica code, so Jolpica's "Andrea Kimi" never reaches the page.
  - **Teams** come from `TEAMS`, through an explicit `constructorId` map: `mercedes→Mercedes`, `ferrari→Ferrari`, `red_bull→Red Bull`, `mclaren→McLaren`, `rb→Racing Bulls`, `alpine→Alpine`, `haas→Haas`, `audi→Audi`, `williams→Williams`, `aston_martin→Aston Martin` and `cadillac→Cadillac`.
  - **Fallback:** the Jolpica name and `var(--muted)`.

## Review Focus

1. **An old snapshot in KV.** The KV snapshot written before this change has no `history`. It must still decode, both in the Worker and in the browser, and the page shows everything except "Who led" and the constructor split (sections are left out, not broken). Tested in Task 1 against a frozen copy of today's fixture.
2. **History fetch fails, hangs, or Jolpica rate-limits it.** Expect the core snapshot (calendar, next session, standings) to be written anyway, with `history` absent and a warning logged. Tested in Task 1 with a `JolpicaError` on one page, a decode failure, and a page that never answers (timeout).
3. **A driver who isn't in `CARS`**, such as Hirakawa (HIR), or Camara, whose `code` is `null`. Expect the Jolpica name, `var(--muted)` and no photo, never a crash or a broken image. Tested in Task 6.
4. **Season edges.** None of these may show "NaN", negative numbers or "0 rounds left":
   - during a race weekend's last 4 h (both "done" and "now" by different clocks);
   - after the finale, with and without the next calendar published;
   - before round 1, when standings fall back to last season;
   - a title decided while rounds remain.
   
   Tested in Tasks 5 and 6.
5. **`/api/season` is 503, down or hangs.** Expect the loader to lift on its budget and the waiting line to show. A 503 is not retried, and a hung request times out after 8 s. Tested in Task 7 (unit) and Task 10 (e2e).

## Council round 1 (2026-11-09) — what changed

Claude Opus scored the plan 7/10 and GPT Sol 7/10. Gemini was unavailable in this harness. The changes:
- **History source.** History comes from season results, not per-round standings. The old way's "two top drivers" sums were wrong for Red Bull, Racing Bulls and Haas, while the new way reproduces every official total and needs 7 requests instead of about 20. The constructor rows gain an "Others" term when two drivers don't account for the total.
- **History can fail on its own.** A failure no longer blocks the core refresh, and requests are sequential and spaced.
- **One completion rule.** Done and now use a single cutoff (`bounds().closes`). The calendar count stays inside `snapshot.calendar`, and the finale is tested with the 2027 calendar published.
- **The decided line names when the title was settled.** It is worked out from the history, so it doesn't drift round by round.
- **No retries on a 503,** an 8 s fetch timeout, and a waiting line on pending as well as on error.
- **Keyboard path for the calendar card,** with Escape to dismiss.
- **Old-snapshot test kept.** A frozen legacy fixture keeps that test alive.
- **Weekday formatter.** `sessionDay` gives "Sat 7 Nov", so a new `weekday` gives "Sat".
- **Blender 5.2.** A one-tile preflight runs before the full batch.
- **Correct types.** `Leader` uses `DriverRef`, codes are nullable, and the `constructorId → TEAMS` map is explicit.
- **The clock ticks only where needed.** `useSecond()` runs only in `ThisWeekend` and `Calendar`.
- **Two photo sizes.** Circuit photos come in two sizes, and portraits are required only for the drivers listed, with the car crop as fallback.
- **Missing facts drop only the facts.** A circuit with no facts drops its facts, not the whole weekend band.
- **Motion-map hover rows** (the strip's chip and the standings ink fill) are added. The map's "second tap opens the page" is corrected.

## Council round 2 (2026-11-09) — what changed

GPT Sol scored the plan 8/10 and Claude Opus 7/10. The changes:
- **The history step has a deadline.** It runs under `Effect.timeout('20 seconds')`, so a hung page leaves the history out like any other failure.
- **The client spaces the requests.** The 250 ms spacing lives in `JolpicaClient.layer`, so the fakes stay instant and `bun test` doesn't slow down.
- **The standings round comes from the results.** Jolpica can label the standings with round N+1 while they still hold round-N points: the committed fixture says 20 and carries round-19 points. The title fight's round is now the last race with results, `latest.race.race.round`, in the same season, falling back to `standings.round`.
- **"Others" shows only when the data line up.** The split appears only when `history.round` equals the constructor standings' round and the history's sum for the team equals the official total. Otherwise only the total shows.
- **The settled line needs this season's standings.** With last season's standings, the line is the plain champion sentence.
- **A real 2027 fixture.** The finale test uses a 2027 fixture whose dates are shifted a year forward. The existing `calendar2027` stays as it is.
- **The fetch timeout test is simpler.** It checks that `fetch` receives an `AbortSignal`, and the e2e hung-request test proves the behaviour.
- **Small fixes:**
  - `bounds` is exported from `weekend.ts` and reused;
  - `TEAMS` is exported from `cars.ts`;
  - `WhoLed` calls `useSecond()`;
  - part labels fall back to the family name;
  - a driver's team is `constructors.at(-1)`;
  - the motion map's "planned, not built" note moves below This season instead of being deleted;
  - the regenerated fixture keeps 2-space JSON, because `e2e/hero.spec.ts:122` string-replaces it.

## Council round 3 (2026-11-09) — what changed

GPT Sol scored the plan 8/10. Its one high finding: the round-20 standings and history fixtures clashed with the round-19 `latest` fixture. The changes:
- **One moment for all fixtures.** They all now describe after round 19: the history is cut at round 19, and the existing standings fixtures are kept, since they reproduce the round-19 sums exactly. That matches the e2e clock and exercises the Jolpica quirk for real.
- **The "Others" guard uses that same round.**
- **The hung-request e2e test now proves the abort.**

## Council round 4 (2026-11-09) — final check

The plan was re-checked with no changes. GPT Sol scored it 9/10 and Claude Opus 8/10, with no blocking or high-severity findings. Opus recomputed every expected value from the raw Jolpica pages. The nits were then applied to the plan text:
- **Lawson's team** comes from his latest race row, a medium nit.
- **Zero-point parts** are dropped, and ties are sorted by code.
- **Fixture file names** are corrected.
- **The retry estimate** is about 39 s.
- **The caption example** is `380 pts`.
- **The HIR wording** is fixed.

| Delegate | Round 1 | Round 2 | Round 3 | Round 4 |
| --- | --- | --- | --- | --- |
| Claude Opus | 7/10 | 7/10 | 7/10 | 8/10 |
| GPT Sol | 7/10 | 8/10 | 8/10 | 9/10 |
| Gemini Pro | unavailable | unavailable | unavailable | unavailable |

---

## File Structure

```
src/
  season/jolpica-schema.ts     + SeasonResultsResponse (paged)
  season/jolpica-client.ts     + seasonResults(season, offset), seasonSprints(season, offset)
  season/history.ts            seasonHistory(): leaders after each round, points per team (pure)
  season/snapshot-schema.ts    + History, history?: History
  season/build-snapshot.ts     + history (isolated, sequential)
  season/use-season.ts         no retry on 503, 8 s timeout
  season/words.ts              number words for headlines
  season/page-model.ts         every number and data-driven sentence on the page (pure)
  circuits/calendar.ts         CALENDAR: the 23 circuits' code, facts, tile, time zone and photo
  circuits/registry.ts         takes name/gp/tz/lengthKm/laps/firstGp from CALENDAR
  season/weekend.ts            gpName reads CALENDAR; + weekday()
  drivers/portraits.ts         PORTRAITS by driver code
  routes/season.tsx
  this-season/Season.tsx  TitleFight.tsx  Calendar.tsx  Drivers.tsx  Constructors.tsx  WhoLed.tsx  ThisWeekend.tsx
  styles/season.css
  shell/menu.ts  shell/WeekendBox.tsx   "This season" becomes a link
public/circuits/tiles/<tile>-<state>-<theme>.webp   23 × 4 × 2
public/img/drivers/<code>.webp   public/img/circuits/<circuitId>-{720,2400}.webp
blender/circuits/tiles.py  tiles.sh
test/fixtures/jolpica/results-2026.json  sprint-2026.json   (rounds 1–19, paged by the fake)
test/fixtures/season-snapshot-v1.json   frozen legacy snapshot
test/season/history.test.ts  page-model.test.ts  test/circuits/calendar.test.ts  tiles.test.ts
test/this-season/*.test.tsx  e2e/season.spec.ts
```

---

### Task 1: The season's history in the snapshot

**Files:**
- Modify: `src/season/jolpica-schema.ts`, `jolpica-client.ts`, `snapshot-schema.ts`, `build-snapshot.ts`
- Create: `src/season/history.ts`
- Fixtures:
  - The existing fixtures describe one coherent moment: after round 19 (Mexico City), before São Paulo, which matches the e2e clock `2026-11-06T15:00Z`. `results-last.json` and `qualifying-last.json` are round 19. The standings are labelled round 20 but carry round-19 points (ANT 380, Mercedes 630), the Jolpica quirk Task 6 handles. Keep all of them unchanged.
  - Save `results-2026.json` and `sprint-2026.json`: Jolpica-shaped responses holding rounds 1–19 only, cut from the 2026-11-09 fetch in the scratchpad.
  - The fake serves `seasonResults(season, offset)` by slicing those races' rows into 100-row pages, with `MRData.total` set, so the paging is real.
  - Checked: these rounds reproduce all 25 driver totals and all 11 constructor totals in the existing standings fixtures.
  - Copy the current `test/fixtures/season-snapshot.json` to `season-snapshot-v1.json` before anything regenerates it.
- Test: `test/season/history.test.ts`, `test/season/build-snapshot.test.ts`, `test/season/fake-jolpica.ts`

**Interfaces:**
- Produces: `SeasonResultsResponse`, which decodes `MRData.total` and every race's rows: `{ total: number; races: ReadonlyArray<{ round: number; rows: ReadonlyArray<ResultRow> }> }`. It reads `Results` for race pages and `SprintResults` for sprint pages, through the same decoder with the row key as a parameter.
- Produces: `JolpicaClient['Service'].seasonResults` and `.seasonSprints`, each `(season: number, offset: number) => Effect<typeof SeasonResultsResponse.Type, JolpicaError>`. The paths are `/${season}/results/?limit=100&offset=${offset}` and `/${season}/sprint/?limit=100&offset=${offset}`.
- Produces: `seasonHistory(races, sprints): History`, with:
  - `History = { round: number; leaders: ReadonlyArray<Leader>; teams: ReadonlyArray<TeamPoints> }`, where `round` is the last counted round;
  - `Leader = { round: number; driver: DriverRef; lead: number }`;
  - `TeamPoints = { constructorId: string; driver: DriverRef; points: number }`.
- Produces: `SeasonSnapshot.history?: History`. The key is optional, and consumers handle `undefined`.

The rules for `seasonHistory`:
- Merge the pages by round, since one race can be split across two pages.
- Count rounds `1..k`, where `k` is the last round such that every round up to it has race results. A round counts only once its Grand Prix has results, so a sprint weekend's sprint points wait for the race.
- After each counted round, add that round's race and sprint points per driver.
- The leader has the most points. A tie is broken by countback on race finishes: most wins, then most second places, and so on. `lead` is the leader's points minus P2's.
- `teams` holds the points each driver scored for each constructor over the counted rounds.

- [ ] **Step 1: Write the failing tests.**
  - `history.test.ts`, against the fresh fixtures:
    - `every driver's summed points equal the official standings`, for all 25 drivers;
    - `every team's summed points equal the official constructor total`, for all 11 teams, so Red Bull is `261 + 107 + 14 = 382` and Racing Bulls `69 + 38 + 1 = 108`;
    - `history.round` is 19, and `leaders` runs over rounds 1–19: RUS leads rounds 1–2 (lead 7 after round 1), then ANT leads rounds 3–19 (lead 119 after round 19);
    - `a round split across pages is merged`;
    - `history stops before a round with no race results` (drop round 12's rows, and the leaders end at round 11);
    - `a tie on points goes to more wins`.
  - `build-snapshot.test.ts`:
    - `the snapshot carries history for the standings season`;
    - `history fetches pages until offset ≥ total`: 5 race pages (418 rows) and 2 sprint pages, in sequence;
    - `a failing history page still writes the core snapshot`: `seasonResults` fails with a `JolpicaError` on offset 200, `history` is undefined, and `nextSession` and the standings are present;
    - `a decode failure in history behaves the same`;
    - `a history page that never answers times out after 20 s`: the fake returns `Effect.never` and the test advances the clock with Effect's `TestClock`. `history` is undefined, and the core snapshot is present;
    - `no standings means no history`;
    - `a snapshot without history still decodes`: decode `season-snapshot-v1.json` with `SeasonSnapshotJson` and through `fetchSeason`'s decoder.
- [ ] **Step 2: Run** `bun test test/season`. Expected: FAIL.
- [ ] **Step 3: Implement** the schema, the client endpoints, `seasonHistory`, and the history step in `buildSnapshot`.
  - The history step runs after the core `Effect.all`, for `driverStandings.season`.
  - It fetches pages one at a time, wrapped in `Effect.timeout('20 seconds')`.
  - On a `JolpicaError` or a timeout, it logs a warning and leaves `history` out, so the core snapshot is unaffected.
  - `JolpicaClient.layer` spaces its real HTTP requests at least 250 ms apart, with a one-permit semaphore and a sleep, so all calls (up to 16 with the fallbacks) stay under 4 per second. The fakes are untouched.
- [ ] **Step 4: Run** `bun test test/season`. Expected: PASS, including the existing refresh, store and API tests.
- [ ] **Step 5: Regenerate** `test/fixtures/season-snapshot.json` from the fake at `2026-11-06T15:00:00Z` with a scratch script.
  - Write it with `JSON.stringify(…, null, 2)`, because `e2e/hero.spec.ts:122` string-replaces `"circuitId": "interlagos"`.
  - Check that it has `history`, and that `season-snapshot-v1.json` is unchanged.
- [ ] **Step 6: Commit** `feat(season): the snapshot sums the season's results into who led each round and each team's points`

### Task 2: The 23 calendar circuits

**Files:**
- Create: `src/circuits/calendar.ts`
- Modify: `src/circuits/registry.ts`, `src/season/weekend.ts` (`gpName`)
- Test: `test/circuits/calendar.test.ts`

**Interfaces:**
- Produces: `CalendarCircuit = { tile: string; code: string; name: string; gp: string; tz: string; lengthKm: string; laps: number; firstGp: number; photo: CircuitPhoto }`.
  - `CircuitPhoto = { small: string; large: string; place: string; credit: string }`.
  - `code` is the three-letter tile label from the Figma frame: AUS, CHN, JPN, MIA, CAN, MON, ESP, AUT, GBR, BEL, HUN, NED, ITA, MAD, AZE, MAL, SIN, USA, MEX, BRA, LVG, QAT, ABU.
  - `gp` is the short race name used across the site, for example `'São Paulo GP'`. For `sepang` it follows the 2026 race name, `'Bahrain GP in Malaysia'`.
- Produces: `CALENDAR` as a `const … satisfies Record<string, CalendarCircuit>`, `calendarCircuit(circuitId: string): CalendarCircuit | undefined`, and `grandPrix(gp: string): string`, so `'São Paulo GP'` becomes `'São Paulo Grand Prix'`.
- Changes:
  - The registry's five entries read `name`, `gp`, `tz` and the facts `lengthKm`, `laps` and `firstGp` straight from the `CALENDAR` const, which is typed, so there is no `undefined`.
  - `gpName(race)` reads `calendarCircuit` first, so the weekend box and this page agree.
  - `Hero.tsx` compiles unchanged.

- [ ] **Step 1: Write the failing tests.**
  - `every 2026 calendar circuit has an entry`: for each race in `races-2026.json`, a failure names the missing id.
  - `every tile id is a bacinger layout` in `blender/circuits/data/f1-circuits.geojson`.
  - `facts are well-formed`: `lengthKm` matches `/^\d\.\d{3}$/`, `laps` is in 40–80, `firstGp` is in 1950–2026, and `tz` is accepted by `Intl.DateTimeFormat`.
  - `grandPrix('Las Vegas GP') === 'Las Vegas Grand Prix'`.
  - `gpName` for `interlagos` stays `'São Paulo GP'`.
- [ ] **Step 2: Run** `bun test test/circuits test/season`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `CALENDAR` in calendar order, keyed by Jolpica `circuitId`.
  - Tile ids: `au-1953 cn-2004 jp-1962 us-2022 ca-1978 mc-1929 es-1991 at-1969 gb-1948 be-1925 hu-1986 nl-1948 it-1922 es-2026 az-2016 my-1999 sg-2008 us-2012 mx-1962 br-1940 us-2023 qa-2004 ae-2009`.
  - Facts come from each circuit's Wikipedia infobox for its current layout, with the source per entry noted in the commit body. Copy the five existing entries unchanged.
  - `photo` points to placeholder paths until Task 4. Task 4's file test fails until they exist.
- [ ] **Step 4: Run** `bun test` and `bun run lint`. Expected: PASS, with the Home hero tests unchanged.
- [ ] **Step 5: Commit** `feat(circuits): all 23 calendar circuits carry their facts, time zone and tile`

### Task 3: Blender calendar tiles

**Files:**
- Create: `blender/circuits/tiles.py`, `blender/circuits/tiles.sh`, `public/circuits/tiles/*.webp` (184 files)
- Modify: `src/circuits/calendar.ts` (`tileSrc`), `DESIGN.md` (circuit notes)
- Test: `test/circuits/tiles.test.ts`

**Interfaces:**
- Produces: `TileState = 'done' | 'upcoming' | 'now' | 'hover'`, and `tileSrc(tile: string, state: TileState, theme: Theme): string`, which returns `` `/circuits/tiles/${tile}-${state}-${theme}.webp` ``.

- [ ] **Step 1: Write the failing test** `every calendar tile is rendered`: for every `CALENDAR` tile, state and theme, the file exists and is between 1 byte and 40 KB.
- [ ] **Step 2: Run** it. Expected: FAIL, listing the missing files.
- [ ] **Step 3: Port** `~/Developments/personal/lights-out-private/pipeline-2026-11-08/tracks/thumbs.py` to `tiles.py`.
  - Bring in `layout`, `smooth`, `bank` and `strip` from that folder's `sizes.py`, and `fit` from its `circuit.py`.
  - Import `camera`, `material`, `recolour` and `setup_render` from the repo's `blender/circuits/circuit.py`.
  - Read `blender/circuits/data/f1-circuits.geojson`.
  - Strip every comment. Keep look E as is: pitch 32°, lens 50, north up, `ROAD = (0.02, 0.012, 0.02)`, transparent film.
  - Use these (ground, road) colour pairs:
    - light theme: done `F4F3EF:8A8D93`, upcoming `F4F3EF:DCDAD4`, now `F4F3EF:A43BFF`, hover `111214:B9B7B0`;
    - dark theme: done `0E0F11:B9B7B0`, upcoming `0E0F11:3A3C42`, now `0E0F11:A43BFF`, hover `F2F1EC:8A8D93`.
  - Render 208 × 192 WEBP at quality 82, straight from Blender.
  - `tiles.sh` mirrors `build.sh` and takes an optional circuit list.
  - Move the old docstring's reasons into `DESIGN.md`: flat, because there's no elevation at this size, and road widths exaggerated so they read.
- [ ] **Step 4: Preflight on Blender 5.2.1.** Render `br-1940` only. Check that the tile shades like the Figma tile in 22:212. If the EEVEE settings in `setup_render` fail on 5.2, fix them there and re-render the hero posters to prove nothing changed.
- [ ] **Step 5: Render all tiles.** Run the test. Expected: PASS. Make a contact sheet of the 23 light "done" tiles and the 23 dark "now" tiles, and compare it against 22:212.
- [ ] **Step 6: Commit** `feat(circuits): every calendar circuit has a Blender tile per state and theme`

### Task 4: Photos — portraits and one photo per circuit

**Files:**
- Create: `src/drivers/portraits.ts`, `public/img/drivers/<code>.webp`, `public/img/circuits/<circuitId>-720.webp`, `public/img/circuits/<circuitId>-2400.webp`
- Modify: `src/circuits/calendar.ts` (`photo`)
- Test: `test/drivers/portraits.test.ts`, `test/circuits/calendar.test.ts`

**Interfaces:**
- Produces: `portraitFor(code: string | null): Photo | undefined`, backed by `PORTRAITS: Partial<Record<string, Photo>>`.

- [ ] **Step 1: Write the failing tests.**
  - `every listed portrait has a file`;
  - `ANT, VER, RUS, HAM, LEC, NOR and PIA have portraits` (the current title contenders);
  - `every calendar circuit has both photo sizes`;
  - `every credit names a licence`: each credit matches `/· (CC BY(-SA)? \d\.\d|CC0|Public domain)$/`.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Source the photos** from Commons with `~/Developments/personal/lights-out-private/pipeline-2026-11-08/tools/commons_search.py`. Search the 2025 and 2026 race categories first.
  - **Portraits:** head and shoulders at 840 × 1080, WEBP quality 80. Get all 22 drivers if Commons has them, and at least the seven above.
  - **Circuits:** one wide photo per circuit, aerial or trackside with the layout readable. The source must be at least 2400 px wide. Export it at 720 px and 2400 px, WEBP quality 78.
  - Record `place` (place and year) and `credit` (photographer and licence), and put each photo's Commons file page in the commit body.
  - Reject anything whose subject is a logo.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat(season): drivers have portraits and every circuit a photo, all from Commons`

### Task 5: Page model — calendar and this weekend

**Files:**
- Create: `src/season/words.ts`, `src/season/page-model.ts`
- Modify: `src/season/weekend.ts` (+ `weekday`, export `bounds`)
- Test: `test/season/page-model.test.ts`

**Interfaces:**
- Consumes: `pickRace`, `bounds`, `latestStart`, `SESSION_LABEL`, `SESSION_MINUTES` and `when` from `weekend.ts`; `calendarCircuit` and `grandPrix` from Task 2.
- Produces:
  - `words(n: number): string`: `0–30` become lowercase English ("twenty-three"), and anything higher returns digits. `capital(s: string): string`.
  - `weekday(session: Session, timeZone: string): string`, giving `'Fri'`, or the UTC weekday when the time is unconfirmed.
  - `calendarTiles(snapshot, now): ReadonlyArray<{ round: number; circuitId: string; code: string; circuit?: CalendarCircuit; state: 'done' | 'now' | 'upcoming'; status: 'Done' | 'Now' | '' }>`. `code` falls back to the first three letters of `country`, uppercased.
  - `calendarHead(snapshot, now): { label: string; count: string; headline: string }`.
  - `weekend(snapshot, now): null | { label: string; title: string; facts?: CalendarCircuit; sessions: ReadonlyArray<{ label: string; day: string; status: string; next: boolean }> }`.

The rules:
- **One clock.**
  - A round is `done` once `now ≥ closes`, where `closes` is its race's `latestStart + 4 h`, the same cutoff as `pickRace`.
  - A round is `now` while `pickRace` returns it as `'this-weekend'` and it belongs to `snapshot.calendar`, matched on season and round.
  - A round is never both.
- **The count stays in `snapshot.calendar`.** It uses the now round, then the next upcoming round of that calendar, and otherwise reads `'Season complete'`.
- **The weekend band** uses `pickRace` across both calendars.
  - A race from `nextCalendar` is labelled `` `Next race · ${season} · Round ${n}` ``.
  - Without circuit facts it keeps its sessions and leaves `facts` out.

- [ ] **Step 1: Write the failing tests** with exact strings, on the 2026 fixture calendar (23 rounds).
  - `words(23) === 'twenty-three'`, `words(1) === 'one'` and `words(31) === '31'`.
  - At `2026-11-06T15:00Z`:
    - tile 19 is `done`/`Done`, tile 20 is `now`/`Now`, and tile 21 is `upcoming` with no status;
    - the head is `{ label: 'The calendar · 23 rounds', count: 'Round 20 of 23', headline: 'Twenty-three circuits. Nineteen done, one live.' }`.
  - At `2026-11-08T19:00Z` (2 h after the race starts), tile 20 is still `now` and not `done`. The headline still reads `'Nineteen done, one live.'`
  - At `2026-11-12T12:00Z`, the headline is `'Twenty-three circuits. Twenty done, three to go.'` and the count `'Round 21 of 23'`.
  - At `2026-03-01T00:00Z`: `'Twenty-three circuits. None done yet.'`
  - At `2026-12-20T00:00Z`, with `nextCalendar` set to `calendar2027`:
    - the headline is `'Twenty-three circuits. All done.'` and the count `'Season complete'`;
    - `weekend` is labelled `'Next race · 2027 · Round 1'`.
  - The 2027 calendar for that case is a new `calendar2027Shifted` in `fake-jolpica.ts`, with every session moved forward one year. The existing `calendar2027` stays as it is.
  - At the same time with no `nextCalendar`, `weekend` is labelled `'Last race · Round 23'` and every session reads `'Done'`.
  - `weekend` at `2026-11-07T12:00Z` returns:
    - `label: 'This weekend · Round 20'` and `title: 'São Paulo Grand Prix.'`;
    - sessions `['Practice 1','Practice 2','Practice 3','Qualifying','Race']`, with days `['Fri','Fri','Sat','Sat','Sun']` in `America/Sao_Paulo`;
    - statuses `['Done','Done','Next · 02h 30m','Later','Later']`, with `next` true only for Practice 3.
  - Status formats:
    - more than 24 h away reads `'Next · 1d 05h'`;
    - a session in progress reads `'Live'` and is the `next` row;
    - an unconfirmed time reads `'Time TBC'`.
  - Between weekends, `weekend` is labelled `'Next race · Round 21'`.
  - A race whose circuit is missing from `CALENDAR` gives `facts` undefined, with its sessions still present.
- [ ] **Step 2: Run** `bun test test/season/page-model.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the model.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat(season): the calendar and the weekend band read their state from the snapshot`

### Task 6: Page model — the title fight, standings and who led

**Files:**
- Modify: `src/season/page-model.ts`, `src/home/cars.ts` (export `TEAMS`)
- Test: `test/season/page-model.test.ts`

**Interfaces:**
- Produces:
  - `Person = { code: string | null; name: string; family: string; colour: string; car?: Car; portrait?: Photo }`, from `person(ref: DriverRef): Person`.
  - `Team = { id: string; name: string; colour: string }`, from `team(ref: ConstructorRef): Team`, through the Global Constraints map.
  - `titleFight(snapshot): null | { label: string; first: Person; second: Person; firstPoints: number; secondPoints: number; gap: number; line: string; state: 'open' | 'decided' | 'over' }`
  - `driversCopy(rows: ReadonlyArray<{ points: number }>): string`
  - `driverRows(snapshot): null | { podium: ReadonlyArray<DriverRow>; rest: ReadonlyArray<DriverRow> }`, with `DriverRow = { position: number; person: Person; team: Team; points: number; gap: string }`. `gap` is `'+N'`, or `''` for P1.
  - `constructorRows(snapshot): ReadonlyArray<{ position: number; team: Team; parts: ReadonlyArray<{ label: string; points: number }>; total: number }>`
  - `whoLed(snapshot, now): null | { columns: number; stints: ReadonlyArray<{ person: Person; from: number; to: number; current: boolean; photo: 'car' | 'portrait' }>; leads: ReadonlyArray<number>; changes: ReadonlyArray<number>; live: number | null; line: string }`

The rules:
- **The standings round.**
  - Jolpica can label the standings with round N+1 while they still carry round-N points.
  - So the round is `latest.race.race.round` when that result is from the standings season, and `standings.round` otherwise.
  - The label and the points left both use this round.
- **Points left.** A remaining round counts 25 if it has a Race session, plus 8 if it has a Sprint. A round remains when it comes after the standings round in the same season's calendar. If the standings season differs from `snapshot.season`, no points are left, and the settled line falls back to the plain champion sentence.
- **A driver's team** is their row's `constructor` in `latest.race.rows` when they raced in it, and otherwise the last entry in the standings row's `constructors`. Jolpica lists Lawson's constructors as `['rb', 'red_bull']`, so `.at(-1)` alone would put him at Red Bull.
- **States.** `decided` when the gap is greater than the points left and some are still left. `over` when no points are left. `open` otherwise, including a gap equal to the points left, because a tie on points is still possible.
- **The settling round.** It is the first `history.leaders` round where the current P1 leads and `lead > pointsLeftAfter(round)`. It is used only when the standings season equals `snapshot.season`.
- **Constructor parts.**
  - Take `history.teams` for the constructor, drop 0-point entries, and sort by points, breaking ties by code. A team with a total of 0 shows the total only.
  - Keep the top two drivers, labelled by code or, when the code is `null`, the family name.
  - Add `{ label: 'Others', points: total − d1 − d2 }` when that is not 0.
  - The split shows only when `history.round` equals the standings round (the `latest` rule above) and the history's sum for that team equals the official total. Otherwise `parts` is `[]`, and the row shows only the total.
- **Who led.** One column per round of the standings season's calendar, or `standings.round` columns when the standings are from last season.
  - Stints are runs of the same leader. A stint of 4 rounds or more uses `car`; a shorter one uses `portrait`, falling back to `car`.
  - `live` is the `now` round from Task 5 when it comes after the last history round.

- [ ] **Step 1: Write the failing tests.** Copy is exact.
  - **Open fight.** Standings after round 17 (P1 300, P2 290, both McLaren) with six race-only rounds left:
    - `state: 'open'` and `label: 'The 2026 title fight · after round 17'`;
    - `line: 'Six rounds left, 150 points still to win. Same team, same car, one title.'`, where the last sentence appears only when both drivers share a constructor.
  - **Decided.** With the fixture, whose standings are labelled round 20 but whose latest result is round 19:
    - `gap: 119`, `state: 'decided'` and `label: 'The 2026 title fight · after round 19'`;
    - points left: 100, four race-only rounds;
    - `line: 'Antonelli is the 2026 champion. It was settled at the Mexico City Grand Prix, with four rounds to spare.'` The lead was 119 after round 19, with 100 points left.
  - **Decided without history:** `'Antonelli is the 2026 champion, with four rounds still to run.'`
  - **Gap equal to the points left** stays `'open'`.
  - **Over.** No rounds left: `state: 'over'`, `label: 'The 2026 title fight · final'`, and the settled line (or `'Antonelli is the 2026 champion.'` without history).
  - **Pre-season fallback.** Standings from 2025 with the 2026 calendar give `state: 'over'`, `label: 'The 2025 title fight · final'` and `line: 'Antonelli is the 2025 champion.'`. The fake returns the 2026 standings relabelled as 2025, and its history is present.
  - **Standings and results agree.** When `latest` is relabelled round 20 to match the standings, the line reads `'…with three rounds still to run.'` without history.
  - **No standings, or fewer than two rows:** `null`.
  - **`driversCopy`.** The fixture's 380, 261, 259 and 250 give `'The front three are covered by 121 points. Fourth is 9 points behind third.'` A 1-point gap reads `'1 point'`.
  - **`person` and `team`.**
    - The fixture's Camara has `code: null` and gives `name: 'Rafael Camara'`, `colour: 'var(--muted)'`, and no car or portrait.
    - `team({ constructorId: 'rb', … })` gives `{ name: 'Racing Bulls', colour: '#6692FF' }`.
    - In `driverRows`, LAW (P9) is at Racing Bulls, not Red Bull.
    - Cadillac's `parts` is `[]`, with a total of 0.
  - **Constructor rows.** Red Bull's parts are `[VER 261, HAD 107, Others 14]` with total 382, and McLaren's are `[NOR 221, PIA 144]` with total 365. For all 11 teams, the parts sum to the total.
    - With history cut at round 18 against a standings round of 19, every row's `parts` is `[]`.
    - A history sum that differs from the official total also gives `[]`. "Others" is never negative.
  - **`whoLed`, from the fixture's history.**
    - stints are `[RUS 1–2 portrait, ANT 3–19 car current]`, with `changes: [3]` and `columns: 23`;
    - `live` is `20` at `2026-11-06T15:00Z`, and `null` at `2026-11-12T12:00Z`;
    - `line: 'Each column is one round. The photo shows who led the championship after it. Two drivers have led this season.'` With a single leader, it ends `'Antonelli has led every round.'`
  - **`whoLed` without history:** `null`.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement** the model.
- [ ] **Step 4: Run** `bun test test/season`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(season): the title fight, standings and leader strip read their numbers and copy from the snapshot`

### Task 7: The route, the page frame and the shell links

**Files:**
- Create: `src/routes/season.tsx`, `src/this-season/Season.tsx`, `src/styles/season.css`
- Modify:
  - `src/season/use-season.ts`: `retry: (count, error) => !(error instanceof SeasonWarmingError) && count < 3`, and `fetch('/api/season', { signal: AbortSignal.timeout(8000) })`;
  - `src/shell/menu.ts`: "This season" gets `to: '/season'`, and `MenuEntry['to']` widens to `To | null`;
  - `src/shell/WeekendBox.tsx`: the Standings tab's "This season" becomes `<Go to="/season">`;
  - `src/routeTree.gen.ts` (generated).
- Test: `test/this-season/season.test.tsx`, `test/season/use-season.test.ts`, `test/shell/footer.test.tsx`

**Interfaces:**
- Produces: `Season()`, which waits for the loader with `waitFor(client.fetchQuery(seasonQueryOptions))` as Home does.
  - **With data:** it renders `TitleFight`, `Calendar`, `Drivers`, `Constructors`, `WhoLed` and `ThisWeekend` in that order. Each takes `{ snapshot }` and returns `null` when its model is `null`. Only `Calendar`, `WhoLed` and `ThisWeekend` call `useSecond()`.
  - **Without data,** pending or error: `<p className="season-empty">The season data is on its way. Try again in a minute.</p>`. A timed-out request is retried up to 3 times, about 39 s in all with backoff, and the waiting line covers that on purpose.
- Route head: title `'This season · Lights Out'` and description `'The Formula 1 calendar, the standings and the next session, in your time.'`

- [ ] **Step 1: Write the failing tests.**
  - `Season renders the six sections in order`;
  - `Season shows the waiting line while pending and on a 503`;
  - `a SeasonWarmingError is not retried`;
  - `fetchSeason passes an AbortSignal to fetch`. The e2e hung-request test proves the 8 s timeout;
  - the footer and menu link "This season" to `/season`, with no "Soon".
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement** the route and the frame, with stub sections (their `<section>` and heading only). Wire the links.
- [ ] **Step 4: Run** `bun test` and `bun run build`. Expected: PASS, and `/season` is prerendered.
- [ ] **Step 5: Commit** `feat(season): the This season page has its route, and the menu, footer and weekend box link to it`

### Task 8: Title fight and calendar

**Files:**
- Create: `src/this-season/TitleFight.tsx`, `src/this-season/Calendar.tsx`
- Modify: `src/styles/season.css`
- Test: `test/this-season/title-fight.test.tsx`, `test/this-season/calendar.test.tsx`

Build each section from the Figma frame:
- **TitleFight.** Two portraits in viewfinder brackets, each with a team-colour rule and a caption block (`P1`, name, `380 pts`). The gap is the giant middle number, with "Points between first and second" and the `titleFight` line. The credit line goes under the portraits. With no portrait, crop the car photo; with neither, show a plain block in team colour.
- **Calendar.** Use the header strings from `calendarHead`. Build 12-column rows of tiles, each with a top rule (3 px purple when `now`), a two-digit round, the `tileSrc` image for the current theme, the code and the status. Tiles are `<button>`s.
  - **Hover or keyboard focus:** the tile swaps to its `hover` render, and the card (`photo.small`, a purple rule, `` `R${round} · ${grandPrix(gp)}` ``, then `` `${name} · ${lengthKm} km · ${laps} laps` `` and the credit) clips in beside it in 240 ms. The card is the tile's `aria-describedby` target.
  - **Escape** hides the card, and so do blur and leaving the tile.
  - **Touch:** a tap toggles the locked card. Tiles do not navigate, because no circuit pages exist yet.
  - A circuit with no `CALENDAR` entry shows its code and status, with no image and no card.
  - The caption reads "Hover a round to see the circuit · tap on touch".

- [ ] **Step 1: Write the failing tests.**
  - TitleFight with the fixture shows `119`, `'Kimi Antonelli'`, `'Max Verstappen'` and the decided line.
  - Calendar renders 23 tiles. Tile 20 has `aria-current="true"` and the image `/circuits/tiles/br-1940-now-light.webp`.
  - Hovering tile 13 shows `'R13 · Italian Grand Prix'` and `'Monza · 5.793 km · 53 laps'`.
  - Tabbing to tile 13 shows the same card, and Escape hides it.
  - A missing circuit renders with no `img`.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement** both sections and their CSS.
- [ ] **Step 4: Run** the tests and lint. Expected: PASS. Then run `bun run dev` and compare `/season` against 20:2 and 20:283, light and dark.
- [ ] **Step 5: Commit** `feat(season): the page opens on the title fight and the calendar of Blender circuits`

### Task 9: Drivers', constructors', who led and this weekend

**Files:**
- Create: `src/this-season/Drivers.tsx`, `Constructors.tsx`, `WhoLed.tsx`, `ThisWeekend.tsx`
- Modify: `src/styles/season.css`
- Test: `test/this-season/standings.test.tsx`, `who-led.test.tsx`, `this-weekend.test.tsx`

Build each section from the Figma frame:
- **Drivers.** The heading "The championship is a race too." with `driversCopy` beside it.
  - P1 is a large car photo in brackets, with a team bar, `` `P1 · ${team} · Leader` ``, the family name and the points.
  - P2 and P3 are smaller, with `` `P2 · ${team} · ${gap} pts behind` ``.
  - The timing tower lists P4–P10 with Pos, team bar, code, name, team, points and gap to leader.
  - `` `${n} more drivers · Show all` `` reveals the rest in place.
  - The `CARS` credit goes under the photos.
- **Constructors.** The heading "Two drivers, one team score." with its static paragraph. The top five rows show `parts` joined by `+`, then `= total`, with one bar per part on a scale where the leader's total is the full width. `` `${n} more teams · Show all` `` reveals the rest.
- **WhoLed.** An opposite-theme band (`data-theme={opposite(theme ?? 'light')}`, as Home's car band does). The heading "Who led, and when." with the `whoLed` line, then:
  - **Round numbers,** with "Lead change" over each `changes` round and "Now" over `live`.
  - **Stint panels,** each spanning its rounds with its photo and a caption block. The caption gives `` `Leader · R${from} to R${to}` ``, the family name and `` `${n} rounds in front` ``. For the current stint it reads `'Leader · from R…'` and `'… rounds so far'`.
  - **The live column** has a purple outline and the vertical text `` `${gp} · live this weekend` ``. One empty column follows per remaining round.
  - **The `+lead` row,** with "Live" and `·` for future rounds, then the labels "Lead in points after each round" and "Still to race", and the credits.
- **ThisWeekend.** The `photo.large` band.
  - The caption block holds the `weekend()` label and title, plus Laps, Lap length and First race here when `facts` exist.
  - The sessions card is headed "Sessions · track time", with one row per session and the `next` row filled.
  - The credit reads `` `${credit} · times from the official calendar` ``.

- [ ] **Step 1: Write the failing tests.**
  - **Drivers:** P4–P10 by default, and "15 more drivers · Show all" reveals all 25 rows.
  - **Constructors:** the Red Bull row reads `261`, `107`, `Others 14` and `382`, with "6 more teams".
  - **WhoLed:** two stints captioned `'R1 to R2'` and `'from R3'`, with `'17 rounds so far'`, and a live column for round 20. Nothing renders without history.
  - **ThisWeekend:** at `2026-11-07T12:00Z`, one row is next, and after the clock advances 60 s its status changes.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement** the four sections and their CSS.
- [ ] **Step 4: Run** `bun test` and lint. Expected: PASS. Run the dev server and compare against both frames.
- [ ] **Step 5: Commit** `feat(season): standings, the leader strip and the weekend band fill out This season`

### Task 10: Motion, phone, reduced motion and the end-to-end check

**Files:**
- Modify: `src/this-season/*.tsx`, `src/styles/season.css`, `docs/motion-map.md`, `DESIGN.md`
- Create: `e2e/season.spec.ts`

**Motion.** Follow `docs/motion-map.md` › This season:
- **Headlines:** `sweep`, with the count typing on.
- **Calendar tiles:** they fade up row by row, 30 ms apart, and the "Now" rule draws.
- **Leader strip:** the columns draw left to right, scrubbed. The current stint's caption fills purple last. Hovering a column shows its `+lead` in a mono chip.
- **Standings:** the hairlines draw, the points `roll`, and the payoff (P1, and the leading team's total) fills purple last. On hover, a row fills ink from the left.
- **Photos:** `reveal`.

Update the map: move "From here on the pages are planned, not built" to below the This season section, and make the calendar row read "a tap toggles the card" instead of "the second tap opens the page".

**Phone (390 px). [my call, no phone frame exists.]** Show it to Praffi before calling it done.
- The poster stacks: the gap, then the portraits side by side.
- The calendar has 4 columns, and a tapped card sits under its row.
- The drivers' table keeps Pos, code, points and gap.
- Constructors stack the parts under the team.
- "Who led" becomes a vertical list of stints.
- The sessions card follows the photo.

- [ ] **Step 1: Write `e2e/season.spec.ts`** with `e2e/fixtures.ts`:
  - `loads with no errors, light and dark`;
  - `after scrolling to the end no text is hidden` (desktop and phone);
  - `no horizontal overflow at 390 px`;
  - `?reduced shows everything with no bars`;
  - `a 503 shows the waiting line within the loader budget`, with the 503 resource console line filtered as in `e2e/hero.spec.ts:59`;
  - `a hung /api/season is aborted at 8 s`: the route never fulfils, a `requestfailed` event for `/api/season` fires within 9 s, and the waiting line is visible;
  - `hovering round 13 shows the Monza card` and `Tab + Escape drive the card` (desktop);
  - `tapping a tile toggles its card` (phone);
  - `the sessions card counts down` (advance the clock 60 s).
- [ ] **Step 2: Run** `bunx playwright test e2e/season.spec.ts`. Expected: FAIL where motion and the phone layout are missing.
- [ ] **Step 3: Implement** the motion and the phone layout.
- [ ] **Step 4: Run** `bun run lint && bun test && bunx playwright test`. Expected: all green. If `hero.spec` late-circuit or the `home.spec` loader budget fails, re-run it alone before judging; both are known load flakes.
- [ ] **Step 5: Live evidence.**
  - Desktop screenshots in light and dark, next to 20:2 and 20:283.
  - Phone screenshots and a recording of the calendar hover.
  - Contact sheets of the photos and the tiles.
  
  Show all of it to Praffi.
- [ ] **Step 6: Commit** `feat(season): This season moves to the motion map and works on a phone`
