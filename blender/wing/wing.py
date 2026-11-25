import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

ARGS = sys.argv[sys.argv.index("--") + 1 :]
OUT, WIDTH, HEIGHT, SAMPLES = ARGS[0], int(ARGS[1]), int(ARGS[2]), int(ARGS[3])
ANGLES = [float(a) for a in ARGS[4:]]

SHUT = math.radians(56)
PIVOT = (0.375, 0.218)
CHORD = 0.15

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def linear(code):
    return tuple(((int(code[i : i + 2], 16) / 255 + 0.055) / 1.055) ** 2.4 for i in (1, 3, 5))


def material(name, code, rough, coat=0, metal=0):
    made = bpy.data.materials.new(name)
    made.use_nodes = True
    node = made.node_tree.nodes["Principled BSDF"]
    node.inputs["Base Color"].default_value = (*linear(code), 1)
    node.inputs["Roughness"].default_value = rough
    node.inputs["Metallic"].default_value = metal
    node.inputs["Coat Weight"].default_value = coat
    node.inputs["Coat Roughness"].default_value = 0.12
    return made


CARBON = material("carbon", "#26282e", 0.46, 0.22)
DARK = material("dark", "#121317", 0.5, 0.3)
PURPLE = material("purple", "#a43bff", 0.5, 0.08)
METAL = material("metal", "#7d8087", 0.3, 0, 1)


def foil(thick, camber, n=44):
    upper, lower = [], []
    for i in range(n + 1):
        x = (1 - math.cos(math.pi * i / n)) / 2
        t = 5 * thick * (0.2969 * math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x**3 - 0.1036 * x**4)
        c = -camber * 4 * x * (1 - x)
        upper.append((x, c + t))
        lower.append((x, c - t))
    return upper + lower[-2:0:-1]


def mesh(name, rings, look):
    n = len(rings[0])
    points = [p for ring in rings for p in ring]
    faces = []
    for i in range(len(rings) - 1):
        for j in range(n):
            a, b = i * n + j, i * n + (j + 1) % n
            faces.append((a, b, b + n, a + n))
    faces += [tuple(range(n - 1, -1, -1)), tuple(range((len(rings) - 1) * n, len(rings) * n))]
    data = bpy.data.meshes.new(name)
    data.from_pydata(points, [], faces)
    data.update()
    edit = bmesh.new()
    edit.from_mesh(data)
    bmesh.ops.recalc_face_normals(edit, faces=edit.faces)
    edit.to_mesh(data)
    edit.free()
    for face in data.polygons:
        face.use_smooth = len(face.vertices) == 4
    made = bpy.data.objects.new(name, data)
    scene.collection.objects.link(made)
    data.materials.append(look)
    return made


def smooth(t):
    return t * t * (3 - 2 * t)


def spoon(x):
    return -0.03 * (1 - min(1, abs(x) / 0.40) ** 2)


def half(flat, radius, drop):
    path = [(flat * i / 26, 0, 0, 0.0) for i in range(26)]
    for i in range(22):
        a = math.pi / 2 * i / 22
        path.append((flat + radius * math.sin(a), -radius * (1 - math.cos(a)), a, i / 22))
    for i in range(19):
        path.append((flat + radius + 0.012 * i / 18, -radius - drop * i / 18, math.pi / 2, 1 + i / 18))
    return path


def loop(name, flat, radius, drop, shift, height, profile, chord, pitch, start=0.0):
    path = half(flat, radius, drop)
    for side in (-1, 1) if start else (0,):
        if side == 0:
            run = [(-x, z, -a, k) for x, z, a, k in reversed(path)][:-1] + path
        else:
            run = [(side * x, z, side * a, k) for x, z, a, k in path if x >= start]
        rings = []
        for x, z, a, k in run:
            out = Vector((math.sin(a), 0, math.cos(a)))
            c, p = chord(k), pitch(k)
            ring = []
            for u, t in profile(k):
                u, t = u * c, t * c
                along = u * math.cos(p) - t * math.sin(p)
                off = u * math.sin(p) + t * math.cos(p)
                ring.append(Vector((x, shift(k) + along, height + z + spoon(x) * (1 - min(1, k)))) + out * off)
            rings.append(ring)
        mesh(name, rings, CARBON)


