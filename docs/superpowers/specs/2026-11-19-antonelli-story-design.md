# The people, Kimi Antonelli's story page: design

## Why

The people (PR #25) gave every race driver the same data-built page. Antonelli's hand-written story page was approved on 2026-11-08, but it was held back because its Monza band was a flat outline with no 3D model behind it (spec `2026-11-18-the-people-design.md`).

He is the 2026 champion and the youngest ever, and the `/people` champion band already links to `/people/antonelli`. Praffi picked this page as the next build on 2026-11-19 ("go with antonelli"). It finishes the people chapter: the one driver a newcomer is most likely to read about gets a real story, not just the template.

Anything below not taken from the approved Figma frames or an earlier Praffi decision is marked **my call**.

## Approaches

### The Monza band (Praffi picked B, 2026-11-19)

1. **Everything in the 8 Nov mock.** Monza modelled like the track pages, plus a new "Start grid" layer where the camera drops to 22 cars on the grid, with car 19 lit. This is the biggest option: a tracks page plus a new 3D feature (car models, grid placement, a camera move).
2. **Monza model plus the existing band, no grid layer. Picked.** The same Monza model and the same `CircuitStage` the track pages use, with its toggles. Two tags on the track tell the story: "Pole" and a purple "Grid 19 · his start". It costs about half of A, and a grid layer can come later.
3. **A still image.** One Blender render of the grid. The cheapest, but it would be the only band on the site you cannot turn.

### How the page relates to the driver template

**My call, shown in the approved frames:** `/people/antonelli` renders the story page instead of the template. The story's numbers section replaces the template's season and career sections. The template's race-by-race list stays, unchanged, near the bottom. Every other driver keeps the template.

## Starting point: the approved Figma frames

File `IPkJZWQnY0IKdIjf6Nuugl`, page "v2 — minimalist mocks". Praffi approved the light desktop direction on 2026-11-19 ("yes this direction is right"), then all four frames ("approve, write the spec").

| Frame | Light | Dark |
|---|---|---|
| Desktop | 449:1037 (x 49480) | 453:164 (x 51020) |
| Phone | 455:83 (board 131:2, x 10890) | 456:92 (board 135:2, x 10890) |

These refresh the 2026-11-08 frames (212:506, 221:560, 215:533, 222:657), which stay on the canvas untouched. The refresh changed three things: the Monza band (glow look, real model, tags), the numbers (after round 20), and the race-by-race band added from the Ocon template (440:1001 / 443:110 / 445:74 / 445:387).

After approval the grid measurement showed Monza's start line is not its finish line (see the Monza band below). Praffi picked option B on 2026-11-19 ("go with B"): the band hides the sector labels and shows two tags, "Pole" and "Grid 19 · his start". The four frames were updated to match.

## Data rules

- **Live numbers come from the snapshot.** Career totals (starts, wins, podiums, poles), the 2026 win count, the credit line's round and city, and the race-by-race rows are computed from `/api/season`, as the template does. They change as the season runs (Las Vegas, Lusail, Abu Dhabi still to come).
- **History is fixed copy.** The record ages, the clinch race and date, the Monza block (grid, lap 10, flag, date), the milestones and the payoff line describe the past. They never change, and after the calendar rolls to 2027 the snapshot no longer holds 2026 rounds, so they could not be computed then anyway (**my call**). Each one was checked against data or goes on the facts list below.
- **After the season rolls over** (standings season is no longer 2026), anything phrased "in 2026" from live data hides rather than shows a wrong year (**my call**): the "A year later he won {nine} Grands Prix." sentence and the "{Nine} of them in 2026" note. The career totals keep working, because the career already carries past seasons forward.

## The page: `/people/antonelli`

Top to bottom, as in frames 449:1037 and 455:83.

### 1. Hero

- Photo: "Antonelli after his first win · Shanghai, 2026", Photo Liauzh · CC BY 4.0. Commons file `2026_Chinese_GP_-_Mercedes_-_Kimi_Antonelli_-_Post_Race_Celebration.jpg` (4651×3101, **my call**), recorded in credits. Desktop and phone crops like the other people heroes (`public/img/people/`).
- Label: "The people · Mercedes · No. 12". Team and number from the standings row, like the template.
- Headline: "Kimi Antonelli." (two lines on desktop).
- Sub: "2026 world champion. Born in Bologna, 25 August 2006."

### 2. "Second season, first title."

- Label: "In Formula 1 · {starts} starts".
- Body: "He arrived in 2025 at 18, the third-youngest driver in F1 history. A year later he won {nine} Grands Prix." The number word is his 2026 win count.
- Four stats (frame 449:1037):
  - Wins · {career wins} · "{Nine} of them in 2026"
  - Pole positions · {career poles} · "The first at 19, the youngest ever"
  - Podiums · {career podiums} · "From {starts} starts"
  - Car number · 12 · "Kept for his title defence" (**on the facts list**; cut if it is not announced)
- Payoff row, purple: "So · Five wins in a row from his first. Nobody had done that."
- Credit: "Figures: Jolpica F1 API, after round {n}, {locality}".
- Career totals reuse `career()` in `src/people/page-model.ts`, so the story and the template can never disagree. Today they read 44 starts, 9 wins, 7 poles, 19 podiums.

### 3. The record

- Label "The record", the big "20", unit "years and 68 days old".
- Headline "Youngest champion ever."
- Body: "He clinched the title in Mexico City on 1 November 2026. The record he broke was Sebastian Vettel's, from 2010."
- Payoff, purple: "3 years and 66 days younger."
- Five ages on the day of each driver's first title: Antonelli 2026 · 20 y 68 d (purple, first), Vettel 2010 · 23 y 134 d, Hamilton 2008 · 23 y 300 d, Alonso 2005 · 24 y 58 d, Verstappen 2021 · 24 y 73 d.
- Credit: "Age on the day of each driver's first title".
- All fixed copy. A unit test checks the copy against itself: 25 Aug 2006 to 1 Nov 2026 is 20 y 68 d, and Vettel's 23 y 134 d minus that is 3 y 66 d.

### 4. Monza: "Nineteenth to first."

The signature band. Dark navy `#06080E` in both themes, like the track pages' band.

- Label "Monza · Round 13 · 6 September 2026", headline "Nineteenth to first.", body "A new power unit meant a grid penalty at his home race. He passed his teammate for the win: the first Italian to win at Monza in 60 years."
- Three stats: Grid 19th · Lap 10 5th · Flag 1st (purple).
- The stage: `CircuitStage` for Monza as the track pages use it, with its toggles and the "Explore the lap in 3D" link. No pole lap replay on this band (**my call**: the band is about the start, and the replay HUD would compete with the tags).
  - The mock's chips read "Sectors / Corners" and its hint "Press a corner · switch the layers". The shipped stage has "Turns / Sectors" toggles and the explore link instead, the same substitution the tracks spec made (**my call**).
- **Monza's start line is not its finish line.** OpenF1 car positions on the formation grid (still between 13:02:30 and 13:03:31 on race day) put pole (#10 Gasly) 276.3 m past the finish line and Antonelli's P19 slot 125.4 m past it, 151 m behind pole. The tags mark the grid, not the line.
- **The band hides the S1/S2/S3 sector labels** (Praffi, option B). At the measured positions the tags would cross them. The sector colours stay on the track and the Sectors toggle still works.
- Two tags under the track, both pointing down:
  - "Pole" (white pill) at the pole slot.
  - "Grid 19 · his start" (purple pill, purple dot) at his grid slot.
  - They never cover a turn chip or the headline, on desktop or phone (frames 449:1037 and 455:83 show the placement).
- Explain line under the stage: "Sectors: the lap in three timed parts. Corners: the eleven numbered turns. He started 19th, about 150 m behind the car on pole." The builder adjusts "Corners" to the toggle's real name, "Turns".
- Footnote: "Layout: bacinger/f1-circuits (MIT) · elevation: SRTM 30 m (NASA), exaggerated 1.5x · Map © OpenStreetMap contributors (ODbL) · turn numbers: F1 circuit map · sectors and grid: OpenF1, 2026 race".

### 5. W17 photo band

"Red Bull Ring · 2026 · Kimi Antonelli, Mercedes W17", Photo Lukas Raich · CC BY-SA 4.0. Same set as the Leclerc and Piastri heroes; the Antonelli frames are `FIA_F1_Austria_2026_Nr._12_Antonelli_(1).jpg`, `(3)` and `(4)`. The builder picks the one that crops best to the band and records it in credits.

### 6. Milestones: "From Bologna to Mexico City."

Fixed copy, six rows, 2026 in purple:
- 2006 · Born in Bologna on 25 August. Karting at five.
- 2020 · European karting champion at 14, the youngest senior winner ever.
- 2022 · Wins the Italian and German F4 titles in his first full season.
- 2023 · Formula Regional champion, in Europe and the Middle East.
- 2025 · F1 debut in Melbourne at 18. Starts 16th, finishes 4th.
- 2026 · Youngest pole and first win in Shanghai. Champion in Mexico City.

### 7. Race by race

The template's `Races` section and `driverPage(...).races` rows, unchanged: opposite-theme band, 2026 rows, best result purple (today Shanghai, by the template's rule), phone short statuses and key, footnote. **My call:** reuse the component rather than copy it.

