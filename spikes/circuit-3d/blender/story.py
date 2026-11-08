"""The overtake as numbers: a point-mass leader and a chaser on an authored time gap, Turn 12 to Turn 1.

replay.py writes the page's map positions and telemetry from it, so the numbers match the motion.
All numbers are sample data shaped to look plausible, not a real lap.
"""

FPS = 30
SUB = 8  # physics substeps per frame

# sample numbers, shaped to look plausible: not a real car or a real lap
ACCEL = 11.0  # m/s2 at zero speed, fading to nothing at top speed
BRAKE = 48.0  # m/s2, about 4.9 g
V_TOP = 88.0  # m/s on the straight, about 317 km/h, in straight mode
V_EXIT = 32.0  # m/s leaving Junção
V_T1 = 30.0  # m/s at the Turn 1 turn-in
DETECT_AFTER_T12 = 70.0  # m; the detection point (placeholder: check the 2026 Interlagos layout)
DRAIN = 0.02  # battery fraction per s deploying on the straight
DRAIN_OVERTAKE = 0.04  # with Overtake Mode
HARVEST = 0.12  # recovered per s under braking
LANE = 3.4  # m left of centre for the chaser's inside line
LEADER_LANE = -2.6  # m; the leader sits right of centre

# the story, as the chaser's time gap (s) to the leader: in the tow, out of it, alongside, ahead
GAP_START = 0.62
GAP_PULL = 0.24  # when the chaser leaves the tow
GAP_BRAKE = 0.05  # when the leader brakes; the chaser brakes later
GAP_END = -0.22
PULL_BEFORE_BRAKE = 3.0  # s before the leader's braking point that the chaser pulls out
BRAKE_LATER = 0.12  # s the chaser brakes after the leader


def gear(v):
    kmh = v * 3.6
    return 1 + sum(kmh > t for t in (75, 115, 150, 185, 220, 255, 290))


def ease(a, b, t0, t1, t):
    k = min(1.0, max(0.0, (t - t0) / (t1 - t0)))
    return a + (b - a) * k * k * (3 - 2 * k)


def simulate(track):
    """The leader is a point mass on the throttle, then the brakes. The chaser follows the authored gap."""
    x12, x1 = track.turn(12), track.turn(1) + track.lap
    detect = x12 + DETECT_AFTER_T12
    dt = 1 / FPS / SUB

    # leader: flat out from Junção, braking to the Turn 1 speed exactly at the turn-in
    hist, t, x, v, braking, brake_t = [], 0.0, x12, V_EXIT, False, None
    while x < x1 + 70:
        if not braking and v * v - V_T1 * V_T1 >= 2 * BRAKE * (x1 - x):
            braking, brake_t = True, t
        if braking and x < x1:
            v = max(V_T1, v - BRAKE * dt)
        elif braking:
            v = min(V_T1 + 4, v + 2 * dt)
        else:
            v += ACCEL * (1 - (v / V_TOP) ** 2) * dt
        hist.append((t, x, v, braking))
        x += v * dt
        t += dt
    duration = t
    pull_t = brake_t - PULL_BEFORE_BRAKE

    def leader_x(at):
        if at <= 0:
            return x12 + V_EXIT * at  # before the clip starts: still coming out of Junção
        i = min(len(hist) - 1, int(at / dt))
        return hist[i][1] + hist[i][2] * (at - hist[i][0])

    def gap(at):
        if at < pull_t:
            return ease(GAP_START, GAP_PULL, 0.0, pull_t, at)
        if at < brake_t:
            return ease(GAP_PULL, GAP_BRAKE, pull_t, brake_t, at)
        return ease(GAP_BRAKE, GAP_END, brake_t, duration, at)

    frames, events, ce, le, armed = [], {}, 1.0, 0.8, False
    n = int(duration * FPS)
    for i in range(n):
        at = i / FPS
        lx, lv, lb = leader_x(at), hist[min(len(hist) - 1, int(at / dt))][2], at >= brake_t
        g = gap(at)
        cx = leader_x(at - g)
        cv = (leader_x(at + 0.5 / FPS - gap(at + 0.5 / FPS)) - leader_x(at - 0.5 / FPS - gap(at - 0.5 / FPS))) * FPS
        cb = at >= brake_t + BRAKE_LATER
        if not armed and cx >= detect:
            armed, events["detect"] = g < 1.0, at
        k = ease(0.0, 1.0, pull_t, pull_t + 1.0, at)  # leaves the tow for the inside over a second
        for_frame = 1 / FPS
        ce = min(1.0, max(0.0, ce + (HARVEST if cb else -(DRAIN_OVERTAKE if armed else DRAIN)) * for_frame))
        le = min(1.0, max(0.0, le + (HARVEST if lb else -DRAIN) * for_frame))
        frames.append({
            "t": at, "lx": lx, "cx": cx, "lv": lv, "cv": cv, "lane": LEADER_LANE + (LANE - LEADER_LANE) * k,
            "gap": g, "armed": armed, "lb": lb, "cb": cb, "ce": ce, "le": le,
        })
    events.update(overtake=events["detect"] + 0.4, pull=pull_t, brake=brake_t + BRAKE_LATER)
    return frames, events, detect
