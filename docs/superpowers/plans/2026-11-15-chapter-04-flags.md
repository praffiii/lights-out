# Chapter 04, Flags and what they mean: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/chapters/flags`, built from the approved Figma frames. Its flag wall shows live 2026 race-control counts that ride the hourly season refresh. Wire it into Chapter 03, Home and the menu.

**Architecture:**
- **A pure tally** counts OpenF1 `race_control` rows per Grand Prix.
- **An Effect builder** fetches only the races that aren't frozen yet and carries the rest forward from the previous snapshot. It stores the result as the optional `flags` field on the season snapshot.
- **A pure wall model** turns that field into the page's numbers and quotes.
- **The page** is the `Tyres.tsx` pattern plus a CSS-only sticky stack of six posters.

**Tech Stack:** TanStack Start file routes, React 19, GSAP via `#/motion/motion.ts`, Effect 4 (Schema, `OpenF1Client`), react-query (`useSeason`), `bun test`, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-15-chapter-04-flags-design.md`, approved 2026-11-15. The spec has the copy, the poster table, the words, the photo credits and the Figma nodes. Read it beside this plan.

## Global Constraints

- **No comments in code.** No `as` casts except `as const`, no `any`, no non-null `!`. `bun run lint` passes (oxlint anti-slop, tsc, `tools/no_comments.py`).
- **Never invent a number.** Every number on the page comes from the snapshot's `flags`, or is a rule: 3 strikes, 5 seconds, ten flags.
- **Zero cost.** No new Worker routes, KV keys or paid services. OpenF1 requests go through the existing `OpenF1Client` gate and its 400 ms spacing.
- **Never write production KV.** Never run `tools/refresh-season.ts` against real credentials. Read-only GETs to OpenF1 are fine.
- **Media rules.** Use only the four Commons photos named in the spec. Captions and credits are verbatim from the spec. Credits end with `, via Wikimedia Commons` where the Tyres page does the same.
- **Commits.** Local only, conventional, written as the new behaviour in present tense. Never add a Claude co-author trailer. Don't push.
- **Shell.** Use `sed -n`, not `head`. Never use bare `git stash`.

## Review Focus

1. **OpenF1 returns an empty `race_control` for a finished race** because it hasn't filled it in yet. That race must not be frozen at zero. Expected: it gets no row, so it doesn't count, and it is fetched again next hour. Test in Task 2.
2. **A refresh times out or OpenF1 fails partway through** the first full fetch. Expected: the previous tally is kept, or the field is omitted. The rest of the snapshot is still written, and Jolpica data is never blocked. Test in Task 2.
3. **The page loads before `/api/season` answers, or the call fails.** Expected: six posters with their orders and lines, and no numbers, chips, footnote or stat lines. The reserved space keeps the layout from jumping. Test in Task 4 e2e.
4. **Phone at 390 px.**
   - The sticky posters' text must fit in 560 px with no horizontal overflow.
   - The "rest of the box" carousel scrolls sideways only inside itself.
   - Test in Task 4 e2e (overflow) and the Task 6 live check.
5. **Season rollover in January 2027, before the first race.** Expected: last season's tally, with `<season>` reading 2026 everywhere, never 2027. Test in Task 2 (fallback) and Task 3 (the season in the copy comes from the tally).

---

## File map

| File | Job |
|---|---|
| `src/flags/schema.ts` (new) | `RaceControl` and `RaceControlResponse` (OpenF1 decode); `FlagRace`, `FlagSample` and `FlagTally` (snapshot) |
| `src/flags/tally.ts` (new) | Pure: `finishedRaces`, `frozen`, `countRace`, `redSessionCount` |
| `src/flags/build.ts` (new) | Effect: `flagTally(season, now, previous)` |
| `src/flags/wall.ts` (new) | Pure: `wallOf(tally)`, `count(n)` |
| `src/season/openf1-client.ts` | New `raceControl(key)` and `redFlags(year)` readers |
| `src/season/snapshot-schema.ts` | `flags: Schema.optionalKey(FlagTally)` |
| `src/season/build-snapshot.ts`, `src/season/refresh.ts` | Pass the previous `flags` in, and attach the new one |
| `src/chapter/Flags.tsx`, `src/chapter/FlagWall.tsx`, `src/styles/flags.css`, `src/routes/chapters.flags.tsx` (new) | The page |
| `src/chapter/words.ts`, `src/home/content.ts`, `src/chapter/Tyres.tsx` | Words, photos, links |
| `test/flags/*.test.ts`, `test/fixtures/openf1/race-control-*.json`, `test/fixtures/openf1/red-2026.json` (new) | Unit tests and trimmed real fixtures |
| `test/fixtures/season-snapshot.json` | Gains a real `flags` field |
| `e2e/flags.spec.ts` (new); `e2e/tyres.spec.ts`, `e2e/home.spec.ts` | e2e |

The spec offers a credits page. There isn't one: credits sit under each photo and in the footer. So nothing changes there.

**Ruling vs spec:** `FlagRace` drops `round`. Nothing shows it. Deriving it needs the Jolpica calendar, which the fallback season doesn't have. `samples` keeps only the four flags whose posters carry a chip: clear, yellow, blue and chequered. Double yellow and red have no chip (spec, "The flag wall").

---

### Task 1: Flag schema and pure counting

**Files:**
- Create: `src/flags/schema.ts`, `src/flags/tally.ts`, `test/flags/tally.test.ts`.
- Create fixtures, from `race_control?session_key=<key>`, saved verbatim:
  - `test/fixtures/openf1/race-control-11253.json`: Suzuka, 49 rows.
  - `test/fixtures/openf1/race-control-11342.json`: Hungaroring, 81 rows.
  - `test/fixtures/openf1/red-2026.json`: `race_control?flag=RED&date%3E=2026-01-01&date%3C2027-01-01`, 41 rows, testing days included.
  - Copy each from the scratchpad's `rc.json` / `red.json` if they're still there; otherwise fetch them.

**Interfaces:**
- Produces in `src/flags/schema.ts`:
  - `RaceControl = Schema.Struct({ session_key: Number, date: String, lap_number: NullOr(Number), category: String, flag: NullOr(String), message: String })`.
  - `RaceControlResponse = Schema.Array(RaceControl)`.
  - `FlagSample = Struct({ lap: Number, message: String })`.
  - `FlagRace = Struct({ sessionKey, circuit: String, dateEnd: String, clear, yellow, doubleYellow, blue, red, chequered, blackWhite, blackWhiteTrackLimits, safetyCars, vscs: Number, samples: Struct({ clear, yellow, blue, chequered: optionalKey(FlagSample) }) })`.
  - `FlagTally = Struct({ season: Number, races: Array(FlagRace), redSessions: Number })`.
  - Types of the same names.
- Produces in `src/flags/tally.ts`:
  - `finishedRaces(sessions: ReadonlyArray<OpenF1Session>, now: Date): ReadonlyArray<OpenF1Session>`: `session_name === 'Race'`, not `is_cancelled`, `date_end` + 30 min before now, oldest first.
  - `frozen(race: { dateEnd: string }, now: Date): boolean`: `dateEnd` + 48 h before now.
  - `countRace(session: OpenF1Session, rows: ReadonlyArray<RaceControl>): FlagRace`.
  - `redSessionCount(sessions: ReadonlyArray<OpenF1Session>, rows: ReadonlyArray<RaceControl>): number`.

- [ ] **Step 1: Write the failing tests** in `test/flags/tally.test.ts`.
  - Decode the fixtures with `RaceControlResponse`, and use `sessions2026` from `test/season/fake-openf1.ts`.
  - `counts Suzuka by the rules`: `countRace(suzuka, rows)` has:
    - `clear 6`, `yellow 2`, `doubleYellow 2`, `blue 10`, `red 0`, `chequered 1`;
    - `blackWhite 1`, `blackWhiteTrackLimits 0`;
    - `safetyCars 1`, `vscs 0`;
    - `circuit 'Suzuka'`, `sessionKey 11253`.
  - `counts Hungaroring by the rules`:
    - `clear 6`, `yellow 5`, `doubleYellow 2`, `blue 11`, `chequered 1`;
    - `blackWhite 1`, `blackWhiteTrackLimits 1`;
    - `safetyCars 0`, `vscs 1`.
  - `a VSC is not a safety car`: one synthetic row `{category: 'SafetyCar', message: 'VSC DEPLOYED'}` gives `vscs 1, safetyCars 0`. A `{category: 'SafetyCar', message: 'SAFETY CAR ENDING'}` row gives neither.
  - `a black-and-white flag counts for track limits only when the message says so`.
  - `samples quote the first message with a lap number`:
    - `samples.blue` equals the first BLUE row with a non-null `lap_number`, as `{ lap, message }`;
    - a kind with no such row has no key.
  - `finishedRaces skips cancelled races, sprints and races still running`:
    - at `2026-11-15T00:00:00Z` it returns 20 sessions, from `Melbourne` to `Interlagos`, without Sakhir or Jeddah;
    - at 20 minutes after Interlagos' `date_end` the last one is `Mexico City`.
  - `frozen after 48 hours`: false at `dateEnd` + 47 h, true at + 49 h.
  - `redSessionCount skips testing days`: `red-2026.json` with `sessions2026` gives `26`.

- [ ] **Step 2: Run them and watch them fail.**
  - Run: `bun test test/flags/tally.test.ts`.
  - Expected: FAIL, because `src/flags/tally.ts` can't be resolved.

- [ ] **Step 3: Implement** `schema.ts` and `tally.ts` with the signatures above. The kind rules are verbatim from the spec, "Rules":
  - a flag kind by `flag`: `CLEAR`, `YELLOW`, `DOUBLE YELLOW`, `BLUE`, `RED`, `CHEQUERED`, `BLACK AND WHITE`;
  - a safety car is `category === 'SafetyCar'` and the message includes `SAFETY CAR DEPLOYED`;
  - a VSC is a message that includes `VSC DEPLOYED`;
  - track limits is `BLACK AND WHITE` and the message includes `TRACK LIMITS`;
  - red sessions: distinct `session_key`s whose session's `session_name` is in `Practice 1`, `Practice 2`, `Practice 3`, `Qualifying`, `Sprint Qualifying`, `Sprint`.

- [ ] **Step 4: Run the tests.**
  - Run: `bun test test/flags/tally.test.ts`.
  - Expected: PASS.

- [ ] **Step 5: Commit.**
  - `git add src/flags test/flags test/fixtures/openf1/race-control-*.json test/fixtures/openf1/red-2026.json`
  - `git commit -m "feat(flags): race control messages are counted per Grand Prix"`

### Task 2: OpenF1 readers, the incremental tally, and the snapshot field

**Files:**
- Modify: `src/season/openf1-client.ts`, `test/season/fake-openf1.ts`, `src/season/snapshot-schema.ts`, `src/season/build-snapshot.ts`, `src/season/refresh.ts`.
- Create: `src/flags/build.ts`, `test/flags/build.test.ts`.
- Modify: `test/season/refresh.test.ts` (one test).

**Interfaces:**
- Consumes the Task 1 interfaces.
- Produces:
  - `OpenF1Client` gains:
    - `raceControl: Read<typeof RaceControlResponse>` at `/race_control?session_key=${key}`, through `empty()`;
    - `redFlags: (year: number) => Effect<ReadonlyArray<RaceControl>, OpenF1Error>` at `/race_control?flag=RED&date%3E=${year}-01-01&date%3C${year + 1}-01-01`, through `empty()`.
  - `fakeOpenF1Service` defaults both to `Effect.succeed([])`.
  - `flagTally(season: number, now: Date, previous: FlagTally | undefined): Effect.Effect<FlagTally | undefined, never, OpenF1Client>` in `src/flags/build.ts`.
  - `buildSnapshot(now: Date, previous?: FlagTally)`. `refreshSnapshot` passes `previous?.flags`.
  - `SeasonSnapshot.flags: Schema.optionalKey(FlagTally)`.

How `flagTally` decides:
1. Read `sessions(season)` and take `finishedRaces`. If that list is empty, use `season - 1`. The tally's `season` is whichever season was used.
2. For each race:
   - if `previous` is the same season, has a row with that `sessionKey`, and that row is `frozen`, carry the row forward;
   - otherwise fetch `raceControl` and run `countRace`;
   - if the response is empty, the race gets no row.
3. `redSessions = redSessionCount(sessions, yield* redFlags(season))`: one request per run.
4. If no race has a row, return `previous`.
5. On any `OpenF1Error`, or a timeout of `'60 seconds'`, log a warning `flag tally skipped` and return `previous`. This follows `latestSession`'s `catchTags`.

- [ ] **Step 1: Write the failing tests** in `test/flags/build.test.ts`. Use `fakeOpenF1({ raceControl, redFlags, sessions })`, and count calls with a closure array.
  - `tallies every finished 2026 race`:
    - `raceControl` returns the Suzuka rows for every key;
    - at `2026-11-15T00:00:00Z` the tally has `season 2026`, 20 races, and `races[0].circuit 'Melbourne'`;
    - `raceControl` was called 20 times.
  - `an unchanged race list older than 48 hours makes no race_control request`: `previous` is the result of the test above. At `2026-11-15`, a second run calls `raceControl` 0 times and returns `races` equal to `previous.races`.
  - `a race under 48 hours old is fetched again`: with the same `previous`, run at Interlagos' `date_end` + 24 h. Only key `11412` is requested.
  - `a race with no race control yet gets no row and is asked for again`:
    - `raceControl` returns `[]` for `11412`; the tally has 19 races;
    - a run 3 days later with that tally as `previous` requests `11412` again.
  - `falls back to last season before the first race`:
    - `raceControl` returns the Suzuka rows for every key;
    - at `2026-03-01T00:00:00Z` the tally's `season` is `2025`;
    - `redFlags` was asked for `2025`.
  - `keeps the previous tally when OpenF1 fails`: `raceControl` fails with an `OpenF1Error`. The result `toBe(previous)`.
  - `omits the field when OpenF1 fails and there is no previous tally`: the result is `undefined`.
  - `a snapshot without flags still decodes`: `Schema.decodeUnknownSync(SeasonSnapshotJson)` of `test/fixtures/season-snapshot-v1.json` succeeds, and `flags` is `undefined`.
- Add to `test/season/refresh.test.ts`: `keeps writing the snapshot and the previous flags when OpenF1 race control fails`.
  - Store a previous snapshot with a `flags` tally.
  - Refresh with `raceControl` failing.
  - Expect the outcome `'written'`, a new `fetchedAt`, and the stored `flags` equal to the previous one.

- [ ] **Step 2: Run them and watch them fail.**
  - Run: `bun test test/flags test/season`.
  - Expected:
    - `build.test.ts` fails because the module can't be resolved;
    - the refresh test fails on `flags`;
    - every existing season test still passes.

- [ ] **Step 3: Implement** the readers, the fake defaults, `flagTally`, the schema field, and the wiring.
  - `buildSnapshot` calls `flagTally(season, now, previous)` after `latestSession`, and spreads `...(flags && { flags })`.
  - `refreshSnapshot` passes `previous?.flags` to `buildSnapshot`.

- [ ] **Step 4: Run all the tests.**
  - Run: `bun test`.
  - Expected: all pass, with no snapshot test changed except the new refresh test.

- [ ] **Step 5: Commit.**
  - `git commit -m "feat(season): the hourly refresh keeps a flag tally for the season's Grands Prix"`

### Task 3: The wall model and the e2e fixture

**Files:**
- Create: `src/flags/wall.ts`, `test/flags/wall.test.ts`.
- Modify: `test/fixtures/season-snapshot.json`.

**Interfaces:**
- Consumes `FlagTally`.
- Produces in `src/flags/wall.ts`:
  - `type Quote = { circuit: string; lap: number; message: string }`;
  - `type Wall = { season: number; races: number; first: string; latest: string; clear: number; yellow: number; doubleYellow: number; blue: number; red: number; chequered: number; redSessions: number; blackWhite: number; trackLimits: number; safetyCars: number; scRaces: number; vscs: number; vscRaces: number; quotes: Partial<Record<'clear' | 'yellow' | 'blue' | 'chequered', Quote>> }`;
  - `wallOf(tally: FlagTally): Wall`;
  - `count(n: number): string`, which is `n.toLocaleString('en-GB')`.

- [ ] **Step 1: Add the real tally to the fixture.**
  - Write a scratchpad script (not committed) that runs `flagTally(2026, new Date('2026-11-15T00:00:00Z'), undefined)` against `OpenF1Client.layer` with `FetchHttpClient.layer`. These are read-only GETs.
  - Add the result as `flags` to `test/fixtures/season-snapshot.json`, keeping every other key byte-identical.
  - Check that the sums match the spec table:
    - 20 races; CLEAR 526; YELLOW 298; DOUBLE YELLOW 242; BLUE 1287; race RED 0; redSessions 26; CHEQUERED 20;
    - black-and-white 20, 17 of them track limits;
    - SC 15 in 10 races; VSC 25 in 14 races.
  - If any number differs, stop and report it: OpenF1 changed after the spec was written.

- [ ] **Step 2: Write the failing tests** in `test/flags/wall.test.ts`, on the fixture's `flags`:
  - `sums the season`: `wallOf` gives all of the following:
    - `season 2026`, `races 20`, `first 'Melbourne'`, `latest 'Interlagos'`;
    - `blue 1287`, `red 0`, `redSessions 26`;
    - `trackLimits 17`, `blackWhite 20`;
    - `safetyCars 15`, `scRaces 10`, `vscs 25`, `vscRaces 14`.
  - `quotes the most recent race that has the flag`. Build a tally from two races, where only the older one has a `blue` sample. `quotes.blue.circuit` is the older circuit, and `quotes.clear` comes from the newer one.
  - `the season in the copy is the tally's`: a tally with `season 2025` gives `wall.season 2025`.
  - `count groups thousands the British way`: `count(1287)` is `'1,287'`.

- [ ] **Step 3: Run them and watch them fail.**
  - Run: `bun test test/flags/wall.test.ts`.
  - Expected: FAIL, because the module can't be resolved.

- [ ] **Step 4: Implement** `wall.ts`.

- [ ] **Step 5: Run the tests.**
  - Run: `bun test`.
  - Expected: all pass. The fixture still decodes in `test/season/kv-rest.test.ts` and `test/chapter/page-model.test.ts`.

- [ ] **Step 6: Commit.**
  - `git commit -m "feat(flags): the wall reads its season totals and latest quotes from the tally"`

### Task 4: The Chapter 04 page

**Files:**
- Create: `src/chapter/Flags.tsx`, `src/chapter/FlagWall.tsx`, `src/styles/flags.css`, `src/routes/chapters.flags.tsx`, `e2e/flags.spec.ts`.
- Create photos in `public/img/`:
  - `ch04-marshal.jpg`: STP 3286, about 2000 px wide;
  - `ch04-sweep.jpg`: native 1575;
  - `ch04-fire.jpg`: 1920;
  - `ch04-board.jpg`: native 1477.
- Modify: `src/home/content.ts` (`PHOTOS`), `src/chapter/words.ts`.

**Interfaces:**
- Consumes `wallOf`, `count`, `Wall` (Task 3), and `useSeason().data?.flags`.
- Produces:
  - `PHOTOS.ch04Marshal`, `ch04Sweep`, `ch04Fire`, `ch04Board`, with `place` and `credit` from the spec;
  - nine `WORDS` keys: `marshal`, `marshalSector`, `yellowFlag`, `blueFlag`, `lappedCar`, `redFlag`, `trackLimits`, `blackWhiteFlag`, `vsc`. Definitions are verbatim from the spec, "Words";
  - `FLAGS_WORDS` in the spec's order;
  - the route `/chapters/flags`.

**The DOM contract the e2e test relies on.**
- The wall:
  - `.chapter-page.flags-page` contains `section.wall[data-theme=<opposite>]`;
  - the header holds `.label`, `.tag`, `h2`, `.body`;
  - `ol.posters` holds six `li.poster[data-flag]`, with flags `green`, `yellow`, `double`, `blue`, `red`, `chequered` in that order.
- Each poster holds:
  - `.index`, `.order`, `.line`;
  - `.count` with `.num` and `.unit`;
  - `.chip` with `.where` and `.msg`;
  - `.rail` with six `i`, the current one `[data-on]`.
  - `double` and `red` hold a `figure` instead of the chip and rail.
  - `red` adds `.sub`.
- `.foot` closes the wall.
- The other sections:
  - `section.rest` has `ul.tiles` with five `li`;
  - `section.limits` has `ol.strikes` with four `li` (the last `[data-payoff]`) and `.stat`;
  - `section.boards` has `ul.stats` with two `li`, a `figure`, and `.stat` text inside its `li`;
  - `Words`, then `Next`.
- **With no tally:**
  - `.count`, `.chip`, `.sub`, `.foot`, `.tag`, `.limits .stat` and the boards' numbers render as empty elements;
  - CSS gives them a reserved `min-height`;
  - every `<season>` in fixed copy falls back to omitting the season. For example, the label reads `The flag wall`.

- [ ] **Step 1: Write the failing e2e** in `e2e/flags.spec.ts`, using the `loaded`/`chapter` helpers from `e2e/tyres.spec.ts`:
  - `loads with no errors, light` and `…, dark`:
    - the h1 reads `A flag isan order.`;
    - the title is `Flags and what they mean · Lights Out`;
    - `errors` is empty.
  - `no horizontal overflow on the page`.
  - `every photo is credited`: `.photo-band .credit`, both poster figures, `.boards .credit` and `.next .credit` each contain `CC`.
  - `six posters in race order with the season's counts`:
    - `[data-flag]` values in order: `['green','yellow','double','blue','red','chequered']`;
    - the blue `.num` is `1,287`; the red `.num` is `0`;
    - the red `.sub` contains `26 practice, qualifying and sprint sessions`;
    - the wall `.tag` reads `OpenF1 race control · 20 races`;
    - `.foot` contains `Melbourne to Interlagos`.
  - `the posters keep their flag colours in both themes`:
    - for both colour schemes, the blue poster's computed `background-color` is `rgb(28, 140, 255)`;
    - the wall header's background differs from `body`'s.
  - `track limits and boards read the tally`:
    - `.limits .stat` contains `17 of 20 black-and-white flags in 2026 races were for track limits`;
    - `.boards .stats` contains `15` and `10 races in 2026`.
  - `with /api/season failing, no number renders and the posters still show`:
    - use `stubSeason(page, { status: 500, body: '' })` before `goto`;
    - six posters are visible;
    - every `.count`, `.chip`, `.limits .stat` and `.foot` has empty text;
    - `hiddenText(page)` is `[]`.
  - `reduced motion leaves the posters unstacked`: with `emulateMedia({ reducedMotion: 'reduce' })`, the first poster's computed `position` is `static`.
  - `a word chip opens its definition`: clicking `Track limits` opens `.words > .def` with `Track limits`.

- [ ] **Step 2: Run it and watch it fail.**
  - Run: `bunx playwright test e2e/flags.spec.ts`.
  - Expected: FAIL, because the route 404s.

- [ ] **Step 3: Add the photos, the `PHOTOS` entries and the words.**
  - Resize with `sips -Z`. If the scratchpad is gone, re-download from Commons through the imageinfo `thumburl`, with a User-Agent, and back off on 429.
  - Re-read `DESIGN.md`'s seven rules and the frames (`get_screenshot` on 375:821 and 384:839) before the next step.

- [ ] **Step 4: Build the route, page, wall and CSS.**
  - Follow the `Tyres.tsx` pattern: `hero`/`motion` with `sweep`, `block`, `reveal` and `rise`, plus `Words` and `Next`.
  - The route's stylesheets are `chapterCss` + `flagsCss` only.
  - Copy is verbatim from the spec, sections 1–8. Inline `Term`s go exactly where the spec's "Inline terms" list puts them.
  - The six posters' field and ink colours come from the spec's table, and stay the same in both themes.
  - Sticky stack:
    - `.poster { position: sticky; top: 0; height: 100svh; min-height: 640px }`, and `560px` at `max-width: 760px`;
    - `@media (prefers-reduced-motion: reduce) { .poster { position: static; height: auto } }`.
  - The marshal photo crops from the top (`object-position` near the top), so his face shows.
  - On a phone:
    - the rest tiles become `overflow-x: auto; scroll-snap-type: x mandatory`, with the next card's edge showing;
    - the strikes become stacked rows;
    - the split posters put the photo under the colour;
    - the chequered checks run along the bottom.
  - The chequered rail swatch is a tiny CSS check (`conic-gradient`).

- [ ] **Step 5: Run the checks.**
  - Run: `bunx playwright test e2e/flags.spec.ts && bun run lint`.
  - Expected: all pass, on desktop and phone.

- [ ] **Step 6: Commit.**
  - `git commit -m "feat(guide): chapter 04 shows each flag's order on a live flag wall"`

### Task 5: Wire it into the guide

**Files:**
- Modify: `src/home/content.ts` (`CHAPTERS[3].to`), `src/chapter/Tyres.tsx`, `e2e/tyres.spec.ts`, `e2e/home.spec.ts`.

**Interfaces:**
- Consumes the `/chapters/flags` route from Task 4.
- Produces nothing new.

- [ ] **Step 1: Change the e2e tests first.**
  - `e2e/tyres.spec.ts`: rename `the hero nav leads back to chapter 02` to `the hero nav leads to chapters 02 and 04`.
    - Assert the `04 Flags and what they mean` link has `href` `/chapters/flags`.
    - Add `the next card leads to chapter 04`: `.next .read` has `href` `/chapters/flags`.
  - `e2e/home.spec.ts`:
    - add `Home's chapter 04 row leads to chapter 04` (`.rows li:nth-child(4) a`);
    - change the menu test name and count to `four chapters linked` and `4`.

- [ ] **Step 2: Run them and watch them fail.**
  - Run: `bunx playwright test e2e/tyres.spec.ts e2e/home.spec.ts`.
  - Expected: the three changed tests fail; the rest pass.

- [ ] **Step 3: Make the links.**
  - `CHAPTERS[3].to = '/chapters/flags'`.
  - In `Tyres.tsx`, the hero `Soon` becomes `<Go to="/chapters/flags">04 Flags and what they mean →</Go>`. Match the arrow style of Chapter 02's forward link.
  - The `Next` card gets `to="/chapters/flags"`.

- [ ] **Step 4: Run all the checks.**
  - Run: `bun test && bun run lint && bunx playwright test`.
  - Expected: all pass.

- [ ] **Step 5: Commit.**
  - `git commit -m "feat(guide): chapter 03, Home and the menu lead to chapter 04"`

### Task 6: Facts, and the live check

**Files:** none, unless a fact fails.

- [ ] **Step 1: Verify the facts** in the spec's "Facts to verify before ship", with sources:
  - track limits: 3rd offence black-and-white, 4th a 5 s penalty, checked against one 2026 race director's event notes;
  - the ten flags of Appendix H;
  - red flag cars go to the pit lane;
  - the VSC delta.
  - If a fact fails, fix the copy and its e2e test as one more commit.
- [ ] **Step 2: Scroll the page in a browser** at 1440 and 390, in both themes, with `bun run dev`.
  - The posters stack cleanly and no text is clipped.
  - The wall is in the opposite theme.
  - Compare against the four Figma frames.
  - Save screenshots in the scratchpad for the PR body.
- [ ] **Step 3: Record the ledger,** then hand over to sol-loop. Don't push.
