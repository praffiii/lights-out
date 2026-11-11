import json
import os
import sys
import math

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import broadcast as b
import circuit
from circuit import CID, HEIGHT, HERE, PINS, PUBLIC, SECTORS, SECTOR_CUTS, TURNS, WIDTH, Track, camera, empty, export, project, setup_render
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

OUT = os.path.join(HERE, ".out")
LINES = os.path.join(HERE, "..", "..", "src", "circuits", "lines")
PITCH, LENS, SHIFT_X, SHIFT_Y = 36.0, 60.0, -0.06, 0.07
LINE_POINTS = 400
CROP_MARGIN = 0.06
FREE = (0.2, 0.41, 0.92, 0.785)
FILL = 0.98
AZIMUTHS = range(0, 360, 10)
CANDIDATES = (0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9)
KEEP_OUT = ((0.0, 0.0, 0.31, 0.49), (0.79, 0.0, 1.0, 0.48))


def aim(cam, mid, span, az_deg, target):
    az, pitch = math.radians(az_deg), math.radians(PITCH)
    dist = span * b.DIST
    cam.data.shift_x, cam.data.shift_y = SHIFT_X, SHIFT_Y
    cam.location = (
        mid.x + dist * math.cos(pitch) * math.sin(az),
        mid.y - dist * math.cos(pitch) * math.cos(az),
        mid.z + dist * math.sin(pitch),
    )
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam.data.clip_start, cam.data.clip_end = dist * 0.25, dist * 6
    bpy.context.view_layer.update()
    return dist


def box(scene, cam, pts):
    vs = [world_to_camera_view(scene, cam, p) for p in pts]
    x0, x1 = min(v.x for v in vs), max(v.x for v in vs)
    y0, y1 = min(1 - v.y for v in vs), max(1 - v.y for v in vs)
    mx, my = (x1 - x0) * CROP_MARGIN, (y1 - y0) * CROP_MARGIN
    return x0 - mx, y0 - my, x1 + mx, y1 + my


def room(r):
    return min((FREE[2] - FREE[0]) / (r[2] - r[0]), (FREE[3] - FREE[1]) / (r[3] - r[1]))


def intrudes(scene, cam, pts):
    for p in pts:
        v = world_to_camera_view(scene, cam, p)
        if any(x0 <= v.x <= x1 and y0 <= 1 - v.y <= y1 for x0, y0, x1, y1 in KEEP_OUT):
            return True
    return False


def place(scene, cam, pts, mid, span, az, fill):
    cam.data.lens = LENS
    target = mid.copy()
    for _ in range(8):
        aim(cam, mid, span, az, target)
        cam.data.lens *= room(box(scene, cam, pts)) * fill
        bpy.context.view_layer.update()
        r = box(scene, cam, pts)
        dx = (FREE[0] + FREE[2]) / 2 - (r[0] + r[2]) / 2
        dy = (FREE[1] + FREE[3]) / 2 - (r[1] + r[3]) / 2
        wide = (target - cam.location).length * cam.data.sensor_width / cam.data.lens
        tall = wide * scene.render.resolution_y / scene.render.resolution_x
        right, up = cam.matrix_world.col[0].xyz, cam.matrix_world.col[1].xyz
        target = target - right * dx * wide + up * dy * tall
    aim(cam, mid, span, az, target)
    return target


def fit(scene, cam, pts, mid, span, az):
    fill = FILL
    target = place(scene, cam, pts, mid, span, az, fill)
    while intrudes(scene, cam, pts) and fill > 0.6:
        fill -= 0.03
        target = place(scene, cam, pts, mid, span, az, fill)
    return target


def frame(scene, cam, pts, mid, span):
    best = None
    for az in AZIMUTHS:
        target = fit(scene, cam, pts, mid, span, az)
        if not intrudes(scene, cam, pts) and (best is None or cam.data.lens > best[0]):
            best = (cam.data.lens, az, target)
    lens, az, target = best
    dist = aim(cam, mid, span, az, target)
    cam.data.lens = lens
    bpy.context.view_layer.update()
    return az, dist


def centreline(track):
    out = []
    for i in range(LINE_POINTS):
        p = track.at(track.lap * i / LINE_POINTS)
        out.append({"u": i / LINE_POINTS, "x": round(p.x, 2), "y": round(p.z + HEIGHT, 2), "z": round(-p.y, 2)})
    return out


def crop(scene, cam, pts):
    x0, y0, x1, y1 = box(scene, cam, pts)
    return [round(max(0.0, v), 4) for v in (x0, y0)] + [round(min(1.0, v), 4) for v in (x1, y1)]


