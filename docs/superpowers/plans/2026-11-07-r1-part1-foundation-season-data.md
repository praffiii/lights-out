# Release 1 · Part 1: Foundation and Season Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deployable TanStack Start app on the Cloudflare free tier. A cron job keeps a decoded, validated F1 season snapshot in KV. One API route serves that snapshot, and a typed client hook reads it.

**Architecture:**
- Content routes are prerendered to static assets, which are free and unlimited.
- A Cron Trigger (`*/30 * * * *`) runs an Effect program. The program fetches Jolpica, decodes the responses with Effect Schema, builds a `SeasonSnapshot`, and writes it to KV only when every part succeeds.
- `GET /api/season` reads KV and returns the snapshot.
- The browser decodes it with the same schema through TanStack Query.
- Jolpica never sees visitor traffic.

**Tech Stack:** TypeScript, Bun, TanStack Start, TanStack Router, TanStack Query, Effect v4 (`effect`, `effect/http`), Cloudflare Workers with KV and Cron Triggers, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-07-f1-fan-site-design.md`

**Scope note:** Release 1 is split into two plans.
- **Part 1 (this plan)** covers the foundation and season data. Nothing in it depends on the visual design.
- **Part 2** covers the intro, the How F1 works replays, the glossary UI, and the season page UI. It is planned after the design direction (palette, type, motion language, intro storyboard) has been shown to Praffi and approved, as spec §11 requires.

## Global Constraints

- **Zero cost.** Use only Cloudflare free-tier features: Workers, static assets, KV, and Cron Triggers. Do not use Workers Caching (`"cache": { "enabled": true }`), because it bills static-asset requests against the 100,000/day limit.
- **No custom domain.** Deploy to `*.workers.dev`.
- **CPU budget.** The free tier allows 10 ms of CPU per request and per cron invocation. Waiting on `fetch` does not count toward that budget.
- **Respect Jolpica.** Base URL `https://api.jolpi.ca/ergast/f1`. Jolpica is called only from the cron job, never per visitor. Pass `?limit=100` on every list call.
- **Effect v4 imports.** Use `import { Effect, Schema, Schedule, Layer, Context } from "effect"` and `import { HttpClient, FetchHttpClient } from "effect/http"`. Check names against Context7 `/websites/effect_website_v4` before writing new APIs.
- **No `any`.** Do not use lazy `unknown` or `Record<string, unknown>` either. Derive types from schemas (`typeof X.Type`).
- **Footer disclaimer, exact copy:** "Lights Out is an unofficial fan project. Not affiliated with Formula 1, FOM or any team."
- **Commits.** Use conventional commit titles in present tense. End each commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Confirm outward-facing actions first.** Ask Praffi before running any Cloudflare action: `wrangler login`, `kv namespace create`, or `deploy`.

## Review Focus

1. **Off-season.** Between the 2026 finale (early December) and the 2027 calendar's publication, there is no upcoming session. Expect `nextSession: null`, and the last season's final standings still shown. Tested in Task 3.
2. **New year with empty standings.** In January, `current` may resolve to 2027 with no standings yet. Expect the snapshot to fall back to the previous season's final standings, labelled with that season. Tested in Task 3.
3. **Jolpica down, rate-limited (429), or returning malformed JSON during a cron run.** Expect the previous snapshot to stay in KV untouched, and the route to keep serving it with its original `fetchedAt`. Tested in Task 4.
4. **First deploy, before the cron has ever run.** Expect `/api/season` to return 503 with `{ "status": "warming" }` instead of a crash. Tested in Task 4.
5. **Sprint weekends and sessions with no time yet (TBC).** Sprint rounds have `SprintQualifying` and `Sprint` instead of FP2 and FP3, and some sessions have a `date` but no `time`. Expect the sessions list to contain exactly the sessions present, with `startsAt` set to the date at `00:00Z` and `timeConfirmed: false`. Tested in Task 2.

---

## File Structure

```
src/
  server.ts                    # custom Worker entry: fetch (TanStack) + scheduled (cron)
  routes/__root.tsx            # root layout, footer disclaimer
  routes/index.tsx             # placeholder home (Part 2 replaces)
  routes/api/season.ts         # GET /api/season server route
  season/jolpica-schema.ts     # Effect Schemas for raw Jolpica responses
  season/snapshot-schema.ts    # SeasonSnapshot schema (shared server ⇄ client)
  season/jolpica-client.ts     # JolpicaClient service (HttpClient + retry)
  season/build-snapshot.ts     # buildSnapshot: Effect<SeasonSnapshot, …, JolpicaClient>
  season/store.ts              # SnapshotStore service over KV
  season/refresh.ts            # refreshSnapshot: the cron program
  season/use-season.ts         # TanStack Query hook
test/
  fixtures/jolpica/*.json      # recorded Jolpica responses
  season/*.test.ts
wrangler.jsonc
```

