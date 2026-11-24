import json
import math
import os
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, ".out")
PINS = os.path.join(HERE, "..", "..", "src", "fight", "pins.json")

PALETTES = {
    "light": {"body": "#D3D1CA", "tyre": "#2E3035", "rim": "#8A8D93", "road": "#BDBBB3", "line": "#111214", "edge": "#FFFFFF"},
    "dark": {"body": "#A6A9AF", "tyre": "#232428", "rim": "#7A7D84", "road": "#2A2C31", "line": "#F2F1EC", "edge": "#4A4D54"},
}
PURPLE = "#A43BFF"
CENTRE = 1.7
RADIUS = 15
HALF = 7.5
ROAD_EDGE = 0.35
AZ, EL, LENS = -150, 30, 70
MIRROR_X, AXLE_X, LANE = 2.35, 3.4, 1.25
VIEWS = {
    "switch": {"size": (2880, 1500), "dist": 80, "target": (6, 0), "attacker": 90, "defender": 92, "scale": 1.5},
    "switch-phone": {"size": (1170, 1260), "dist": 72, "target": (17, 2), "attacker": 90, "defender": 94, "scale": 1.9},
    "dive": {"size": (2880, 1900), "ortho": 9.4, "turn": 0},
    "dive-phone": {"size": (1170, 1260), "ortho": 9, "turn": -90},
}


def lin(h):
    c = (int(h[i : i + 2], 16) / 255 for i in (1, 3, 5))
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c)


def material(name, hex_=None, glow=False):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 0.85
    bsdf.inputs["Specular IOR Level"].default_value = 0.15
    if hex_ is None:
        info = nt.nodes.new("ShaderNodeObjectInfo")
        nt.links.new(info.outputs["Color"], bsdf.inputs["Base Color"])
    elif glow:
        bsdf.inputs["Base Color"].default_value = (0, 0, 0, 1)
        bsdf.inputs["Emission Color"].default_value = (*lin(hex_), 1)
        bsdf.inputs["Emission Strength"].default_value = 1
    else:
        bsdf.inputs["Base Color"].default_value = (*lin(hex_), 1)
    return m


def car(parts, clay, palette, x, y, deg, body, scale=1):
    place = Matrix.Translation((x, y, 0)) @ Matrix.Rotation(math.radians(deg), 4, "Z") @ Matrix.Scale(scale, 4) @ Matrix.Translation((-CENTRE, 0, 0))
    for o in parts:
        kind = o.get("kind")
        if kind == "pu":
            continue
        c = o.copy()
        c.data = o.data.copy()
        bpy.context.scene.collection.objects.link(c)
        c.data.materials.clear()
        c.data.materials.append(clay)
        c.color = (*lin(palette.get(kind, body) if kind in ("tyre", "rim") else body), 1)
        c.parent = None
        c.matrix_world = place @ o.matrix_world


def normal(pts, i):
    a, b = pts[max(0, i - 1)], pts[min(len(pts) - 1, i + 1)]
    d = Vector((b[0] - a[0], b[1] - a[1], 0)).normalized()
    return Vector((-d.y, d.x, 0))


def ribbon(name, pts, width, z, mat):
    verts, faces = [], []
    for i, p in enumerate(pts):
        n = normal(pts, i) * width / 2
        at = Vector((p[0], p[1], z))
        verts += [at + n, at - n]
        if i:
            faces.append((2 * i - 2, 2 * i - 1, 2 * i + 1, 2 * i))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(mat)
    bpy.context.scene.collection.objects.link(bpy.data.objects.new(name, mesh))


def bezier(p0, p1, p2, p3, n=60):
    return [tuple((1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t**3 * d for a, b, c, d in zip(p0, p1, p2, p3)) for t in (i / n for i in range(n + 1))]


def chain(*curves):
    return [p for i, c in enumerate(curves) for p in (bezier(*c) if i == len(curves) - 1 else bezier(*c)[:-1])]


ATTACKER = chain(((-60, 11), (-10, 10.5), (8, 11), (14, 3)), ((14, 3), (20, -8), (13, -20), (-4, -20.6)), ((-4, -20.6), (-20, -21), (-40, -20), (-60, -19)))
DEFENDER = chain(((-60, 20), (-12, 20.6), (14, 22), (18.2, 6)), ((18.2, 6), (20, -5), (10, -10), (0, -11)), ((0, -11), (-16, -12), (-40, -13), (-60, -13.5)))


def heading(pts, i):
    a, b = pts[max(0, i - 1)], pts[min(len(pts) - 1, i + 1)]
    return math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))


