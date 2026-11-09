# Race Weekend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Race weekend page at `/weekend` from the approved Figma frames. It always shows the current or next Grand Prix:
- the circuit photo hero;
- a big countdown to the next session;
- an interactive 3D circuit band with the facts and the schedule in the visitor's time;
- the latest session result, practice included;
- a teaser to How F1 works.

**Architecture:**
- **One new piece of data: the latest session result.** The hourly refresh asks OpenF1 for the newest session that is out of its live window, and stores its result as an optional `latestSession`.
  - Checked on 2026-11-09: OpenF1's historical data is free without an account. Sessions 11406 (FP2), 11408 (Qualifying) and 11412 (Race) returned results, and `drivers` maps each car number to its code.
  - OpenF1 treats a session as live, and needing a login, until 30 minutes after it ends.
  - If OpenF1 fails or has nothing new, the refresh keeps the stored snapshot's `latestSession`. The Latest block never blinks out around a session.
- **Pure page model.** As on This season, every number and every data-driven sentence comes from pure functions of `(snapshot, now, visitor zone)` in `src/weekend/page-model.ts`. The components only lay them out.
- **The circuit band reuses Home's 3D circuit.** `src/circuits/Circuit.tsx` gains an optional yaw (drag to spin) and makes the lap light optional. The 3D roads, turn pins and sector meshes already exist for the five circuits from now to the 2027 opener: Interlagos, Las Vegas, Losail, Yas Marina and Albert Park.
- **Prerendered without data, like This season,** and listed explicitly in the prerender pages, because no static link reaches it.

**Tech Stack:** As This season: TanStack Start on Cloudflare Workers, TanStack Query, Effect 4 schemas and services, React 19.3, R3F and three.js, GSAP with the `src/motion/motion.ts` grammar, `bun test` with happy-dom, and Playwright (headed Chrome, 2 workers).

**Spec:** `docs/superpowers/specs/2026-11-07-f1-fan-site-design.md`, item 6 ("the latest results (race, qualifying, sprint)") and §8. Also read `DESIGN.md` and `docs/motion-map.md`.

**Figma** (file `IPkJZWQnY0IKdIjf6Nuugl`, page 13:2). There is no phone frame (see Task 7).

| Section | Light (68:2) | Dark (70:2) |
|---|---|---|
| Hero: photo, title block, caption | y 88–988 | same layout |
| Countdown | y 1066–1458 | same layout |
| Circuit band (opposite theme) | 68:49, y 1586–2666 | same layout |
| Latest result | y 2746–3342 | same layout |
| Teaser to Chapter 02 | 68:145, y 3406–4114 | same layout |

Read each section with `get_design_context` before building it, and match type, spacing and colour to the frame.

**Scope, decided by Praffi on 2026-11-09:**
- **Latest includes practice,** through OpenF1.
- **The "Overtake detection" toggle is dropped** until the overtaking chapter. The band ships with two working toggles: Turns and Sectors.
- **The circuit band is interactive** in our matte look, with no glow:
  - drag sideways to spin;
  - a reset button eases it back to the poster pose;
  - turn numbers ride on stems that follow the road;
  - the Blender still shows until the band scrolls into view.

**My calls, flagged for Praffi:**
- **Route.** The page lives at `/weekend` and is not added to the menu, because the approved menu has no slot for it. It is reached from the weekend box on every page.
- **Corner names.** The data names one corner per circuit, such as turn 1 "S do Senna". It shows as a fixed label, as in the mock.
- **The spin is limited to ±45°,** with a rubber-band edge. Spun further, a long track like Las Vegas leaves the frame, and the ground tile's corners swing into view. Council found this.
- **Links with nowhere to go yet.** "Explore the lap in 3D", "Full timesheet", the Chapter 02 "Read" and the weekend box's "Full result" stay "Soon". The box's Latest tab shows Jolpica's last race, which can differ from this page's newest session.

## Global Constraints

