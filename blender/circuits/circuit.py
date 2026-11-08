
import json
import bisect
import math
import os

import bmesh
import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
PUBLIC = os.path.join(HERE, "..", "..", "public", "circuits")
PINS = os.path.join(HERE, "..", "..", "src", "circuits", "pins")

WIDTH = 7.2
HEIGHT = 1.2
STEP = 3.0
CIRCUITS = {
    "br-1940": {"turns": [6, 13, 21, 40, 49, 62, 70, 81, 92, 110, 121, 135, 141, 153, 163], "cuts": (0.282, 0.73), "rot": 90, "pitch": 44, "frame": 1.28},
    "us-2023": {"turns": [4, 8, 15, 19, 22, 27, 34, 38, 44, 49, 53, 58, 72, 82, 85, 88, 96], "cuts": (0.243, 0.518), "rot": 90, "pitch": 44, "frame": 1.24},
    "qa-2004": {"turns": [5, 12, 20, 24, 30, 37, 47, 57, 62, 68, 76, 80, 86, 90, 95, 102], "cuts": (0.343, 0.635), "rot": 60, "pitch": 44, "frame": 1.15},
    "ae-2009": {"turns": [4, 9, 17, 23, 33, 51, 55, 60, 75, 89, 94, 98, 103, 108, 119, 128], "cuts": (0.211, 0.657), "rot": 90, "pitch": 44, "frame": 1.15},
    "au-1953": {"turns": [4, 12, 26, 33, 38, 48, 53, 61, 95, 100, 116, 123, 130, 140], "cuts": (0.328, 0.6), "rot": 45, "pitch": 44, "frame": 1.15},
}
CID = os.environ.get("CIRCUIT", "br-1940")
CFG = CIRCUITS[CID]
SECTOR_CUTS = CFG["cuts"]
TURNS = CFG["turns"]
EXAGGERATE = 3.0
SMOOTH = 7

THEMES = {
    "light": {"bg": "#F4F3EF", "ink": "#111214"},
    "dark": {"bg": "#0E0F11", "ink": "#F2F1EC"},
}
SECTORS = [("S1", "#A43BFF"), ("S2", "#2BD45E"), ("S3", "#F5C400")]


def linear(hex_):
    c = [int(hex_[i : i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c)


def catmull_rom(p0, p1, p2, p3, t):
    k = [0.0]
    for a, b in ((p0, p1), (p1, p2), (p2, p3)):
        k.append(k[-1] + max((b - a).length, 1e-6) ** 0.5)
    t0, t1, t2, t3 = k
    u = t1 + (t2 - t1) * t
    a1 = p0 * ((t1 - u) / (t1 - t0)) + p1 * ((u - t0) / (t1 - t0))
    a2 = p1 * ((t2 - u) / (t2 - t1)) + p2 * ((u - t1) / (t2 - t1))
    a3 = p2 * ((t3 - u) / (t3 - t2)) + p3 * ((u - t2) / (t3 - t2))
    b1 = a1 * ((t2 - u) / (t2 - t0)) + a2 * ((u - t0) / (t2 - t0))
    b2 = a2 * ((t3 - u) / (t3 - t1)) + a3 * ((u - t1) / (t3 - t1))
    return b1 * ((t2 - u) / (t2 - t1)) + b2 * ((u - t1) / (t2 - t1))


def load_points():
    raw = json.load(open(os.path.join(DATA, f"{CID}-m.json")))["P"]
    z = json.load(open(os.path.join(DATA, f"{CID}-elevation.json")))["z"]
    if math.dist(raw[0], raw[-1]) < 1:
        raw, z = raw[:-1], z[:-1]
    n = len(z)
    z = [sum(z[(i + d) % n] for d in range(-SMOOTH, SMOOTH + 1)) / (2 * SMOOTH + 1) for i in range(n)]
    mean = sum(z) / n
    c, s_ = math.cos(math.radians(CFG["rot"])), math.sin(math.radians(CFG["rot"]))
    pts = [Vector((x * c - y * s_, x * s_ + y * c, (h - mean) * EXAGGERATE)) for (x, y), h in zip(raw, z)]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), 0))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), 0))
    mid = (lo + hi) / 2
    return [p - mid for p in pts], hi - lo, mid, mean


