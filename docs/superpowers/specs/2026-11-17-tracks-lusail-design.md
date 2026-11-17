# The tracks, Lusail: design

## Why

The tracks shipped with one circuit page, Las Vegas (PR #21, spec `2026-11-17-the-tracks-design.md`). Lusail is round 22, the race after Las Vegas, so it gets its page next (Praffi, 2026-11-17). Yas Marina follows with its own small spec. DESIGN.md says "per circuit, built once; per race, data only".

The page code from PR #21 is already generic. `TrackPage`, the band, the braking section, the history live row, the index link and the credits list all read from `TRACK_PAGES`. A new circuit is a data change: copy, photos and one prerender path. No component changes.

Anything below not taken from the approved Figma frames or an earlier Praffi decision is marked **my call**.

## Approaches

### Photos

Commons has almost no Formula 1 photos of Lusail. The F1 races there are 2021, 2023, 2024 and 2025, and their categories hold paddock and podium shots, not cars on track.

1. **Tell Lusail's own story: built for bikes, raced under lights. Praffi picked this (2026-11-17).** Use the well-shot Box Repsol MotoGP sets, CC BY 2.0, captioned for exactly what they show. The history headline turns that into the page's point: "Built for bikes. Then came F1."
2. **Low-quality F1 paddock shots.** These are honest but read below the bar.
3. **No photos, band only.** This breaks the "no text-only section" rule.

Las Vegas made the call to caption by subject, not by corner. The same rule holds here: a caption names the riders and the year, and never claims a corner it does not show.

### Braking numbers

Same as Las Vegas: the section computes from the stored pole lap (`pole:v1:losail`). There is nothing new to choose.

## Starting point: the approved Figma frames

File `IPkJZWQnY0IKdIjf6Nuugl`, page "v2 — minimalist mocks". Praffi approved them on 2026-11-17.

| Frame | Light | Dark |
|---|---|---|
| Lusail, desktop | 429:1539 (x 40240) | 429:1804 (x 41780) |
| Lusail, phone | 429:2069 (board 131:2, x 9480) | 429:2329 (board 135:2, x 9480) |

## The page: `/tracks/losail`

Everything not listed below works as on Las Vegas: the band with its stats from the registry, the turn chips, the toggles, the pole lap replay, the braking section, the live history row and the Next band.

The page holds one new entry, `TRACK_PAGES.losail` in `src/tracks/pages.ts`:

| Field | Value |
|---|---|
| `country` | `Qatar` |
| `intro` | "Built for motorbikes in the desert north of Doha, raced at night under floodlights." |
| `hero` | place "The MotoGP start · Lusail, 2012", credit "Photo Box Repsol · CC BY 2.0", source `2012_Qatar_Grand_Prix_start.jpg` |
| `bandTitle` | "One long straight." / "Then fast rights." |
| `places` | "Fast rights · T12–14, no braking" on turn 13, `up` |
| `cornersBody` | "on a circuit built for MotoGP. Two corners worth knowing first." (the page puts "Clockwise," from the registry in front) |
| `historyTitle` | "Built for bikes." / "Then came F1." |
| `historyPhoto` | place "Casey Stoner, Ducati · Lusail, 2008", credit "Photo Cecep Gorbachev · CC BY 2.0", source `CaseyStoner-01.jpg` |

**My call, after the live check:** the mock's second tag, "Main straight · 1,068 m" under Turn 1, is dropped. Turn 1 sits right above the pole-lap replay readout (which the mock did not show), so the tag touched it at every width. A raised tag at Turn 1 would land on the S1 label and the Turn 3 and 4 pins. The straight is still named in the headline and in the Turn 1 card. An e2e test now keeps every place tag at least 12 px clear of the readout, on both pages.

**Corners**, in the mock's order:

1. **Tag `T1 · End of the straight`.**
   - Line: "The 1,068-metre straight ends in a right-hander, the first stop of the lap."
   - Photo: place "Marc Márquez leads the opening lap · Lusail, 2014", credit "Photo Box Repsol · CC BY 2.0", source `Marc_Márquez_leads_the_pack_2014_Losail.jpeg`.
   - **My call:** the mock's "from 321 km/h" is dropped. It is a 2025 pole-lap number in hand copy, and the 2026 lap replaces it on 28 Nov. This matches the Las Vegas ruling on "22 seconds". The braking section carries the live numbers.
2. **Tag `T12–14 · The fast rights`.**
   - Line: "Three fast right-handers, taken without braking. In 2023 their kerbs cut tyres."
   - Photo: place "Pol Espargaró, Repsol Honda · Lusail, 2021", credit "Photo Box Repsol · CC BY 2.0", source `Pol_Espargaró_2021_Doha_4.jpg`.
   - "Without braking" holds on the 2025 pole lap, which has no zone between Turns 10 and 16. If a later lap brakes there, the line is wrong. It is a fact about the circuit's design, so it stays, and it goes on the facts list for Praffi to check.

**History rows.** The 2026 row in the mock is the live row. The page builds it and it is not copy.

| Year | Line |
|---|---|
| 2008 | "MotoGP's first night race. The circuit opened in 2004, built for bikes." |
| 2021 | "F1's first visit, a late stand-in for Australia. Hamilton wins." |
| 2023 | "Verstappen is champion on Saturday, in the sprint. On Sunday every set of tyres is limited to 18 laps." |

**Numbers the page computes, checked on the stored 2025 fixture** (Piastri, dry, 1:19.387):

- 7 stops, at turns 1, 2, 4, 6, 7, 10 and 16.
- The biggest stop is into Turn 6: 250 → 99 km/h, 2.0 s, about 90 metres.
- Flat out: 68 %, 54.1 s of the lap.
- The payoff: "10 seconds a lap on the brakes, 54 flat out."
- The longest run without braking is 23 s, from Turn 10 to Turn 16.
- The hero round is 22, from the season data.

## Photos

Each photo comes in two files, `public/img/tracks/losail-<name>.jpg` and `losail-<name>-phone.jpg`. Phone crops follow the phone frames. Desktop crops follow the desktop frames.

| Name | Desktop | Phone | Source size |
|---|---|---|---|
| `hero` | 2880×1520 | 1170×780 | 5616×3744 |
| `t1` | 1632×1120 | 1170×804 | 5184×3456 |
| `rights` | 960×660 | 1170×804 | 5341×3561 |
| `2008` | 760×570 | 760×570 | 824×570 |

These match the Las Vegas sizes for the same slots.

**My call:** the 2008 photo is never upscaled. Its source is 824 px wide, so both files keep the 760×570 crop, and the phone shows it at about 2×. This differs from the Las Vegas 1982 still, whose phone file was enlarged to 1170 px.

## Wiring

- `vite.config.ts` prerenders `/tracks/losail`.
- The index links the Lusail cell on its own (`to` comes from `TRACK_PAGES`). The credits page lists the four photos on its own, with "The tracks" as where each one is used.
- The head title, "Lusail · The tracks · Lights Out", comes from the route's existing `info.name`.

## Rules that apply

The Las Vegas spec's rules all hold. Most relevant here:

- No code comments.
- No `as` casts except `as const`.
- Never invent numbers.
- Every photo carries a caption block and a credit.
- No F1, FIA or team logos as graphics.
- Zero cost: the page reads `/api/season` and `/api/pole/losail`, which already exist.

The Repsol and Monster logos in the MotoGP photos are on the bikes and boards in the photo, not used as graphics. That is the same as the team liveries in the DHS Las Vegas photos.

## Tests

Tests that change because a second page exists:

- `test/tracks/index-model.test.ts`: the linked cells become `['vegas', 'losail']`.
- `e2e/tracks.spec.ts`, the index test: `.sizes a.cell` now matches two links, so it asserts both, `/tracks/vegas` then `/tracks/losail`.

New tests, written before the page entry:

- **Unit,** `test/tracks/braking.test.ts`: the stored Lusail pole lap gives 7 stops. The biggest is into Turn 6, 250 → 99 km/h, and the longest run is Turn 10 to Turn 16.
- **e2e,** `e2e/tracks.spec.ts`, in both themes on desktop and phone:
  - `/tracks/losail` shows "Lusail.", the label `Round 22 · Qatar`, and its place tag, inside the band and clear of the replay readout.
  - With the stubbed pole lap: "Seven stops.", "Into Turn 6", "250", and the explain line naming Turns 10 and 16.
  - No sideways scroll.
- **e2e,** the "every photo is credited" test runs over both pages.

`test/tracks/page-model.test.ts` already loops over every page. It checks each place tag sits on a turn the circuit has, with no change needed.

## Facts to verify before ship

- The main straight is 1,068 m (Wikipedia, "Lusail International Circuit").
- The circuit opened in 2004.
- The 2008 Qatar motorcycle GP was MotoGP's first night race.
- 2021: F1's first Qatar GP was a stand-in for the cancelled Australian GP, and Hamilton won.
- 2023: Verstappen clinched the title in the sprint, and Pirelli's kerb finding led to the 18-lap tyre limit.
- Turns 12–14 are taken without braking, and "their kerbs cut tyres" in 2023.
- The 2008 Stoner photo:
  - It is filed in the 2008 Qatar race category but dated 12 Mar 2008, three days after the race on 9 Mar. That could be a camera clock or a test session, so the caption says "Lusail, 2008", not "the first night race".
  - It is 824 px wide.
  - Praffi decides whether it is good enough. If not, the history photo becomes the 2012 start shot cropped differently, or a later Box Repsol night shot.

## Proof before PR

- `bun test`, `bun run lint` and the full `bunx playwright test` are green.
- Live check in the browser at 1440 and 390, in both themes, with the local KV seeded with the Lusail pole lap:
  `bunx wrangler kv key put --local --binding SEASON_KV 'pole:v1:losail' --path test/fixtures/pole/losail.json`
- Review: sol-loop, then the `pr` skill writes the body.

## Left to the builder

- The exact crop boxes, as long as they match the frames and keep riders clear of the title block.
- JPEG quality, as long as the four desktop files stay under about 1 MB together, as the Las Vegas set does.