- **Code style.** No code comments anywhere, no `as` assertions (except `as const`), no `any`, no non-null `!`. `bun run lint` passes before every commit.
- **Commits.** Commit locally after each task with a conventional, present-tense title. Never add a `Co-Authored-By` trailer. Never push, open a PR or deploy without Praffi's explicit word. Ask before any Cloudflare action.
- **Media.** Wikimedia Commons under CC0, CC BY or CC BY-SA, or public domain, with the credit on the page. Never use OpenF1's `headshot_url`: those are Formula 1's photos. No F1, FIA or team logos.
- **Network.** OpenF1 requests send `User-Agent: LightsOutFanSite/0.1 (personal project)`. They are sequential, at least 400 ms apart, and capped at 20 s in total. Tests never touch the network.
- **Themes and motion.** Light and dark both match their frames, and the circuit band uses the opposite theme. Under reduced motion there is no motion and no hidden text. The track can still be dragged, but without momentum.
- **Prerender-safe.** No `window`, `document`, `matchMedia`, `Intl…resolvedOptions()` or `location` at module level or during render. The visitor's zone is read once after mount. `useTheme().theme` can be `null`; treat it as `'light'`.
- **Scoped styles.** Every rule in `weekend.css` sits under `.weekend-page`. Never reuse a class that `site.css`, `home.css` or `season.css` styles unscoped (`.bar`, `.strip`, `.display`, `.dot`, `.chip`, `.lead`, `.photo`, `.card`).
- **Motion.** Every move comes from `src/motion/motion.ts` (`sweep`, `reveal`, `block`, `draw`, `roll`). Never `once: true` on a ScrollTrigger; use `ONCE`. Each section sets up its own `useGSAP` once its data has rendered.
- **Copy.** Every data-driven sentence is written out word for word in Task 2. Praffi checks the copy before deploy.
- **Names and colours.** Drivers come from `CARS`, matched on the three-letter code. Codes `CARS` doesn't know fall back to OpenF1's `last_name`, full name and team, with `#<team_colour>` or `var(--muted)`.

## Review Focus

1. **OpenF1 fails, is still in its live window, or has no result yet (404).** The stored `latestSession` is kept, and nothing else changes. Task 1 tests all three.
2. **Qualifying and race shapes.** Q1/Q2/Q3 arrays, null positions for DNF and DNS rows, `+2 LAPS` gaps, and testing or cancelled sessions in the season list. Task 1 tests them with the real 11408 and 11412 responses.
3. **The visitor's zone differs from the machine's.** Every visitor-time string comes from an explicit zone, and sessions without a confirmed time never show an invented time. Task 2 tests this with `Asia/Jakarta` and `America/New_York` on a UTC process.
4. **The weekend after the flag, and the season's end.** The clock has a defined state after the race and after the finale, and the page never falls back to the loader's waiting line while a calendar exists. Task 2 tests both.
5. **Spinning stays readable.** At −45°, 0° and +45° on all five models, the track stays in frame, pins that leave the frame hide, and the S labels sit on the road. On touch screens a vertical swipe still scrolls the page. Tasks 4 and 8 cover this.

---

### Task 1: The latest session result in the snapshot

**Files:**
- Create:
  - `src/season/openf1-schema.ts`
  - `src/season/openf1-client.ts`
  - `src/season/latest-session.ts`
  - `test/season/fake-openf1.ts`
  - `test/season/latest-session.test.ts`
  - `test/fixtures/openf1/`: real responses saved once for the 2026 season list, plus results and drivers for 11406 (FP2), 11408 (Qualifying) and 11412 (Race)
- Modify:
  - `src/season/snapshot-schema.ts`
  - `src/season/build-snapshot.ts`
  - `src/season/refresh.ts`
  - `tools/refresh-season.ts`
  - `test/season/snapshot.ts`
  - `test/season/refresh.test.ts`
  - `test/season/build-snapshot.test.ts`
  - `test/season/kv-rest.test.ts`
  - `test/fixtures/season-snapshot.json`

**Interfaces:**
- Produces:
  ```ts
  export const LatestSession = Schema.Struct({
    season: Schema.Number,
    round: Schema.Number,
    name: SessionName,
    startsAt: Schema.String,
    rows: Schema.Array(Schema.Struct({
      position: Schema.Number,
      code: Schema.String,
      family: Schema.String,
      name: Schema.String,
      team: Schema.String,
      colour: Schema.NullOr(Schema.String),
      time: Schema.NullOr(Schema.Number),
      gap: Schema.NullOr(Schema.Union([Schema.Number, Schema.String])),
    })),
  })
  ```
  - `SeasonSnapshot` gains `latestSession: Schema.optionalKey(LatestSession)`.
  - `class OpenF1Client extends Context.Service`:
    - `sessions(year)`;
    - `result(sessionKey)`, which maps a 404 to `[]`;
    - `drivers(sessionKey)`.
  - `latestSession(calendar: ReadonlyArray<Race>, season: number, now: Date): Effect.Effect<LatestSession | undefined, never, OpenF1Client>`.
  - `buildSnapshot` and `refreshSnapshot` require `JolpicaClient | OpenF1Client` (plus `SnapshotStore` for the refresh).