def resample(pts):
    n = len(pts)
    out, starts = [], []
    for i in range(n):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        starts.append(len(out))
        steps = max(1, math.ceil((p2 - p1).length / STEP))
        out += [catmull_rom(p0, p1, p2, p3, k / steps) for k in range(steps)]
    return out, starts


SIDE = 0.62
RELIEF = 0.35
LIGHT = (-0.6, 0.8)


def material(name, hex_):
    m = bpy.data.materials.new(name)
    nodes, links = m.node_tree.nodes, m.node_tree.links
    nodes.clear()
    geo = nodes.new("ShaderNodeNewGeometry")
    xyz = nodes.new("ShaderNodeSeparateXYZ")
    links.new(geo.outputs["Normal"], xyz.inputs[0])

    def op(kind, a, b):
        n = nodes.new("ShaderNodeMath")
        n.operation = kind
        for slot, v in ((0, a), (1, b)):
            if isinstance(v, (int, float)):
                n.inputs[slot].default_value = v
            else:
                links.new(v, n.inputs[slot])
        return n.outputs[0]

    nx, ny, nz = xyz.outputs["X"], xyz.outputs["Y"], xyz.outputs["Z"]
    toward = op("ADD", op("MULTIPLY", nx, LIGHT[0]), op("MULTIPLY", ny, LIGHT[1]))
    relief = op("MULTIPLY", op("MULTIPLY", toward, nz), RELIEF)
    shade = op("ADD", op("ADD", op("MULTIPLY", nz, 1 - SIDE), SIDE), relief)
    shade = op("MAXIMUM", op("MINIMUM", shade, 1.15), 0.4)
    rgb = nodes.new("ShaderNodeRGB")
    rgb.outputs[0].default_value = (*linear(hex_), 1)
    mul = nodes.new("ShaderNodeVectorMath")
    mul.operation = "SCALE"
    emit = nodes.new("ShaderNodeEmission")
    out = nodes.new("ShaderNodeOutputMaterial")
    links.new(rgb.outputs[0], mul.inputs[0])
    links.new(shade, mul.inputs["Scale"])
    links.new(mul.outputs[0], emit.inputs["Color"])
    links.new(emit.outputs[0], out.inputs["Surface"])
    m["rgb"] = rgb.name
    return m


def recolour(m, hex_):
    m.node_tree.nodes[m["rgb"]].outputs[0].default_value = (*linear(hex_), 1)