def ribbons(track):
    cuts = [0, SECTOR_CUTS[0] * track.lap, SECTOR_CUTS[1] * track.lap, track.lap]
    edge = WIDTH / 2 - 1
    spans = []
    for i, (name, hex_) in enumerate(SECTORS):
        idx, us = b.sector_span(track, cuts[i], cuts[i + 1])
        b.strips(name, track, idx, us, [(0, b.CORE), (edge, b.EDGE), (-edge, b.EDGE)], HEIGHT + 0.1, b.glow_material(name, hex_))
        b.strips(f"{name}-halo", track, idx, us, [(0, b.HALO)], HEIGHT + 0.05, b.halo_material(f"{name}-halo", hex_))
        spans.append(([idx[int(len(idx) * f)] % len(track.samples) for f in CANDIDATES], {i % len(track.samples) for i in idx}))
    return spans


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    track = Track()
    os.makedirs(OUT, exist_ok=True)
    lo, hi = b.extent(track)
    img, footprints, roads = b.bake_map(scene, b.Local(track.mid), lo, hi, os.path.join(OUT, f"{CID}-map.png"))
    b.save_webp(scene, img, os.path.join(PUBLIC, f"{CID}-map.webp"))
    b.save_webp(scene, img, os.path.join(PUBLIC, f"{CID}-map-2048.webp"), 0.5)

    top = [p + Vector((0, 0, HEIGHT)) for p in track.samples]
    xs, ys, zs = [p.x for p in top], [p.y for p in top], [p.z for p in top]
    mid = Vector(((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, (min(zs) + max(zs)) / 2))
    span = max(max(xs) - min(xs), max(ys) - min(ys))

    ground = circuit.terrain(track, b.ground_material("ground", span, img=img))
    b.map_uvs(ground, lo, hi)
    tree = b.ground_tree(ground)
    b.streets(roads, tree, span, lo, hi)
    circuit.ribbon("road", track.samples, track.s, 0, track.lap, track.lap, circuit.material("road", b.PAL["road"]))
    spans = ribbons(track)
    mids = [ks[len(ks) // 2] for ks, _ in spans]
    hues = dict(SECTORS)
    circuit.bar(track, 0.0, "start", b.flat_emit("start", b.PAL["start"]), length=WIDTH + 3, depth=7, rise=0.5)
    turns = [empty(f"turn-{n}", b.on_ground(tree, b.outward(track, track.starts[i], b.TURN_OUT))) for n, i in enumerate(TURNS, start=1)]
    anchors = [b.on_ground(tree, b.outward(track, k, b.SECTOR_OUT)) for k in mids]

    bg = setup_render(scene)
    bg.inputs["Color"].default_value = b.rgba(b.PAL["bg"])
    scene.render.resolution_x, scene.render.resolution_y = 2880, 1800
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.quality = 82
    scene.eevee.taa_render_samples = 32
    cam = camera(scene, LENS)
    az, dist = frame(scene, cam, top + [e.location.copy() for e in turns] + anchors, mid, span)
    base = top + [e.location.copy() for e in turns]
    taken = []
    labels = [b.sector_label(n, hues[f"S{n}"], track, ks, own, az, span, tree, taken, lambda cs: room(box(scene, cam, base + cs))) for n, (ks, own) in enumerate(spans, start=1)]
    pts = base + [c for corners, _ in labels for c in corners]
    fit(scene, cam, pts, mid, span, az)
    count = b.blocks(footprints, track, tree, circuit.material("blocks", b.PAL["block"]), cam.location.copy(), top[::4] + [p for _, points in labels for p in points])

    for percent, suffix in ((100, ""), (50, "-1440")):
        scene.render.resolution_percentage = percent
        scene.render.filepath = os.path.join(PUBLIC, f"{CID}{suffix}.webp")
        bpy.ops.render.render(write_still=True)
    scene.render.resolution_percentage = 100

    pins = project(scene, cam, turns)
    pins["crop"] = crop(scene, cam, pts)
    os.makedirs(PINS, exist_ok=True)
    json.dump(pins, open(os.path.join(PINS, f"{CID}.json"), "w"), indent=1)
    os.makedirs(LINES, exist_ok=True)
    json.dump(centreline(track), open(os.path.join(LINES, f"{CID}.json"), "w"))
    export(os.path.join(OUT, f"{CID}.glb"))
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, f"{CID}.blend"))
    print(f"done {CID}: lap {track.lap:.0f} m, camera {dist:.0f} m at {az} deg, lens {cam.data.lens:.1f} mm, crop {pins['crop']}, blocks {count}, labels clear {not intrudes(scene, cam, pts)}, map {(hi.x - lo.x):.0f}x{(hi.y - lo.y):.0f} m")


main()
