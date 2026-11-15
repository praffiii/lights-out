import json
import math
import os
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, ".out")
RIG = os.path.join(HERE, "..", "..", "src", "car", "parts.json")

PALETTES = {
    "light": {"body": "#D3D1CA", "tyre": "#2E3035", "rim": "#8A8D93", "pu": "#9C9EA4"},
    "dark": {"body": "#5A5D64", "tyre": "#232428", "rim": "#7A7D84", "pu": "#7A7D84"},
}
PURPLE = "#A43BFF"
ORDER = ["frontWing", "survivalCell", "halo", "sidepods", "floor", "powerUnit", "rearWing", "tyres"]
LENS = 85
OVERVIEW = {"target": Vector((1.75, 0, 0.45)), "d": 19.0, "az": 38, "el": 25}
PHONE_D = 17.0
PART_PULL = 0.55
PART_D = 0.72
SIDE = {"target": Vector((1.85, 0, 0.55)), "d": 12.0, "el": 9, "scale": 6.0}
TOP_SCALE = 6.2
TOP_X = 1.85
WHEELBASE = 3.4
WIDTH = 1.9


def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))


def lin(c):
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c)


def gltf(v):
    return [round(v.x, 4), round(v.z, 4), round(-v.y, 4)]


def orbit(target, d, az, el):
    az, el = math.radians(az), math.radians(el)
    return target + Vector((d * math.cos(el) * math.cos(az), d * math.cos(el) * math.sin(az), d * math.sin(el)))


def meshes():
    return [o for o in bpy.data.objects if o.type == "MESH"]


