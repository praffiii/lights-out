"""The overtaking replay as a live-timing map: Blender is only the maths here (the shared track and simulation).

Run: npm run replay  ->  src/replay.json, in seconds. Nothing is rendered.

Map units are metres, x right and y down, framed 16:9 on the stretch from Turn 12 to Turn 1.
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from circuit import HERE, WIDTH, Track  # noqa: E402
from story import FPS, LEADER_LANE, gear, simulate  # noqa: E402

SPREAD = 4.0  # lanes drawn 4x wider than real, so side by side reads at map scale
PAD = 70.0  # m of map around the stretch
FOOT = 170.0  # m of extra map under it, clear for the step caption
STEP = 6.0  # m between path points


def main():
    track = Track()
    frames, events, detect = simulate(track)
    x12, x1 = track.turn(12), track.turn(1) + track.lap

    def flat(p):
        return (p.x, -p.y)  # Blender's top view, y flipped for SVG

    def place(x, lane=0.0):
        h = track.heading(x)
        c = track.at(x)
        return flat(c + h.cross((0, 0, 1)) * -lane * SPREAD)  # left of the direction of travel

    stretch = [place(x12 - 40 + k * STEP) for k in range(int((x1 + 90 - x12) / STEP))]
    xs, ys = [p[0] for p in stretch], [p[1] for p in stretch]
    left, top, w, h = min(xs) - PAD, min(ys) - PAD, max(xs) - min(xs) + 2 * PAD, max(ys) - min(ys) + 2 * PAD + FOOT
    if w / h < 16 / 9:  # widen or heighten around the middle to a 16:9 frame
        left, w = left - (h * 16 / 9 - w) / 2, h * 16 / 9
    else:
        top, h = top - (w * 9 / 16 - h) / 2, w * 9 / 16

    def norm(p):
        return [round((p[0] - left) / w, 4), round((p[1] - top) / h, 4)]

    def path(points):
        return "M" + "L".join(f"{p[0] - left:.1f},{p[1] - top:.1f}" for p in points)

    lap = [place(k * STEP) for k in range(int(track.lap / STEP))]
    hd = track.heading(detect)
    across = hd.cross((0, 0, 1)) * (WIDTH / 2 + 10)
    tick = [flat(track.at(detect) + across), flat(track.at(detect) - across)]
    kmh = lambda v: round(v * 3.6)  # noqa: E731
    out = {
        "fps": FPS,
        "duration": round(frames[-1]["t"], 2),
        "events": {k: round(v, 2) for k, v in events.items()},
        "posterFrame": int((events["pull"] + events["brake"]) / 2 * FPS),
        "map": {
            "width": round(w, 1), "height": round(h, 1),
            "lap": path(lap) + "Z", "stretch": path(stretch),
            "detect": [norm(p) for p in tick],
            "turns": {"12": norm(place(x12, 16)), "1": norm(place(x1, -16))},  # off the road, clear of the frame edge and the tags
        },
        # per frame: speeds, gap (s while the chaser is behind, -1 once ahead), gears, modes, battery (0..5 cells),
        # then chaser and leader map positions (0..1 of the frame from the top left)
        "frames": [[
            kmh(f["cv"]), kmh(f["lv"]),
            round(f["gap"], 2) if f["gap"] > 0 else -1,
            gear(f["cv"]), gear(f["lv"]),
            "corner" if f["cb"] else "overtake" if f["armed"] else "straight",
            "corner" if f["lb"] else "straight",
            round(f["ce"] * 5, 1), round(f["le"] * 5, 1),
            norm(place(f["cx"], f["lane"])), norm(place(f["lx"], LEADER_LANE)),
        ] for f in frames],
    }
    json.dump(out, open(os.path.join(HERE, "..", "src", "replay.json"), "w"), separators=(",", ":"))
    print("replay", len(frames), "frames", out["events"], "map", out["map"]["width"], "x", out["map"]["height"], "m")


main()
