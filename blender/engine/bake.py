import os
import sys

import bmesh
import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, ".out")
BLEND = os.path.join(HERE, "engine.blend")
PART_IDS = ("v6", "turbo", "mguK", "energyStore", "electronics")
SAMPLES = 256
GAIN = 2.0
MAX_EDGE = 0.035


def meshes():
    return [o for o in bpy.data.objects if o.type == "MESH" and "part" in o]


def refine(ob):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    for _ in range(4):
        long_edges = [e for e in bm.edges if e.calc_length() > MAX_EDGE]
        if not long_edges:
            break
        bmesh.ops.subdivide_edges(bm, edges=long_edges, cuts=1, use_grid_fill=True)
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()


def group_parts():
    by_key = {}
    for o in meshes():
        by_key.setdefault((o["part"], o["tone"]), []).append(o)
    parents = {}
    for pid in PART_IDS:
        empty = bpy.data.objects.new(f"part:{pid}", None)
        bpy.context.scene.collection.objects.link(empty)
        parents[pid] = empty
    joined = []
    for (pid, tone), objs in sorted(by_key.items()):
        bpy.ops.object.select_all(action="DESELECT")
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        if len(objs) > 1:
            bpy.ops.object.join()
        ob = bpy.context.active_object
        ob.name = f"{pid}_{tone}"
        ob.data.name = f"{pid}_{tone}"
        ob["part"] = pid
        ob["tone"] = tone
        ob.parent = parents[pid]
        refine(ob)
        joined.append(ob)
    bpy.context.view_layer.update()
    return list(parents.values()), joined


def white():
    m = bpy.data.materials.new("white")
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
    bsdf.inputs["Roughness"].default_value = 0.8
    bsdf.inputs["Specular IOR Level"].default_value = 0.18
    return m


def stage(objs):
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
    for o in objs:
        o.data.materials.clear()
        o.data.materials.append(mat)
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
    bpy.ops.mesh.primitive_plane_add(size=30, location=(0.3, 0, -0.155))
    ground = bpy.context.object
    ground.data.materials.append(mat)
    return sc, key, rim, ground


def once(sc, objs, name):
    for o in objs:
        layer = o.data.color_attributes.get(name) or o.data.color_attributes.new(name, "FLOAT_COLOR", "POINT")
        o.data.color_attributes.active_color = layer
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    sc.render.bake.target = "VERTEX_COLORS"
    sc.render.bake.use_pass_direct = True
    sc.render.bake.use_pass_indirect = True
    sc.render.bake.use_pass_color = False
    bpy.ops.object.bake(type="DIFFUSE")
    print("baked", name)


def bake(sc, objs):
    for side in ("", "_back"):
        once(sc, objs, "assembled" + side)
        for o in objs:
            o.data.flip_normals()
    for o in objs:
        front = o.data.color_attributes["assembled"].data
        back = o.data.color_attributes["assembled_back"].data
        for f, b in zip(front, back):
            f.color = tuple(max(x, y) for x, y in zip(f.color, b.color))
        o.data.color_attributes.remove(o.data.color_attributes["assembled_back"])


def pack(objs):
    peak = 0.0
    for o in objs:
        src = o.data.color_attributes["assembled"].data
        light = o.data.color_attributes.new("light", "BYTE_COLOR", "POINT")
        for i, out in enumerate(light.data):
            r = src[i].color[0]
            peak = max(peak, r)
            out.color = (min(r / GAIN, 1), 0, 0, 1)
        o.data.color_attributes.remove(o.data.color_attributes["assembled"])
        o.data.color_attributes.active_color = o.data.color_attributes["light"]
        o.data.color_attributes.render_color_index = o.data.color_attributes.active_color_index
        o.data.materials.clear()
    print("peak", round(peak, 3), "gain", GAIN)


def export(path, parents, objs, extras):
    for o in extras:
        bpy.data.objects.remove(o)
    bpy.ops.object.select_all(action="DESELECT")
    for o in parents + objs:
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
    bpy.ops.wm.open_mainfile(filepath=BLEND)
    os.makedirs(OUT, exist_ok=True)
    parents, objs = group_parts()
    sc, key, rim, ground = stage(objs)
    bake(sc, objs)
    pack(objs)
    export(sys.argv[sys.argv.index("--") + 1], parents, objs, (key, rim, ground))


main()
