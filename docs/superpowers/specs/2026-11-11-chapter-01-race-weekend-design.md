# Chapter 01, A race weekend: design

## Why

The hero's main call to action, "Start the guide", still says "Soon". The guide is the site's core promise ("A fan-made guide for anyone who just watched their first race and wants to know what happened") and none of it exists yet. Chapter 01 is the first page of it.

The Las Vegas Grand Prix weekend (19–21 Nov 2026, track time) is when a wave of new fans arrives. The aim is to ship before then, but the bar comes first.

Praffi skipped the question round on 2026-11-11 ("you already know the context and mock"). Everything below that is not quoted from DESIGN.md, the Figma mock or an earlier Praffi decision is **my call**.

## Starting point: the approved Figma mock

Figma `IPkJZWQnY0IKdIjf6Nuugl`, page "v2 — minimalist mocks", frames "Chapter 01 · A race weekend" (light, node 89:2) and "… · dark" (94:2). Top to bottom:

1. **Hero.** Label `How F1 works · Chapter 01 · 5 min`, right-aligned `Start here · 02 How overtaking works →`. Headline "Three days. / One race." Side line "Friday is practice, Saturday sets the order, Sunday pays the points."
2. **Full-bleed photo** with a caption block: `01 · The grid · Shanghai, 2024` / "Norris, Hamilton and Alonso wait for the Sprint start." Credit underneath (`PHOTOS.ch01`, Liauzh, CC BY-SA 4.0).
3. **The weekend (signature section, opposite theme).** Label `The weekend · Standard format` with a `Standard | Sprint` toggle. Three giant columns, "Fri." "Sat." "Sun.", with Sun. filled purple. Under each, one line ("Practice. Nothing counts yet." / "One lap decides where you start." / "The race pays the points.") and the sessions as big rows with a mono duration. A footnote on the sprint format.
4. **Qualifying.** Label `Saturday · Qualifying · Knockout`, headline "Six out. Six out. / Ten fight for pole.", three giant numbers 22 → 16 → 10 (10 in purple), each with a mono caption (`Q1 · 18 min · Slowest six out` …). The mock's Q3 says 12 min; it is 13 min in 2026 (see "Facts to verify").
5. **Points.** Label `Sunday · Points`, headline "Top ten score.", a shrinking big-type ladder 25 18 15 12 10 8 6 4 2 1 with 25 in purple, and a footnote ("No bonus point for fastest lap since 2025 · Sprints pay 8 to 1 to the top eight").
6. **Words from this chapter.** A row of term chips and `Full glossary →`.
7. **Next chapter.** A full-bleed photo with a caption card: `Next · Chapter 02 · 5 min`, "How overtaking works.", "Why a pass starts a lap early →".
8. The shared footer.

The mock was drawn on 2026-11-07, before the broadcast circuits, the pole-lap replay and the lap explorer shipped. It has no 3D and no live data. This design keeps its structure and copy, and adds what the site can now do.

## What changes from the mock

### 1. Qualifying gets the real pole lap (the page's one dense widget)

After the 22 → 16 → 10 poster, a dark broadcast band replays a real pole lap on its glowing 3D circuit. It is the exact stage the weekend page ships: the car head and trail, the readout card, the lap clock, the S1–S3 boxes, the reacting turn pins, the Turns and Sectors toggles, hover-to-scrub, click (or "Explore the lap in 3D") into `/lap/<circuit>`, and the reduced-motion still.

