# The people: design

## Why

The menu lists "The people", marked `Soon`. A new fan sees 22 names on a timing screen and knows two of them. The people answers "who is this, how is their season going, and what have they done before?"

- **The index, `/people`**, is the grid as a timing tower, with the champion's band and the legends they chase.
- **One page per race driver, `/people/<driverId>`**, shows the season and the whole career. Every number comes from data.

**Scope (Praffi, 2026-11-18):** the index plus a page for every race driver. "Go with B" chose a page for every driver. "Include career too" added the career section. Praffi approved the Ocon mock on 2026-11-18.

Kimi Antonelli's hand-written story page was approved on 2026-11-08, but it is **not** in this scope. Its Monza band is still a flat outline, which breaks rule 4, and it needs a Monza Blender model and a re-mock in the broadcast glow style. Until that lands, Antonelli gets the same template as everyone else (my call).

Anything below that does not come from the approved Figma frames, DESIGN.md or an earlier Praffi decision is marked **my call**.

## Approaches

### Where the driver data lives

The page needs four things the season snapshot does not hold yet:
- each driver's results for every round of the season;
- qualifying results, for the teammate head-to-head and poles;
- dates of birth;
- career totals.

1. **Inside the season snapshot, with the career's past seasons cached through `previous` (my call).**
   - Race-by-race rows come from results the hourly run already fetches. `history()` pulls every race and sprint of the season, and today keeps only the leader and team totals.
   - Season qualifying is one new paged fetch, about five requests an hour.
   - Past seasons never change, so they are fetched once per driver and carried forward from the previous snapshot. Flags and top speed already work this way.
   - This adds no KV key, no endpoint and no workflow step. The page reads `/api/season`, the same as `/season`.
   - **The cost is size.** The snapshot is 56 KB today (7 KB gzipped). The new `people` field adds about 25–30 KB raw, roughly 4 KB gzipped, to every page that reads the snapshot.
2. **A separate `people:v1` KV key and `/api/people` endpoint, like the pole laps.**
   - This keeps `/api/season` lean.
   - It needs a second store, handler, route and query, and the driver page would need two fetches (standings plus people).
3. **Career numbers baked into the repo by a script run by hand.** This breaks "data updates itself" (Praffi, 2026-11-10).

### How career totals stay cheap

A career is **past seasons + the current season**.

- **The current season** is computed every hour from the season's results, sprints and qualifying, which the run already has.
- **Past seasons** come from Jolpica per driver, then sit in the snapshot as `people.past[driverId]` with `through: <last full season>`.
  - The request sources:
    - `/drivers/<id>/results` (paged);
    - `/drivers/<id>/sprint` (paged);
    - `/drivers/<id>/qualifying/1` for poles;
    - `/<season>/driverstandings` for each past season, for best season and titles. The whole field's final table is fetched once per season and shared by every driver. A driver-scoped standings call needs a season and would cost about 170 requests on its own.
  - Building the past for all 22 drivers from cold takes about 150 requests: about 120 for results, sprints and poles, plus about 25 season tables.
  - **Each run builds the past for at most 60 requests' worth of drivers (my call)**, so a cold start fills in over three or four hourly runs. The current spacing is 250 ms and Jolpica allows 500 requests an hour.
  - **"The season" here always means the standings season** (`driverStandings.season`), the one `history()` already follows. It never means `snapshot.season`. `people.results` and `qualifying` cover that season, and `past` must run `through` the season before it.
  - A driver whose past is missing, or whose `through` is not the standings season minus one, has no career section until it is filled. The page never shows a career that leaves out a season or counts one twice.
- **At a rollover**, Jolpica's `current` flips to the new year in January. The standings stay on the old season until the new round 1 is scored, so nothing changes until then. After round 1, every past goes stale and refills over a few runs, and careers hide for those hours (my call).

## Starting point: the approved Figma frames

Figma file `IPkJZWQnY0IKdIjf6Nuugl`, page "v2 — minimalist mocks".

| Frame | Light | Dark |
|---|---|---|
| Index, desktop | 210:488 | 211:497 |
| Index, phone | 214:524 (board 131:2) | 215:841 (board 135:2) |
| Driver template (Ocon), desktop | 440:1001 (x 46400) | 443:110 (x 47940) |
| Driver template (Ocon), phone | 445:74 (board 131:2, x 10420) | 445:387 (board 135:2, x 10420) |

Approvals:
- The index: 2026-11-08.
- The driver template: 2026-11-18. The Ocon mock is the template, and its numbers are real, after round 20.

The Antonelli story frames (212:506, 221:560, 215:533, 222:657) are for the later story page only.

## Which drivers get a page