def ribbon(name, samples, s, a, b, lap, mat):
    m = len(samples)
    idx = [k for k in range(m) if a <= s[k] <= b]
    if a > 0:
        idx.insert(0, idx[0] - 1)
    idx.append((idx[-1] + 1) % m if b < lap else 0)
    verts, faces, us = [], [], []
    for j, k in enumerate(idx):
        p = samples[k]
        t = flat(samples[(k + 1) % m] - samples[k - 1])
        nrm = Vector((-t.y, t.x, 0)) * (WIDTH / 2)
        up = Vector((0, 0, HEIGHT))
        u = lap if (k == 0 and j > 0) else s[k]
        for q in (p + nrm + up, p - nrm + up, p + nrm, p - nrm):
            verts.append(q[:])
            us.append(u / lap)
    for j in range(len(idx) - 1):
        lt, rt, lb, rb = (4 * j + o for o in range(4))
        lt1, rt1, lb1, rb1 = (4 * (j + 1) + o for o in range(4))
        faces += [(lt, rt, rt1, lt1), (lt, lt1, lb1, lb), (rb, rb1, rt1, rt)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    uv = mesh.uv_layers.new(name="lap")
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            vi = mesh.loops[li].vertex_index
            uv.data[li].uv = (us[vi], 0.0)
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


GROUND_VERTS = 36000
CROP = 0.2302
GRADE = 6.0
SINK = 0.3
BLEND = 45.0
DRAPE = 80.0
APRON = 5000.0


def terrain(track, mat):
    d = json.load(open(os.path.join(DATA, f"{CID}-terrain.json")))
    nx, ny = d["nx"], d["ny"]
    anchors = [p for k, p in enumerate(track.samples) if k % 8 == 0]

    def drape(x, y):
        num = den = 0.0
        for p in anchors:
            w = 1.0 / ((p.x - x) ** 2 + (p.y - y) ** 2 + DRAPE ** 2)
            num, den = num + w * p.z, den + w
        return num / den


    cell = 50.0
    grid = {}
    for k, p in enumerate(track.samples):
        grid.setdefault((int(p.x // cell), int(p.y // cell)), []).append(k)

    reach = WIDTH / 2 + GRADE + BLEND

    def grade(x, y):
        cx, cy = int(x // cell), int(y // cell)
        num = den = pull = 0.0
        near, nearest = 1e9, 0
        for a in (-1, 0, 1):
            for b in (-1, 0, 1):
                for k in grid.get((cx + a, cy + b), ()):
                    p = track.samples[k]
                    dist = math.hypot(p.x - x, p.y - y)
                    if dist >= reach:
                        continue
                    w = 1.0 - min(1.0, max(0.0, (dist - WIDTH / 2 - GRADE) / BLEND))
                    w = w * w * (3 - 2 * w)
                    wk = w / (dist * dist + 1.0)
                    num, den, pull = num + wk * (p.z - SINK), den + wk, max(pull, w)
                    if dist < near:
                        near, nearest = dist, k
        road = num / den if den else 0.0
        if near < WIDTH / 2 + 2:
            road = min(road, foot(nearest, x, y) - SINK)
        return road, pull

    def foot(k, x, y):
        n = len(track.samples)
        best, z = 1e9, track.samples[k].z
        for j in (k - 1, k):
            p, q = track.samples[j % n], track.samples[(j + 1) % n]
            ux, uy = q.x - p.x, q.y - p.y
            t = max(0.0, min(1.0, ((x - p.x) * ux + (y - p.y) * uy) / max(1e-9, ux * ux + uy * uy)))
            d = math.hypot(p.x + ux * t - x, p.y + uy * t - y)
            if d < best:
                best, z = d, p.z + (q.z - p.z) * t
        return z

    up = max(2, round(math.sqrt(GROUND_VERTS / (nx * ny))))
    mx, my = nx * up - up + 1, ny * up - up + 1
    verts = []
    for j in range(my):
        for i in range(mx):
            u, v = i / up, j / up

            ex = d["x"][0] + (d["x"][1] - d["x"][0]) * u / (nx - 1)
            ny_ = d["y"][0] + (d["y"][1] - d["y"][0]) * v / (ny - 1)
            c, s_ = math.cos(math.radians(CFG["rot"])), math.sin(math.radians(CFG["rot"]))
            X, Y = ex * c - ny_ * s_ - track.mid.x, ex * s_ + ny_ * c - track.mid.y
            z = drape(X, Y)
            road, w = grade(X, Y)
            z = road * w + z * (1 - w)
            if w > 0.999:
                z = min(z, road)
            verts.append((X, Y, z))
    faces = []
    for j in range(my - 1):
        for i in range(mx - 1):
            a = j * mx + i
            faces.append((a, a + 1, a + mx + 1, a + mx))

    ring = [i for i in range(mx)] + [j * mx + mx - 1 for j in range(1, my)] + \
           [(my - 1) * mx + i for i in range(mx - 2, -1, -1)] + [j * mx for j in range(my - 2, 0, -1)]
    start = len(verts)
    for r in ring:
        x, y, _ = verts[r]
        k = APRON / math.hypot(x, y)
        verts.append((x * k, y * k, 0.0))
    n = len(ring)
    for q in range(n):
        a, b = ring[q], ring[(q + 1) % n]
        faces.append((a, start + q, start + (q + 1) % n, b))
    mesh = bpy.data.meshes.new("ground")
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(mat)
    obj = bpy.data.objects.new("ground", mesh)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        f.smooth = True
    bm.to_mesh(mesh)
    bm.free()
    return obj


def flat(v):
    return Vector((v.x, v.y, 0)).normalized()


def empty(name, co):
    e = bpy.data.objects.new(name, None)
    e.location = co
    bpy.context.collection.objects.link(e)
    return e


class Track:

    def __init__(self):
        pts, self.size, self.mid, self.mean = load_points()
        self.samples, self.starts = resample(pts)
        s = [0.0]
        for k in range(1, len(self.samples)):
            s.append(s[-1] + (self.samples[k] - self.samples[k - 1]).length)
        self.s = s
        self.lap = s[-1] + (self.samples[0] - self.samples[-1]).length

    def turn(self, n):
        return self.s[self.starts[TURNS[n - 1]]]

    def at(self, x):
        x %= self.lap
        k = bisect.bisect_right(self.s, x) - 1
        nxt = (k + 1) % len(self.samples)
        seg = (self.s[k + 1] if nxt else self.lap) - self.s[k]
        return self.samples[k].lerp(self.samples[nxt], (x - self.s[k]) / seg)

    def heading(self, x, span=6.0):
        return (self.at(x + span) - self.at(x - span)).normalized()


def bar(track, x, name, mat, length=WIDTH + 0.9, depth=7.5, rise=0.25):
    p, h = track.at(x), flat(track.heading(x))
    side = Vector((-h.y, h.x, 0))
    bpy.ops.mesh.primitive_cube_add(size=1)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (depth, length, HEIGHT + rise)
    ob.rotation_euler = (0, 0, math.atan2(h.y, h.x))
    ob.location = p + Vector((0, 0, (HEIGHT + rise) / 2))
    ob.data.materials.append(mat)
    return ob


def build_track(track):
    t = track
    cuts = [0, SECTOR_CUTS[0] * t.lap, SECTOR_CUTS[1] * t.lap, t.lap]
    for i, (name, hex_) in enumerate(SECTORS):
        ribbon(name, t.samples, t.s, cuts[i], cuts[i + 1], t.lap, material(name, hex_))
    ground = material("ground", THEMES["light"]["bg"])
    terrain(t, ground)
    ink = material("ink", THEMES["light"]["ink"])
    bar(t, 0.0, "start", ink)
    for n, i in enumerate(TURNS, start=1):
        empty(f"turn-{n}", t.samples[t.starts[i]] + Vector((0, 0, HEIGHT)))
    return {"ink": ink, "ground": ground}


def camera(scene, lens):
    data = bpy.data.cameras.new("camera")
    data.lens = lens
    data.sensor_fit = "HORIZONTAL"
    cam = bpy.data.objects.new("camera", data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    return cam


def setup_render(scene):
    r = scene.render
    r.resolution_x, r.resolution_y = 1600, 900
    scene.view_settings.view_transform = "Standard"
    r.engine = "BLENDER_EEVEE"
    scene.eevee.taa_render_samples = 16
    scene.world = bpy.data.worlds.new("world")
    scene.world.use_nodes = True
    return scene.world.node_tree.nodes["Background"]


def project(scene, cam, objects):
    out = {}
    for obj in objects:
        v = world_to_camera_view(scene, cam, obj.matrix_world.translation)
        out[obj.name] = [round(v.x, 4), round(1 - v.y, 4)] if v.z > 0 else None
    return out


def export(path, animations=False):
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_cameras=True,
        export_yup=True,
        export_animations=animations,
        export_animation_mode="SCENE",
        export_force_sampling=True,
    )
