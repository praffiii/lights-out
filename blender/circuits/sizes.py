import json
import math
import os
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
GEOJSON = os.path.join(HERE, "data", "f1-circuits.geojson")
ARGS = sys.argv[sys.argv.index("--") + 1 :]
MODE, OUT, IDS = ARGS[0], ARGS[1], ARGS[2:]
PAD = 6
NUDGE = 0.25
LAYOUTS = {
    "desk": dict(W=1440, H=1000, SS=2, PX_PER_KM=88.0, COLS=6, COL0=48, COL_STEP=240, CENTRE_DX=84, LABEL_Y=(219, 468, 717, 967), ABOVE_LABEL=92),
    "phone": dict(W=390, H=1087, SS=3, PX_PER_KM=46.0, COLS=3, COL0=16, COL_STEP=130, CENTRE_DX=49, LABEL_Y=tuple(113 + 135 * r for r in range(8)), ABOVE_LABEL=54),
}
L = LAYOUTS[MODE]
W, H, SS, PX_PER_KM = L["W"], L["H"], L["SS"], L["PX_PER_KM"]
COLS, COL0, COL_STEP, CENTRE_DX = L["COLS"], L["COL0"], L["COL_STEP"], L["CENTRE_DX"]
LABEL_Y, ABOVE_LABEL = L["LABEL_Y"], L["ABOVE_LABEL"]
M_PER_PX = 1000.0 / PX_PER_KM
WIDEN = 88.0 / PX_PER_KM
PITCH = math.radians(50)
BG = "#06080E"
GRID = "#131B2F"
SLAB = "#111726"
COOL = "#C3CBDA"
ACCENT = "#A43BFF"
SLAB_W, CORE_W, HALO_W = 36.0 * WIDEN, 13.0 * WIDEN, 160.0 * WIDEN
SLAB_H = 30.0
GRID_HALF = 4.0 * WIDEN


def linear(hex_):
    h = hex_.lstrip("#")
    c = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]


def emit(name, hex_, k, halo=False):
    m = bpy.data.materials.new(name)
    nodes, links = m.node_tree.nodes, m.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    e = nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = (*[x * k for x in linear(hex_)], 1)
    if not halo:
        links.new(e.outputs[0], out.inputs["Surface"])
        return m
    m.surface_render_method = "BLENDED"
    uv = nodes.new("ShaderNodeUVMap")
    uv.uv_map = "across"
    xy = nodes.new("ShaderNodeSeparateXYZ")
    links.new(uv.outputs[0], xy.inputs[0])

    def op(kind, a, b):
        n = nodes.new("ShaderNodeMath")
        n.operation = kind
        for slot, v in ((0, a), (1, b)):
            if isinstance(v, (int, float)):
                n.inputs[slot].default_value = v
            else:
                links.new(v, n.inputs[slot])
        return n.outputs[0]

    d = op("SUBTRACT", xy.outputs["Y"], 0.5)
    g = op("EXPONENT", op("MULTIPLY", op("MULTIPLY", d, d), -18.0), 0)
    links.new(g, e.inputs["Strength"])
    add = nodes.new("ShaderNodeAddShader")
    links.new(e.outputs[0], add.inputs[0])
    links.new(nodes.new("ShaderNodeBsdfTransparent").outputs[0], add.inputs[1])
    links.new(add.outputs[0], out.inputs["Surface"])
    return m


