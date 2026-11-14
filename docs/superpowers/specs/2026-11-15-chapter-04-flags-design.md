# Chapter 04, Flags and what they mean: design

## Why

Chapter 03's hero nav and next-chapter card already promise "Flags and what they mean." with `Soon`, and the card's line is "What each colour asks of a driver". Chapter 04 answers the question a new fan has the first time the broadcast cuts to a yellow sector or a blue flag: what is that colour telling the driver to do? It is the shortest chapter (4 min). It should feel instinctive, because flags are colour and instinct, not data.

The bar is the same as for Chapters 01 to 03: landonorris.com and mercedesamgf1.com (Praffi, 2026-11-14).

Everything below that does not come from the approved Figma frames, DESIGN.md, `docs/motion-map.md` or an earlier Praffi decision is **my call**.

## Approaches

These are the three signature sections I considered, from the first message on 2026-11-14:

1. **A replay on the broadcast stage.** A real 2026 flag sequence plays on the glowing circuit, with marshal sectors turning yellow and the safety car coming out. It would be the third stage replay in a row. It also needs hand-placed marshal-sector boundaries, because OpenF1 names marshal sectors by number but never says where they are.
2. **A flag wall.** Each flag is a full-screen colour poster: what it means, what the driver must do, and a real 2026 count. **Praffi picked this ("yes go with B").**
3. **The flag wall plus a race-control ticker.** A scrolling feed of real messages with no map. It adds a second dense widget and breaks rule 2.

How the live counts reach the page:

1. **A new optional `flags` field on the season snapshot.** It is built by the hourly refresh, beside `history` and `latestSession`, and read through `useSeason`, which every page already calls for the weekend box. **My call.** It needs no new route, no new KV key and no new hook. A failure skips the field, the way `history` already does.
2. **A separate KV key, route and hook, like the pole laps.** The failure is isolated, but it costs three new modules to carry one small number table.
3. **Numbers baked into the repo.** These are frozen at Interlagos, which breaks "data updates itself" (Praffi, 2026-11-10).

## Starting point: the approved Figma frames

Figma `IPkJZWQnY0IKdIjf6Nuugl`, page "v2 — minimalist mocks":

| Frame | Node | Where |
|---|---|---|
| Desktop light | 375:821 | x 31000 |
| Desktop dark | 383:830 | x 32540 |
| Phone light | 384:839 | board 131:2 |
| Phone dark | 385:83 | board 135:2 |

Approvals:

- Praffi approved the light desktop direction on 2026-11-15 ("yes").
- Praffi signed off the dark and phone frames ("ok").

Top to bottom:

1. **Hero.**
   - Label `How F1 works · Chapter 04 · 4 min`.
   - Nav `← 03 Tyres and strategy · 05 Inside the car →`. Chapter 05 stays `Soon`.
   - Headline "A flag is / an order."
   - Intro: "At 300 km/h a driver can't hear the marshals. So they show a colour, and every colour has one job. Here is what each one asks." The phone frame drops the last sentence to fit; the page keeps it.
2. **Full-bleed photo.**
   - The photo is a track marshal at Zandvoort in 2024, with yellow and green flags tucked into his vest. It is Commons `2024-08-24 Motorsport, Formel 1, Großer Preis der Niederlande 2024 STP 3286 by Stepro.jpg`.
   - Caption `01 · Track marshal · Zandvoort, 2024`: "A marshal waits out the rain, yellow and green flags in his vest."
   - Credit: Photo Steffen Prößdorf · CC BY-SA 4.0.
   - Crop it from the top so his face shows. His bib reads "Intervention marshal", which is why the caption says "Track marshal".
   - Praffi rejected the first pick, the 2026 "FLAG MARSHAL" bib close-up, because a newcomer can't read what it is.
