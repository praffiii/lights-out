import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[sys.argv.index("--") + 1]
OUT = os.path.join(HERE, "car.blend")

S = 1 / 2.156
REAR_AXLE_Y = 3.76

IDS = {
    "Front wing": "frontWing",
    "Survival cell": "survivalCell",
    "Halo": "halo",
    "Sidepods": "sidepods",
    "Engine cover": "sidepods",
    "Floor": "floor",
    "Power unit": "powerUnit",
    "Rear wing": "rearWing",
    "Tyres": "tyres",
    "Suspension": "suspension",
}

EXPLODE_BY = {
    "frontWing": (0.75, 0, 0),
    "survivalCell": (0, 0, 0),
    "halo": (0, 0, 0.6),
    "cover": (0, 0, 0.85),
    "powerUnit": (0, 0, 0.35),
    "sidepods": (0, 0.55, 0.12),
    "floor": (0, 0, -0.45),
    "rearWing": (-0.75, 0, 0.35),
    "tyres": (0, 0.55, 0),
    "suspension": (0, 0, 0),
}

OPEN_DEG = {"frontWing": -15.0, "rearWing": -35.0}

KEEP = {
    "frontWing": 0.7,
    "survivalCell": 0.35,
    "halo": 0.8,
    "sidepods": 0.4,
    "floor": 0.3,
    "powerUnit": 1.0,
    "rearWing": 0.7,
    "tyres": 0.35,
    "suspension": 0.4,
}


def select(objs, active=None):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = active or objs[0]


def edit(o, *ops):
    select([o])
    bpy.ops.object.mode_set(mode="EDIT")
    for op in ops:
        op()
    bpy.ops.object.mode_set(mode="OBJECT")


def to_frame():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    bpy.ops.import_scene.gltf(filepath=SRC)
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    m = Matrix.Translation((REAR_AXLE_Y * S, 0, 0)) @ Matrix.Rotation(math.pi / 2, 4, "Z") @ Matrix.Scale(S, 4)
    for o in meshes:
        mw = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = m @ mw
    for o in [o for o in bpy.data.objects if o.type != "MESH"]:
        bpy.data.objects.remove(o)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return meshes


def split(objs):
    out = []
    for o in objs:
        edit(o, lambda: bpy.ops.mesh.separate(type="LOOSE"))
        out += list(bpy.context.selected_objects)
    return out


def box(o):
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi, (lo + hi) / 2, hi - lo


def in_sidepod(c):
    return 0.28 < abs(c.y) < 0.8 and -0.05 < c.x < 2.65 and 0.2 < c.z < 0.66


def bodywork(c):
    if in_sidepod(c):
        return "Sidepods"
    if -0.65 < c.x < 1.8 and c.z > 0.45 and abs(c.y) < 0.36:
        return "Engine cover"
    return "Survival cell"


def classify(lo, hi, c, d, src):
    if src == "Front wing" and c.x > 3.5:
        return "Front wing"
    if src == "Rear wing":
        return "Rear wing"
    ay = abs(c.y)
    if sorted(d)[1] < 0.02 and max(d) > 0.06:
        return "Suspension"
    near_axle = min(abs(c.x - 3.4), abs(c.x)) < 0.4
    if min(abs(c.x - 3.4), abs(c.x)) < 0.45 and d.y > 0.2 and 0.25 < ay < 0.7 and 0.15 < c.z < 0.65:
        return "Suspension"
    if ay > 0.5 and near_axle and 0.2 < c.z < 0.65:
        return "Tyres"
    if -0.75 < c.x < 2.95 and ((c.z < 0.21 and d.z < 0.32) or (lo.z < 0.13 and hi.z < 0.5 and ay > 0.4)):
        return "Floor"
    if ay < 0.16 and c.z > 0.74 and 1.65 < c.x < 2.75 and d.x < 1.2:
        return "Halo"
    return bodywork(c)