def hairpin(parts, clay, palette, view):
    centre = [(-70 + i * 2, RADIUS) for i in range(35)]
    centre += [(RADIUS * math.sin(a), RADIUS * math.cos(a)) for a in (math.pi * i / 60 for i in range(61))]
    centre += [(-i * 2, -RADIUS) for i in range(1, 36)]
    ribbon("road", centre, 2 * HALF, 0, material("road", palette["road"]))
    paint = material("edge", palette["edge"])
    for off in (HALF - ROAD_EDGE, ROAD_EDGE - HALF):
        ribbon("edge", [(p[0] + n.x * off, p[1] + n.y * off) for p, n in ((p, normal(centre, i)) for i, p in enumerate(centre))], 0.25, 0.012, paint)
    ribbon("attacker", ATTACKER, 0.42, 0.02, material("attacker", palette["line"]))
    ribbon("defender", DEFENDER, 0.6, 0.024, material("defender", PURPLE, True))
    for pts, i, body in ((ATTACKER, view["attacker"], palette["body"]), (DEFENDER, view["defender"], PURPLE)):
        car(parts, clay, palette, *pts[i][:2], heading(pts, i), body, view["scale"])


def level(parts, clay, palette):
    ribbon("road", [(-30, 0), (30, 0)], 40, 0, material("road", palette["road"]))
    car(parts, clay, palette, CENTRE, LANE, 0, PURPLE)
    car(parts, clay, palette, MIRROR_X - AXLE_X + CENTRE, -LANE, 0, palette["body"])
    ribbon("level", [(MIRROR_X, -3.4), (MIRROR_X, 3.4)], 0.07, 0.015, material("level", palette["line"], True))


def camera(view):
    sc = bpy.context.scene
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    sc.collection.objects.link(cam)
    sc.camera = cam
    cam.data.clip_end = 500
    sc.render.resolution_x, sc.render.resolution_y = view["size"]
    if "ortho" in view:
        cam.data.type = "ORTHO"
        cam.data.ortho_scale = view["ortho"]
        cam.location = (1.2, 0, 30)
        cam.rotation_euler = (0, 0, math.radians(view["turn"]))
        return cam
    target = Vector((*view["target"], 0))
    a, e = math.radians(AZ), math.radians(EL)
    cam.data.lens = LENS
    cam.location = target + view["dist"] * Vector((math.cos(e) * math.cos(a), math.cos(e) * math.sin(a), math.sin(e)))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    return cam


def light(view):
    sc = bpy.context.scene
    flat = "ortho" in view
    at, size, energy = (Vector((4, -5, 9)), 9, 900) if flat else (Vector((-10, 30, 45)), 26, 15000)
    target = Vector((1.2, 0, 0)) if flat else Vector((*view["target"], 0))
    key = bpy.data.objects.new("key", bpy.data.lights.new("key", "AREA"))
    key.data.size, key.data.energy = size, energy
    key.location = at
    key.rotation_euler = (at - target).to_track_quat("Z", "Y").to_euler()
    sc.collection.objects.link(key)
    world = bpy.data.worlds.new("w")
    sc.world = world
    world.use_nodes = True
    background = world.node_tree.nodes["Background"]
    background.inputs["Color"].default_value = (1, 1, 1, 1)
    background.inputs["Strength"].default_value = 0.5


def render(name, theme):
    view, palette = VIEWS[name], PALETTES[theme]
    bpy.ops.wm.open_mainfile(filepath=os.path.join(HERE, "car.blend"))
    sc = bpy.context.scene
    parts = [o for o in bpy.data.objects if o.type == "MESH"]
    clay = material("clay")
    if "ortho" in view:
        level(parts, clay, palette)
    else:
        hairpin(parts, clay, palette, view)
    for o in parts:
        o.hide_render = True
    camera(view)
    light(view)
    sc.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for d in prefs.devices:
        d.use = True
    sc.cycles.device = "GPU"
    sc.cycles.samples = 128
    sc.cycles.use_denoising = True
    sc.render.film_transparent = True
    sc.view_settings.view_transform = "Standard"
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.render.filepath = os.path.join(OUT, f"{name}-{theme}.png")
    bpy.ops.render.render(write_still=True)
    print("rendered", name, theme)


def marks(view):
    if "ortho" in view:
        return {"mirror": Vector((MIRROR_X, LANE + 0.65, 0.8)), "axle": Vector((MIRROR_X, -LANE - 0.85, 0.4))}
    a, d = ATTACKER[view["attacker"]], DEFENDER[view["defender"]]
    return {"att": Vector((*a, 1)), "def": Vector((*d, 1)), "dive": Vector((*ATTACKER[45], 0.05)), "wide": Vector((*DEFENDER[52], 0.05))}


def pins():
    out = {}
    for name, view in VIEWS.items():
        bpy.ops.wm.read_factory_settings(use_empty=True)
        cam = camera(view)
        bpy.context.view_layer.update()
        key = name.replace("-phone", "Phone")
        out[key] = {k: [round(q.x, 4), round(1 - q.y, 4)] for k, q in ((k, world_to_camera_view(bpy.context.scene, cam, p)) for k, p in marks(view).items())}
    with open(PINS, "w") as f:
        json.dump(out, f, indent=2)
        f.write("\n")
    print("rig", PINS)


args = sys.argv[sys.argv.index("--") + 1 :]
os.makedirs(OUT, exist_ok=True)
if args[0] == "pins":
    pins()
else:
    render(args[0], args[1])