def blend(a, b):
    def at(k):
        f = smooth(min(1, k))
        return [(p[0], p[1] * (1 - f) + q[1] * f) for p, q in zip(a, b)]

    return at


TIP = foil(0.05, 0.0)
FLAP = foil(0.10, 0.07)

loop(
    "main",
    0.36,
    0.135,
    0.34,
    lambda k: -0.02 * smooth(min(1, k)) - 0.05 * max(0, k - 1),
    0,
    blend(foil(0.095, 0.10), TIP),
    lambda k: 0.29 + 0.11 * smooth(min(1, k)) + 0.03 * max(0, k - 1),
    lambda k: math.radians(14) * (1 - smooth(min(1, k))),
)
loop(
    "tip",
    0.36,
    0.132,
    0.16,
    lambda k: PIVOT[0] - CHORD * math.cos(SHUT) + 0.02 * smooth(min(1, k)),
    PIVOT[1] - CHORD * math.sin(SHUT),
    blend(FLAP, TIP),
    lambda k: CHORD + 0.02 * min(1, k),
    lambda k: SHUT * (1 - smooth(min(1, k))),
    0.359,
)


def flap(angle):
    rings = []
    for i in range(61):
        x = -0.3565 + 0.713 * i / 60
        ring = []
        for u, t in FLAP:
            u, t = (u - 1) * CHORD, t * CHORD
            ring.append(
                Vector(
                    (
                        x,
                        PIVOT[0] + u * math.cos(angle) - t * math.sin(angle),
                        PIVOT[1] + u * math.sin(angle) + t * math.cos(angle) + spoon(x),
                    )
                )
            )
        rings.append(ring)
    return mesh("flap", rings, PURPLE)


