import json
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from circuit import CID, HEIGHT, HERE, PINS, PUBLIC, SECTORS, THEMES, Track, build_track, camera, export, linear, project, recolour, setup_render
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

OUT = os.path.join(HERE, ".out")
LINES = os.path.join(HERE, "..", "..", "src", "circuits", "lines")
AZ, PITCH, DIST, LENS, SHIFT_X, SHIFT_Y = 15.0, 40.0, 2.7, 60.0, -0.06, 0.07
GLOW = {"dark": 1.1, "light": 1.0}
CONTOUR_STEP = 3.0
FOG = 0.75
FLAT_LO, FLAT_HI = 0.0004, 0.002
LINE_POINTS = 400
CROP_MARGIN = 0.06
PALETTE = {
    "dark": {"ground": "#121316", "line": "#737985", "haze": "#1B1D22"},
    "light": {"ground": "#EFEEE9", "line": "#7E8187", "haze": "#EDEBE6"},
}


def contour_material(theme, mid, span):
    pal = PALETTE[theme]
    m = bpy.data.materials.new(f"contours-{theme}")
    nodes, links = m.node_tree.nodes, m.node_tree.links
    nodes.clear()

    def op(kind, a, b=None):
        n = nodes.new("ShaderNodeMath")
        n.operation = kind
        for slot, v in ((0, a), (1, b)):
            if v is None:
                continue
            if isinstance(v, (int, float)):
                n.inputs[slot].default_value = v
            else:
                links.new(v, n.inputs[slot])
        return n.outputs[0]

    geo = nodes.new("ShaderNodeNewGeometry")
    pos = nodes.new("ShaderNodeSeparateXYZ")
    links.new(geo.outputs["Position"], pos.inputs[0])
    nrm = nodes.new("ShaderNodeSeparateXYZ")
    links.new(geo.outputs["Normal"], nrm.inputs[0])
    f = op("FRACT", op("DIVIDE", op("ADD", pos.outputs["Z"], CONTOUR_STEP * 0.37), CONTOUR_STEP))
    d = op("MINIMUM", f, op("SUBTRACT", 1.0, f))
    slope = op("MAXIMUM", op("SUBTRACT", 1.0, nrm.outputs["Z"]), 0.02)
    width = op("MINIMUM", op("MULTIPLY", slope, 0.55), 0.06)
    line = op("SUBTRACT", 1.0, op("DIVIDE", d, width))
    dx = op("POWER", op("SUBTRACT", pos.outputs["X"], mid.x), 2)
    dy = op("POWER", op("SUBTRACT", pos.outputs["Y"], mid.y), 2)
    r = op("SQRT", op("ADD", dx, dy))
    fade = op("POWER", op("SUBTRACT", 1.0, op("MINIMUM", op("DIVIDE", r, span * FOG), 1.0)), 1.6)
    flat = op("MAXIMUM", op("MINIMUM", op("DIVIDE", op("SUBTRACT", op("SUBTRACT", 1.0, nrm.outputs["Z"]), FLAT_LO), FLAT_HI - FLAT_LO), 1.0), 0.0)
    amount = op("MULTIPLY", op("MULTIPLY", op("MAXIMUM", op("MINIMUM", line, 1.0), 0.0), fade), flat)
    mix = nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    links.new(amount, mix.inputs["Factor"])
    mix.inputs["A"].default_value = (*linear(pal["ground"]), 1)
    mix.inputs["B"].default_value = (*linear(pal["line"]), 1)
    cam = nodes.new("ShaderNodeCameraData")
    near, far = span * DIST * 0.7, span * DIST * 1.9
    haze = op("POWER", op("MAXIMUM", op("MINIMUM", op("DIVIDE", op("SUBTRACT", cam.outputs["View Distance"], near), far - near), 1.0), 0.0), 1.4)
    mix2 = nodes.new("ShaderNodeMix")
    mix2.data_type = "RGBA"
    links.new(haze, mix2.inputs["Factor"])
    links.new(mix.outputs["Result"], mix2.inputs["A"])
    mix2.inputs["B"].default_value = (*linear(pal["haze"]), 1)
    emit = nodes.new("ShaderNodeEmission")
    links.new(mix2.outputs["Result"], emit.inputs["Color"])
    out = nodes.new("ShaderNodeOutputMaterial")
    links.new(emit.outputs[0], out.inputs["Surface"])
    return m