- **Wire schemas.**
  - `session_name` is a plain `String`.
  - `is_cancelled` is optional.
  - On result rows, `position` is `NullOr(Number)`. `duration` and `gap_to_leader` are `NullOr(Union(Number, String, Array(NullOr(Number))))`.
  - On drivers, `team_colour` is `NullOr(String)`.
- **Name map.** `Practice 1→FP1`, `Practice 2→FP2`, `Practice 3→FP3`, `Sprint Qualifying` or `Sprint Shootout→SprintQualifying`, `Sprint→Sprint`, `Qualifying→Qualifying`, `Race→Race`. Anything else, such as testing days, is skipped.

- [ ] **Step 1: Write the failing tests.** Use `fakeOpenF1`, a layer over the saved fixtures next to `fakeJolpica`.
  - **`picks the newest session out of its live window`.** At `2026-11-06T21:00Z`, the result is FP2 of round 20. Row 1 is `{ position: 1, code: 'ANT', time: 70.763, gap: 0 }`.
  - **The live window.** At `2026-11-06T20:20Z` FP2 is inside its window, so the result is FP1. At `20:31Z` it is FP2.
  - **Qualifying arrays.** With 11408, `time` and `gap` take the last non-null entry of each array.
  - **Race rows.** With 11412, rows with a null `position` are dropped, and a lapped gap stays the string `'+2 LAPS'`.
  - **Skipped sessions.** Cancelled sessions and testing days are skipped.
  - **A 404 result** gives `undefined`.
  - **Calendar match.**
    - A session matches a calendar session when the mapped name is the same and `Date.parse(date_start) === Date.parse(startsAt)`. OpenF1 writes `+00:00` and Jolpica writes `Z`, so never compare the raw strings.
    - The fixtures keep OpenF1's own timestamps untouched, and FP2's `…T19:00:00+00:00` must match the calendar's `…T19:00:00Z`.
    - A session with no match gives `undefined`.
  - **Failures.** A 401 gives `undefined` and a warning. So does no answer within 20 s, run with `TestClock`.
  - **In `refresh.test.ts`:**
    - `keeps the stored latestSession when OpenF1 has nothing new`;
    - `replaces it when OpenF1 has a newer one`.
- [ ] **Step 2: Run them and watch them fail.** `bun test test/season` → FAIL, because `latest-session.ts` doesn't exist.
- [ ] **Step 3: Implement.**
  - **Client.** It copies the Jolpica client's shape: a base URL of `https://api.openf1.org/v1`, the user agent, a one-permit semaphore with `400 millis` spacing, and `retryTransient` on errors only. `result` catches a 404 status and returns `[]`; every other non-OK status is an `OpenF1Error`.
  - **`latestSession`.**
    - Read `sessions?year=`. Keep the uncancelled sessions with a mapped name whose `date_end` plus 30 minutes is before `now`, and take the newest.
    - Read its result and drivers, and join them on `driver_number`.
    - Match the session to the calendar on name and parsed instant to get `round`.
    - Apply `Effect.timeout('20 seconds')` and `Effect.catch` with a warning log, as `history` does.
  - **Wiring.**
    - `buildSnapshot` attaches the result when it is defined.
    - `refreshSnapshot` reads the store first. When the new snapshot has no `latestSession`, it copies the stored one over, but only if that one is from the same season.
    - `tools/refresh-season.ts` merges `OpenF1Client.layer`.
  - **Fixture.** The shared e2e fixture gets the latest session at its clock (15:00Z on 6 Nov, before FP1): the Mexico City Grand Prix race, round 19, saved from OpenF1.
- [ ] **Step 4: Run** `bun test` → all pass, and `bun run lint` → clean.
- [ ] **Step 5: Commit** `feat(season): the snapshot carries the newest finished session's result from OpenF1`.