---

### Task 1: Scaffold, prerender, and the Worker entry

**Files:**
- Create: the scaffold output, `src/server.ts`, `src/routes/__root.tsx` (footer), `src/routes/index.tsx`, `wrangler.jsonc`
- Test: `test/build.test.ts`

**Interfaces:**
- Produces:
  - `src/server.ts` default-exports `{ fetch, scheduled } satisfies ExportedHandler<Env>`. For now, `scheduled` is a no-op. Task 4 fills it.
  - The `Env` type includes `SEASON_KV: KVNamespace`.

- [ ] **Step 1: Scaffold in place.** Run `bun create cloudflare@latest . --framework=tanstack-start`. If it refuses the non-empty directory, scaffold into `../lights-out-tmp` and move everything except `.git` into this repo, keeping `docs/`. Use Bun as the package manager.
- [ ] **Step 2: Record the React version.** Run `bun pm ls react`. Write the version on one line in `docs/notes.md`, together with the React Three Fiber v9 range (`>=19 <19.4`). This only informs Part 2 and blocks nothing here.
- [ ] **Step 3: Configure Wrangler.** In `wrangler.jsonc`:
  - set `"main": "./src/server.ts"`;
  - add `"triggers": { "crons": ["*/30 * * * *"] }`;
  - add `"kv_namespaces": [{ "binding": "SEASON_KV", "id": "TBD-ask-Praffi" }]`;
  - keep `nodejs_compat`.

  Run `wrangler types` to generate `Env`.
- [ ] **Step 4: Write the Worker entry.** `src/server.ts` follows the Cloudflare TanStack Start custom-entrypoint pattern: `fetch: handler.fetch`, plus an empty `scheduled`.
- [ ] **Step 5: Turn on prerendering.** Set `tanstackStart({ prerender: { enabled: true, crawlLinks: true } })` in `vite.config.ts`, and exclude `/api/*` from prerendering with a `filter`.
- [ ] **Step 6: Add the footer.** Add the exact disclaimer copy from Global Constraints to the footer in `__root.tsx`. Leave it unstyled.
- [ ] **Step 7: Write the failing test.** `test/build.test.ts` → `it("prerenders the home page with the disclaimer")`. It reads the built `index.html` from the client output directory and asserts that the file exists and contains `"unofficial fan project"`. Add `"test": "vitest run"` and `"build"` scripts.
- [ ] **Step 8: Run the build and the test.** Run `bun run build && bun run test`. Expected: PASS.
- [ ] **Step 9: Check the Worker locally.** Run `bun run dev`, open `/`, and confirm the page renders with the footer.
- [ ] **Step 10: Commit.** `chore: scaffold TanStack Start app on Cloudflare Workers with prerendering`

### Task 2: Jolpica schemas

**Files:**
- Create: `src/season/jolpica-schema.ts`, `test/fixtures/jolpica/*.json`
- Test: `test/season/jolpica-schema.test.ts`

**Interfaces:**
- Produces, as Effect Schemas whose decoded types are exported as `typeof X.Type`:
  - `RacesResponse` → `{ season: number; races: ReadonlyArray<Race> }`
  - `Race` → `{ season: number; round: number; raceName: string; circuit: { circuitId: string; circuitName: string; locality: string; country: string }; sessions: ReadonlyArray<Session> }`
  - `Session` → `{ name: SessionName; startsAt: string /* ISO instant */; timeConfirmed: boolean }`
  - `SessionName` → `"FP1" | "FP2" | "FP3" | "SprintQualifying" | "Sprint" | "Qualifying" | "Race"`
  - `RaceResultsResponse`, `QualifyingResponse`, `SprintResponse` → `{ race: { season; round; raceName } | null; rows: ReadonlyArray<…Row> }`. An empty `Races` array decodes to `race: null`, `rows: []`.
  - `ResultRow` → `{ position: number; positionText: string; driver: DriverRef; constructor: ConstructorRef; points: number; grid: number; laps: number; status: string; time: string | null }`
  - `QualifyingRow` → `{ position: number; driver: DriverRef; constructor: ConstructorRef; q1: string | null; q2: string | null; q3: string | null }`
  - `DriverStandingsResponse` and `ConstructorStandingsResponse` → `{ season: number; round: number; rows: ReadonlyArray<…> } | null`. Empty `StandingsLists` decodes to `null`.
  - `DriverRef` → `{ driverId: string; code: string | null; number: number | null; givenName: string; familyName: string; nationality: string }`
  - `ConstructorRef` → `{ constructorId: string; name: string; nationality: string }`