### 8. Next: "Where the 12 came from."

- Label "Next · Legends", headline "Where the 12 came from.", "Read →" to `/people#legends`.
- Photo: "Ayrton Senna · Belgian Grand Prix podium, Spa, 1989", Photo madagascarica · CC BY 2.0. Commons file `Ayrton_Senna_1989_Belgian_GP_podium.jpg` (1800×1301), recorded in credits. Senna raced No. 1 in 1989; the caption makes no claim about 12.

### Loading and failure

Fixed-copy sections (hero photo and headline, the record, Monza, the W17 band, milestones, Next) render straight away. Sections that read the snapshot (the hero label, the numbers section, race by race) stay hidden while it loads, when `/api/season` fails, and when Antonelli has no standings row (**my call**). The page never shows a blank number or an error block in the middle of the story.

## Monza as a modelled circuit

Built on branch `feat/antonelli`, not yet committed:

- `blender/circuits/circuit.py` has `it-1922` with turns `[5, 15, 28, 40, 45, 55, 64, 79, 86, 93, 106]` and cuts `(0.3303, 0.6425)`.
  - Turns: MultiViewer's 2026 Monza corner positions, fitted to the layout (7.4 m RMS), each snapped to the nearest layout point. Every turn lands within 30 m of MultiViewer's own lap distance.
  - Cuts: Antonelli's fastest lap of the 2026 race (lap 53, OpenF1 session 11361). His car positions were fitted to the layout (2.1 m median), then read at the sector times. S2 starts about 190 m before the Roggia, S3 about 195 m before Ascari, as on the FIA map.
  - The bacinger layout began about 290 m past the real finish line. `data/it-1922-m.json` and `-elevation.json` were rotated to start at the line (one interpolated point added), so the start bar sits on the real line.