def faded(name, hex_):
    m = bpy.data.materials.new(name)
    m.surface_render_method = "BLENDED"
    nodes, links = m.node_tree.nodes, m.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    tc = nodes.new("ShaderNodeTexCoord")
    xy = nodes.new("ShaderNodeSeparateXYZ")
    links.new(tc.outputs["Window"], xy.inputs[0])

    def op(kind, a, b):
        n = nodes.new("ShaderNodeMath")
        n.operation = kind
        for slot, v in ((0, a), (1, b)):
            if isinstance(v, (int, float)):
                n.inputs[slot].default_value = v
            else:
                links.new(v, n.inputs[slot])
        return n.outputs[0]

    def edge(v, k):
        return op("MINIMUM", op("MULTIPLY", op("MINIMUM", v, op("SUBTRACT", 1.0, v)), k), 1.0)

    fade = op("MULTIPLY", edge(xy.outputs["X"], 8.0), edge(xy.outputs["Y"], 5.0))
    fade = op("MULTIPLY", fade, fade)
    mix = nodes.new("ShaderNodeMixShader")
    links.new(fade, mix.inputs["Fac"])
    e = nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = (*linear(hex_), 1)
    links.new(nodes.new("ShaderNodeBsdfTransparent").outputs[0], mix.inputs[1])
    links.new(e.outputs[0], mix.inputs[2])
    links.new(mix.outputs[0], out.inputs["Surface"])
    return m


def layout(cid):
    with open(GEOJSON) as f:
        g = next(x for x in json.load(f)["features"] if x["properties"]["id"] == cid)
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


def ribbon(name, pts, at, w, z, mat, walls=0.0):
    n = len(pts)
    verts, faces, uvs = [], [], []
    for i, p in enumerate(pts):
        t = (pts[(i + 1) % n] - pts[i - 1]).normalized()
        side = Vector((-t.y, t.x, 0)) * w / 2
        verts += [(p + at + side + Vector((0, 0, z)))[:], (p + at - side + Vector((0, 0, z)))[:]]
        uvs += [(i / n, 0.0), (i / n, 1.0)]
    for i in range(n):
        a, b = 2 * i, 2 * ((i + 1) % n)
        faces.append((a, b, b + 1, a + 1))
    if walls:
        base = len(verts)
        for i, p in enumerate(pts):
            t = (pts[(i + 1) % n] - pts[i - 1]).normalized()
            side = Vector((-t.y, t.x, 0)) * w / 2
            verts += [(p + at + side)[:], (p + at - side)[:]]
            uvs += [(0, 0), (0, 1)]
        for i in range(n):
            a, b = 2 * i, 2 * ((i + 1) % n)
            faces += [(base + a, base + b, b, a), (a + 1, b + 1, base + b + 1, base + a + 1)]
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    layer = me.uv_layers.new(name="across")
    for poly in me.polygons:
        for li in poly.loop_indices:
            layer.data[li].uv = uvs[me.loops[li].vertex_index]
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    return ob


def at_pixel(sx, sy):
    x = (sx - W / 2) * M_PER_PX
    y = (H / 2 - sy) * M_PER_PX / math.sin(PITCH)
    return Vector((x, y, 0))