Use `Schema.FiniteFromString` for every numeric string. Build each `Session` from the Jolpica keys `FirstPractice`, `SecondPractice`, `ThirdPractice`, `SprintQualifying`, `Sprint`, `Qualifying`, and the race's own `date`/`time`. Include only the keys that are present, ordered by `startsAt`. If `time` is missing, use `${date}T00:00:00Z` with `timeConfirmed: false`.

- [ ] **Step 1: Record fixtures.** Use `curl -s` to save these files into `test/fixtures/jolpica/`:
  - `races-2026.json` ← `/2026/races/?limit=100`
  - `results-last.json` ← `/2026/last/results/?limit=100`
  - `qualifying-last.json` ← `/2026/last/qualifying/?limit=100`
  - `sprint-empty.json` ← a non-sprint round's `/sprint/`
  - `driverstandings-2026.json` and `constructorstandings-2026.json`
  - `races-empty.json` ← `/2030/races/`
  - `standings-empty.json` ← `/2030/driverstandings/`
- [ ] **Step 2: Write the failing tests.**
  - `decodes the 2026 calendar with numeric rounds`: `races.length > 20`; `races[0].round === 1`.
  - `builds sprint-weekend sessions without FP2/FP3`: pick a round with a `Sprint` key in the fixture. Its session names equal `["FP1","SprintQualifying","Sprint","Qualifying","Race"]`.
  - `marks sessions without a time as unconfirmed`: an inline fixture race whose `Qualifying` has no `time` gives `timeConfirmed === false` and `startsAt` ending in `T00:00:00Z`.
  - `decodes results points and grid as numbers`: `typeof rows[0].points === "number"`.
  - `decodes empty races to race: null`: `{ race: null, rows: [] }`.
  - `decodes empty StandingsLists to null`.
  - `rejects a non-numeric points string`: decoding `points: "abc"` fails with a `SchemaError`.