- **Headline:** "The lap that wins pole." It stays true whether or not a lap is stored. When a lap is shown, the existing `Pole lap · <driver> · <year> <Grand Prix>` label (plus `· Wet`) names it. **My call.**
- **What it does not carry:** the weekend band's stats card and schedule. Those belong to `/weekend`; this band is only the stage, its toggles and its credit line. **My call.**
- **Which circuit (the same race as the poster above it):** the circuit of the latest Grand Prix qualifying in the season snapshot (`latest.qualifying`), if it has a model. That is the race the poster's data line names, so the lap is the payoff of "Ten fight for pole". Otherwise, the circuit of the race the weekend page shows (`pickRace`), if it has a model. Otherwise, the most recently raced circuit that has one. In practice: Interlagos today (São Paulo 2026), Las Vegas from the Friday night of its qualifying, then Lusail and Yas Marina. The pick is a pure function of the snapshot. It does not ask whether a lap is stored. **My call** (raised by the builder check).
- **No lap stored:** the band shows the plain circuit with no replay, exactly as the weekend band does, under the same headline. Never invent numbers.
- **No snapshot:** the section is left out.
- **Theme:** always the dark broadcast screen, in both themes (DESIGN.md rule 7 exemption). Credit line as on the weekend band, including `Telemetry: OpenF1 (unofficial)`.

This satisfies "3D first" and "one dense data widget per page" (rule 2): the circuit is the widget, and everything else stays a poster.

### 2. The weekend section ties the format to this weekend

The three columns stay evergreen. They teach the format, so the headings stay "Fri. Sat. Sun.".

- **A live line under the columns** (mono, one row) names the race the weekend page shows and when its days fall for the visitor, for example `This weekend · Las Vegas · Thu–Sat at the track, Fri–Sun your time · Full weekend →`, linking to `/weekend`. Las Vegas is the reason: it runs Thursday to Saturday at the track so the race lands on Saturday night on the Strip, which Mercedes' own race page shows as "Track time" vs "My time". When the track days and the visitor's days match, the line says them once. Between seasons it names the opener. **My call.**
- **The toggle defaults to that race's format** (Sprint if it has a sprint session, otherwise Standard). The visitor can still flip it. **My call.**
- **Session rows per format (2026):**
  - Standard: Fri: Practice 1, Practice 2. Sat: Practice 3, Qualifying. Sun: Formation lap, Race.
  - Sprint: Fri: Practice 1, Sprint qualifying. Sat: Sprint, Qualifying. Sun: Formation lap, Race.

### 3. The posters carry the latest real result

Both stay big-type posters with one mono line of real data beneath. They do not become tables. **My call.**

- **Qualifying:** under 22, the six drivers knocked out in Q1 at the latest Grand Prix; under 16, the six knocked out in Q2; under 10, the pole-sitter and time. Three-letter codes, for example `São Paulo · out: ALB OCO STR HUL BOR COL`. It uses the season snapshot's `latest.qualifying` (Grand Prix qualifying, never sprint qualifying).
- **Points:** under each ladder number, the code of the driver who scored it at the latest Grand Prix, plus one caption naming the race. It uses `latest.race`.
- **No data** (the snapshot is missing or the field is null): the posters show without the data line.

### 4. Words work inline

The glossary page does not exist yet, so `Full glossary →` shows `Soon`. Each chip in "Words from this chapter" opens its one-line definition in place. The same terms in the body copy get the DESIGN.md inline treatment: a dotted underline that turns solid, with the definition popping in under the term (0.24 s; tap toggles on touch). One list of definitions serves both. **My call** on scope: the inline-term mechanism ships now, covering only this chapter's terms. The original spec already planned it that way ("it grows as each later section lands").

Terms (from the mock): practice, qualifying, knockout, pole position, grid, formation lap, lights out, sprint, points, constructors. Plus parc fermé, because it is the rule that makes Saturday decide Sunday. **My call.**

### 5. Wiring the guide in