def islands(bm):
    seen = [False] * len(bm.faces)
    for f0 in bm.faces:
        if seen[f0.index]:
            continue
        isl, stack = [], [f0]
        seen[f0.index] = True
        while stack:
            f = stack.pop()
            isl.append(f)
            for e in f.edges:
                for g in e.link_faces:
                    if not seen[g.index]:
                        seen[g.index] = True
                        stack.append(g)
        yield isl


def body_labels(objs):
    out = []
    for o in objs:
        n = o.name
        src = "Front wing" if n.startswith(("Front wing", "NoseConnection")) else "Rear wing" if n.startswith("Rear wing") else "Body"
        bm = bmesh.new()
        bm.from_mesh(o.data)
        bm.faces.ensure_lookup_table()
        labels = [None] * len(bm.faces)
        for isl in islands(bm):
            vs = {v.co.copy().freeze() for f in isl for v in f.verts}
            lo = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
            hi = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
            c, d = (lo + hi) / 2, hi - lo
            part = classify(lo, hi, c, d, src)
            per_face = part in ("Sidepods", "Engine cover", "Survival cell") and len(isl) < 500
            for f in isl:
                fc = f.calc_center_median()
                p = part
                if per_face and in_sidepod(fc):
                    p = "Sidepods"
                elif per_face and part == "Sidepods":
                    p = "Survival cell"
                y = fc.y if per_face else c.y
                labels[f.index] = (p, ("L" if y >= 0 else "R") if p in ("Tyres", "Sidepods") else "")
        out.append((o, labels))
        bm.free()
    return out


def split_by(o, labels):
    keys = sorted(set(labels))
    o.data.materials.clear()
    for k in keys:
        o.data.materials.append(bpy.data.materials.get(str(k)) or bpy.data.materials.new(str(k)))
    for p in o.data.polygons:
        p.material_index = keys.index(labels[p.index])
    edit(o, lambda: bpy.ops.mesh.separate(type="MATERIAL"))
    by_name = {str(k): k for k in keys}
    return [(by_name[s.material_slots[s.data.polygons[0].material_index].material.name], s) for s in bpy.context.selected_objects if len(s.data.polygons)]


def join(objs, name):
    select(objs)
    if len(objs) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    ob.data.name = name
    return ob


def tag(ob, part, offset, **props):
    ob["part"] = part
    ob["offset"] = offset
    for k, v in props.items():
        ob[k] = v


def side_offset(key, side):
    x, y, z = EXPLODE_BY[key]
    return (x, -y if side == "R" else y, z)


def wing_roles(ob):
    part = ob["part"]
    edit(
        ob,
        lambda: bpy.ops.mesh.select_all(action="SELECT"),
        lambda: bpy.ops.mesh.remove_doubles(threshold=0.0008),
        lambda: bpy.ops.mesh.separate(type="LOOSE"),
    )
    roles = {}
    for o in list(bpy.context.selected_objects):
        lo, hi, c, d = box(o)
        if part == "rearWing":
            role = "flap" if (d.y > 0.9 and lo.x < -0.6) or (abs(c.y) < 0.01 and c.z > 0.82 and hi.x < -0.43) else "endplate" if d.y < 0.12 and abs(c.y) > 0.4 else "pylon" if c.z < 0.4 or d.y < 0.04 else "body"
        else:
            role = "endplate" if d.y < 0.5 and abs(c.y) > 0.3 and d.z > 0.3 else "flap" if 0.4 < d.y < 0.55 and d.x > 0.18 else "body"
        key = (role, round(c.x, 1), "L" if c.y >= 0 else "R") if role == "flap" and part == "frontWing" else (role,)
        roles.setdefault(key, []).append(o)
    flaps = 0
    for key, objs in sorted(roles.items(), key=lambda kv: str(kv[0])):
        role = key[0]
        if role == "flap":
            flaps += 1
        name = f"{part}_{role}{flaps}" if role == "flap" else f"{part}_{role}"
        j = join(objs, name)
        tag(j, part, EXPLODE_BY[part], role=role)
        if role == "pylon":
            j["plain"] = True
        if role != "endplate":
            edit(j, lambda: bpy.ops.mesh.select_all(action="SELECT"), lambda: bpy.ops.mesh.fill_holes(sides=0))
        if role == "flap":
            vs = [v.co for v in j.data.vertices]
            lead = max(vs, key=lambda v: v.x) if part == "frontWing" else max((v for v in vs if abs(v.y) > 0.3), key=lambda v: v.x)
            pivot = Vector((lead.x, box(j)[2].y, lead.z))
            bpy.context.scene.cursor.location = pivot
            select([j])
            bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
            j["open_deg"] = OPEN_DEG[part]