def centre(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    return sum(pts, Vector()) / len(pts)


def top_at(objs, x, y, r=0.08):
    best = None
    for o in objs:
        for v in o.data.vertices:
            p = o.matrix_world @ v.co
            if abs(p.x - x) < r and abs(p.y - y) < r and (best is None or p.z > best.z):
                best = p.copy()
    return best


def outer_at(objs, x, r=0.08):
    pts = [o.matrix_world @ v.co for o in objs for v in o.data.vertices]
    return max((p for p in pts if abs(p.x - x) < r), key=lambda p: p.y).copy()


def parts():
    out = {}
    for o in meshes():
        out.setdefault(o["part"], []).append(o)
    return out


def left(objs):
    return [o for o in objs if not o.name.endswith("_R") and "_R_" not in o.name]


def anchors(by):
    found = {
        "frontWing": top_at([o for o in by["frontWing"] if o.get("role") == "body"], 4.2, 0.45),
        "survivalCell": top_at(by["survivalCell"], 2.9, 0.0),
        "halo": max((o.matrix_world @ v.co for o in by["halo"] for v in o.data.vertices), key=lambda p: p.z).copy(),
        "sidepods": top_at(left([o for o in by["sidepods"] if o.get("kind") != "cover"]), 1.6, 0.6),
        "floor": outer_at(by["floor"], 1.4),
        "powerUnit": Vector((0.55, 0.11, 0.48)),
        "rearWing": top_at([o for o in by["rearWing"] if o.get("role") != "endplate"], -0.6, 0.3),
        "tyres": outer_at([o for o in left(by["tyres"]) if o.get("kind") == "tyre"], 3.4),
    }
    for k, v in found.items():
        assert v is not None, k
    return found


def explode():
    for o in meshes():
        o.location += Vector(o["offset"])
    bpy.context.view_layer.update()


def open_flaps():
    for o in meshes():
        if o.get("role") == "flap":
            o.matrix_world = o.matrix_world @ Matrix.Rotation(math.radians(o["open_deg"]), 4, "Y")


def colour(o, palette, lit):
    kind = o.get("kind")
    if o.get("role") == "flap" and lit:
        c = PURPLE
    elif kind == "tyre":
        c = palette["tyre"]
    elif kind == "rim":
        c = palette["rim"]
    elif kind == "pu":
        c = palette["pu"]
    else:
        c = palette["body"]
    o.color = (*lin(rgb(c)), 1)


def clay():
    m = bpy.data.materials.new("clay")
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 0.85
    bsdf.inputs["Specular IOR Level"].default_value = 0.15
    info = nt.nodes.new("ShaderNodeObjectInfo")
    nt.links.new(info.outputs["Color"], bsdf.inputs["Base Color"])
    return m


def stage(ground_z):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for d in prefs.devices:
        d.use = True
    sc.cycles.device = "GPU"
    sc.cycles.samples = 32 if os.environ.get("PREVIEW") else 96
    sc.cycles.use_denoising = True
    sc.render.film_transparent = True
    sc.view_settings.view_transform = "Standard"
    mat = clay()
    for o in meshes():
        o.data.materials.clear()
        o.data.materials.append(mat)
    world = bpy.data.worlds.new("w")
    sc.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (1, 1, 1, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.42
    key = bpy.data.objects.new("key", bpy.data.lights.new("key", "AREA"))
    key.data.size, key.data.energy = 10.0, 650
    key.location = (3.5, 2.5, 6.0)
    key.rotation_euler = (key.location - Vector((1.7, 0, 0))).to_track_quat("Z", "Y").to_euler()
    sc.collection.objects.link(key)
    bpy.ops.mesh.primitive_plane_add(size=40, location=(1.7, 0, ground_z))
    bpy.context.object.is_shadow_catcher = True
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    sc.collection.objects.link(cam)
    sc.camera = cam
    return sc, cam


def aim(cam, position, target):
    cam.location = position
    cam.rotation_euler = (target - position).to_track_quat("-Z", "Y").to_euler()


def write(sc, name):
    if os.environ.get("PREVIEW"):
        sc.render.resolution_percentage = 50
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.render.filepath = os.path.join(OUT, name + ".png")
    bpy.ops.render.render(write_still=True)
    print("rendered", name)


def frame(view, sc, cam):
    cam.data.lens = LENS
    if view.startswith("exploded"):
        phone = view == "exploded-phone"
        sc.render.resolution_x, sc.render.resolution_y = (1800, 1500) if phone else (2880, 1800)
        aim(cam, orbit(OVERVIEW["target"], PHONE_D if phone else OVERVIEW["d"], OVERVIEW["az"], OVERVIEW["el"]), OVERVIEW["target"])
    elif view.startswith("side"):
        sc.render.resolution_x, sc.render.resolution_y = 2880, 900
        cam.data.type = "ORTHO"
        cam.data.ortho_scale = SIDE["scale"]
        aim(cam, orbit(SIDE["target"], SIDE["d"], 90, SIDE["el"]), SIDE["target"])
    else:
        phone = view == "top-phone"
        sc.render.resolution_x, sc.render.resolution_y = (1300, 2880) if phone else (2880, 1300)
        cam.data.type = "ORTHO"
        cam.data.ortho_scale = TOP_SCALE
        cam.location = Vector((TOP_X, 0, 12))
        cam.rotation_euler = (0, 0, -math.pi / 2 if phone else math.pi)


def render(view, theme):
    palette = PALETTES[theme]
    if view.startswith("exploded"):
        explode()
    if view == "side":
        open_flaps()
    for o in meshes():
        colour(o, palette, view.startswith("side"))
        o.hide_render = (view.startswith("exploded") and o["part"] == "suspension") or (view.startswith("side") and o["part"] == "rearWing" and o.get("role") == "endplate")
    sc, cam = stage(-0.5 if view.startswith("exploded") else 0)
    frame(view, sc, cam)
    write(sc, f"{view}-{theme}")


def pins(view, marks):
    sc = bpy.context.scene
    cam = bpy.data.objects.new(view, bpy.data.cameras.new(view))
    sc.collection.objects.link(cam)
    frame(view, sc, cam)
    bpy.context.view_layer.update()
    return {pid: [round(c, 4) for c in (lambda q: (q.x, 1 - q.y))(world_to_camera_view(sc, cam, at))] for pid, at in marks.items()}


def top_dims():
    short = TOP_SCALE * 1300 / 2880
    along = sorted(round(0.5 - (x - TOP_X) / TOP_SCALE, 4) for x in (0.0, WHEELBASE))
    across = [round(0.5 - WIDTH / 2 / short, 4), round(0.5 + WIDTH / 2 / short, 4)]
    return {"along": along, "across": across}


def rig():
    by = parts()
    marks = {pid: at + Vector(next(o for o in left(by[pid]) if o.get("kind") != "cover")["offset"]) for pid, at in anchors(by).items()}
    explode()
    t, d = OVERVIEW["target"], OVERVIEW["d"]
    framings = []
    for pid in ORDER:
        shown = [o for o in by[pid] if o.get("kind") != "cover"] or by[pid]
        target = t.lerp(centre(shown), PART_PULL)
        framings.append({"id": pid, "anchor": gltf(marks[pid]), "camera": {"position": gltf(orbit(target, d * PART_D, OVERVIEW["az"], OVERVIEW["el"])), "target": gltf(target)}})
    nodes = [{"name": o.name, "part": o["part"], "offset": gltf(Vector(o["offset"]))} for o in sorted(meshes(), key=lambda o: o.name)]
    flaps = [{"node": o.name, "axis": gltf(Vector((0, 1, 0))), "angle": round(math.radians(o["open_deg"]), 4)} for o in sorted(meshes(), key=lambda o: o.name) if o.get("role") == "flap"]
    data = {
        "lens": LENS,
        "assembled": {"position": gltf(orbit(t, d, OVERVIEW["az"], OVERVIEW["el"])), "target": gltf(t)},
        "side": {"position": gltf(orbit(SIDE["target"], SIDE["d"], 90, SIDE["el"])), "target": gltf(SIDE["target"]), "scale": SIDE["scale"]},
        "parts": framings,
        "posters": {"exploded": pins("exploded", marks), "explodedPhone": pins("exploded-phone", marks)},
        "top": top_dims(),
        "nodes": nodes,
        "hidden": ["suspension"],
        "flaps": flaps,
    }
    with open(RIG, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    print("rig", RIG)


def main():
    args = sys.argv[sys.argv.index("--") + 1 :]
    bpy.ops.wm.open_mainfile(filepath=os.path.join(HERE, "car.blend"))
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(os.path.dirname(RIG), exist_ok=True)
    if args[0] == "rig":
        rig()
    else:
        render(args[0], args[1])


main()
