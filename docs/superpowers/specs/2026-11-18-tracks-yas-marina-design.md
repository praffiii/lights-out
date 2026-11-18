# The tracks, Yas Marina: design

## Why

Yas Marina is round 23, the season finale, and the last modelled circuit without a page. Las Vegas (PR #21) and Lusail (PR #22) showed that a new circuit page is a data change only: copy, photos and one prerender path. `TrackPage`, the band, the braking section, the history live row, the index link and the credits list all read from `TRACK_PAGES`. DESIGN.md says "per circuit, built once; per race, data only".

Anything below not taken from the approved Figma frames or an earlier Praffi decision is marked **my call**.

## Approaches

### Photos

Commons has Formula 1 cars on track at Yas Marina only for 2009, 2010 and 2015. For 2022–2025 it has only the 2023 Etihad flyover, which shows no track.

1. **Older photos, captioned by subject and year. Praffi picked these four (2026-11-18).** One night view of the circuit, one race winner, the hotel, and a 2009 champion on race day. The four photos are from four different years.
2. **The 2023 flyover as hero.** It is recent, but it shows no track and no car.
3. **The 2015 race start as hero.** At 1600 px wide it is too small for the 2880 px hero.

As on Las Vegas and Lusail, a caption names the subject and the year, and never claims a corner it does not show. The hotel photo is the only place photo, and it shows the hotel.

### Braking numbers

Same as Las Vegas and Lusail: the section computes from the stored pole lap (`pole:v1:yas_marina`). Nothing new to choose.

## Starting point: the approved Figma frames

File `IPkJZWQnY0IKdIjf6Nuugl`, page "v2 — minimalist mocks". Praffi approved them on 2026-11-18.

| Frame | Light | Dark |
|---|---|---|
| Yas Marina, desktop | 436:965 (x 43320) | 436:1166 (x 44860) |
| Yas Marina, phone | 438:1387 (board 131:2, x 9950) | 438:1589 (board 135:2, x 9950) |

## The page: `/tracks/yas_marina`

Everything not listed below works as on Las Vegas and Lusail: the band with its stats from the registry, the turn chips, the toggles, the pole lap replay, the braking section, the live history row and the Next band.

The page holds one new entry, `TRACK_PAGES.yas_marina` in `src/tracks/pages.ts`:

| Field | Value |
|---|---|
| `country` | `United Arab Emirates` |
| `intro` | "Beside a marina on Yas Island, raced from sunset into the night." |
| `hero` | place "Racing under the floodlights · Yas Marina, 2010", credit "Photo JiteshJagadish · CC BY 2.0", source `Yas_Marina_circuit_by_night.jpg` |
| `bandTitle` | "Two straights." / "Then the marina." |
| `places` | "Under the W hotel · T13–14" on turn 13, `up` |
| `cornersBody` | "beside a marina and under a hotel. Two corners worth knowing first." (the page puts "Anticlockwise," from the registry in front) |
| `historyTitle` | "Where titles" / "are decided." |
| `historyPhoto` | place "Jenson Button, Brawn, the 2009 champion · Yas Marina, 2009", credit "Photo Yuriy Lapitskiy · CC BY-SA 3.0", source `Jenson_Button_(Brawn_BGP_001)_on_Sunday_at_2009_Abu_Dhabi_Grand_Prix.jpg` |

**My call, made while building the mocks (Praffi saw it in the frames):** the draft's second tag, "Banked turn · new in 2021" on Turn 9, is dropped. Turn 9 sits at the far left of the band. On a phone a tag centred on it would hang off the stage, which the place-tag e2e test forbids. The banked turn is not named elsewhere on the page.

**Corners**, in the mock's order (the first is the big photo):

1. **Tag `T5 · The hairpin`.**
   - Line: "Three old corners became one wider hairpin in 2021. It opens onto the back straight."
   - Photo: place "Kimi Räikkönen, Lotus, the winner · Yas Marina, 2012", credit "Photo Play Among Friends Paf · CC BY 2.0", source `2012_Abu_Dhabi_GP_Winner.jpg`.
2. **Tag `T13–14 · Under the hotel`.**
   - Line: "The track runs under the W Abu Dhabi hotel, which straddles it beside the marina."
   - Photo: place "Fireworks over the hotel after the race · Yas Marina, 2015", credit "Photo Willo2173 · CC BY 2.0", source `Firework_Abu_Dhabi_Grand_Prix_2015.jpg`.

**History rows.** The 2026 row in the mock is the live row. The page builds it and it is not copy.

| Year | Line |
|---|---|
| 2009 | "F1's first day–night race. It starts at 17:00 and the sun sets at 17:43. Vettel wins." |
| 2021 | "Verstappen passes Hamilton on the last lap, after a disputed safety-car restart, and is champion." |
| 2025 | "Norris is champion by two points. Verstappen wins the race." |

**Numbers the page computes, checked on the stored 2025 fixture** (Verstappen, dry, 1:22.207):

- 6 stops, at turns 1, 5, 6, 9, 12 and 16.
- The biggest stop is into Turn 6: 316 → 68 km/h, 2.6 s, about 130 metres.
- Flat out: 66 %, 54.2 s of the lap.
- The payoff: "11 seconds a lap on the brakes, 54 flat out."
- The longest run without braking is 15 s, from Turn 6 to Turn 9.
- The hero round is 23, from the season data.

## Photos

Each photo comes in two files, `public/img/tracks/yas_marina-<name>.jpg` and `yas_marina-<name>-phone.jpg`. They are already cropped. The crops and scripts are in `~/Developments/personal/lights-out-private/pipeline-2026-11-17/yas/` (`out/`, `crop.py`).

| Name | Desktop | Phone | Source |
|---|---|---|---|
| `hero` | 2880×1520 | 1170×780 | 3599×2399, full size, via the browser |
| `t5` | 1632×1120 | 1170×804 | 3840 px preview of a 4256 px original |
| `hotel` | 960×660 | 1170×804 | 3840 px preview of a 5184 px original |
| `2009` | 864×648 | 1170×876 | 3840 px preview of a 5616 px original |

These match the Las Vegas sizes for the same slots. Nothing is enlarged. The four desktop files total about 770 KB.

**My call:** the desktop hero is the bottom-left 2880×1520 of the original, with no resize. A full-width crop put the four cars behind the title block. This crop keeps them to the right of it. The floodlight tops are cut on desktop. The phone crop is the full frame and keeps them.

**My call:** the hotel photo drops its top 160 px before cropping, to remove a white speck in the sky.

**How the files were fetched (for the next circuit):** `upload.wikimedia.org` now answers scripted downloads with 429. Previews come from `thumb.wikimedia.org`, at standard widths only (for example 500, 960, 1920 and 3840). A source narrower than 3840 px has no preview wide enough, so its original was fetched through the browser.

## Wiring

- `vite.config.ts` prerenders `/tracks/yas_marina`.
- The index links the Yas Marina cell on its own (`to` comes from `TRACK_PAGES`). The credits page lists the four photos on its own, with "The tracks" as where each one is used.
- The head title, "Yas Marina · The tracks · Lights Out", comes from the route's existing `info.name`.

## Rules that apply

The Las Vegas spec's rules all hold. Most relevant here:

- No code comments.
- No `as` casts except `as const`.
- Never invent numbers.
- Every photo carries a caption block and a credit.
- No F1, FIA or team logos as graphics.
- Zero cost: the page reads `/api/season` and `/api/pole/yas_marina`, which already exist.

The Etihad, Lotus, Total and Brawn logos in the photos are on boards and cars in the photo, not used as graphics. This is the same as the liveries in the Las Vegas and Lusail photos.

## Tests

Tests that change because a third page exists:

- `test/tracks/index-model.test.ts`: the linked cells become `['vegas', 'losail', 'yas_marina']`.
- `e2e/tracks.spec.ts`, the index test: `.sizes a.cell` matches three links, `/tracks/vegas`, `/tracks/losail`, then `/tracks/yas_marina`.

New tests, written before the page entry:

- **Unit,** `test/tracks/braking.test.ts`: the existing "reads a dry lap too" test only checks the stop count and the flat-out share. A new test pins the numbers the copy relies on: stops at turns 1, 5, 6, 9, 12 and 16; the biggest into Turn 6 at 316 → 68 km/h over 130 m; the longest run from Turn 6 to Turn 9; 54.2 s flat out.
- **e2e,** `e2e/tracks.spec.ts`, in both themes on desktop and phone:
  - `/tracks/yas_marina` shows "Yas Marina.", the label `The tracks · Round 23 · United Arab Emirates`, and the place tag `Under the W hotel · T13–14`.
  - With the stubbed pole lap: "Six stops.", "Into Turn 6", "316", "Verstappen's pole lap, 2025, 1:22.207", and the explain line "from Turn 6 to Turn 9".
  - No sideways scroll.
- **e2e,** the place-tag test and the "every photo is credited" test both add Yas Marina to their loops.

`test/tracks/page-model.test.ts` already loops over every page. It checks each place tag sits on a turn the circuit has, with no change needed.

## Facts to verify before ship

- **The hotel is over the track between Turns 13 and 14.** This is the weakest one. Wikipedia ("Abu Dhabi Grand Prix") says "The W Abu Dhabi - Yas Island is over the short straight between turn 13 and 14", but does not say whether that uses the pre-2021 or current numbering. If it is the old numbering, the tag, the corner tag and the pin move.
- 2009 was F1's first day–night race: start at 17:00, sunset at 17:43, and Vettel won.
- 2021: old Turns 4–6 became one hairpin (now Turn 5), and it opens onto the back straight.
- 2021: Verstappen passed Hamilton on the last lap after a disputed safety-car restart, and became champion.
- 2025: Norris was champion by two points, and Verstappen won the race.
- The Räikkönen photo is titled "2012 Abu Dhabi GP Winner". The car is the 2012 Lotus, and Räikkönen won that race.
- The Button photo is filed as Sunday at the 2009 race.

## Proof before PR

- `bun test`, `bun run lint` and the full `bunx playwright test` are green.
- Live check in the browser at 1440 and 390, in both themes, with the local KV seeded with the Yas Marina pole lap:
  `bunx wrangler kv key put --local --binding SEASON_KV 'pole:v1:yas_marina' --path test/fixtures/pole/yas_marina.json`
- Review: sol-loop, then the `pr` skill writes the body.

## Left to the builder

- JPEG quality, as long as the four desktop files stay under about 1 MB together.
- Where the place tag lands on the live 3D band. The e2e test decides, as on Lusail. If the tag fails it at any width, raise it with Praffi rather than dropping it silently.