### Task 2: The page model and the calendar file

**Files:**
- Create: `src/weekend/page-model.ts`, `src/weekend/ics.ts`, `test/weekend/page-model.test.ts`, `test/weekend/ics.test.ts`
- Modify:
  - `src/season/weekend.ts`:
    - `when(iso, trackZone, visitorZone?)` formats "yours", and its "(next day)" shift, in `visitorZone`.
    - When `visitorZone` is `undefined` it keeps today's runtime default, so `WeekendBox` and `Footer` don't change. The page model always passes the zone.
    - Also move `zoneName` here from `WeekendBox.tsx`.
  - `test/season/weekend.test.ts`

**Interfaces:**
- Consumes: `pickRace`, `nextLightsOut`, `when`, `sessionDay`, `countdown`, `SESSION_LABEL`, `SESSION_MINUTES`, `latestStart` and `gpName` from `src/season/weekend.ts`. For the flag, pass `nextLightsOut(...).race`'s `Race` session to `sessionDay`, with the zone from `circuitFor(…).tz`. `weekend()`'s label rule (`page-model.ts:117`); `calendarCircuit`, `circuitFor`, `CARS` and `portraitFor`.
- Produces:
  ```ts
  export function weekendPage(snapshot: SeasonSnapshot, now: Date, zone: string): WeekendPage | null
  export type WeekendPage = {
    label: string
    title: string
    dates: string
    place: string
    photo: CalendarCircuit['photo'] | undefined
    clock: Clock | null
    flag: string | null
    note: string
    band: Band
    latest: Latest | null
  }
  export type Clock = { label: string; target: string; units: 'dhm' | 'hms' | 'd'; track: string; yours: string }
  export type Band = { when: string; info: CircuitInfo | undefined; facts: CalendarCircuit | undefined; zone: string; schedule: ReadonlyArray<{ label: string; day: string; time: string; state: 'done' | 'live' | 'next' | 'later' }> }
  export type Latest = { label: string; gap: string; headline: string; body: string; rows: ReadonlyArray<{ position: number; code: string; colour: string; time: string }>; image: Photo | undefined; who: string }
  export function clockDigits(clock: Clock, now: number): ReadonlyArray<{ value: string; unit: string }>
  export function weekendIcs(snapshot: SeasonSnapshot, now: Date): { filename: string; body: string } | null
  ```
  - `weekendPage` is `null` only when `pickRace` is `null`.

**Copy, word for word.** `T` is a confirmed session's time at the track (HH:MM). `Day` is the race's weekday at the track.
- **`label`.** As `weekend()`: `This season · Round ${round} of ${of}`, or `Next race · ${season} · Round ${round}` for a race from `nextCalendar`.
- **`title`.** `${grandPrix(gp)}.`, for example "São Paulo Grand Prix.".
- **`dates`.** `${first day}–${race day} ${Month} ${year} · ${circuitName}`, from UTC days when times are not confirmed.
- **The clock's target.**
  - While a session runs, the clock counts to its end, using `SESSION_MINUTES`.
  - Otherwise it counts to the race's next session.
  - After the race's last session ends, `clock` is `null`, and `flag` says what's next:
    - `Chequered flag. The ${grandPrix(next gp)} starts ${Sat 21 Nov}.` when `nextLightsOut` finds a race. The day is that race's start day in its own track zone, through `sessionDay`; Las Vegas reads `Sat 21 Nov`.
    - `Chequered flag. That was the last race of ${season}.` when it doesn't.
- **`clock.label`.** `Next · ${SESSION_LABEL}`, or `Live · ${SESSION_LABEL}` while a session runs.
- **`clock.units`.**
  - `hms` under 24 hours to go.
  - `dhm` from 24 hours.
  - `d` when the target's time is not confirmed; that counts whole days to `latestStart`.
- **`clock.track` and `clock.yours`.**
  - Confirmed: `${Sat 7 Nov} · ${T} at the track` and `${HH:MM} your time`.
  - Not confirmed: `${Sat 7 Nov} · time TBC`, with the day from UTC, and an empty `yours`.