- [ ] **Step 3: Run the tests to see them fail.** Run `bun run test test/season/jolpica-schema.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 4: Implement the schemas** in `src/season/jolpica-schema.ts`, per the Interfaces block.
- [ ] **Step 5: Run the tests again.** Expected: PASS.
- [ ] **Step 6: Commit.** `feat(season): Jolpica responses decode into typed season data`

### Task 3: JolpicaClient and buildSnapshot

**Files:**
- Create: `src/season/snapshot-schema.ts`, `src/season/jolpica-client.ts`, `src/season/build-snapshot.ts`
- Test: `test/season/build-snapshot.test.ts`

**Interfaces:**
- Consumes: Task 2 schemas.
- Produces:
  - `SeasonSnapshot` (Effect Schema, JSON-encodable both ways):

    ```ts
    {
      fetchedAt: string;
      season: number;
      calendar: ReadonlyArray<Race>;
      nextSession: { round: number; raceName: string; circuitName: string; country: string; session: Session } | null;
      latest: { race: RaceResultsResponse; qualifying: QualifyingResponse | null; sprint: SprintResponse | null } | null;
      driverStandings: DriverStandingsResponse;      // already `| null` per Task 2
      constructorStandings: ConstructorStandingsResponse;
    }
    ```

    The names refer to the Task 2 decoded types.

    The standings objects carry their own `season`, which may be `season - 1` (see the fallback below).
  - `class JolpicaClient extends Context.Service<JolpicaClient>()("JolpicaClient", …)`. Check the exact v4 service API in Context7. It exposes:
    - `races(season: number | "current")`
    - `lastResults(season)`
    - `lastQualifying(season)`
    - `lastSprint(season)`
    - `driverStandings(season)`
    - `constructorStandings(season)`

    Each method returns `Effect<Decoded, JolpicaError>`.
  - `JolpicaClient.layer: Layer<JolpicaClient, never, HttpClient.HttpClient>`. It uses `HttpClient.filterStatusOk`. It retries only transport errors and 429/5xx responses, with `Schedule.exponential("500 millis")` combined with `Schedule.recurs(3)`.
  - `class JolpicaError extends Data.TaggedError("JolpicaError")<{ readonly path: string; readonly cause: HttpClientError | SchemaError }>`
  - `buildSnapshot(now: Date): Effect<SeasonSnapshot, JolpicaError, JolpicaClient>`

**Snapshot rules.** These are pinned by the tests below.
- `season` is the `season` from `races("current")`.
- `nextSession` is the earliest session across the calendar with `startsAt > now`. If none is found, fetch `races(season + 1)` and take its earliest session. If that is empty too, the value is `null`.
- If `driverStandings(season)` returns `null`, use `driverStandings(season - 1)`. Apply the same rule to constructor standings.
- `latest` is `null` when `lastResults` returns `race: null`. When it is set, `sprint` is `null` if `rows` is empty.
- Fetch independent endpoints with `Effect.all(…, { concurrency: 4 })`.

- [ ] **Step 1: Write the failing tests.** Use a fake `JolpicaClient` layer, `Layer.succeed`, backed by the Task 2 fixtures, with methods overridable per test.
  - `picks the next future session mid-season`: with `now` set before round 5's FP1, `nextSession.round === 5` and `nextSession.session.name === "FP1"`.
  - `looks into next season when the current one is over`: with `now` after the last race and `races(2027)` returning a calendar, `nextSession.round === 1` and `season === 2026`.
  - `returns nextSession null when next season is not published`: `races(2027)` is empty, so the result is `null`.
  - `falls back to last season's standings when the new season has none`: `driverStandings(2027)` returns `null`, so `driverStandings.season === 2026`.
  - `latest.sprint is null on a non-sprint weekend`.
  - `fails with JolpicaError when any endpoint fails`: the `races` method fails, so the Effect fails with `_tag === "JolpicaError"`.
- [ ] **Step 2: Run the tests to see them fail.** Expected: FAIL.
- [ ] **Step 3: Implement** `snapshot-schema.ts`, `jolpica-client.ts`, and `build-snapshot.ts`, per Interfaces.
- [ ] **Step 4: Run the tests again.** Expected: PASS.
- [ ] **Step 5: Add a retry test for the client.** Name it `jolpica client retries a 429 then succeeds`. Provide `JolpicaClient.layer` over a fake `HttpClient` (`HttpClient.make`) that returns 429 once, then the fixture. Assert that the call succeeds and the fake was called twice. Use `TestClock` (or the v4 equivalent) so the test does not sleep for real.
- [ ] **Step 6: Run the tests.** Expected: PASS.
- [ ] **Step 7: Commit.** `feat(season): season snapshot builds from Jolpica with off-season fallbacks`

### Task 4: KV store, the cron refresh, and `GET /api/season`

**Files:**
- Create: `src/season/store.ts`, `src/season/refresh.ts`, `src/routes/api/season.ts`
- Modify: `src/server.ts` (the `scheduled` handler)
- Test: `test/season/refresh.test.ts`, `test/season/api-season.test.ts`

**Interfaces:**
- Consumes:
  - `buildSnapshot` and `SeasonSnapshot` from Task 3
  - `Env.SEASON_KV` from Task 1
- Produces:
  - `SnapshotStore` service:
    - `read: Effect<SeasonSnapshot | null>`. It decodes the stored JSON with `SeasonSnapshot`. A corrupt value is treated as `null` and logged.
    - `write(s: SeasonSnapshot): Effect<void>`
    - `SnapshotStore.fromKV(kv: Pick<KVNamespace, "get" | "put">): Layer<SnapshotStore>`
    - The KV key is `"season:v1"`.
  - `refreshSnapshot(now: Date): Effect<"written" | "kept-previous", never, JolpicaClient | SnapshotStore>`. On a `JolpicaError` it logs the error, leaves KV untouched, and returns `"kept-previous"`.
  - `handleSeasonRequest(store): Effect<Response>`, the pure handler the route calls.
    - 200 response: the encoded snapshot JSON, `Content-Type: application/json`, and `Cache-Control: public, max-age=60`.
    - When the store is empty: 503 with `{ "status": "warming" }` and `Cache-Control: no-store`.