def grid(mat):
    half_x = W / 2 * M_PER_PX + 1000
    half_y = H / 2 * M_PER_PX / math.sin(PITCH) + 1000
    lines = []
    for k in range(-int(half_x // 1000), int(half_x // 1000) + 1):
        lines.append([Vector((k * 1000, -half_y, 0)), Vector((k * 1000, half_y, 0))])
    for k in range(-int(half_y // 1000), int(half_y // 1000) + 1):
        lines.append([Vector((-half_x, k * 1000, 0)), Vector((half_x, k * 1000, 0))])
    verts, faces = [], []
    for a, b in lines:
        t = (b - a).normalized()
        s = Vector((-t.y, t.x, 0)) * GRID_HALF
        i = len(verts)
        verts += [(a + s)[:], (b + s)[:], (b - s)[:], (a - s)[:]]
        faces.append((i, i + 1, i + 2, i + 3))
    me = bpy.data.meshes.new("grid")
    me.from_pydata(verts, [], faces)
    me.materials.append(mat)
    ob = bpy.data.objects.new("grid", me)
    bpy.context.collection.objects.link(ob)


def box(scene, cam, ob):
    w, h = W * SS, H * SS
    pts = [world_to_camera_view(scene, cam, ob.matrix_world @ v.co) for v in ob.data.vertices]
    x0 = max(0, int(min(p.x for p in pts) * w) - PAD * SS)
    x1 = min(w, int(max(p.x for p in pts) * w) + 1 + PAD * SS)
    y0 = max(0, int((1 - max(p.y for p in pts)) * h) - PAD * SS)
    y1 = min(h, int((1 - min(p.y for p in pts)) * h) + 1 + PAD * SS)
    return x0, y0, x1, y1


def render(scene, path, border=None):
    r = scene.render
    r.use_border = border is not None
    r.use_crop_to_border = border is not None
    if border:
        x0, y0, x1, y1 = border
        w, h = W * SS, H * SS
        r.border_min_x, r.border_max_x = (x0 + NUDGE) / w, (x1 + NUDGE) / w
        r.border_min_y, r.border_max_y = (h - y1 + NUDGE) / h, (h - y0 + NUDGE) / h
    r.filepath = path
    bpy.ops.render.render(write_still=True)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    r = scene.render
    r.engine = "BLENDER_EEVEE"
    scene.eevee.taa_render_samples = 32
    scene.view_settings.view_transform = "Standard"
    r.resolution_x, r.resolution_y = W * SS, H * SS
    r.image_settings.file_format = "PNG"
    scene.world = bpy.data.worlds.new("world")
    bg = scene.world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (*linear(BG), 1)
    bg.inputs["Strength"].default_value = 1.0

    data = bpy.data.cameras.new("cam")
    data.type = "ORTHO"
    data.sensor_fit = "HORIZONTAL"
    data.ortho_scale = W * M_PER_PX
    data.clip_end = 400000
    cam = bpy.data.objects.new("cam", data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    d = Vector((0, -math.cos(PITCH), math.sin(PITCH)))
    cam.location = d * 100000
    cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()

    grid(faded("grid", GRID))
    slab = emit("slab", SLAB, 1.0)
    cool_core, cool_halo = emit("cool", COOL, 0.95), emit("cool-halo", COOL, 0.16, True)
    hot_core, hot_halo = emit("hot", ACCENT, 1.6), emit("hot-halo", ACCENT, 0.6, True)
    made = {}
    for i, cid in enumerate(IDS):
        col, row = i % COLS, i // COLS
        at = at_pixel(COL0 + col * COL_STEP + CENTRE_DX, LABEL_Y[row] - ABOVE_LABEL)
        pts = smooth(layout(cid), 8.0)
        halo = ribbon(cid + "-halo", pts, at, HALO_W, SLAB_H + 0.5, cool_halo)
        ribbon(cid + "-slab", pts, at, SLAB_W, SLAB_H, slab, walls=1.0)
        core = ribbon(cid + "-core", pts, at, CORE_W, SLAB_H + 1.0, cool_core)
        made[cid] = (halo, core, [(COL0 + col * COL_STEP) * SS, LABEL_Y[row] * SS])

    bpy.context.view_layer.update()
    os.makedirs(OUT, exist_ok=True)
    render(scene, os.path.join(OUT, f"{MODE}.png"))
    cells = {}
    for cid, (halo, core, label) in made.items():
        border = box(scene, cam, halo)
        halo.data.materials[0], core.data.materials[0] = hot_halo, hot_core
        render(scene, os.path.join(OUT, f"{MODE}-{cid}.png"), border)
        halo.data.materials[0], core.data.materials[0] = cool_halo, cool_core
        x0, y0, x1, y1 = border
        cells[cid] = {"patch": [x0, y0, x1 - x0, y1 - y0], "label": label}
    json.dump({"w": W * SS, "h": H * SS, "km": round(PX_PER_KM * SS), "cells": cells}, open(os.path.join(OUT, f"{MODE}.json"), "w"))
    print("done sizes", MODE, len(cells))


main()
