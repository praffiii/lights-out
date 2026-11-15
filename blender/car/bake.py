import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, ".out")
SAMPLES = 256
GAIN = 2.0
POSES = ("assembled", "exploded")
VISIBILITY = ("visible_camera", "visible_diffuse", "visible_glossy", "visible_shadow", "visible_transmission", "visible_volume_scatter")


def meshes():
    return [o for o in bpy.data.objects if o.type == "MESH" and "part" in o]


def white():
    m = bpy.data.materials.new("white")
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
    bsdf.inputs["Roughness"].default_value = 0.85
    bsdf.inputs["Specular IOR Level"].default_value = 0.15
    return m


def stage():
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for d in prefs.devices:
        d.use = True
    sc.cycles.device = "GPU"
    sc.cycles.samples = SAMPLES
    mat = white()
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
    bpy.ops.mesh.primitive_plane_add(size=40, location=(1.7, 0, 0))
    ground = bpy.context.object
    ground.data.materials.append(mat)
    return sc, key, ground


def bake(sc, pose):
    for side in ("", "_back"):
        once(sc, pose + side)
        for o in meshes():
            o.data.flip_normals()
    for o in meshes():
        front, back = (o.data.color_attributes[pose + side].data for side in ("", "_back"))
        for f, b in zip(front, back):
            f.color = tuple(max(x, y) for x, y in zip(f.color, b.color))
        o.data.color_attributes.remove(o.data.color_attributes[pose + "_back"])


def once(sc, pose):
    for o in meshes():
        layer = o.data.color_attributes.get(pose) or o.data.color_attributes.new(pose, "FLOAT_COLOR", "POINT")
        o.data.color_attributes.active_color = layer
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes():
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes()[0]
    sc.render.bake.target = "VERTEX_COLORS"
    sc.render.bake.use_pass_direct = True
    sc.render.bake.use_pass_indirect = True
    sc.render.bake.use_pass_color = False
    bpy.ops.object.bake(type="DIFFUSE")
    print("baked", pose)


def explode(sign, ground):
    for o in meshes():
        o.location += sign * Vector(o["offset"])
        if o["part"] == "suspension":
            for v in VISIBILITY:
                setattr(o, v, sign < 0)
    ground.location.z = -0.5 if sign > 0 else 0
    bpy.context.view_layer.update()


def pack():
    peak = 0.0
    for o in meshes():
        a, b = (o.data.color_attributes[p].data for p in POSES)
        light = o.data.color_attributes.new("light", "BYTE_COLOR", "POINT")
        for i, out in enumerate(light.data):
            r, g = a[i].color[0], b[i].color[0]
            peak = max(peak, r, g)
            out.color = (min(r / GAIN, 1), min(g / GAIN, 1), 0, 1)
        for p in POSES:
            o.data.color_attributes.remove(o.data.color_attributes[p])
        o.data.color_attributes.active_color = o.data.color_attributes["light"]
        o.data.color_attributes.render_color_index = o.data.color_attributes.active_color_index
        o.data.materials.clear()
    print("peak", round(peak, 3), "gain", GAIN)


def pivots():
    out = []
    for o in [m for m in meshes() if m.get("role") == "flap"]:
        name = o.name
        o.name = name + "_mesh"
        hinge = bpy.data.objects.new(name, None)
        bpy.context.scene.collection.objects.link(hinge)
        hinge.matrix_world = o.matrix_world.copy()
        world = o.matrix_world.copy()
        o.parent = hinge
        o.matrix_world = world
        out.append(hinge)
    bpy.context.view_layer.update()
    return out


def export(path, key, ground):
    bpy.data.objects.remove(key)
    bpy.data.objects.remove(ground)
    hinges = pivots()
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes() + hinges:
        o.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_normals=False,
        export_texcoords=False,
        export_materials="NONE",
        export_vertex_color="ACTIVE",
        export_active_vertex_color_when_no_material=True,
        export_all_vertex_colors=False,
        export_yup=True,
        export_animations=False,
        export_image_format="NONE",
    )
    print("exported", path)


def main():
    bpy.ops.wm.open_mainfile(filepath=os.path.join(HERE, "car.blend"))
    os.makedirs(OUT, exist_ok=True)
    sc, key, ground = stage()
    bake(sc, "assembled")
    explode(1, ground)
    bake(sc, "exploded")
    explode(-1, ground)
    pack()
    export(sys.argv[sys.argv.index("--") + 1], key, ground)


main()