- **`PEOPLE` in `src/people/people.ts` is the curated list (my call).** Each entry holds a Jolpica `driverId`, a code, and a hero photo with caption and credit.
  - It holds the 22 race drivers of 2026.
  - A page exists only for an entry in this list. The prerender paths come from it.
- Drivers in the standings but not in `PEOPLE` get no page. In 2026 those are the stand-ins Tsunoda, Hirakawa and Câmara.
  - They stay in the tower without a link.
  - They are named in its footnote, built from data: "Also raced in 2026: Yuki Tsunoda (Racing Bulls, rounds 12 to 14) and …".
- If a new driver joins mid-season, their row shows without a link until someone adds a photo entry. That is the only manual step, and it is a content step, not a data refresh.
- A `PEOPLE` driver missing from the current standings, e.g. after a season change, keeps their page with the hero, career and Next. The season and race-by-race sections hide, and the tower does not link them (my call).
- **Each new season is a content step (my call):** update `PEOPLE` for the new grid, the champion band and Legends. Data never needs a manual refresh, but new faces need photos.
- An unknown `/people/<id>` renders the site's 404.

## The index: `/people`

Build it as frames 210:488 and 214:524. Top to bottom:

1. **Hero:**
   - Label "The people · <standings season> season".
   - A giant **22**, then "drivers on the grid.". The count is the number of `PEOPLE` drivers in the current standings.
   - The body: "Eleven teams, two cars each. Who drives for whom, how they stand after <latest locality>, and the ones they chase." Count the teams from the standings.
   - Three facts:
     - **Champion.** Once `page-model.ts` reports the title as `decided`, this shows the champion with "Aged <n>". Until then it shows the leader, labelled "Leader".
     - **Youngest** and **Oldest**, among `PEOPLE`, from dates of birth.
2. **Champion band, the signature, in the opposite theme.**
   - The approved 2026 copy: "Champion at twenty.", the age on the day (20 years, 68 days), and the payoff "The youngest champion in F1 history.".
   - It sits beside the Melbourne Walk photo with its caption block.
   - This copy is keyed to 2026 and hides once the standings season moves past 2026 (my call).
   - Its link reads "Read  →" (my call; the mock said "His story  →"). It goes to `/people/antonelli`, which is the template until the story page ships.
3. **The tower, the page's one dense widget:**
   - Label "The grid · after round <n>", headline "Who's who.", and meta "<n> drivers · <n> teams · points after <locality>".
   - Columns: Pos, No., Driver, Team, Nationality, Points.
   - Rows follow the driver standings.
     - The champion's row is filled purple and its status reads "Champion". Before the title is decided, no row is purple.
     - Every `PEOPLE` row links to its page.
     - On hover or focus, the row goes dark, Nationality swaps to "Read  →", and a 300 × 200 thumbnail of that driver's hero photo floats beside the row with its caption. This follows frame 210:488.
     - On a phone there is no hover. The whole row is the link (frame 214:524).
   - The stand-in footnote sits below the tower.
4. **Legends:** label "Legends", meta "World titles · four or more", headline "The ones they chase.". Six rows, a title count and a line each, verbatim from frame 210:488:
   - 7 · "Michael Schumacher. Two with Benetton, then five in a row with Ferrari from 2000."
   - 7 · "Lewis Hamilton. One with McLaren in 2008, six with Mercedes. Still racing, now with Ferrari." (read the full line from the frame)
   - 5 · "Juan Manuel Fangio. Five in the 1950s, with four different teams."
   - 4 · "Alain Prost. 1985, 1986, 1989 and 1993."
   - 4 · "Sebastian Vettel. Four in a row with Red Bull, 2010 to 2013."
   - 4 · "Max Verstappen. Four in a row with Red Bull, 2021 to 2024. Still racing."
   - These are history facts, true through 2026, so they stay static copy. If an active legend wins another title, that is part of the yearly content step (my call).
   - The Senna photo: "Spa-Francorchamps · 1991", "Ayrton Senna, McLaren MP4/6", "Photo George Voudouris · CC BY-SA 4.0", with the note "Three titles, and the number 12 that Antonelli races in his honour." The builder finds that Commons file by author and subject and records its URL in credits.
5. **Next:** "Next · This season", "The fight for second.", then "Read →" to `/season`, with the Verstappen portrait.
6. **The footer.**

## The driver page: `/people/<driverId>`

Build it as frames 440:1001 and 445:74. Copy here is pronoun-free (my call). The mock's "His Haas teammate" and "Where he started" become the lines below, so one template fits everyone.