- **`note`, about the session after the target.**
  - Default: `Then ${label in lower case} at ${T} track time: ${ABOUT}`. When that session's time is not confirmed, `at ${T} track time` becomes `on ${Sat}`.
  - **Target is the race:** `${laps} laps, ${distance} km. ${ABOUT.Race}`. The first sentence is dropped when there is no `CircuitInfo`.
  - **Target's time not confirmed:** `Session times are not confirmed yet.`
  - **No clock:** empty.
- **`ABOUT`:**
  - **FP1, FP2, FP3:** `an hour for teams to try set-ups. Times hint, they don't decide.`
  - **SprintQualifying:** `a shorter knockout that sets the sprint grid.`
  - **Sprint:** `a 100 km race with points for the top eight.`
  - **Qualifying:** `three knockout rounds that set ${Day}'s grid.`
  - **Race:** `Points go to the top ten, 25 for the win.`
- **Band.**
  - `when`: `6–8 Nov`.
  - **Schedule rows.** The session label, the weekday in capitals, and the time as `HH:MM`, all in the visitor's zone. An unconfirmed session shows its UTC weekday and `TBC`.
  - **`state`.** `done` after a session ends, `live` while it runs, `next` for the clock's target, and `later` otherwise.
  - **Day column.** The `next` row reads `${DAY} · next`, and the `live` row `${DAY} · live`.
- **`latest`**, from `latestSession`. It is `null` when that is missing, from another season, or has fewer than two rows.
  - **`label`.**
    - `Latest · ${SESSION_LABEL} · ${Fri 6 Nov}` when the session's round is the page's race.
    - `Latest · ${gpName} · ${SESSION_LABEL} · ${Sun 26 Oct}` otherwise.
    - The day is in that race's own track zone.
  - **`gap`.** P2's gap as `0.253 s`. A string gap such as `+1 LAP` reads `1 lap`.
  - **`headline`, by session:**
    - **Practice:** `${P1} fastest. ${P2} that far behind.`
    - **Qualifying:** `${P1} on pole. ${P2} that far behind.`
    - **SprintQualifying:** `${P1} on sprint pole. ${P2} that far behind.`
    - **Sprint:** `${P1} wins the sprint. ${P2} that far behind.`
    - **Race:** `${P1} wins. ${P2} that far behind.`
    - Names are family names from `CARS`, else the row's `family`.
  - **`body`.** `${P3} third, ${P4} fourth. ${LESSON}`. The first sentence is dropped when there are fewer than four rows.
  - **`LESSON`:**
    - **Practice:** `Practice times hint, they don't decide: teams run different fuel loads and tyres.`
    - **Qualifying:** `Pole is the best seat into Turn 1, not a promise.`
    - **SprintQualifying:** `It sets the sprint grid only.`
    - **Sprint:** `Sprint points go to the top eight.`
    - **Race:** `Points go to the top ten, 25 for the win.`
  - **`rows`.** P1 to P3. P1 shows the time (`1:10.763` for a lap, `1:32:10.412` for a race); the others show `+0.253`.
  - **`image` and `who`.** `image` is the P1 portrait, else P1's car photo, else `undefined`. `who` is `${name} · ${team}`, from `CARS`/`TEAMS` or else the row.