- `build.sh it-1922` wrote `public/circuits/it-1922{.glb,.webp,-1440.webp,-map.webp,-map-2048.webp}`, `src/circuits/pins/it-1922.json` and `src/circuits/lines/it-1922.json`. The glb is 436 KB, the same order as the other circuits.

To ship it:

- **Marks.** `circuit.py` gains an optional `marks` map per circuit, in metres past the finish line along the layout: Monza gets `{"pole": 276.3, "grid-19": 125.4}` (measured above). `build.py` writes each as an empty `mark-<name>` into the glb and into the pins JSON. `Circuit.tsx` positions `mark-*` elements the way it positions `turn-*` ones, but never counts them as turns and never hides them as crowded. Rebuild only `it-1922`; other circuits have no marks and stay byte-identical.
- **Bare band.** `CircuitStage` gains a `bare` prop that hides the `-label` meshes without a replay. Today only the replay HUD hides them (`Replay.bare`), and this band has no replay. For circuits with marks, `build.py` also renders a label-free poster, `<model>-bare.webp` and `-bare-1440.webp`, and a bare stage uses it, so the labels never flash in while the model loads. `/lap/monza` and the weekend band keep the labelled poster.
- **Places.** `Place` (`src/tracks/pages.ts`) and `CircuitStage`'s `places` prop grow from "a tag on a turn" to "a tag on a turn or a mark", plus an `accent` flag for the purple pill. The three existing track tags keep working unchanged.
- **Registry.** `monza` joins `MODELLED` and `CIRCUITS` in `src/circuits/registry.ts` (Jolpica `circuitId` `monza`, `openf1: 'Monza'`, model `it-1922`, facts from the calendar entry plus `distanceKm` and `turns: 11`, `direction: 'clockwise'`), with `marks`.
  - Side effects, all accepted (**my call**): the hourly pole refresh also stores `pole:v1:monza`, the 2026 Monza pole lap, on its next run; `/lap/monza` works and gets prerendered, because `vite.config.ts` crawls links and this band's explore link points to it; the 2027 Italian GP weekend gets the full weekend band for free. There is no `/tracks/monza` page; `trackFor('monza')` stays null because `TRACK_PAGES` has no entry.