### 1. Hero
- The hero photo from `PEOPLE`, with its caption block (place, year and credit).
- Label "The people · <Team> · No. <n>".
- The name as two lines, given name then family name with a full stop: "Esteban / Ocon.".
- The sub line:
  - "<Nationality>, <age>. In Formula 1 since <first season>, with <n words> teams."
  - With one team, it ends "with <Team>.".
  - For a rookie it reads "<Nationality>, <age>. First season in Formula 1, with <Team>." (my call).
  - Nationality is Jolpica's adjective, e.g. "French".

### 2. The season
- Label "<season> · After round <n>".
- Headline:
  - "<Ordinal in words> in <season>.", e.g. "Sixteenth in 2026.".
  - "Champion in <season>." once the title is decided for this driver.
  - "Leading <season>." for the leader before then.
- Body: "<Points in words, capitalised> points from <starts> races. <Team> teammate <Name> has <n>." When a team has more than one teammate, use the teammate with the most shared races.
- Four stats:
  - **Points**, with the note "P<n> in the championship".
  - **Best finish**, as an ordinal, with the note "<Country>, round <n>". For a tie, use the earliest.
  - **Qualifying vs <teammate family name>**, as "a–b", with the note "Ahead in a of n". It counts only rounds where both qualified for the same team.
  - **Races**, the starts, with the note "Of <completed rounds> so far".
- Purple payoff:
  - "Best of <season>: <ordinal> in <locality>, for <n> points."
  - With one win: "Best of <season>: a win in <locality>."
  - With several: "<n> wins in <season>, the first in <locality>."
- Credit: "Figures: Jolpica F1 API, after round <n>, <locality>".

### 3. Career
This section is hidden while the driver's past is missing or stale (see Approaches).

- Label "Career · Since <first season>".
- A giant number: **starts**, with the unit "starts in Formula 1" ("start" for one).
- Headline:
  - No wins: "No wins yet."
  - One win: "One win: <Country>, <year>."
  - Several: "<n> wins. The first: <Country>, <year>."
- Body:
  - "With <teams, joined with commas and 'and'>."
  - Then "Best season: <ordinal>, in <years>." or, for a champion, "World champion in <years>.".
- Purple payoff: "<n words> seasons, <n words> teams." It uses singular forms, and "First season." for a rookie.
- A ladder of five:
  - Wins (the purple cell), Podiums, Pole positions, Points.
  - Then Best season, or **Titles** for a champion.
- Credit: "Career figures: Jolpica F1 API, after round <n> · points include sprints".

**Definitions**, which are pinned by tests:
- **Start:** a race result whose status is not "Did not start", "Withdrawn" or a failure to qualify (`positionText` `W` or `F`, or that status).
- **Win:** position 1. **Podium:** position 1 to 3.
- **Pole:** qualifying position 1.
- **Points:** race plus sprint points.
- **Seasons:** distinct seasons with a start.
- **Teams:** distinct Jolpica `constructorId`s with a start. Renault and Alpine count as two.
- **Best season and titles:** the final championship position of each completed season. The current season is not counted until it is over.

### 4. Race by race (the signature, in the opposite theme)
- Label "Race by race · <season>", headline "Race by race.", body "Where each race started and finished. The best result is filled purple." (my call).
- One row per **completed** round, with columns Rd, Grand Prix, City, Start, Finish, Points.
  - The Grand Prix column is `raceName` without " Grand Prix". The City column is the circuit's locality. The phone drops City and shows "Pts".
  - Start is "P<grid>". Grid 0 shows "Pit lane".
  - Finish is "P<n>". Otherwise it reads, from `positionText`:
    - `R`: "Retired" ("Out" on a phone, explained in the footnote).
    - `D`: "Disqualified".
    - `N`: "Not classified".
    - `W`: "Did not start".
  - A round with no result for this driver reads "Did not race", dimmed. It gives no reason, because the data has none.
- The row with the best finish is filled purple. For a tie, use the one with more points, then the earliest.
- Sprints are not shown. The footnote reads: "Results: Jolpica F1 API, after round <n>. Sprints not shown."

### 5. Next
- "Next · P<n>", the `PEOPLE` driver one place below in the standings, with their name, "Read  →" and portrait (`src/drivers/portraits.ts`) with its caption.
- The last driver wraps to the leader.

### 6. The footer.

## Data changes

- **`DriverRef` gains `dateOfBirth`** as an `optionalKey`, so stored snapshots still decode. Jolpica sends it on every Driver object.
- **`JolpicaClient` gains:**
  - `seasonQualifying(season, offset)` (paged);
  - `driverResults(id, offset)` and `driverSprints(id, offset)` (paged);
  - `driverPoles(id)`;
  - `driverSeasonStanding(season, id)`.
  - It keeps the same user agent, spacing and semaphore as today.