- **Route:** `/chapters/race-weekend`. It fits the existing `ChapterPath` type (`/chapters/${string}`). Page title "A race weekend · Lights Out".
- **The hero's "Start the guide"** links there instead of showing `Soon`.
- **Home "Start here" row 01, and the Menu's How F1 works · 01,** link there (`to` is set in `CHAPTERS`).
- **The weekend page teaser** (today "Watch the pass at Turn 1", Chapter 02, `Soon`) teases Chapter 01 instead ("Three days. One race.", `Read`), until Chapter 02 exists. **My call.**
- **Next chapter card:** Chapter 02 does not exist, so the card shows as in the mock with `Soon` in place of the link.
- **Reading time:** the hero label and the Home row show the same number. The mock says 5 min and Home says 6; use 5 unless the final copy reads longer. **My call.**
- **Not in scope:** the How F1 works index page (its Figma frame exists, but Home's "Start here" list already does its job), a glossary page, and chapters 02–05.

## Page order (light theme)

Hero (paper) → photo → the weekend (tarmac, the signature) → qualifying poster (paper) → pole lap (broadcast dark) → points poster (paper) → words → next chapter → footer.

In the dark theme, the signature section turns paper and the pole-lap band stays broadcast dark.

## Rules that apply (from DESIGN.md and earlier decisions)

- Every section is a poster: one image or one number, a headline, a caption. One dense widget: the circuit.
- Every photo has a caption block with the place and year, plus its Commons credit. Only CC0 / CC BY / CC BY-SA / public domain. No OpenF1 headshots, and no F1, FIA or team logos as graphics.
- One ease family (`launch`, `brake`). The motion is as in `docs/motion-map.md` under "How F1 works and the chapters": the hero headline sweeps then the label, the photo arrives behind the bar and drifts, the paragraph groups fade up 24 px, the term pop-in, the ladder rises with the payoff filling purple last, the next-chapter photo wipes up. Big numbers `roll`.
- Reduced motion: nothing stretches or blurs, nothing stays hidden, and the pole lap is the finished still.
- Both themes; phone at 390 px. On a phone, the three day columns stack, the knockout numbers stack, and the ladder wraps to two rows. The circuit stage uses the weekend band's phone behaviour.
- Text and data stay real HTML.
- Code: no comments, no `as` casts except `as const`, no `any`, no non-null `!`, `bun run lint` passes, existing style by hand.

## Facts to verify before ship

Checked on 2026-11-11 against press coverage of the FIA's 2026 changes: with 22 cars, Q1 and Q2 each drop six. Q1 is 18 min and Q2 15 min. Q3 is **13 min**, because the FIA added a minute, so the mock's "12 min" is wrong. Sprint qualifying is 12 / 10 / 8 min. Sprints pay 8 to 1 to the top eight, across six sprint weekends. Parc fermé starts at sprint qualifying, lifts after the sprint, and locks again from Grand Prix qualifying. Still confirm against the 2026 FIA Sporting Regulations before ship:
- the qualifying lengths (18 / 15 / 13 min) and six-six eliminations with 22 cars;
- the sprint qualifying format and the sprint distance (about 100 km) and points (8 to 1, top eight);
- race points 25–1 to the top ten, with no fastest-lap point since 2025;
- practice lengths (60 min), the race time limit, and when parc fermé starts.

## Proof before PR

- **Unit tests (pure page-model functions):** the circuit pick (latest qualifying modelled, then the weekend circuit, then the most recent modelled); the live line (track vs visitor days, the matching-days case, between seasons); the default format (sprint vs standard); the knockout and ladder captions from a snapshot, and their absence on null data.
- **Playwright:**
  - the chapter renders in both themes at 1440 and 390;
  - the format toggle swaps the session rows;
  - a term chip opens its definition;
  - "Start the guide" reaches the chapter;
  - the pole band falls back to the still under reduced motion.
- `bun run lint` and the project's checks pass, plus live screenshots of the page for Praffi.
- sol-loop before any PR. No council (Praffi's usual for Lights Out).

## Left to the builder

- Extracting the circuit stage out of `CircuitBand` so the weekend band and the chapter share it, without changing the weekend band.
- The exact copy for the body paragraphs and term definitions, in the mock's voice: short, plain, present tense.
- Where the page-model code lives, and the CSS file split.
