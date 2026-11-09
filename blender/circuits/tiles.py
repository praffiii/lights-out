import json
import math
import os
import sys

import bmesh
import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from circuit import camera, material, recolour, setup_render

GEOJSON = os.path.join(HERE, "data", "f1-circuits.geojson")
OUT = os.path.join(HERE, "..", "..", "public", "circuits", "tiles")
IDS = (
    "au-1953 cn-2004 jp-1962 us-2022 ca-1978 mc-1929 es-1991 at-1969 gb-1948 be-1925 hu-1986 nl-1948 "
    "it-1922 es-2026 az-2016 my-1999 sg-2008 us-2012 mx-1962 br-1940 us-2023 qa-2004 ae-2009"
).split()
W, H = 208, 192
PITCH = math.radians(32)
LENS = 50
ROAD = (0.02, 0.012, 0.02)
PAIRS = {
    "light": {"done": ("F4F3EF", "8A8D93"), "upcoming": ("F4F3EF", "DCDAD4"), "now": ("F4F3EF", "A43BFF"), "hover": ("111214", "B9B7B0")},
    "dark": {"done": ("0E0F11", "B9B7B0"), "upcoming": ("0E0F11", "3A3C42"), "now": ("0E0F11", "A43BFF"), "hover": ("F2F1EC", "8A8D93")},
}


def layout(cid):
    with open(GEOJSON) as f:
        g = next(feature for feature in json.load(f)["features"] if feature["properties"]["id"] == cid)
    c = g["geometry"]["coordinates"]
    c = c[0] if g["geometry"]["type"] == "MultiLineString" else c
    lo0, la0 = c[0]
    k = math.cos(math.radians(la0))
    p = [Vector((math.radians(lo - lo0) * 6371008.8 * k, math.radians(la - la0) * 6371008.8, 0)) for lo, la in c]
    if (p[0] - p[-1]).length < 1:
        p = p[:-1]
    lo = Vector((min(q.x for q in p), min(q.y for q in p), 0))
    hi = Vector((max(q.x for q in p), max(q.y for q in p), 0))
    return [q - (lo + hi) / 2 for q in p]


def smooth(pts, step):
    n, out = len(pts), []
    for i in range(n):
        a, b = pts[i], pts[(i + 1) % n]
        k = max(1, int((b - a).length // step))
        out += [a.lerp(b, j / k) for j in range(k)]
    for _ in range(2):
        m = len(out)
        out = [q for i in range(m) for q in (out[i].lerp(out[(i + 1) % m], 0.25), out[i].lerp(out[(i + 1) % m], 0.75))]
    return out


def mesh(name, verts, faces, mat):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.materials.append(mat)
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    return ob


def strip(name, pts, at, mat, w, h):
    n = len(pts)
    verts, faces = [], []
    for i, p in enumerate(pts):
        t = (pts[(i + 1) % n] - pts[i - 1]).normalized()
        side = Vector((-t.y, t.x, 0)) * w / 2
        for q in (p + side, p - side):
            verts += [(q + at)[:], (q + at + Vector((0, 0, h)))[:]]
    for i in range(n):
        a, b = 4 * i, 4 * ((i + 1) % n)
        faces += [(a, b, b + 1, a + 1), (a + 1, b + 1, b + 3, a + 3), (a + 3, b + 3, b + 2, a + 2)]
    return mesh(name, verts, faces, mat)


def bank(name, pts, top, base, h, mat):
    n = len(pts)
    verts, faces = [], []
    for i, p in enumerate(pts):
        t = (pts[(i + 1) % n] - pts[i - 1]).normalized()
        side = Vector((-t.y, t.x, 0))
        verts += [(p + side * base / 2)[:], (p + side * top / 2 + Vector((0, 0, h)))[:], (p - side * top / 2 + Vector((0, 0, h)))[:], (p - side * base / 2)[:]]
    for i in range(n):
        a, b = 4 * i, 4 * ((i + 1) % n)
        faces += [(a, b, b + 1, a + 1), (a + 1, b + 1, b + 2, a + 2), (a + 2, b + 2, b + 3, a + 3)]
    return mesh(name, verts, faces, mat)


def fit(scene, cam, pts, d, mx, my):
    w, h = scene.render.resolution_x, scene.render.resolution_y
    cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
    centre = sum(pts, Vector()) / len(pts)
    lo, hi = 20.0, 50000.0
    for _ in range(40):
        dist = (lo + hi) / 2
        cam.location = centre + d * dist
        cam.data.clip_end = dist * 6
        cam.data.shift_x = cam.data.shift_y = 0
        bpy.context.view_layer.update()
        v = [world_to_camera_view(scene, cam, p) for p in pts]
        ok = all(q.z > 0 for q in v) and max(q.x for q in v) - min(q.x for q in v) <= 1 - 2 * mx and max(q.y for q in v) - min(q.y for q in v) <= 1 - 2 * my
        lo, hi = (lo, dist) if ok else (dist, hi)
    cam.location = centre + d * hi
    bpy.context.view_layer.update()
    v = [world_to_camera_view(scene, cam, p) for p in pts]
    cam.data.shift_x = (min(q.x for q in v) + max(q.x for q in v)) / 2 - 0.5
    cam.data.shift_y = ((min(q.y for q in v) + max(q.y for q in v)) / 2 - 0.5) * h / w


def main():
    only = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    setup_render(scene)
    scene.render.film_transparent = True
    scene.render.resolution_x, scene.render.resolution_y = W, H
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.quality = 82
    cam = camera(scene, LENS)
    d = Vector((0, -math.cos(PITCH), math.sin(PITCH)))
    road, ground = material("road", "#8A8D93"), material("ground", "#F4F3EF")
    os.makedirs(OUT, exist_ok=True)
    for cid in IDS:
        if only and cid not in only:
            continue
        pts = layout(cid)
        span = max(max(p.x for p in pts) - min(p.x for p in pts), max(p.y for p in pts) - min(p.y for p in pts))
        pts = smooth(pts, span / 300)
        w, h, rh = (span * k for k in ROAD)
        obs = [bank(cid + "-bank", pts, w * 1.3, w * 1.3 + h * 3.5, h, ground), strip(cid, pts, Vector((0, 0, h)), road, w, rh)]
        fit(scene, cam, [p + Vector((0, 0, z)) for p in pts for z in (0, h + rh)], d, 0.05, 0.06)
        for theme, states in PAIRS.items():
            for state, (g, r) in states.items():
                recolour(ground, "#" + g)
                recolour(road, "#" + r)
                scene.render.filepath = os.path.join(OUT, f"{cid}-{state}-{theme}.webp")
                bpy.ops.render.render(write_still=True)
        for ob in obs:
            bpy.data.objects.remove(ob)
    print("done tiles")


main()