def rod(angle):
    end = Vector((0, PIVOT[0] - CHORD * 0.93 * math.cos(angle), PIVOT[1] - CHORD * 0.93 * math.sin(angle) + spoon(0) + 0.004))
    curve = bpy.data.curves.new("rod", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = 0.006
    curve.bevel_resolution = 6
    line = curve.splines.new("POLY")
    line.points.add(1)
    line.points[0].co = (0, 0.21, 0.118 + spoon(0), 1)
    line.points[1].co = (*end, 1)
    made = bpy.data.objects.new("rod", curve)
    scene.collection.objects.link(made)
    curve.materials.append(METAL)
    return made


SWAN = [
    (0.36, -0.40),
    (0.20, -0.385),
    (0.04, -0.31),
    (-0.055, -0.17),
    (-0.088, -0.03),
    (-0.082, 0.05),
    (-0.045, 0.092),
    (0.01, 0.085),
    (0.045, 0.035),
    (0.055, -0.005),
]


def along(t):
    t *= len(SWAN) - 1
    i = min(len(SWAN) - 2, int(t))
    f = t - i
    p = [SWAN[max(0, min(len(SWAN) - 1, j))] for j in (i - 1, i, i + 1, i + 2)]
    return tuple(
        0.5
        * (
            2 * p[1][d]
            + (p[2][d] - p[0][d]) * f
            + (2 * p[0][d] - 5 * p[1][d] + 4 * p[2][d] - p[3][d]) * f * f
            + (3 * p[1][d] - p[0][d] - 3 * p[2][d] + p[3][d]) * f**3
        )
        for d in (0, 1)
    )


def pylon(side):
    rings = []
    for i in range(91):
        here, after, before = along(i / 90), along(min(1, i / 90 + 0.004)), along(max(0, i / 90 - 0.004))
        ahead = Vector((0, after[0] - before[0], after[1] - before[1])).normalized()
        across = Vector((1, 0, 0)).cross(ahead)
        wide = 0.046 - 0.022 * (i / 90)
        ring = []
        for q in range(20):
            a = 2 * math.pi * q / 20
            centre = Vector((side * 0.07, here[0], here[1] + spoon(0)))
            ring.append(centre + Vector((1, 0, 0)) * 0.0048 * math.cos(a) + across * wide * math.sin(a) * 0.75)
        rings.append(ring)
    mesh("pylon", rings, DARK)


def pod():
    rings = []
    for i in range(41):
        t = i / 40
        r = 0.023 * math.sqrt(max(1e-5, math.sin(math.pi * min(1, t**0.62))))
        z = 0.098 + 0.022 * t + spoon(0)
        turn = [2 * math.pi * q / 28 for q in range(28)]
        rings.append([Vector((r * math.cos(a), 0.03 + 0.20 * t, z + 1.15 * r * math.sin(a))) for a in turn])
    mesh("pod", rings, DARK)
    rings = []
    for i in range(13):
        z = 0.09 * i / 12 + spoon(0)
        turn = [2 * math.pi * q / 16 for q in range(16)]
        rings.append([Vector((0.006 * math.cos(a), 0.12 + 0.045 * math.sin(a), z)) for a in turn])
    mesh("fin", rings, DARK)


def beam(y, z, chord, degrees):
    p = math.radians(degrees)
    rings = []
    for i in range(41):
        x = -0.50 + i / 40
        ring = []
        for u, t in FLAP:
            u, t = u * chord, t * chord
            ring.append(
                Vector(
                    (
                        x,
                        y + u * math.cos(p) - t * math.sin(p),
                        z + u * math.sin(p) + t * math.cos(p) - 0.02 * (1 - abs(x) / 0.5),
                    )
                )
            )
        rings.append(ring)
    mesh("beam", rings, CARBON)


pylon(-1)
pylon(1)
pod()
beam(0.10, -0.335, 0.16, 10)
beam(0.235, -0.285, 0.11, 32)

world = bpy.data.worlds.new("world")
scene.world = world
world.use_nodes = True
sky = world.node_tree.nodes["Background"]
sky.inputs[0].default_value = (0.03, 0.035, 0.05, 1)
sky.inputs[1].default_value = 1


def aim(thing, at):
    thing.rotation_euler = (Vector(at) - thing.location).to_track_quat("-Z", "Y").to_euler()


def area(where, at, energy, wide, tall, colour=(1, 1, 1)):
    light = bpy.data.lights.new("area", "AREA")
    light.shape = "RECTANGLE"
    light.energy = energy
    light.size = wide
    light.size_y = tall
    light.color = colour
    made = bpy.data.objects.new("area", light)
    scene.collection.objects.link(made)
    made.location = where
    aim(made, at)


area((-0.5, -0.9, 1.8), (0, 0.15, 0), 22, 2.6, 1.2)
area((-1.9, -0.6, 0.5), (0, 0.1, -0.1), 26, 0.5, 1.6, (0.75, 0.83, 1))
area((1.6, 0.9, 0.9), (0, 0.2, 0), 30, 0.6, 1.6, (0.9, 0.92, 1))
area((0, 1.5, 0.75), (0, 0.25, 0.12), 20, 2.2, 0.6, (0.95, 0.93, 1))
area((0.6, -1.6, 0.1), (0, 0, -0.1), 9, 1.4, 0.8)

lens = bpy.data.cameras.new("camera")
lens.lens = 70
camera = bpy.data.objects.new("camera", lens)
scene.collection.objects.link(camera)
scene.camera = camera
camera.location = (-1.0, -1.5, 0.42)
aim(camera, (-0.01, 0.15, 0.03))

render = scene.render
render.engine = "CYCLES"
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True
render.film_transparent = True
scene.view_settings.view_transform = "Standard"
render.resolution_x, render.resolution_y = WIDTH, HEIGHT
render.image_settings.file_format = "PNG"
render.image_settings.color_mode = "RGBA"

for i, degrees in enumerate(ANGLES):
    parts = [flap(math.radians(degrees)), rod(math.radians(degrees))]
    render.filepath = os.path.join(OUT, f"{i:02d}.png")
    bpy.ops.render.render(write_still=True)
    print("rendered", i, degrees)
    for part in parts:
        bpy.data.objects.remove(part)
