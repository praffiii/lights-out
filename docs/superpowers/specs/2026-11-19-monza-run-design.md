# His run from 19th: the Monza band drives his lap 1

Mock: Figma `IPkJZWQnY0IKdIjf6Nuugl`, page "v2 — minimalist mocks", frames `463:1073` (mid-lap, desktop), `464:1073` (end of lap, desktop), `463:1074` (mid-lap, phone). Approved by Praffi on 2026-11-19.

Builds on: [2026-11-19-antonelli-story-design.md](2026-11-19-antonelli-story-design.md) (the Monza band, option B tags).

## Why

Every other circuit band on the site has a pole-lap car moving round the track. The Monza band on `/people/antonelli` has nothing moving, so next to them it looks stuck or still loading (Praffi: "rn just looks ambiguous"). The motion should tell his story, not someone else's pole lap. So the band shows his real opening lap of the 2026 Italian Grand Prix, from the Grid 19 tag.

## Goals

- **The car.** A purple car with a short trail leaves the Grid 19 mark and drives his real lap 1 at real speed, 95.76 s. The head is purple with a white ring and a purple glow. The trail is white dots with a purple glow, like the pole car, because a purple trail disappears on the purple first sector.
- **The chip.** A purple chip in the tag style rides with the car and reads `ANT · P{n}`. `{n}` is his position at that moment: the latest OpenF1 position update at or before that point of the lap. Over the lap it goes 19 → 17 → 16 → 15 → 14.
- **The end of the lap.** At the line the chip reads `ANT · P14 · after lap 1`. It holds for `advance`'s 1.6 s, then the run starts again from the grid, the same loop the pole replay uses.
- **When it runs.**
  - It starts once the page has entered and the band is on screen.
  - It pauses when the band is off screen or the tab is hidden (`runWhileSeen`).
  - With reduced motion, the car sits still on the line with the end chip.
- **What stays.** The Pole and Grid 19 tags, the hidden sector labels, the Turns and Sectors toggles, "Explore the lap in 3D", the headline, the stats and the explainer all stay as they are.
- **The footnote.** It names the new data: `… · sectors, grid and his lap 1: OpenF1, 2026 race`.

## Non-goals

- No other cars, no laps after lap 1, and no lap clock, sector splits or speed card on this band.
- No hover-to-scrub and no click-to-ride. The Explore link already goes to `/lap/monza`.
- No live refresh. The race is over, so the lap is baked once into the repo.

## Anti-goals

- **Nothing made up.** Every position shown is a point from the data and every chip number is an OpenF1 update. A smoothed or invented position would break the site's "real telemetry" promise.
- **Nothing hidden.** The car and chip must not hide the Pole tag, the Grid 19 tag or the headline, except in passing as the car drives by.

## Approaches

1. **Bake once and draw on the stage's trace (chosen, my call).**
   - A one-off tool pulls his lap 1 from OpenF1, lines it up with the Monza model using the same `alignLap` as the pole laps, and writes a JSON file into the repo, like `src/pass/pass.json`.
   - A small heads-up display draws the car on the stage's projected track, using the same `pointAt` and `runWhileSeen` as `PassHud`.
   - The server and KV don't change.
2. **Fetch at runtime through the pole pipeline.** Rejected: it would add a server route and KV keys for a race that will never change.
3. **Move a dot along the model line on a made-up schedule.** Rejected: it isn't his lap.

## Facts (checked 2026-11-19)

- OpenF1 race session `11361` (Monza, 6 September 2026), car `12`. Lap 1:
  - `date_start` `2026-09-06T13:03:30.936Z`, `lap_duration` 95.76;
  - sectors 33.736 / 32.161 / 29.863.
- OpenF1 position updates for car 12 during lap 1:

  | Time (UTC) | Position |
  |---|---|
  | before the start (`12:06:43.906`) | 19 |
  | `13:03:41.984` | 17 |
  | `13:03:47.208` | 16 |
  | `13:03:55.067` | 17 |
  | `13:04:04.185` | 16 |
  | `13:04:51.458` | 15 |
  | `13:04:57.301` | 14 |

  He crosses the line at `13:05:06.696`. The next update (`13:05:10.337`, P13) is already lap 2.
