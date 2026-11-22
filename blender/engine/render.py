import json
import math
import os
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, ".out")
BLEND = os.path.join(HERE, "engine.blend")
RIG = os.path.join(HERE, "..", "..", "src", "engine", "rig.json")

PALETTES = {
    "light": {"body": "#D6D4CD", "carbon": "#8F9298", "metal": "#A6A8AD", "dark": "#4A4D53"},
    "dark": {"body": "#5E6168", "carbon": "#3C3F45", "metal": "#7E8188", "dark": "#26282D"},
}
PURPLE = "#A43BFF"
LENS = 85
EXPLODED_CAM = {"target": Vector((0.42, 0.0, 0.02)), "d": 7.2, "az": 42, "el": 26, "res": (2880, 1800)}
BAND_CAM = {"target": Vector((0.42, 0.0, 0.06)), "d": 5.9, "az": 42, "el": 26, "res": (2880, 1620)}
ANCHOR = {
    "v6": Vector((0.30, 0.20, 0.36)),
    "turbo": Vector((-0.28, 0.0, 0.26)),
    "mguK": Vector((0.30, 0.25, 0.0)),
    "energyStore": Vector((1.10, 0.24, 0.0)),
    "electronics": Vector((0.88, -0.12, 0.17)),
}
EXPLODE_BY = {
    "v6": Vector((0.0, 0.0, 0.0)),
    "turbo": Vector((-0.30, 0.0, 0.20)),
    "mguK": Vector((0.0, 0.34, -0.10)),
    "energyStore": Vector((0.30, 0.0, -0.22)),
    "electronics": Vector((0.34, -0.06, 0.24)),
}
SHADOW = {"centre": (0.3, 0.0, -0.155), "size": (3.2, 2.2), "px": (1024, 704)}


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
    return [o for o in bpy.data.objects if o.type == "MESH" and "part" in o]


def clay():
    m = bpy.data.materials.new("clay")
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 0.8
    bsdf.inputs["Specular IOR Level"].default_value = 0.18
    info = nt.nodes.new("ShaderNodeObjectInfo")
    nt.links.new(info.outputs["Color"], bsdf.inputs["Base Color"])
    return m


def stage(ground_z):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for dv in prefs.devices:
        dv.use = True
    sc.cycles.device = "GPU"
    sc.cycles.samples = 32 if os.environ.get("PREVIEW") else 128
    sc.cycles.use_denoising = True
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.view_settings.view_transform = "Standard"
    mat = clay()
    for ob in meshes():
        ob.data.materials.clear()
        ob.data.materials.append(mat)
    world = bpy.data.worlds.new("w")
    sc.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (1, 1, 1, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.45
    key = bpy.data.objects.new("key", bpy.data.lights.new("key", "AREA"))
    key.data.size, key.data.energy = 3.5, 150
    key.location = (1.4, 1.5, 2.6)
    key.rotation_euler = (key.location - Vector((0.3, 0, 0))).to_track_quat("Z", "Y").to_euler()
    sc.collection.objects.link(key)
    rim = bpy.data.objects.new("rim", bpy.data.lights.new("rim", "AREA"))
    rim.data.size, rim.data.energy = 2.5, 40
    rim.location = (-1.6, -1.2, 1.4)
    rim.rotation_euler = (rim.location - Vector((0.3, 0, 0))).to_track_quat("Z", "Y").to_euler()
    sc.collection.objects.link(rim)
    bpy.ops.mesh.primitive_plane_add(size=30, location=(0.3, 0, ground_z))
    bpy.context.object.is_shadow_catcher = True
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    sc.collection.objects.link(cam)
    sc.camera = cam
    return sc, cam


def place(sc, cam, cfg):
    sc.render.resolution_x, sc.render.resolution_y = cfg["res"]
    cam.data.lens = LENS
    cam.location = orbit(cfg["target"], cfg["d"], cfg["az"], cfg["el"])
    cam.rotation_euler = (cfg["target"] - cam.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.view_layer.update()


def render(view, theme):
    palette = PALETTES[theme]
    exploded = view == "exploded"
    lit = "v6" if view == "band" else None
    for ob in meshes():
        if exploded:
            ob.location += Vector(ob["explode"])
        c = PURPLE if ob["part"] == lit and ob["tone"] != "dark" else palette[ob["tone"]]
        ob.color = (*lin(rgb(c)), 1)
    low = -0.455 if exploded else -0.155
    sc, cam = stage(low)
    place(sc, cam, EXPLODED_CAM if exploded else BAND_CAM)
    if os.environ.get("PREVIEW"):
        sc.render.resolution_percentage = 50
    tag = f"{view}-{theme}"
    sc.render.filepath = os.path.join(OUT, tag + ".png")
    bpy.ops.render.render(write_still=True)
    print("rendered", tag)


def shadow():
    for ob in meshes():
        ob.visible_camera = False
    sc, cam = stage(SHADOW["centre"][2])
    sc.render.resolution_x, sc.render.resolution_y = SHADOW["px"]
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = SHADOW["size"][0]
    cam.location = Vector((SHADOW["centre"][0], SHADOW["centre"][1], 6.0))
    cam.rotation_euler = (0, 0, 0)
    sc.render.filepath = os.path.join(OUT, "shadow-band.png")
    bpy.ops.render.render(write_still=True)
    print("rendered shadow-band")


def rig():
    sc = bpy.context.scene
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    sc.collection.objects.link(cam)
    sc.camera = cam
    place(sc, cam, EXPLODED_CAM)
    pins = {}
    for pid, pt in ANCHOR.items():
        q = world_to_camera_view(sc, cam, pt + EXPLODE_BY[pid])
        pins[pid] = [round(q.x, 4), round(1 - q.y, 4)]
    band_pos = orbit(BAND_CAM["target"], BAND_CAM["d"], BAND_CAM["az"], BAND_CAM["el"])
    data = {
        "lens": LENS,
        "band": {"position": gltf(band_pos), "target": gltf(BAND_CAM["target"])},
        "turn": [0, 1, 0],
        "pins": pins,
        "shadow": {"centre": gltf(Vector(SHADOW["centre"])), "size": list(SHADOW["size"]), "drop": 0},
    }
    os.makedirs(os.path.dirname(RIG), exist_ok=True)
    with open(RIG, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    print("rig", RIG)


def main():
    args = sys.argv[sys.argv.index("--") + 1 :]
    bpy.ops.wm.open_mainfile(filepath=BLEND)
    os.makedirs(OUT, exist_ok=True)
    if args[0] == "rig":
        rig()
    elif args[0] == "shadow":
        shadow()
    else:
        render(args[0], args[1])


main()
