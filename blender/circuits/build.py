import json
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from circuit import CFG, CID, CROP, HERE, PINS, PUBLIC, THEMES, WIDTH, Track, build_track, camera, export, linear, project, recolour, setup_render

OUT = os.path.join(HERE, ".out")


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    track = Track()
    mats = build_track(track)

    bg = setup_render(scene)
    pitch = math.radians(CFG["pitch"])
    cam = camera(scene, 50)
    wide = math.tan(cam.data.angle / 2)
    high = wide * scene.render.resolution_y / scene.render.resolution_x
    h = track.size.y / 2
    near = h * math.sin(pitch) * CFG["frame"] / high + h * math.cos(pitch)
    edge = h + WIDTH
    far = edge * math.sin(pitch) / (high * (1 - 2 * CROP)) - edge * math.cos(pitch)
    dist = max(track.size.x * 0.5 * CFG["frame"] / wide, near, far)
    cam.location = (0, -dist * math.cos(pitch), dist * math.sin(pitch))
    cam.rotation_euler = (math.pi / 2 - pitch, 0, 0)
    cam.data.clip_start, cam.data.clip_end = 10, dist * 4

    for theme, c in THEMES.items():
        bg.inputs["Color"].default_value = (*linear(c["bg"]), 1)
        recolour(mats["ink"], c["ink"])
        recolour(mats["ground"], c["bg"])
        scene.render.filepath = os.path.join(PUBLIC, f"{CID}-{theme}.png")
        bpy.ops.render.render(write_still=True)
    recolour(mats["ink"], THEMES["light"]["ink"])
    recolour(mats["ground"], THEMES["light"]["bg"])

    turns = [o for o in scene.objects if o.type == "EMPTY" and o.name.startswith("turn-")]
    pins = project(scene, cam, turns)
    os.makedirs(PINS, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    json.dump(pins, open(os.path.join(PINS, f"{CID}.json"), "w"), indent=1)
    export(os.path.join(OUT, f"{CID}.glb"))
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, f"{CID}.blend"))
    zs = [p.z for p in track.samples]
    print(f"done {CID}: lap {track.lap:.0f} m, camera {dist:.0f} m, model height {min(zs):.0f}..{max(zs):.0f} m")


main()