- **ICS (RFC 5545).**
  - `filename`: `${circuitId}-${season}.ics`.
  - The body is `BEGIN:VCALENDAR`, `VERSION:2.0`, `PRODID:-//Lights Out//Race weekend//EN`, then one `VEVENT` per session, then `END:VCALENDAR`.
  - Each `VEVENT` has:
    - `UID:${season}-${round}-${name}@lights-out`;
    - `DTSTAMP` (now, UTC);
    - `SUMMARY:${gp} · ${SESSION_LABEL}`, with `,`, `;` and `\` escaped.
  - **Times.** A confirmed session has `DTSTART` in UTC and a `DURATION` from `SESSION_MINUTES`. An unconfirmed one has `DTSTART;VALUE=DATE` from its UTC date and `DTEND;VALUE=DATE` the day after.
  - Lines end with CRLF. They fold at 75 UTF-8 octets, only at code-point boundaries, so the 2-byte `·` is never split.

- [ ] **Step 1: Write the failing tests** with the fixture snapshot and fixed clocks, on a process zone of UTC:
  - **Weekend copy.**
    - The hero copy at FP3 minus 2 h.
    - `clock.units` `hms`, `dhm` (5 days out) and `d` (unconfirmed).
    - A live session (FP3 plus 20 min) gives the `Live · Practice 3` label and a `live` row.
    - At race end plus 1 h, `clock` is `null` and `flag` is exactly `Chequered flag. The Las Vegas Grand Prix starts Sat 21 Nov.`. The race starts at 04:00Z on 22 Nov, so this catches a version that ignores the track zone.
    - After the finale with no next calendar, `flag` is the last-race line.
    - A `nextCalendar` race gets the `Next race · 2027 · Round 1` label.
  - **Notes.**
    - At FP3 minus 2 h, the note about Qualifying reads "…set Sunday's grid.".
    - At the same point of the Las Vegas weekend, it reads "…set Saturday's grid.".
  - **Visitor times.**
    - In `Asia/Jakarta`, the race row is `MON` `00:00`.
    - In `America/New_York`, an unconfirmed session shows its UTC day and `TBC`.
  - **Latest block.**
    - FP2 gives the headline "Antonelli fastest. Norris that far behind." and the body "Verstappen third, Russell fourth. Practice times hint, they don't decide: teams run different fuel loads and tyres."
    - Qualifying with arrays.
    - The Mexico race on the São Paulo page carries the GP in its label.
    - A `+1 LAP` gap reads `1 lap`.
    - A driver missing from `CARS` uses the row's names.
    - `latest` is `null` without `latestSession`.
  - **ICS.**
    - The body parses into five events with `VERSION`, `PRODID` and `DTSTAMP`.
    - An unconfirmed session is all-day.
    - A long summary with a `·` at the 75-octet cut folds without splitting it.
- [ ] **Step 2: Run them and watch them fail** → "weekendPage is not defined".
- [ ] **Step 3: Implement** the functions above, with `Intl.DateTimeFormat` and an explicit `timeZone` for every conversion.
- [ ] **Step 4: Run** `bun test` and `bun run lint`.
- [ ] **Step 5: Commit** `feat(weekend): the page model writes the weekend's copy, clock, schedule and latest result`.

### Task 3: The route, hero and countdown

**Files:**
- Create: `src/routes/weekend.tsx`, `src/weekend/Weekend.tsx`, `src/weekend/Top.tsx`, `src/weekend/Clock.tsx`, `src/styles/weekend.css`, `test/weekend/clock.test.tsx`
- Modify:
  - `src/shell/WeekendBox.tsx`: "Race weekend page" and "Full weekend schedule" become `<Go to="/weekend">`, and "Full result" stays `Soon`.
  - `vite.config.ts`: add `pages: [{ path: '/weekend' }]`.
  - `test/build.test.ts`: assert `dist/client/weekend/index.html`.

**Interfaces:** Consumes `weekendPage`, `clockDigits`, `weekendIcs`, `useSeason`, `useSecond`, `waitFor` and `Go`.

- [ ] **Step 1: Write the failing tests.**
  - `clock.test.tsx` renders `<Clock>` with FP3 two hours away and ticks `gsap.ticker.tick()` once a second; the seconds digit changes.
  - With `clock` null it shows the flag line and no digits.
  - The "Add the weekend to your calendar" button calls `URL.createObjectURL` with a `text/calendar` blob.
  - `build.test.ts` asserts the prerendered `/weekend`.
- [ ] **Step 2: Run them** → FAIL.
- [ ] **Step 3: Implement.**
  - **Route.** It copies `src/routes/season.tsx`. `Weekend` shows the waiting line until data arrives, and reads the visitor's zone in an effect.
  - **`Top`.** The full-bleed photo (`/img/circuits/<circuitId>-2400.webp`, with a 720 `srcSet`) and the title block. The block is ink on the light page and paper on the dark page, and the credit caption sits bottom right.
  - **`Clock`.** The label row, three digit groups with the frame's grey colons, the unit labels, the note, and the calendar `<button>`, which builds the blob and clicks a temporary `<a download>`.
- [ ] **Step 4: Run** `bun test`, `bun run lint` and `bun run build`.
- [ ] **Step 5: Commit** `feat(weekend): the Race weekend page opens with the circuit photo and counts down to the next session`.

### Task 4: The interactive circuit band