- **Cross-check:** Jolpica's lap chart for round 13 has him P14 after lap 1, which matches "the latest update at or before the line".
- **The grid slot:** it is 125.4 m past the line (original spec), so u ≈ 0.0216 on the Monza model line, which starts at the real line.

## Design

### Data: `src/people/monza-run.json`

The file's type is a `MonzaRun` schema, kept next to the story copy:

```
{ session: 11361, code: 'ANT', time: 95.76,
  rows: TelemetryRow[],                         // [t, u, speed, gear, throttle, brake] from alignLap
  positions: ReadonlyArray<readonly [t, n]> }   // t = seconds from lap start (the pre-start 19 at t = 0), n = position
```

### The tool: `tools/monza-run.ts`

- It runs once by hand. Its OpenF1 requests go through the repo's `OpenF1Client`, as `tools/pass.ts` does.
- It uses `laps`, `carData` and `location` for lap 1, `positions` for the lap window, and `Schema` to encode the file.
- It is not part of any build or workflow.

### Lining up a standing start

`alignLap` assumes a flying lap: it runs from the line at `u0` to one full lap later at `u0 + 1`. Lap 1 starts on the grid slot and ends at the line, so its end target is the next whole lap after `u0`, not `u0 + 1`. `alignLap` gets a way to say "this lap starts from the grid" (the builder chooses how). Pole laps and the Interlagos pass must line up exactly as they do today, and their tests prove it.

### Reading the run: one pure function

`runAt(run, t) → { u, position, done }`:
- `u` comes from `sampleRows`;
- `position` is the last entry in `positions` with a time at or before `t`;
- `done` is true when `t >= time`.

The chip text comes from that: `ANT · P{position}`, with ` · after lap 1` added when `done`.

### Drawing

- `CircuitStage` already hands a `hud` its stage, its replay and the projected trace, but it then drops the toggles and the Explore link. The run's display needs them kept, so the stage gets a way to keep its controls alongside a `hud` (the builder chooses how). The Interlagos replay keeps working as it does now, with no toggles.
- The display places the car head and trail with `pointAt(trace, u)`, the same way `PoleHud` does. The chip sits beside the car at the tag size: 11 px on desktop, 8 px on phones.
- Time moves forward with `advance(state, dt, run.time)`, which also gives the 1.6 s hold and the restart.

### Credit

The band's footnote (`MONZA.footnote`) changes as described under Goals. The stage credit line is not shown on this band.

## Tests

- **Unit, alignment:** a standing-start lap from recorded Monza samples starts within 0.004 of the grid slot (u ≈ 0.0216) and ends at u = 1. The existing pole-lap and pass alignment tests stay green unchanged.
- **Unit, `runAt`:**
  - P19 at t = 0;
  - P16 at 20 s (Curva Grande);
  - P15 at 82 s;
  - P14 at 95.76 s with `done` true;
  - `u` never goes backwards.
- **Unit, the file:** `monza-run.json` decodes with the schema, has session 11361 and time 95.76, and its last position is 14.
- **Component:**
  - the band's stage renders the car and the chip;
  - with reduced motion the chip reads `ANT · P14 · after lap 1`;
  - the toggles and the Explore link are still there.
- **e2e** (desktop and phone, stubbed season as the story tests do):
  - the chip shows a text starting `ANT · P` and stays inside the stage;
  - the Pole and Grid 19 tags are still visible;
  - with reduced motion the chip reads `ANT · P14 · after lap 1`.

## Left to the builder

- How `alignLap` is told about a standing start, and how `CircuitStage` keeps its controls with a `hud`.
- Where the chip sits relative to the car. Follow the mock: above and to the right mid-lap, above and to the left at the line. It moves to the other side when it would leave the stage.
- How many trail dots to use and how far apart. Start from the pole car's 9 dots.

## Facts for Praffi to confirm

- P14 after lap 1 (Jolpica lap chart), and the mid-lap positions as OpenF1 reports them.