3. **The flag wall.** This is the signature section, in the opposite theme: tarmac on the light page, paper on the dark page.
   - Its header has:
     - label `The flag wall · <season> season`;
     - accent tag `OpenF1 race control · <n> races`;
     - headline "Six colours. / Six orders.";
     - body "Each flag asks one thing of a driver. Scroll, and they come in the order a race meets them. The counts are every time race control showed one in a <season> Grand Prix."
   - Six full-screen posters follow. See [The flag wall](#the-flag-wall).
   - A footnote closes it: `Counts · OpenF1 race control (unofficial) · <first race> to <latest race> · updated after every race`.
4. **The rest of the box.**
   - Label `Five more · seen less`. Headline "The rest / of the box."
   - Body: "Marshals have ten flags, and most races need only a few. These five come out when one car, or one stretch of track, has a problem."
   - Five square tiles: the flag drawn flat, a small tag, a name and one line.
   - On a phone the tiles become a sideways-scrolling row of cards, with the edge of the next card showing (DESIGN.md's phone rule).
5. **Track limits.**
   - Label `Track limits`. Headline "Four wheels off, / three strikes."
   - Body: "Run all four wheels past the white line and the lap does not count. Keep doing it and the black-and-white flag comes out, then a penalty."
   - A row of four giant numerals:
     - 1 `Lap time deleted`;
     - 2 `Lap time deleted`;
     - 3 `Black-and-white flag`, with a small flag;
     - 4 `Five-second penalty`, filled in accent as the payoff.
   - On a phone this becomes four stacked rows.
   - Accent stat line: `<k> of <n> black-and-white flags in <season> races were for track limits · OpenF1`.
6. **The boards.**
   - Label `When a flag isn't enough`. Headline "The boards / take over."
   - Body: "For a crash that needs a crane, race control slows the whole field. Light panels round the track show SC for the safety car or VSC for a virtual one, and every driver holds position."
   - Two stats: `<sc>` Safety cars · `<a> races in <season>`, and `<vsc>` Virtual safety cars · `<b> races in <season>`.
  - `<a>` and `<b>` are the races with at least one safety car or VSC: 10 and 14 today, not all 20 races.
   - Link "Why a stop is cheaper then → Chapter 03", to `/chapters/tyres-and-strategy`.
   - Photo: marshals waving a yellow flag next to the "SC" board at the 2005 US Grand Prix. It is Commons `F1 yellow flag and SC sign.jpg`, Photo Dan Smith · CC BY-SA 2.0.
     - Caption `04 · Yellow flag and SC board · Indianapolis, 2005`; the phone shortens it to `04 · SC board · Indianapolis, 2005`.
     - Praffi accepted an old photo here: Commons has no 2024–2026 F1 photo of a marshal waving a flag, and the flags haven't changed.
7. **Words from this chapter.** Nine chips:
   - Marshal
   - Marshal sector
   - Yellow flag
   - Blue flag
   - Lapped car
   - Red flag
   - Track limits
   - Black-and-white flag
   - Virtual safety car
8. **Next.**
   - Chapter 05 · 8 min, "Inside / the car.", line "What every part of a 2026 car does".
   - Photo `PHOTOS.ch05` (Piastri at Suzuka, 2026).
   - `to={null}`, because Chapter 05 isn't built.

The Next card and the footer are the shared components; nothing new there.

## The flag wall

### The posters

The six posters, in the order a race meets them:

| # | Flag | Field | Ink | Order (giant) | Line |
|---|---|---|---|---|---|
| 01 | Green | `#12A150` | ink | Go. | The danger is behind you. Race on. |
| 02 | Yellow | `#F5C400` | ink | Slow down. | Danger beside the track. No overtaking. |
| 03 | Double yellow · two flags | `#F5C400` | ink | Be ready / to stop. | The track is blocked, or marshals are on it. |
| 04 | Blue | `#1C8CFF` | paper | Let them by. | A faster car is about to lap you. Move over. |
| 05 | Red | `#E10600` | paper | Stop. | Session stopped. Every car to the pit lane, slowly. |
| 06 | Chequered | ink + checks | paper | It's over. | Race finished. One slow lap, then parc fermé. |

The mock's chequered line said "then the pits". After the flag, cars go to parc fermé, not their garages, so the line now says parc fermé. It is plain text, not the `parcFerme` word: that definition is about the locked set-up, not where cars go after the flag. **My call.**

**Every poster carries:**
- the index `0N / 06 · <name>`;
- the giant order;
- the line;
- the count with its unit;
- a race-control chip: label `Race control · <circuit> · lap <n>` and the real message in mono, for example `WAVED BLUE FLAG FOR CAR 14 (ALO)`;
- a six-swatch rail top right, with the current flag outlined.

The **double yellow** and **red** posters are split in two: colour on one side, photo on the other (photo underneath on a phone). They carry a small count, no chip and no rail.

- **Double yellow:** marshals sweeping the track at Turn 11, Melbourne, 2026. Commons `Turn 11 at the 2026 Australian Grand Prix (028A8507) (cropped).jpg`, Photo Yu Chu Chin · CC BY-SA 4.0. Caption "Marshals clear the track · Melbourne, 2026".
- **Red:** the grass fire that red-flagged Q2, Suzuka, 2025. Commons `2025 Japan GP - Grass Fire - Q2.jpg`, Photo Liauzh · CC BY-SA 4.0. Caption "A grass fire stops qualifying · Suzuka, 2025".
  - Its count is red flags **in a Grand Prix**: 0 so far in 2026.
  - Its sub-line counts the sessions red-flagged outside a Grand Prix: `<m> practice, qualifying and sprint sessions`. It is 26 today; all 26 are practice, qualifying or sprint qualifying.

The **chequered** poster is a black field with a band of white checks. On desktop the checks fill the right side; on a phone they run along the bottom.

The posters keep their real flag colours in both themes. A yellow flag is always yellow. Only the wall's header band changes with the theme.

### Counts and units

Counts are read from the snapshot (see [Live counts](#live-counts)). The units are:

| Poster | Count | Unit |
|---|---|---|
| Green | `CLEAR` messages | "all-clears in <season> races" |
| Yellow | `YELLOW` messages | "yellows in <season> races" |
| Double yellow | `DOUBLE YELLOW` messages | "double yellows in <season> races" |
| Blue | `BLUE` messages | "blue flags in <season> races" |
| Red | race red flags | "times in a <season> Grand Prix" |
| Chequered | races finished | "races finished in <season>" |

Counts use `en-GB` grouping, so 1,287.

### Motion (my call)

The wall is a **sticky stack**. Each poster is `position: sticky; top: 0` and one viewport tall (`100svh`, with a minimum of the mock's 640 px on desktop and 560 px on a phone). As you scroll, the next poster slides up over the one before, so the wall reads as one flag being swapped for the next.

It is CSS only:
- no pinning;
- no scroll-scrubbed timeline;
- no new engine.

So Lenis, a drag or a keyboard all behave as they do on any page. The order line and count use the existing `sweep` and `block` reveals. Every poster's rail is static, because each poster marks its own index.

Under reduced motion the posters are plain, unstacked blocks with no reveals.

## Live counts

The counts have to update themselves. They ride the hourly season workflow, which already reads OpenF1 (Praffi, 2026-11-10).

### Data

`SeasonSnapshot` gains `flags: Schema.optionalKey(FlagTally)`. Old snapshots without it still decode.

`FlagTally` holds:
- `season`: number;
- `races`: one row per finished, uncancelled Grand Prix, oldest first, with:
  - `sessionKey`, `circuit` (OpenF1 `circuit_short_name`), `round`;
  - counts: `clear`, `yellow`, `doubleYellow`, `blue`, `red`, `chequered`, `blackWhite`, `blackWhiteTrackLimits`, `safetyCars`, `vscs`;
  - `samples`: for each of the six wall flags, the first message of that kind in this race with its lap, or none.
- `redSessions`: how many of the season's non-race sessions were red-flagged.

### Rules

- **Kinds of message.** A message counts as:
  - a flag kind, by its `flag` field;
  - a safety car when `category` is `SafetyCar` and the message contains `SAFETY CAR DEPLOYED`;
  - a VSC when it contains `VSC DEPLOYED`;
  - a track-limits black-and-white flag when `flag` is `BLACK AND WHITE` and the message contains `TRACK LIMITS`.
- **Which sessions are races.** Only sessions with `session_name` `Race` count. Cancelled ones (`is_cancelled`) are skipped; Sakhir 2026 is one. Sprints are not Grands Prix.
- **Which race a chip quotes.** Each poster quotes the **most recent** race that has a sample for that flag.
- **Season fallback.** If the current season has no finished race yet, the tally is last season's. The `<season>` in the copy comes from the tally, not from the calendar.
- **Incremental refresh (my call).**
  - A race counts as finished 30 minutes after its `date_end`, the same wait `latestSession` uses.
  - A race whose `date_end` is under 48 hours old is re-fetched every hour, in case OpenF1 is still filling it in. After 48 hours its row is frozen and carried forward from the previous snapshot, which `refreshSnapshot` already reads.
  - So in a normal hour the refresh fetches nothing for older races. The test is "an unchanged race list older than 48 hours makes no `race_control` request".
- **Red sessions (my call).** `redSessions` counts distinct red-flagged sessions whose `session_name` is Practice 1–3, Qualifying, Sprint Qualifying or Sprint, among the tally season's own sessions. Pre-season testing (`Day 1`–`Day 3`) is left out. Use one request, `race_control?flag=RED` for the season's dates, filtered by those `session_key`s. Today's count is 26: no Sprint was red-flagged. The red poster's sub-line says `<m> practice, qualifying and sprint sessions`.
- **Failure.** Any OpenF1 failure keeps the previous tally, or omits the field. It never fails the snapshot, and it never blocks the Jolpica data, as `history` already behaves.

### On the page

- **No tally** (loading, a failed fetch, or a snapshot without `flags`): the posters render without counts, units, chips, the footnote or the stat lines. Their space stays reserved, so nothing jumps when the counts arrive. **No number is ever invented.**
- **Copy that adapts:**
  - "17 of 20" in the track-limits stat comes from the sums;
  - "Six colours" is fixed;
  - the race count in the tag and footnote is `races.length`;
  - the footnote names the first and latest race circuits.

Today's numbers (20 races, Melbourne to Interlagos):

| Count | Value |
|---|---|
| CLEAR | 526 |
| YELLOW | 298 |
| DOUBLE YELLOW | 242 |
| BLUE | 1,287 |
| RED (race) | 0 |
| Red-flagged practice, qualifying and sprint sessions | 26 |
| Chequered | 20 |
| Black-and-white | 20, 17 of them for track limits |
| Safety cars | 15, in 10 races |
| VSCs | 25, in 14 races |

These become the e2e fixture.

## Words

Nine new `WORDS` entries, plus the existing `safetyCar` used inline. My call on the definitions:

- `marshal`: Marshal. A volunteer at a post beside the track who waves the flags and clears crashes.
- `marshalSector`: Marshal sector. One of about 20 stretches of track, each watched by its own post. Flags are shown sector by sector.
- `yellowFlag`: Yellow flag. Danger ahead. Slow down and don't overtake until the green.
- `blueFlag`: Blue flag. A faster car is about to lap you. Let it by at the first chance, or be penalised.
- `lappedCar`: Lapped car. A car a full lap behind the leader. It must let the leaders through.
- `redFlag`: Red flag. The session is stopped. Every car returns slowly to the pit lane.
- `trackLimits`: Track limits. The white lines at the track's edge. All four wheels past them and the lap time is deleted.
- `blackWhiteFlag`: Black-and-white flag. A warning shown with a car number. Do it again and it's a penalty.
- `vsc`: Virtual safety car. Everyone slows to a set lap time without a car on track. Positions are frozen.

`FLAGS_WORDS` holds the nine chips in the mock's order. `vsc` is the only key that isn't the term's camelCase name.

Inline terms (my call):
- **Intro:** `marshal`.
- **Wall body:** none.
- **Yellow line:** `yellowFlag`.
- **Blue line:** `lappedCar`.
- **Track-limits body:** `trackLimits`, `blackWhiteFlag`.
- **Boards body:** `safetyCar`, `vsc`.

`marshalSector` appears as a chip only.

## Wiring the guide in

- **Route:** `/chapters/flags`, file `src/routes/chapters.flags.tsx`. Head title `Flags and what they mean · Lights Out` and a one-line description. Stylesheets `chapterCss` + `flagsCss` only, because there's no circuit stage. **My call** on the slug, shorter than the title, like `overtaking`.
- **Page:** `src/chapter/Flags.tsx` + `src/styles/flags.css`. It follows the `Tyres.tsx` pattern (`chapter-page flags-page`, `.opening`, `.photo-band`, `Words`, `Next`).
- **Links into the chapter:**
  - `CHAPTERS[3].to = '/chapters/flags'`, which lights up Home row 04 and the menu (four linked chapters);
  - Chapter 03's hero nav `Soon` becomes `Go`;
  - Chapter 03's Next card gets `to="/chapters/flags"`.
- **Images:** new files in `public/img/`, sized like the others (about 2000 px wide, the old Indianapolis photo at its native 1477):
  - `ch04-marshal.jpg`
  - `ch04-sweep.jpg`
  - `ch04-fire.jpg`
  - `ch04-board.jpg`
- **Photo entries:** each gets a `PHOTOS` entry with place and credit. `PHOTOS.ch04` (the Zandvoort SC panel) stays as the chapter's card on Home and in the menu.
- **Credits:** the credits page lists CC BY-SA 2.0 alongside the 4.0 photos, if it lists licences.

## Rules that apply

- **The 7 rules (DESIGN.md):**
  - every section is a poster;
  - the wall is the one signature and isn't a dense widget;
  - every photo has a caption block plus its credit;
  - no circuit on this page;
  - one ease family;
  - no text-only section;
  - the signature in the opposite theme.
- **Code:** no code comments; no `as` casts except `as const`; no `any`; no non-null `!`. `bun run lint` (oxlint anti-slop, tsc, no_comments.py) passes.
- **Copy:** never invent numbers; every number on the page comes from the tally or is a rule (3 strikes, 5 seconds).
- **Media:** Commons CC0, CC BY, CC BY-SA or public-domain media only; no F1, FIA, Pirelli or team logos as graphics. Logos that appear inside a photo of a real scene are fine.
- **Zero cost:** no new Worker routes, KV keys or paid services. The refresh adds about 1 OpenF1 request per new race, plus 1 per hour.

## Facts to verify before ship

- **Track limits.** Third offence brings the black-and-white flag, fourth and later a five-second penalty. Source: the FIA's 2026 F1 penalty guidelines, as reported. Confirm against one 2026 race director's event notes. If a race uses a different count, the body copy stays general and the 1–4 row stands as the usual rule.
- **Ten flags.** Appendix H of the International Sporting Code lists green, yellow, red, blue, white, black, black with orange disc, black-and-white, red-and-yellow stripes and chequered. Double yellow is two yellows.
- **The red flag.** Cars return to the pit lane, not the grid. This has been the rule since 2018.
- **The VSC.** It is a set delta time, with no overtaking.
- **Counts.** Recompute the table above from OpenF1 at build time. They change after Las Vegas (22 Nov).

## Proof before PR

- **Unit tests** (`test/flags/`), built from a trimmed `race_control` fixture:
  - kinds are counted by the rules above (track limits only when the message says so; SC and VSC from `DEPLOYED` only);
  - cancelled races and sprints are skipped;
  - the chip quote comes from the most recent race with that flag;
  - incremental: an unchanged race list older than 48 hours makes no `race_control` request and carries the tally forward, while a race under 48 hours old is fetched again;
  - `redSessions` skips testing days and counts practice, qualifying and sprint sessions;
  - season fallback before the first race;
  - an OpenF1 failure keeps the previous tally and still writes the snapshot;
  - a snapshot without `flags` still decodes.
- **e2e** (`e2e/flags.spec.ts`, desktop and phone):
  - loads in both themes;
  - no horizontal overflow at 1470 and 390;
  - every photo credited;
  - six posters in order with the fixture counts (1,287 on blue, 0 on red);
  - the wall header and posters stay in the opposite theme or flag colour in both themes;
  - with `/api/season` failing, no count, chip or stat text renders and the posters still show;
  - reduced motion leaves the posters unstacked;
  - Chapter 03's hero link and Next card, Home row 04 and the menu lead here;
  - the menu shows four linked chapters.
- **Checks:** `bun test`, `bun run lint` and `bunx playwright test` are green.
- **Live:** scroll through it in the browser at 1440 and 390, both themes.
- **Review:** sol-loop, then the `pr` skill for the body.

## Left to the builder

- The exact poster type sizes between the mock's values and the viewport; the order headline may scale with `clamp()`.
- How the `FlagTally` builder splits into pure counting (tested without I/O) and the OpenF1 calls.
- Whether `OpenF1Client` gains one `raceControl(key)` reader plus one season-wide red-flag reader, or one reader with a query. Both go through the existing gate and spacing.
- The rail swatch for chequered (a tiny check, or paper) and the tile drawings, as long as each flag reads as itself.