- **`SeasonSnapshot` gains `people: optionalKey(People)`:**
  - `rounds`: completed rounds with locality, country and race name.
  - `results`: per driver, compact rows of round, grid, `positionText`, position and points.
  - `qualifying`: per round, `driverId`, `constructorId` and position.
  - `past`: per driver, `{ through, starts, wins, podiums, poles, points, seasons, firstSeason, teams, firstWin: { season, country } | null, finals: Array<{ season, position }> }`.
  - The current season's career part is computed in the page model from `results`, `qualifying` and the sprints. Sprint points per driver ride in `results`.
- **`buildSnapshot`** reuses the race and sprint pages that `history()` already fetches. It does not fetch them twice. A failure while building `people` keeps `previous.people` and logs a warning, the same as flags.
- **`src/people/page-model.ts`** turns the snapshot into the index and driver view models. All copy rules above live here, as pure functions with unit tests.

## Wiring

- Routes:
  - `src/routes/people.index.tsx` and `src/routes/people.$driver.tsx`.
  - Their CSS goes in `src/styles/people.css`.
  - Head titles: "The people · Lights Out" and "<Name> · The people · Lights Out".
- `vite.config.ts` prerenders `/people` and every `PEOPLE` path. Data loads on the client through `useSeason`, like `/season`, with the same loading and warming states.
- The menu's "The people" points to `/people`. The `NEXT_PEOPLE` band on the track pages links to `/people`.
- The credits page lists every hero photo, plus the new Gasly and Pérez portraits, with "Used on: The people".
- Photos:
  - 22 hero photos from Commons, 2024–2026 by preference. Each is a car or driver shot that keeps the subject clear of the 740 px title block, the same check as the Yas Marina crop.
  - Each has a desktop and a phone crop, never enlarged, and is captioned by subject, place and year.
  - The Gasly and Pérez portraits follow the existing 840 × 1080 portrait format.

## Rules that apply

- From DESIGN.md "Rules we take from both":
  - Every section is a poster.
  - One dense widget per page: the tower on the index, and race by race on a driver page.
  - Every photo is captioned and credited.
  - The strip, menu and footer carry real info.
  - One ease family.
  - The signature section is in the opposite theme.
- No charts. Ladders and rows with a purple payoff.
- Never invent numbers. When data is missing, the section is hidden or the row reads "Did not race". It is never estimated.
- Phone caption blocks stay dark (#0E0F11) on light pages and invert on dark pages, as in the approved dark phone frame.
- No horizontal scroll at 390 px. Long Grand Prix names ("Bahrain in Malaysia") must fit the phone row.
- Code rules: no comments, no `as` casts, no `any`, no non-null `!`, and Prettier as configured.

## Facts to verify before ship (Praffi)

- Ocon's career, by these definitions: 198 starts, 1 win (Hungary 2021), 4 podiums, 0 poles, 490 points, best season 8th (2017 and 2022), ten seasons, five teams. Official F1 stats count starts slightly differently, so a mismatch of one or two needs a look.
- The tie-break and status wording in race by race.
- The champion band copy is unchanged from 2026-11-08.

## Proof before PR

- **Unit tests**, in `test/people/page-model.test.ts`, on a recorded Ocon + Bearman fixture:
  - Ocon's career: the numbers above.
  - The season: P16, 7 points, best finish 8th in Azerbaijan, qualifying 4–13 against Bearman, 18 starts of 20.
  - Race by race: R12 is "Retired", R15 is the purple row, and R19 and R20 read "Did not race".
  - Copy: no wins, one win, several wins, a rookie, a champion, and one team.
  - The Next wrap-around.
  - A missing or stale past hides the career.
- **Unit tests for the snapshot:**
  - `buildSnapshot` keeps `previous.people.past` when Jolpica fails.
  - It fills at most 60 requests' worth of past per run.
  - It does not fetch season results twice.
- **e2e:**
  - The index: 22 linked rows, stand-ins unlinked and named in the footnote, and the hover preview on desktop.
  - A driver page in both themes at 1440 and 390 px, against a stubbed snapshot.
  - No horizontal scroll.
  - Every photo is credited.
  - An unknown driver gives a 404.
  - The menu link works.
- **Checks:** `bun run lint`, `bun test` and the full Playwright suite.
- **Live evidence:** screenshots of the index and two driver pages (Ocon, and a champion or race winner) in both themes, on desktop and phone.

## Left to the builder

- The exact shape of the compact `people` rows, as long as the snapshot stays under 100 KB raw.
- How to batch the past-career fetches inside the 60-request budget.
- Which 22 hero photos to use, within the rules above. Praffi sees them in the PR.
- Motion, following the existing chapter pages' ease family.
