import math
import os

import bmesh
import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
BLEND = os.path.join(HERE, "engine.blend")

PART_IDS = ("v6", "turbo", "mguK", "energyStore", "electronics")
EXPLODE_BY = {
    "v6": (0.0, 0.0, 0.0),
    "turbo": (-0.30, 0.0, 0.20),
    "mguK": (0.0, 0.34, -0.10),
    "energyStore": (0.30, 0.0, -0.22),
    "electronics": (0.34, -0.06, 0.24),
}


def put(ob, part, tone="body"):
    ob.name = f"{part}:{tone}:{ob.name}"
    ob["part"] = part
    ob["tone"] = tone
    ob["explode"] = EXPLODE_BY[part]
    return ob


def finish(ob, bevel=0.0, seg=3, angle=35):
    bpy.context.view_layer.objects.active = ob
    if bevel:
        m = ob.modifiers.new("b", "BEVEL")
        m.width, m.segments, m.limit_method = bevel, seg, "ANGLE"
        bpy.ops.object.modifier_apply(modifier="b")
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle))
    return ob


def bake_xform(ob, M):
    if M is not None:
        ob.data.transform(M @ ob.matrix_world)
        ob.matrix_world = Matrix.Identity(4)
    return ob


def from_bm(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def box(name, x0, x1, y0, y1, z0, z1, bevel=0.008, M=None, seg=3):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts:
        v.co = Vector(((x0 + x1) / 2 + v.co.x * (x1 - x0), (y0 + y1) / 2 + v.co.y * (y1 - y0), (z0 + z1) / 2 + v.co.z * (z1 - z0)))
    ob = from_bm(name, bm)
    finish(ob, bevel, seg)
    return bake_xform(ob, M)


def prism(name, pts, x0, x1, bevel=0.01, M=None):
    bm = bmesh.new()
    a = [bm.verts.new((x0, y, z)) for y, z in pts]
    b = [bm.verts.new((x1, y, z)) for y, z in pts]
    n = len(pts)
    bm.faces.new(a[::-1])
    bm.faces.new(b)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((a[i], a[j], b[j], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = from_bm(name, bm)
    finish(ob, bevel)
    return bake_xform(ob, M)


def lathe(name, prof, base, axis, n=40, M=None):
    axis = Vector(axis).normalized()
    q = axis.to_track_quat("Z", "Y")
    bm = bmesh.new()
    rings = []
    for r, h in prof:
        ring = []
        for i in range(n):
            t = 2 * math.pi * i / n
            ring.append(bm.verts.new(Vector(base) + q @ Vector((r * math.cos(t), r * math.sin(t), h))))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((a[i], a[j], b[j], b[i]))
    bm.faces.new(rings[0][::-1])
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = from_bm(name, bm)
    finish(ob, 0, angle=50)
    return bake_xform(ob, M)


def cyl(name, p0, p1, r, M=None, n=40):
    d = Vector(p1) - Vector(p0)
    return lathe(name, [(r, 0), (r, d.length)], p0, d, n, M)


def tube(name, pts, r, radii=None, M=None):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions, cu.bevel_depth, cu.bevel_resolution, cu.use_fill_caps = "3D", r, 6, True
    sp = cu.splines.new("NURBS")
    sp.points.add(len(pts) - 1)
    for i, (p, q) in enumerate(zip(sp.points, pts)):
        p.co = (*q, 1)
        p.radius = radii[i] if radii else 1.0
    sp.order_u, sp.use_endpoint_u, sp.resolution_u = min(4, len(pts)), True, 28
    ob = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.selected_objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.ops.object.convert(target="MESH")
    ob = bpy.context.object
    ob.select_set(False)
    finish(ob, 0, angle=60)
    return bake_xform(ob, M)


def torus(name, c, axis, R, r):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=72, minor_segments=28, location=c)
    ob = bpy.context.object
    ob.name = name
    ob.rotation_euler = Vector(axis).to_track_quat("Z", "Y").to_euler()
    bpy.ops.object.transform_apply(rotation=True)
    return finish(ob, 0, angle=60)


def bank(side):
    M = Matrix.Rotation(math.radians(-45 * side), 4, "X")
    dx = 0.012 * side
    put(prism("block", [(-0.078, 0.02), (0.078, 0.02), (0.084, 0.215), (-0.084, 0.215)], 0.03 + dx, 0.46 + dx, 0.012, M), "v6")
    put(box("head", 0.015 + dx, 0.475 + dx, -0.098, 0.098, 0.212, 0.29, 0.01, M), "v6")
    put(box("head_gasket", 0.02 + dx, 0.47 + dx, -0.1, 0.1, 0.208, 0.218, 0.002, M), "v6", "dark")
    put(prism("cam_cover", [(-0.088, 0.286), (0.088, 0.286), (0.074, 0.33), (0.04, 0.348), (-0.04, 0.348), (-0.074, 0.33)], 0.025 + dx, 0.465 + dx, 0.012, M), "v6", "carbon")
    for x in (0.105, 0.245, 0.385):
        put(cyl("coil", (x + dx, 0, 0.345), (x + dx, 0, 0.372), 0.021, M), "v6", "dark")
        put(cyl("coil_cap", (x + dx, 0, 0.372), (x + dx, 0, 0.38), 0.015, M), "v6", "carbon")
    for x in (0.04, 0.45):
        for y in (-0.06, 0.06):
            put(cyl("cover_bolt", (x + dx, y, 0.33), (x + dx, y, 0.342), 0.007, M, 16), "v6", "dark")
    put(prism("cam_drive_cover", [(-0.09, 0.03), (0.09, 0.03), (0.1, 0.29), (0.07, 0.335), (-0.07, 0.335), (-0.1, 0.29)], 0.46 + dx, 0.5 + dx, 0.012, M), "v6", "carbon")
    put(cyl("chassis_stud", (0.5 + dx, 0, 0.25), (0.555 + dx, 0, 0.25), 0.011, M, 24), "v6", "dark")
    put(cyl("stud_boss", (0.5 + dx, 0, 0.25), (0.515 + dx, 0, 0.25), 0.024, M, 32), "v6", "metal")
    for x in (0.05, 0.175, 0.30, 0.425):
        put(box("rib", x - 0.006 + dx, x + 0.006 + dx, min(0.084 * side, 0.104 * side), max(0.084 * side, 0.104 * side), 0.05, 0.2, 0.002, M), "v6")
    ports = []
    for x in (0.105, 0.245, 0.385):
        ports.append((M @ Vector((x + dx, 0.098 * side, 0.255)), x))
        base = M @ Vector((x + dx, -0.10 * side, 0.25))
        lean = M.to_3x3() @ Vector((0, -0.75 * side, 1)).normalized()
        put(lathe("trumpet", [(0.026, 0), (0.026, 0.07), (0.029, 0.1), (0.036, 0.118), (0.041, 0.126), (0.039, 0.13), (0.03, 0.124), (0.022, 0.1)], base, lean, 40), "v6", "metal")
    for i, (p, x) in enumerate(ports):
        out = Vector((p.x, side * 0.30, p.z - 0.02))
        down = Vector((p.x - 0.07, side * (0.33 - 0.012 * i), 0.06 - 0.018 * i))
        run = Vector((0.06 - 0.03 * i, side * (0.30 - 0.03 * i), -0.005 - 0.006 * i))
        back = Vector((-0.04, side * 0.17, 0.05))
        put(tube("primary", [p, out, down, run, back, Vector((-0.085, side * 0.10, 0.10))], 0.0175), "v6", "metal")
    put(tube("collector", [(-0.06, side * 0.135, 0.075), (-0.09, side * 0.10, 0.10), (-0.115, side * 0.06, 0.13)], 0.032, [1.0, 0.85, 0.7]), "turbo", "metal")


def build():
    put(prism("crankcase", [(-0.12, -0.115), (0.12, -0.115), (0.16, -0.07), (0.168, 0.03), (0.07, 0.10), (-0.07, 0.10), (-0.168, 0.03), (-0.16, -0.07)], 0.0, 0.5, 0.016), "v6")
    put(prism("sump", [(-0.1, -0.15), (0.1, -0.15), (0.115, -0.11), (-0.115, -0.11)], 0.04, 0.45, 0.01), "v6", "carbon")
    put(cyl("scavenge_pump", (0.06, -0.15, -0.085), (0.42, -0.15, -0.085), 0.032), "v6", "metal")
    for x in (0.12, 0.24, 0.36):
        put(cyl("pump_ring", (x, -0.15, -0.085), (x + 0.012, -0.15, -0.085), 0.037), "v6", "dark")
    put(prism("front_cover", [(-0.12, -0.115), (0.12, -0.115), (0.15, -0.05), (0.15, 0.05), (0.07, 0.11), (-0.07, 0.11), (-0.15, 0.05), (-0.15, -0.05)], 0.5, 0.528, 0.012), "v6", "carbon")
    put(cyl("water_pump", (0.528, 0.0, 0.0), (0.552, 0.0, 0.0), 0.05, n=48), "v6", "metal")
    for y in (0.12, -0.12):
        put(cyl("chassis_stud", (0.528, y, -0.085), (0.58, y, -0.085), 0.011, n=24), "v6", "dark")
    put(prism("bell_flange", [(-0.14, -0.11), (0.14, -0.11), (0.17, 0.0), (0.12, 0.09), (-0.12, 0.09), (-0.17, 0.0)], -0.025, 0.0, 0.006), "v6", "carbon")
    for s in (1, -1):
        bank(s)
    put(prism("plenum_tub", [(-0.13, 0.16), (0.13, 0.16), (0.15, 0.26), (-0.15, 0.26)], 0.06, 0.44, 0.02), "v6", "carbon")

    T, C = Vector((-0.15, 0, 0.15)), Vector((-0.30, 0, 0.15))
    put(torus("turbine_scroll", T, (1, 0, 0), 0.058, 0.03), "turbo", "metal")
    put(cyl("turbine", T - Vector((0.028, 0, 0)), T + Vector((0.028, 0, 0)), 0.064), "turbo", "metal")
    put(cyl("turbine_outlet", T - Vector((0.028, 0, 0)), T - Vector((0.06, 0, 0)), 0.044), "turbo", "metal")
    put(cyl("bearing_housing", (-0.265, 0, 0.15), (-0.18, 0, 0.15), 0.034), "turbo", "dark")
    put(torus("compressor_scroll", C, (1, 0, 0), 0.07, 0.034), "turbo")
    put(cyl("compressor", C - Vector((0.03, 0, 0)), C + Vector((0.03, 0, 0)), 0.078), "turbo")
    put(lathe("compressor_inlet", [(0.05, 0), (0.05, 0.06), (0.056, 0.08), (0.066, 0.092), (0.064, 0.097), (0.05, 0.09)], C - Vector((0.028, 0, 0)), (-1, 0, 0)), "turbo")
    put(tube("boost_pipe", [(-0.30, 0.075, 0.19), (-0.30, 0.08, 0.30), (-0.24, 0.04, 0.35), (-0.10, 0.0, 0.34), (0.0, 0.0, 0.29), (0.06, 0.0, 0.26)], 0.036), "turbo", "carbon")
    put(tube("tailpipe", [(-0.21, 0.0, 0.15), (-0.26, -0.10, 0.10), (-0.38, -0.11, 0.11), (-0.50, -0.10, 0.16)], 0.04), "turbo", "metal")

    K0, K1 = Vector((0.18, 0.235, -0.055)), Vector((0.43, 0.235, -0.055))
    put(cyl("mguk_body", K0, K1, 0.07, n=56), "mguK")
    for x in (K0.x + 0.03, K1.x - 0.04):
        put(cyl("band", (x, K0.y, K0.z), (x + 0.01, K0.y, K0.z), 0.075, n=56), "mguK")
    put(cyl("mguk_end", K1, K1 + Vector((0.035, 0, 0)), 0.058, n=56), "mguK")
    put(cyl("mguk_cap", K0 - Vector((0.02, 0, 0)), K0, 0.06, n=56), "mguK")
    put(box("drive_housing", 0.43, 0.53, 0.12, 0.24, -0.11, 0.0, 0.012), "mguK")
    for z in (-0.03, -0.065):
        put(tube("phase_cable", [(0.36, 0.235, 0.012 + z * 0.2), (0.48, 0.23, 0.03 + z * 0.3), (0.62, 0.17, 0.02 + z), (0.74, 0.1, 0.02 + z * 0.2)], 0.01), "mguK", "dark")

    put(box("battery", 0.66, 1.18, -0.23, 0.23, -0.15, 0.0, 0.022), "energyStore")
    for x in (0.74, 0.84, 0.94, 1.04):
        put(box("cell_module", x, x + 0.08, -0.205, 0.205, -0.005, 0.02, 0.006), "energyStore", "carbon")
    put(cyl("coolant_in", (0.66, 0.15, -0.07), (0.62, 0.15, -0.07), 0.014), "energyStore", "metal")
    put(cyl("coolant_out", (0.66, -0.15, -0.07), (0.62, -0.15, -0.07), 0.014), "energyStore", "metal")

    put(box("ce_case", 0.74, 1.02, -0.17, 0.07, 0.03, 0.12, 0.014), "electronics")
    for y in (-0.15, -0.11, -0.07, -0.03, 0.01, 0.05):
        put(box("heat_fin", 0.76, 1.0, y - 0.006, y + 0.006, 0.12, 0.15, 0.003), "electronics", "carbon")
    for y in (-0.12, -0.05, 0.02):
        put(cyl("connector", (0.74, y, 0.075), (0.71, y, 0.075), 0.017), "electronics", "dark")


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    build()
    tris = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == "MESH")
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)
    print("built", BLEND, "objects", len(bpy.data.objects), "polys", tris)


main()