- `scheduled` runs `refreshSnapshot(new Date(controller.scheduledTime))`, providing `JolpicaClient.layer`, `FetchHttpClient.layer`, and `SnapshotStore.fromKV(env.SEASON_KV)`. Wrap it in `ctx.waitUntil`.
- The route reads `env` via `import { env } from "cloudflare:workers"`, inside the handler.

- [ ] **Step 1: Write the failing tests.** Use an in-memory `Map`-backed fake KV.
  - `writes the snapshot when Jolpica succeeds`: the result is `"written"`, and the store reads back with an equal `season`.
  - `keeps the previous snapshot when Jolpica fails`: seed the store with a snapshot whose `fetchedAt` is `"2026-11-01T00:00:00.000Z"` and make the fake client fail. The result is `"kept-previous"`, and `fetchedAt` is unchanged.
  - `treats corrupt stored JSON as empty`: seed `"{not json"`, so `read` gives `null`.
  - `api returns 503 warming when the store is empty`: status 503, body `{ status: "warming" }`.
  - `api returns the snapshot with cache headers`: status 200, the `cache-control` header contains `max-age=60`, and the body decodes with `SeasonSnapshot`.
- [ ] **Step 2: Run the tests to see them fail.** Expected: FAIL.
- [ ] **Step 3: Implement** `store.ts`, `refresh.ts`, the route (a thin wrapper over `handleSeasonRequest`), and the `scheduled` wiring.
- [ ] **Step 4: Run the tests again.** Expected: PASS.
- [ ] **Step 5: Test the cron locally.**
  1. Run `bun run dev`.
  2. Trigger the cron with `curl "http://localhost:<port>/cdn-cgi/handler/scheduled"`. This is the Cloudflare Vite plugin's scheduled test endpoint; verify the exact path in Context7 if it 404s.
  3. Fetch `curl localhost:<port>/api/season`.

  Expected: first a 503 before the trigger, then a 200 with real 2026 data after it.
- [ ] **Step 6: Commit.** `feat(season): cron keeps a validated season snapshot in KV and serves it at /api/season`

### Task 5: The `useSeason` client hook, and the first deploy

**Files:**
- Create: `src/season/use-season.ts`
- Modify: `src/routes/index.tsx` (a temporary debug readout: next session name and leader, unstyled; Part 2 replaces it)
- Test: `test/season/use-season.test.ts`

**Interfaces:**
- Consumes: `SeasonSnapshot` from Task 3.
- Produces:
  - `seasonQueryOptions`: `queryOptions` with `queryKey: ["season"]` and a `queryFn` that fetches `/api/season`.
    - On 200 it decodes with `Schema.decodeUnknownPromise(SeasonSnapshot)`.
    - On 503 it throws `SeasonWarmingError`.
    - It sets `staleTime: 60_000`.
  - `useSeason(): UseQueryResult<SeasonSnapshot, SeasonWarmingError | Error>`

- [ ] **Step 1: Write the failing tests.** Stub `fetch` and call `seasonQueryOptions.queryFn` directly.
  - `decodes a 200 snapshot`
  - `throws SeasonWarmingError on 503`
  - `rejects a snapshot missing season`
- [ ] **Step 2: Run the tests to see them fail, then implement, then run them again.** Expected: FAIL, then PASS.
- [ ] **Step 3: Check it in dev.** Run `bun run dev`, trigger the cron, and load `/`. The debug readout should show the real next session.
- [ ] **Step 4: STOP and ask Praffi** before any of the Cloudflare steps below. They need Praffi's account.
  1. Run `wrangler login`.
  2. Run `wrangler kv namespace create SEASON_KV` and put the id in `wrangler.jsonc`.
  3. Run `bun run deploy`.
  4. In the dashboard, trigger the cron once, or wait up to 30 minutes.
  5. Verify that `https://<name>.workers.dev/api/season` returns 200.
  6. Verify that `/` is served as a static asset: the response has no Worker invocation in the logs.
- [ ] **Step 5: Check the CPU budget.** Open Workers Observability and confirm that scheduled invocations use under 10 ms of CPU. If they go over, move each endpoint's decode into its own cron invocation (stagger the crons) before going further.
- [ ] **Step 6: Commit.** `feat(season): site reads the season snapshot through a typed TanStack Query hook`

---

## After this plan

Before Part 2's plan is written, run the design step: show Praffi the design direction and the intro storyboard (spec §9 and §11). Then plan Part 2: the intro, How F1 works (the 15 topics in spec §8), the glossary hover, the season page UI, and the credits page.