**Files:**
- Create: `src/weekend/CircuitBand.tsx`, `test/weekend/circuit-band.test.tsx`
- Modify:
  - `src/circuits/Circuit.tsx`
  - `src/circuits/registry.ts`: add `cuts: readonly [number, number]` per circuit, copied from `blender/circuits/circuit.py` `CFG["cuts"]`
  - `src/home/Hero.tsx`
  - `src/styles/weekend.css`

**Interfaces:**
- **`Circuit` props become** `{ model, theme, layout, fill, pins, onReady, yaw?: RefObject<number>, lap?: { restart, running, tag, onLap, onLapProgress } }`.
  - Without `lap`, the light group is hidden and no lap callback fires.
  - Hero passes its five lap props as `lap`.
- **`Scene` wraps `gltf.scene` in two groups it owns:** an outer one at the track centre that rotates by `yaw.current`, and an inner one at minus the centre.
  - `gltf.scene`'s own transform is never touched, because `useLoader` caches it across pages.
  - A yaw change marks the frame stale.
- **Sector anchors.** `Scene` adds one `Object3D` per sector inside the rotating group, at the `line` point for that sector's middle `u` (from `cuts`), named `S1`, `S2` and `S3`. They join the turn markers in the projection loop.
- **Off-frame pins.** Any pin or anchor whose `screen()` is null gets `visibility: hidden`, as the tag already does.
- `CircuitBand({ band, theme })`, where `theme` is the opposite of the page's theme.

- [ ] **Step 1: Write the failing tests** in `circuit-band.test.tsx`. The tests use happy-dom with no WebGL, so the band shows its poster:
  - the stats and the five schedule rows render, and the `next` row carries `is-next`;
  - the Turns toggle sets `data-turns="off"` on the stage;
  - with `info` undefined, only the stats and the schedule render;
  - after a model load error caught by `CircuitGuard`, the poster stays and the Sectors toggle is disabled.
- [ ] **Step 2: Run them** → FAIL.
- [ ] **Step 3: Implement.**
  - **Layout from 68:49.** Stats at the top left, the schedule at the top right, the stage, the toggles at the bottom left, "Explore the lap in 3D" as `Soon` at the bottom right, and the credit `Blender model · layout bacinger/f1-circuits (MIT) · elevation SRTM (NASA)` under the card.
  - **Stage.** The poster `<img>` first. GL mounts inside a `CircuitGuard` once the band is within 200 px of the viewport, through an `IntersectionObserver` in an effect. It mounts under reduced motion too, because dragging is user-driven.
  - **Drag.**
    - Pointer events on the stage, with `touch-action: pan-y`.
    - Horizontal movement sets `yaw += dx * 0.006`, clamped to ±45°. Beyond the clamp, movement is scaled by 0.3 and springs back on release; under `REDUCED` it snaps back to ±45°.
    - On release, velocity decays by `0.92 ** (dt / 16.7)` on `gsap.ticker`, skipped under `REDUCED`.
  - **`data-yaw`.** The stage carries `data-yaw`: the yaw in whole degrees, updated on release and when a tween ends.
  - **Reset.** A reset button appears once the yaw is not 0. It tweens the yaw to 0 over 0.8 s with ease `launch`; under reduced motion it snaps.
  - **Turns.** Plain mono numbers on a 24 px stem (a `::before` line). The named corner's name sits under its number. The toggle fades the pins over 240 ms.
  - **Sectors.** The toggle tweens `fill` from 1 to 0 over 0.6 s, to the unfilled grey, and back up to 1 to redraw the colours along the lap. It fades the S labels with it, and snaps under reduced motion.
- [ ] **Step 4: Check.**
  - Run `bun test`, `bun run lint` and `bunx playwright test e2e/hero.spec.ts`.
  - On `bun run dev`, check all five models at −45°, 0° and +45°: the track stays in frame, and the S labels sit on the road.
  - Save screenshots of Sectors on and off for the PR.
- [ ] **Step 5: Commit** `feat(weekend): the circuit band spins under a drag, with turn and sector layers`.

### Task 5: The latest result and the teaser

**Files:**
- Create: `src/weekend/Latest.tsx`, `src/weekend/Teaser.tsx`, `test/weekend/latest.test.tsx`
- Modify: `src/weekend/Weekend.tsx`, `src/styles/weekend.css`

