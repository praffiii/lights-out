# Pole lap on the circuit band: design

## Why

The weekend page's circuit band is a glowing broadcast map of the circuit that you can drag to spin. Praffi finds drag-to-spin "so normal" and wants the section to feel futuristic and unmistakably F1.

The answer is real data. The band replays the actual pole lap at that circuit in real time, driven by OpenF1 telemetry, on the map the band already has. A throwaway spike on Las Vegas proved the idea on 2026-11-10 and Praffi approved the direction ("that's looks good"). The spike is on the local branch `spike/pole-lap`, commit "spike: band replays a real fastest lap…". It used the race's fastest lap with a hand-tuned alignment; this document replaces both.

## What it is

On the band, a glowing car runs the pole lap in real time, about 1:33 to 1:48. Around it, the band reads like a timing screen:

- **A big lap clock** in expanded Archivo at the bottom left. It shows the running time, holds the final pole time for a moment, then loops.
- **Three sector boxes, S1 to S3.** The current one shows a running time. Each finished one fills in its sector colour with the real split.
- **A label.** It names the lap: "Pole lap · Lando Norris · 2025 Las Vegas Grand Prix". It adds "Wet" when it rained during that qualifying.
- **A readout card riding next to the car.** It shows live speed in km/h, gear, a green throttle bar and a red brake bar.
- **Turn pins that react.** As the car passes a turn, its pin lights up white and shows the real apex speed and gear, for example `95 km/h · G3`, then settles back.

## How it behaves (decided with Praffi)

- **The pole lap, not the race's fastest lap.** Praffi: "more entertaining".
  - It is the pole-sitter's Q3 lap from the Grand Prix qualifying session, never Sprint Qualifying.
  - A wet pole is shown as it happened, with the "Wet" tag. Its sector times stay real.
- **The most recent running of this race.**
  - If this year's qualifying at that circuit has happened, the band shows this year's pole.
  - Otherwise it shows last year's, and the label carries the year.
- **It updates itself.** Praffi: "everything should be updated itself".
  - Within about an hour of a qualifying session ending, that pole lap replaces the old one with no manual step.
  - So during a race weekend, the weekend page shows *this weekend's* pole from Saturday night.
- **Drag-to-spin is removed,** along with its Reset button and the yaw code that only served it. The Turns and Sectors toggles stay.
- **Hover scrubs.** On desktop, a cursor within about 56 px of the track snaps the car to the nearest point.
  - The clock, splits and readout jump to that moment of the lap.
  - Leaving the track lets the replay continue from there.
  - The cursor becomes a pointer while it is snapped.

## My calls (not yet confirmed by Praffi)

- **Clicking the track opens the lap explorer at that exact point.**
  - It uses the existing band→explorer dive transition.
  - The explorer's swoop lands at the clicked position instead of the start line.
  - The "Explore the lap in 3D" link still opens it at the start line.
- **Phones get the replay without scrubbing.**
  - Dragging along the track would fight page scrolling.
  - Instead, tapping a turn pin jumps the replay to just before that turn.
  - The readout card is smaller and stays inside the stage.
- **Reduced motion.**
  - No moving car.
  - The band shows the finished lap as a still: final time, all three splits filled and no readout card.
  - Hover and tap do nothing.
- **No lap, no replay.** If a circuit has no stored lap, the band looks and works exactly as today minus drag-to-spin. That covers a new circuit with no running last year, or an OpenF1 failure before the first fetch. Never show estimated or invented numbers.
- **Credit.** The band's credit line gains "Telemetry: OpenF1 (unofficial)". Driver names are text only: no headshots (OpenF1 `headshot_url` is banned on this site), no team logos.
- **Car marker.** The car must sit exactly on the track line at every point and read as a bright glowing head with a short trail, clearly visible at desktop and phone sizes. The spike's version was a DOM dot offset from the line and a tiny 3D sphere, which is not good enough. The builder may draw it in 3D or 2D.

## Data

**Which session.** For each circuit that has a 3D model (today: Interlagos, Las Vegas, Lusail, Albert Park and Yas Marina):
- Take the latest OpenF1 session named exactly "Qualifying" at that circuit whose end time has passed.
- That session must have a P1 `session_result` with a Q3 time.

**Which lap.**
- The pole-sitter is P1 in `session_result`; their pole time is the last entry of `duration`.
- The lap is that driver's lap in that session whose `lap_duration` matches the pole time.
- Sector splits come from that lap's `duration_sector_1/2/3`.
- If no lap matches within 0.01 s, skip this session and keep whatever was stored before.