## Wiring

- `src/routes/people.$driver.tsx`: `antonelli` renders `StoryPage`; everyone else `DriverPage`. Head title "Kimi Antonelli · The people · Lights Out"; description "Kimi Antonelli: the youngest champion in Formula 1 history, from Bologna to the 2026 title."
- New `src/people/story.ts` for the fixed copy and photos, `src/people/StoryPage.tsx` for the page, and a `storyPage(snapshot, now)` view model beside `driverPage` for the live numbers. CSS in `src/styles/people.css`, reusing the tracks band styles for the Monza band.
- Credits page: the three new photos (hero, W17, Senna 1989), each with its Commons source.
- Prerender: `/people/antonelli` is already in the list.
- `PEOPLE.antonelli.hero` (the index hover photo and template hero data) stays as it is (**my call**); the story hero is its own entry in `story.ts`.

## Tests

- **Unit:** `storyPage` against `test/fixtures/season-snapshot.json`: career totals equal `career()`'s, the 2026 win word ("nine"), the credit round and city; with a 2027 standings season, the "in 2026" notes are gone and the totals remain. The record copy check above. The registry: Monza has 11 pins, 2 marks and its cuts.
- **e2e** (`e2e/people.spec.ts`, using the `errors` fixture): the story renders all eight sections in both themes; both tags show, stay inside the stage and clear of every visible turn chip and the band headline at 1200, 1440 and 390 px; the band shows no sector label and loads the bare poster; the race list has 20 rows; the Next link lands on `/people#legends`; another driver (Ocon) still gets the template; no sideways scroll on a phone; the credits page lists the three photos.

## Facts to verify (Praffi, before merge)

1. "Kept for his title defence" on car number 12. A claim about 2027; cut unless announced.
2. "The first Italian to win at Monza in 60 years" (Scarfiotti, 1966).
3. "The first at 19, the youngest ever" for his first pole.
4. "Five wins in a row from his first. Nobody had done that."
5. "He passed his teammate for the win" (OpenF1 shows him taking the lead for good on about lap 51).
6. Milestones 2006–2025 as written.
7. "Third-youngest driver in F1 history" at his 2025 debut.

Checked against data: grid 19th and the win (Jolpica; he qualified 7th, so the grid penalty fits), 5th after lap 10 (OpenF1 positions), pole 276.3 m and his P19 slot 125.4 m past the finish line (OpenF1 formation-grid positions, 151 m apart), five straight wins from Shanghai, 20 y 68 d on 1 November 2026, the four other first-title ages, 9 wins / 7 poles / 19 podiums / 44 starts after round 20.

## Left to the builder

- Image crops and sizes for the three new photos, following the people hero pipeline.
- Which of the three W17 frames to use.
- Exact CSS for the tags and the story sections, matching the frames.
- How `StoryPage` shares the hero, races and Next components with `DriverPage`.