- [ ] **Step 1: Write the failing test.**
  - With the FP2 `latestSession`, the block shows `0.253 s`, the headline and body from Task 2, three rows, and the portrait credit.
  - Without an image, the text column takes the full width.
  - With `latest` null, the block is not rendered.
- [ ] **Step 2: Run it** → FAIL.
- [ ] **Step 3: Implement.**
  - **Latest.** The layout from y 2746–3342: a 420×540 image with a caption block of name, team and credit; the label; the giant gap; the headline; the body; the rows with a 3 px team-colour bar; and "Full timesheet" as `Soon`.
  - **Teaser.** `PHOTOS.ch02` full-bleed, with the caption block "Next · How F1 works · Chapter 02", "Watch the pass at Turn 1.", and "Read" as `Soon`, plus the credit line.
- [ ] **Step 4: Run** `bun test` and `bun run lint`.
- [ ] **Step 5: Commit** `feat(weekend): the page shows the latest session's gap and a way into How F1 works`.

### Task 6: Motion

**Files:** Modify `src/weekend/*.tsx` and `docs/motion-map.md` (add a "Race weekend" section under "This season", marked built).

- [ ] **Step 1: Add the moves.**
  - **Hero:** the title `sweep`s, the photo `reveal`s, and the label and dates `sweep`.
  - **Clock:** the digit groups `sweep` on enter and never animate on a tick.
  - **Band:** the card `reveal`s without drift, the stat numbers `roll`, and the schedule hairlines draw (`--hair`).
  - **Latest:** the image `reveal`s, the gap `roll`s, and the P1 row is a `block` that fills last.
  - **Teaser:** the photo `reveal`s and the title `sweep`s.
- [ ] **Step 2: Check** with `bun run dev`, then with `?reduced`: no motion, and nothing hidden.
- [ ] **Step 3: Commit** `feat(weekend): the Race weekend page moves with the sector bar`.

### Task 7: Tablet and phone

**Files:** Modify `src/styles/weekend.css`.

- [ ] **Step 1: Add the breakpoints.**
  - **≤1199 px:**
    - the title block narrows;
    - the digits scale with `clamp`;
    - the band's stats wrap above the schedule;
    - the Latest image column is 320 px.
  - **≤760 px:**
    - the photo is 4:5 and the title block sits below it, full width;
    - the digits are `clamp(56px, 22vw, 120px)` with the units under each group;
    - the band stacks in the order stats, stage (narrow layout, 4:5), toggles, then schedule;
    - Latest stacks the image above the text;
    - the teaser caption moves below the photo.
- [ ] **Step 2: Check** at 390, 800, 1024 and 1280 in both themes: no sideways scroll, and nothing overlaps.
- [ ] **Step 3: Commit** `feat(weekend): the Race weekend page fits tablets and phones`.

### Task 8: End-to-end

**Files:** Create `e2e/weekend.spec.ts`. Use the `errors` fixture in every test, which brings the season stub and the clock.

- [ ] **Step 1: Write the tests:**
  - loads with no errors, in light and in dark;
  - no hidden text after scrolling to the end;
  - no horizontal overflow at 390 px (`scrollWidth <= 390`);
  - fits at 800, 1024 and 1280 px, with no overlap between the clock and the note, or between the band's stats and its schedule;
  - `?reduced` shows everything with no bars;
  - a 503 shows the waiting line within the loader budget;
  - the countdown ticks (`clock.fastForward`);
  - the calendar button downloads `interlagos-2026.ics`, whose body has five `BEGIN:VEVENT`;
  - dragging the stage 200 px moves turn 1's pin;
  - **The limit.** On `?reduced`, so the spring-back snaps, drag 600 px and release. The stage's `data-yaw` (degrees, rounded, written by `CircuitBand`) reads `45`. Every visible pin's box stays inside the stage.
  - the reset button brings turn 1's pin back to within 2 px;
  - on the phone project, a vertical swipe on the stage scrolls the page;
  - the Turns toggle hides the pins, and the Sectors toggle hides the S labels;
  - the weekend box's "Race weekend page" link opens `/weekend`;
  - Home → Weekend → Home keeps each page's styles, and Home's hero still runs its lap.
- [ ] **Step 2: Run** `bunx playwright test e2e/weekend.spec.ts` → all pass. Then run the full suite and record the result.
- [ ] **Step 3: Commit** `test(weekend): end-to-end checks for the Race weekend page`.