def power_unit():
    bm = bmesh.new()

    def boxm(x0, x1, y0, y1, z0, z1):
        bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.LocRotScale(Vector(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)), None, Vector((x1 - x0, y1 - y0, z1 - z0))))

    boxm(0.15, 0.90, -0.12, 0.12, 0.12, 0.34)
    for s in (1, -1):
        m = Matrix.Translation((0.52, s * 0.11, 0.40)) @ Matrix.Rotation(math.radians(-30 * s), 4, "X") @ Matrix.Diagonal((0.72, 0.14, 0.15, 1))
        bmesh.ops.create_cube(bm, size=1.0, matrix=m)
    bmesh.ops.create_cone(bm, segments=32, radius1=0.09, radius2=0.09, depth=0.15, cap_ends=True, matrix=Matrix.Translation((0.98, 0, 0.38)) @ Matrix.Rotation(math.pi / 2, 4, "Y"))
    bmesh.ops.create_cone(bm, segments=32, radius1=0.06, radius2=0.06, depth=0.18, cap_ends=True, matrix=Matrix.Translation((0.30, 0.10, 0.17)) @ Matrix.Rotation(math.pi / 2, 4, "Y"))
    boxm(1.0, 1.32, -0.22, 0.22, 0.10, 0.28)
    bmesh.ops.bevel(bm, geom=bm.edges[:], offset=0.012, segments=2, affect="EDGES")
    me = bpy.data.meshes.new("powerUnit")
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new("powerUnit", me)
    bpy.context.collection.objects.link(ob)
    tag(ob, "powerUnit", EXPLODE_BY["powerUnit"], kind="pu")
    return ob


def slim(ob):
    keep = KEEP[ob["part"]]
    if keep >= 1 or ob.get("role") in ("flap", "endplate"):
        return
    mod = ob.modifiers.new("slim", "DECIMATE")
    mod.ratio = keep
    mod.use_collapse_triangulate = True
    select([ob])
    bpy.ops.object.modifier_apply(modifier="slim")


def triangles(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


def main():
    meshes = to_frame()
    wheels = [o for o in meshes if o.name.startswith(("Wheels", "WheelCovers"))]
    groups = {}
    for o, labels in body_labels([o for o in meshes if o not in wheels]):
        for (part, side), piece in split_by(o, labels):
            groups.setdefault((part, side, "rim" if part == "Tyres" else ""), []).append(piece)
    for o in split(wheels):
        side = "L" if box(o)[2].y >= 0 else "R"
        groups.setdefault(("Tyres", side, "tyre" if o.name.startswith("Wheels") else "rim"), []).append(o)
    for (label, side, kind), objs in sorted(groups.items()):
        part = IDS[label]
        cover = label == "Engine cover"
        name = "_".join(x for x in (part, "cover" if cover else "", side, kind) if x)
        ob = join(objs, name)
        tag(ob, part, EXPLODE_BY["cover"] if cover else side_offset(part, side))
        if kind:
            ob["kind"] = kind
        if cover:
            ob["kind"] = "cover"
        for p in ob.data.polygons:
            p.use_smooth = True
    for name in ("frontWing", "rearWing"):
        wing_roles(bpy.data.objects[name])
    power_unit()
    for o in bpy.data.objects:
        o.data.materials.clear()
    for o in list(bpy.data.objects):
        slim(o)
    for o in sorted(bpy.data.objects, key=lambda o: o.name):
        print("PART", o.name, o["part"], triangles(o))
    print("TRIANGLES", sum(triangles(o) for o in bpy.data.objects))
    bpy.ops.wm.save_as_mainfile(filepath=OUT)


main()