**Telemetry.**
- Take `car_data` (speed, gear, throttle, brake) and `location` (x, y) for that driver over the lap's time window.
- `car_data` arrives at roughly 3–4 samples a second; about 350 samples a lap is fine.

**Wet.** Mark the lap "Wet" if any `weather` sample for the session has `rainfall` set during the lap's window. The window is the call; the builder may widen it to the whole Q3 segment if that's simpler.

**Lining it up with the 3D track.**
- Each sample needs a position on the model's lap line, as the line's own `u` from 0 to 1.
- Compute it from the real `location` positions. Fit a 2D similarity transform (rotation, scale, translation; allow a mirror) from OpenF1's x/y onto the model line's x/z, then project each sample onto the line.
- Do not use speed integration plus a fixed offset. That was the spike's shortcut and it was off by 2.8% of a lap on Vegas.
- **Splits and colours always agree (my call).** After the fit, warp `u` piecewise between four anchors: lap start = 0, the S1 split time = the model's first cut, the S1+S2 time = the second cut, and the pole time = 1. The car then reaches each sector colour at the exact moment its split shows. The baked cuts are never edited, and the circuits are never re-baked for this.
- **Sanity bound (my call).** If the un-warped fit misses either cut by more than 3% of a lap, the alignment is wrong. The pipeline skips that session and keeps the previous lap. The tests check the same bound on recorded laps.

**Stored shape (per circuit).**
- Driver full name, year, Grand Prix name, wet flag, pole time and three sector times.
- The samples as compact rows of time, u, speed, gear, throttle and brake.
- Keep it to about 15 KB of JSON per circuit.

## Pipeline

- **The existing hourly season workflow** (`.github/workflows/season.yml` → `tools/refresh-season.ts`) gains the pole-lap step. It reuses the Effect `OpenF1Client` and the KV store pattern in `src/season/`.
- **Storage.** Each circuit's lap goes in its own KV key (for example `lap:<circuit id>`) in the same namespace. It is written only when the chosen session changed, so most hours write nothing.
- **Failures (my call).** A failure for one circuit never breaks the season snapshot or another circuit's lap. The previous value stays.
  - A lap failure is logged, but it does not turn the hourly run red. Some failures would repeat every hour until the next race weekend.
  - The season snapshot keeps its current exit behaviour.
- **Serving.** The site reads laps through a small API route next to `/api/season`, with caching that suits hourly changes. The band fetches its lap only once it's near the viewport, as the 3D model already does.
- **Production KV.** The production KV namespace is written only by this workflow.
  - `wrangler.jsonc`'s `previews` binding points at the production namespace, so "preview storage" is not a safe test target.
- **Testing without production (my call).**
  - The lap step gets a dry-run mode that writes each circuit's lap JSON to disk instead of KV. That is how the builder pulls real laps from OpenF1 during development.
  - The recorded laps become test fixtures.
  - Local dev reads them from the local KV that the dev server already simulates.
  - No new Cloudflare namespace and no `workflow_dispatch` on the branch.
- **First real laps (my call).** They appear at the first hourly run after the PR merges to `main`. That's acceptable: a band with no lap shows today's map.

## Where it's built (my call)

- **Branch.** `feat/pole-lap`, stacked on `feat/lap-explorer`, because click-to-point needs the explorer.
- **Shipping order.** It ships after the explorer, which ships after broadcast circuits.
- **Split if needed.** If the explorer stalls, the replay can ship on its own, and click-to-point becomes a follow-up.

## Non-goals

- No other drivers, no ghost-versus-ghost comparisons and no race replays.
- No charts: no speed traces or throttle graphs over distance. Everything is big type and the small live bars.
- No sound.
- No team colours or branding.
- The hero and the explorer keep their current light and estimated speeds. Only the click-to-point entry into the explorer changes there.

## Anti-goals (what would make this a failure even if it works)

- Numbers that aren't real, or a lap that doesn't match its label.
- A car that visibly drifts off the line or reaches a sector colour before its split shows.
- A replay that stutters or costs the page its smoothness. It must pause when the band is off screen or the tab is hidden.
- A stale lap after a race weekend because someone forgot a manual step.

## Left to the builder

- Module boundaries, KV key names and the API route's exact shape.
- How to fit the alignment transform, and how to resample and smooth telemetry.
- How the explorer receives the start point.
- HUD styling details within the spike's look (the spike screenshots are the reference): the bottom-left clock, the sector boxes in sector colours, and the readout card with a white left rule.
- How long the end-of-lap hold lasts (the spike used 1.6 s).