def bloom(scene):
    tree = bpy.data.node_groups.new("comp", "CompositorNodeTree")
    scene.compositing_node_group = tree
    rl = tree.nodes.new("CompositorNodeRLayers")
    glare = tree.nodes.new("CompositorNodeGlare")
    for key, val in (("Type", "Bloom"), ("Quality", "High"), ("Threshold", 1.0), ("Strength", 0.25), ("Size", 0.5)):
        if key in glare.inputs:
            glare.inputs[key].default_value = val
    tree.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    out = tree.nodes.new("NodeGroupOutput")
    tree.links.new(rl.outputs["Image"], glare.inputs["Image"])
    tree.links.new(glare.outputs["Image"], out.inputs[0])


def aim(cam, mid, span):
    az, pitch = math.radians(AZ), math.radians(PITCH)
    dist = span * DIST
    cam.data.lens = LENS
    cam.data.shift_x, cam.data.shift_y = SHIFT_X, SHIFT_Y
    cam.location = (
        mid.x + dist * math.cos(pitch) * math.sin(az),
        mid.y - dist * math.cos(pitch) * math.cos(az),
        mid.z + dist * math.sin(pitch),
    )
    cam.rotation_euler = (mid - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam.data.clip_start, cam.data.clip_end = 5, dist * 6
    return dist


def centreline(track):
    out = []
    for i in range(LINE_POINTS):
        p = track.at(track.lap * i / LINE_POINTS)
        out.append({"u": i / LINE_POINTS, "x": round(p.x, 2), "y": round(p.z + HEIGHT, 2), "z": round(-p.y, 2)})
    return out


def crop(scene, cam, track):
    pts = [world_to_camera_view(scene, cam, p + Vector((0, 0, HEIGHT))) for p in track.samples]
    x0, x1 = min(p.x for p in pts), max(p.x for p in pts)
    y0, y1 = min(1 - p.y for p in pts), max(1 - p.y for p in pts)
    mx, my = (x1 - x0) * CROP_MARGIN, (y1 - y0) * CROP_MARGIN
    return [round(max(0.0, v), 4) for v in (x0 - mx, y0 - my)] + [round(min(1.0, v), 4) for v in (x1 + mx, y1 + my)]


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    track = Track()
    mats = build_track(track)

    bg = setup_render(scene)
    scene.render.resolution_x, scene.render.resolution_y = 2880, 1800
    scene.eevee.taa_render_samples = 32
    bloom(scene)
    cam = camera(scene, LENS)
    ribbons = [scene.objects[name] for name, _ in SECTORS]
    pts = [o.matrix_world @ v.co for o in ribbons for v in o.data.vertices]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    mid = (lo + hi) / 2
    span = max(hi.x - lo.x, hi.y - lo.y)
    dist = aim(cam, mid, span)
    ground = scene.objects["ground"]
    original = ground.data.materials[0]

    for theme, c in THEMES.items():
        contours = contour_material(theme, mid, span)
        ground.data.materials[0] = contours
        bg.inputs["Color"].default_value = (*linear(c["bg"]), 1)
        recolour(mats["ink"], c["ink"])
        for o in ribbons:
            o.active_material.node_tree.nodes["Emission"].inputs["Strength"].default_value = GLOW[theme]
        scene.render.filepath = os.path.join(PUBLIC, f"{CID}-{theme}.png")
        bpy.ops.render.render(write_still=True)
        ground.data.materials[0] = original
        bpy.data.materials.remove(contours)
    recolour(mats["ink"], THEMES["light"]["ink"])
    for o in ribbons:
        o.active_material.node_tree.nodes["Emission"].inputs["Strength"].default_value = 1.0

    turns = [o for o in scene.objects if o.type == "EMPTY" and o.name.startswith("turn-")]
    pins = project(scene, cam, turns)
    os.makedirs(PINS, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    pins["crop"] = crop(scene, cam, track)
    json.dump(pins, open(os.path.join(PINS, f"{CID}.json"), "w"), indent=1)
    os.makedirs(LINES, exist_ok=True)
    json.dump(centreline(track), open(os.path.join(LINES, f"{CID}.json"), "w"))
    export(os.path.join(OUT, f"{CID}.glb"))
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, f"{CID}.blend"))
    zs = [p.z for p in track.samples]
    print(f"done {CID}: lap {track.lap:.0f} m, camera {dist:.0f} m, model height {min(zs):.0f}..{max(zs):.0f} m")


main()
